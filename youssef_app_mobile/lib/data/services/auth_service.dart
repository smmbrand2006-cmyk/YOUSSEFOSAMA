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

  static String codeToEmail(String code) {
    final clean = code.trim().toLowerCase().replaceAll(RegExp(r'[^a-z0-9_.-]'), '_');
    // Ensure clean part does not consist solely of underscores/dots or start/end invalidly
    final alphanumericPart = clean.replaceAll(RegExp(r'[^a-z0-9]'), '');
    final safeLocal = alphanumericPart.isEmpty
        ? 'user_${code.trim().hashCode.abs()}'
        : clean.replaceAll(RegExp(r'_+'), '_').replaceAll(RegExp(r'^_+|_+$'), '');
    return '$safeLocal@youssef.app';
  }

  /// Sign In with Email, Phone Number, Username or UserCode
  Future<UserModel> signIn({required String email, required String password}) async {
    final input = email.trim();
    String targetEmail = input;

    if (!input.contains('@')) {
      final cleanCode = input.replaceAll('#', '').trim();

      // 1. Try finding user by exact userCode (phone / account code)
      final codeQuery = await _firestore
          .collection('users')
          .where('userCode', isEqualTo: cleanCode)
          .limit(1)
          .get();

      if (codeQuery.docs.isNotEmpty) {
        final data = codeQuery.docs.first.data();
        final storedEmail = data['email']?.toString();
        if (storedEmail != null && storedEmail.contains('@') && !storedEmail.startsWith('_')) {
          targetEmail = storedEmail;
        } else {
          targetEmail = codeToEmail(data['userCode']?.toString() ?? cleanCode);
        }
      } else {
        // 2. Try finding user by exact displayName
        final nameQuery = await _firestore
            .collection('users')
            .where('displayName', isEqualTo: input)
            .limit(1)
            .get();

        if (nameQuery.docs.isNotEmpty) {
          final data = nameQuery.docs.first.data();
          final storedEmail = data['email']?.toString();
          if (storedEmail != null && storedEmail.contains('@') && !storedEmail.startsWith('_')) {
            targetEmail = storedEmail;
          } else {
            targetEmail = codeToEmail(data['userCode']?.toString() ?? cleanCode);
          }
        } else {
          // 3. Fallback scan by lowercase displayName or userCode
          final allSnap = await _firestore.collection('users').limit(100).get();
          DocumentSnapshot? matchedDoc;
          final lower = input.toLowerCase();

          for (final d in allSnap.docs) {
            final data = d.data();
            final dName = (data['displayName'] ?? '').toString().toLowerCase();
            final dCode = (data['userCode'] ?? '').toString().toLowerCase();
            if (dName == lower || dCode == lower) {
              matchedDoc = d;
              break;
            }
          }

          if (matchedDoc != null) {
            final data = matchedDoc.data() as Map<String, dynamic>;
            final storedEmail = data['email']?.toString();
            if (storedEmail != null && storedEmail.contains('@') && !storedEmail.startsWith('_')) {
              targetEmail = storedEmail;
            } else {
              targetEmail = codeToEmail(data['userCode']?.toString() ?? cleanCode);
            }
          } else {
            targetEmail = codeToEmail(cleanCode);
          }
        }
      }
    }

    UserCredential cred;
    try {
      cred = await _auth.signInWithEmailAndPassword(
        email: targetEmail,
        password: password,
      );
    } on FirebaseAuthException catch (e) {
      // Fallback for legacy accounts created with @youssefapp.com
      if ((e.code == 'user-not-found' || e.code == 'invalid-credential') && targetEmail.endsWith('@youssef.app')) {
        final legacyEmail = targetEmail.replaceAll('@youssef.app', '@youssefapp.com');
        try {
          cred = await _auth.signInWithEmailAndPassword(
            email: legacyEmail,
            password: password,
          );
        } catch (_) {
          rethrow;
        }
      } else {
        rethrow;
      }
    }

    final userDoc = await _firestore.collection('users').doc(cred.user!.uid).get();
    if (userDoc.exists) {
      return UserModel.fromFirestore(userDoc);
    } else {
      // Create document if missing
      final userCode = input.contains('@') ? await _generateUniqueUserCode() : input.replaceAll('#', '').trim();
      final newUser = UserModel(
        uid: cred.user!.uid,
        displayName: cred.user!.displayName ?? input.split('@')[0],
        userCode: userCode,
        email: targetEmail,
        isOnline: true,
      );
      await _firestore.collection('users').doc(cred.user!.uid).set(newUser.toMap());
      return newUser;
    }
  }

  /// Register new user account with Email or Phone/Code
  Future<UserModel> register({
    required String displayName,
    required String email,
    required String password,
    String? bio,
  }) async {
    final cleanInput = email.trim();
    String targetEmail;
    String userCode;

    if (cleanInput.contains('@')) {
      targetEmail = cleanInput;
      userCode = await _generateUniqueUserCode();
    } else {
      userCode = cleanInput.replaceAll('#', '').trim();
      targetEmail = codeToEmail(userCode);
    }

    final cred = await _auth.createUserWithEmailAndPassword(
      email: targetEmail,
      password: password,
    );

    await cred.user!.updateDisplayName(displayName.trim());

    final newUser = UserModel(
      uid: cred.user!.uid,
      displayName: displayName.trim(),
      userCode: userCode,
      email: targetEmail,
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
      try {
        await user.updateDisplayName(displayName.trim());
      } catch (_) {}
    }
    if (bio != null) data['bio'] = bio.trim();
    if (photoUrl != null) {
      data['photoUrl'] = photoUrl;
      // Only update photoURL in FirebaseAuth if it's a valid HTTP URL (Base64 exceeds Auth character limit)
      if (photoUrl.startsWith('http')) {
        try {
          await user.updatePhotoURL(photoUrl);
        } catch (_) {}
      }
    }

    if (data.isNotEmpty) {
      await _firestore.collection('users').doc(user.uid).set(data, SetOptions(merge: true));
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
