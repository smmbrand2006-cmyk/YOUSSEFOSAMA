import 'package:cloud_firestore/cloud_firestore.dart';
import '../../core/utils/encryption_helper.dart';

class MessageModel {
  final String id;
  final String senderId;
  final String senderName;
  final String text;
  final String? mediaUrl;
  final String messageType; // "text" | "image" | "audio"
  final List<String> readBy;
  final bool isDeleted;
  final List<String> deletedFor;
  final List<String> starredBy;
  final bool isPinned;
  final Map<String, dynamic>? replyTo;
  final dynamic createdAt;
  final int? clientTimestamp;

  MessageModel({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.text,
    this.mediaUrl,
    this.messageType = "text",
    this.readBy = const [],
    this.isDeleted = false,
    this.deletedFor = const [],
    this.starredBy = const [],
    this.isPinned = false,
    this.replyTo,
    this.createdAt,
    this.clientTimestamp,
  });

  factory MessageModel.fromFirestore(DocumentSnapshot doc) {
    final data = (doc.data() as Map<String, dynamic>?) ?? {};
    return MessageModel(
      id: doc.id,
      senderId: data['senderId'] ?? '',
      senderName: data['senderName'] ?? '',
      text: data['text'] ?? '',
      mediaUrl: data['mediaUrl'] ?? data['mediaCode'],
      messageType: data['type'] ?? data['messageType'] ?? 'text',
      readBy: List<String>.from(data['readBy'] ?? []),
      isDeleted: data['isDeleted'] == true,
      deletedFor: List<String>.from(data['deletedFor'] ?? []),
      starredBy: List<String>.from(data['starredBy'] ?? []),
      isPinned: data['isPinned'] == true,
      replyTo: data['replyTo'] is Map ? Map<String, dynamic>.from(data['replyTo']) : null,
      createdAt: data['createdAt'],
      clientTimestamp: data['clientTimestamp'] is num ? (data['clientTimestamp'] as num).toInt() : null,
    );
  }

  String getDecryptedText() {
    if (isDeleted) {
      return "🚫 تم حذف هذه الرسالة";
    }
    return EncryptionHelper.decryptMessageText(text);
  }

  bool isReadBy(String userId) {
    return readBy.contains(userId);
  }

  bool isDeletedForUser(String userId) {
    return deletedFor.contains(userId);
  }

  bool isStarredByUser(String userId) {
    return starredBy.contains(userId);
  }

  Map<String, dynamic> toMap() {
    return {
      'senderId': senderId,
      'senderName': senderName,
      'text': text,
      if (mediaUrl != null) 'mediaUrl': mediaUrl,
      'type': messageType,
      'messageType': messageType,
      'readBy': readBy,
      'isDeleted': isDeleted,
      'deletedFor': deletedFor,
      'starredBy': starredBy,
      'isPinned': isPinned,
      if (replyTo != null) 'replyTo': replyTo,
      'reactions': {},
      'isEdited': false,
      'createdAt': createdAt ?? FieldValue.serverTimestamp(),
      'clientTimestamp': clientTimestamp ?? DateTime.now().millisecondsSinceEpoch,
    };
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'senderId': senderId,
      'senderName': senderName,
      'text': text,
      'mediaUrl': mediaUrl,
      'messageType': messageType,
      'readBy': readBy,
      'isDeleted': isDeleted,
      'deletedFor': deletedFor,
      'starredBy': starredBy,
      'isPinned': isPinned,
      'replyTo': replyTo,
      'clientTimestamp': clientTimestamp,
    };
  }

  factory MessageModel.fromJson(Map<String, dynamic> json) {
    return MessageModel(
      id: json['id'] ?? '',
      senderId: json['senderId'] ?? '',
      senderName: json['senderName'] ?? '',
      text: json['text'] ?? '',
      mediaUrl: json['mediaUrl'],
      messageType: json['messageType'] ?? 'text',
      readBy: List<String>.from(json['readBy'] ?? []),
      isDeleted: json['isDeleted'] == true,
      deletedFor: List<String>.from(json['deletedFor'] ?? []),
      starredBy: List<String>.from(json['starredBy'] ?? []),
      isPinned: json['isPinned'] == true,
      replyTo: json['replyTo'] is Map ? Map<String, dynamic>.from(json['replyTo']) : null,
      clientTimestamp: json['clientTimestamp'] is num ? (json['clientTimestamp'] as num).toInt() : null,
    );
  }
}
