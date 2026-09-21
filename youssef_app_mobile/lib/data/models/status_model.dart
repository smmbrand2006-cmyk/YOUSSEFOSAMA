import 'package:cloud_firestore/cloud_firestore.dart';

class StatusViewer {
  final String userId;
  final String userName;
  final String? userAvatar;
  final dynamic viewedAt;

  StatusViewer({
    required this.userId,
    required this.userName,
    this.userAvatar,
    this.viewedAt,
  });

  factory StatusViewer.fromMap(Map<String, dynamic> map) {
    return StatusViewer(
      userId: map['userId'] ?? '',
      userName: map['userName'] ?? 'مستخدم',
      userAvatar: map['userAvatar'],
      viewedAt: map['viewedAt'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'userName': userName,
      if (userAvatar != null) 'userAvatar': userAvatar,
      'viewedAt': viewedAt ?? FieldValue.serverTimestamp(),
    };
  }
}

class StatusModel {
  final String id;
  final String userId;
  final String userName;
  final String? userAvatar;
  final String type; // "text" | "image"
  final String? content;
  final String? backgroundColor;
  final String? mediaUrl;
  final List<StatusViewer> viewers;
  final dynamic createdAt;
  final dynamic expiresAt;

  StatusModel({
    required this.id,
    required this.userId,
    required this.userName,
    this.userAvatar,
    this.type = "text",
    this.content,
    this.backgroundColor,
    this.mediaUrl,
    this.viewers = const [],
    this.createdAt,
    this.expiresAt,
  });

  factory StatusModel.fromFirestore(DocumentSnapshot doc) {
    final data = (doc.data() as Map<String, dynamic>?) ?? {};
    final rawViewers = (data['viewers'] as List<dynamic>?) ?? [];
    final viewersList = rawViewers
        .map((v) => StatusViewer.fromMap(v as Map<String, dynamic>))
        .toList();

    return StatusModel(
      id: doc.id,
      userId: data['userId'] ?? '',
      userName: data['userName'] ?? 'مستخدم',
      userAvatar: data['userAvatar'],
      type: data['type'] ?? 'text',
      content: data['content'],
      backgroundColor: data['backgroundColor'],
      mediaUrl: data['mediaUrl'],
      viewers: viewersList,
      createdAt: data['createdAt'],
      expiresAt: data['expiresAt'],
    );
  }

  bool isViewedBy(String uid) {
    return viewers.any((v) => v.userId == uid);
  }
}
