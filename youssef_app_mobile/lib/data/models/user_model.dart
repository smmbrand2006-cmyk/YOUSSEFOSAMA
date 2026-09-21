import 'package:cloud_firestore/cloud_firestore.dart';

class UserModel {
  final String uid;
  final String displayName;
  final String userCode;
  final String email;
  final String bio;
  final String? photoUrl;
  final bool isOnline;
  final dynamic lastSeen;
  final List<String> blockedUsers;

  UserModel({
    required this.uid,
    required this.displayName,
    required this.userCode,
    required this.email,
    this.bio = "مرحباً! أنا أستخدم تطبيق يوسف.",
    this.photoUrl,
    this.isOnline = false,
    this.lastSeen,
    this.blockedUsers = const [],
  });

  factory UserModel.fromFirestore(DocumentSnapshot doc) {
    final data = (doc.data() as Map<String, dynamic>?) ?? {};
    return UserModel(
      uid: doc.id,
      displayName: data['displayName'] ?? 'مستخدم',
      userCode: data['userCode'] ?? '',
      email: data['email'] ?? '',
      bio: data['bio'] ?? 'مرحباً! أنا أستخدم تطبيق يوسف.',
      photoUrl: data['photoUrl'] ?? data['avatarUrl'],
      isOnline: data['isOnline'] ?? false,
      lastSeen: data['lastSeen'],
      blockedUsers: List<String>.from(data['blockedUsers'] ?? []),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'uid': uid,
      'displayName': displayName,
      'userCode': userCode,
      'email': email,
      'bio': bio,
      if (photoUrl != null) 'photoUrl': photoUrl,
      'isOnline': isOnline,
      'lastSeen': lastSeen ?? FieldValue.serverTimestamp(),
      'blockedUsers': blockedUsers,
    };
  }

  UserModel copyWith({
    String? displayName,
    String? bio,
    String? photoUrl,
    bool? isOnline,
    dynamic lastSeen,
    List<String>? blockedUsers,
  }) {
    return UserModel(
      uid: uid,
      displayName: displayName ?? this.displayName,
      userCode: userCode,
      email: email,
      bio: bio ?? this.bio,
      photoUrl: photoUrl ?? this.photoUrl,
      isOnline: isOnline ?? this.isOnline,
      lastSeen: lastSeen ?? this.lastSeen,
      blockedUsers: blockedUsers ?? this.blockedUsers,
    );
  }
}
