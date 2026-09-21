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
      mediaUrl: data['mediaUrl'],
      messageType: data['messageType'] ?? 'text',
      readBy: List<String>.from(data['readBy'] ?? []),
      createdAt: data['createdAt'],
      clientTimestamp: data['clientTimestamp'] is num ? (data['clientTimestamp'] as num).toInt() : null,
    );
  }

  String getDecryptedText() {
    return EncryptionHelper.decryptMessageText(text);
  }

  bool isReadBy(String userId) {
    return readBy.contains(userId);
  }

  Map<String, dynamic> toMap() {
    return {
      'senderId': senderId,
      'senderName': senderName,
      'text': text,
      if (mediaUrl != null) 'mediaUrl': mediaUrl,
      'messageType': messageType,
      'readBy': readBy,
      'createdAt': createdAt ?? FieldValue.serverTimestamp(),
      'clientTimestamp': clientTimestamp ?? DateTime.now().millisecondsSinceEpoch,
    };
  }
}
