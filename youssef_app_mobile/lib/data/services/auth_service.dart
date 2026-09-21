import 'dart:math';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/user_model.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  User? get currentUser => _auth.currentUser;
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  /// Generate unique 6-digit user code (e.g. 841923)
  Future<String> _generateUniqueUserCode() async {
    final rnd = Random();
    for (int attempts = 0; attempts < 10; attempts++) {
      final code = (100000 + rnd.nextInt(900000)).toString();
      final snap = await _firestore
          .collection('users')
          .where('userCode', isEqualTo: code)
          .limit(1)
          .get();
      if (snap.docs.isEmpty) {
        return code;
      }
    }
    return (100000 + rnd.nextInt(900000)).toString();
  }

  /// Sign In with Email / Username and Password
  Future<UserModel> signIn({required String email, required String password}) async {
    String cleanEmail = email.trim();
    // Support login with username/code if not an email format
    if (!cleanEmail.contains('@')) {
      // Find email by userCode or displayName
      final query = await _firestore
          .collection('users')
          .where('userCode', isEqualTo: cleanEmail.replaceAll('#', ''))
          .limit(1)
          .get();

      if (query.docs.isNotEmpty) {
        cleanEmail = query.docs.first.data()['email'] ?? cleanEmail;
      } else {
        // Try looking by displayName
        final nameQuery = await _firestore
            .collection('users')
            .where('displayName', isEqualTo: cleanEmail)
            .limit(1)
            .get();
        if (nameQuery.docs.isNotEmpty) {
          cleanEmail = nameQuery.docs.first.data()['email'] ?? cleanEmail;
        } else {
          // Default domain fallback
          cleanEmail = "$cleanEmail@youssefapp.com";
        }
      }
    }

    final cred = await _auth.signInWithEmailAndPassword(
      email: cleanEmail,
      password: password,
    );

    final userDoc = await _firestore.collection('users').doc(cred.user!.uid).get();
    if (userDoc.exists) {
      return UserModel.fromFirestore(userDoc);
    } else {
      // Create document if missing
      final userCode = await _generateUniqueUserCode();
      final newUser = UserModel(
        uid: cred.user!.uid,
        displayName: cred.user!.displayName ?? cleanEmail.split('@')[0],
        userCode: userCode,
        email: cleanEmail,
        isOnline: true,
      );
      await _firestore.collection('users').doc(cred.user!.uid).set(newUser.toMap());
      return newUser;
    }
  }

  /// Register new user account
  Future<UserModel> register({
    required String displayName,
    required String email,
    required String password,
    String? bio,
  }) async {
    String cleanEmail = email.trim();
    if (!cleanEmail.contains('@')) {
      cleanEmail = "${cleanEmail.toLowerCase().replaceAll(' ', '')}@youssefapp.com";
    }

    final cred = await _auth.createUserWithEmailAndPassword(
      email: cleanEmail,
      password: password,
    );

    await cred.user!.updateDisplayName(displayName.trim());

    final userCode = await _generateUniqueUserCode();
    final newUser = UserModel(
      uid: cred.user!.uid,
      displayName: displayName.trim(),
      userCode: userCode,
      email: cleanEmail,
      bio: bio ?? "مرحباً! أنا أستخدم تطبيق يوسف.",
      isOnline: true,
      lastSeen: FieldValue.serverTimestamp(),
    );

    await _firestore.collection('users').doc(cred.user!.uid).set(newUser.toMap());
    return newUser;
  }

  /// Get profile document
  Future<UserModel?> getCurrentUserProfile() async {
    final user = _auth.currentUser;
    if (user == null) return null;
    final doc = await _firestore.collection('users').doc(user.uid).get();
    if (!doc.exists) return null;
    return UserModel.fromFirestore(doc);
  }

  /// Update Profile
  Future<void> updateProfile({String? displayName, String? bio, String? photoUrl}) async {
    final user = _auth.currentUser;
    if (user == null) return;
    final data = <String, dynamic>{};
    if (displayName != null) {
      data['displayName'] = displayName.trim();
      await user.updateDisplayName(displayName.trim());
    }
    if (bio != null) data['bio'] = bio.trim();
    if (photoUrl != null) data['photoUrl'] = photoUrl;

    if (data.isNotEmpty) {
      await _firestore.collection('users').doc(user.uid).update(data);
    }
  }

  /// Sign Out
  Future<void> signOut() async {
    final user = _auth.currentUser;
    if (user != null) {
      try {
        await _firestore.collection('users').doc(user.uid).update({
          'isOnline': false,
          'lastSeen': FieldValue.serverTimestamp(),
        });
      } catch (_) {}
    }
    await _auth.signOut();
  }
}
