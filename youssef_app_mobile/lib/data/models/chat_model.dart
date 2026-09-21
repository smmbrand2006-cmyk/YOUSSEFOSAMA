import 'package:cloud_firestore/cloud_firestore.dart';
import '../../core/utils/encryption_helper.dart';

class ChatModel {
  final String id;
  final String type; // "direct" | "group"
  final String? name; // For group
  final List<String> participants;
  final Map<String, String> participantNames;
  final Map<String, String>? participantAvatars;
  final bool isSupport;
  final Map<String, dynamic>? lastMessage;
  final Map<String, int> unreadCount;
  final dynamic updatedAt;
  final dynamic createdAt;

  ChatModel({
    required this.id,
    this.type = "direct",
    this.name,
    required this.participants,
    required this.participantNames,
    this.participantAvatars,
    this.isSupport = false,
    this.lastMessage,
    this.unreadCount = const {},
    this.updatedAt,
    this.createdAt,
  });

  factory ChatModel.fromFirestore(DocumentSnapshot doc) {
    final data = (doc.data() as Map<String, dynamic>?) ?? {};

    // Cast participantNames map safely
    final rawNames = data['participantNames'] as Map<String, dynamic>? ?? {};
    final names = rawNames.map((k, v) => MapEntry(k, v?.toString() ?? ''));

    // Cast participantAvatars map safely
    final rawAvatars = data['participantAvatars'] as Map<String, dynamic>? ?? {};
    final avatars = rawAvatars.map((k, v) => MapEntry(k, v?.toString() ?? ''));

    // Cast unreadCount safely
    final rawUnread = data['unreadCount'] as Map<String, dynamic>? ?? {};
    final unread = rawUnread.map((k, v) => MapEntry(k, (v is num) ? v.toInt() : 0));

    final isSupportChat = data['isSupport'] == true ||
        doc.id.contains("support") ||
        (data['participants'] as List?)?.contains("support_official_123") == true ||
        names.values.any((n) => n.contains("دعم") || n.contains("123") || n.toLowerCase().contains("support"));

    return ChatModel(
      id: doc.id,
      type: data['type'] ?? 'direct',
      name: data['name'],
      participants: List<String>.from(data['participants'] ?? []),
      participantNames: names,
      participantAvatars: avatars,
      isSupport: isSupportChat,
      lastMessage: data['lastMessage'] as Map<String, dynamic>?,
      unreadCount: unread,
      updatedAt: data['updatedAt'],
      createdAt: data['createdAt'],
    );
  }

  /// Get decoded last message snippet
  String getDecryptedLastMessage() {
    if (lastMessage == null) return "";
    final raw = lastMessage!['text']?.toString() ?? "";
    if (raw.isEmpty) return "";
    return EncryptionHelper.decryptMessageText(raw);
  }

  /// Get other participant ID
  String getOtherUserId(String currentUserId) {
    return participants.firstWhere(
      (id) => id != currentUserId,
      orElse: () => currentUserId,
    );
  }

  /// Get chat display title
  String getChatTitle(String currentUserId) {
    if (isSupport) return "الدعم الفني الرسمي (#123)";
    if (type == "group") return name ?? "مجموعة جديدة";
    final otherUid = getOtherUserId(currentUserId);
    return participantNames[otherUid] ?? "مستخدم";
  }

  /// Get chat avatar
  String? getChatAvatar(String currentUserId) {
    if (isSupport) return null;
    final otherUid = getOtherUserId(currentUserId);
    return participantAvatars?[otherUid];
  }

  /// Get unread count for current user
  int getMyUnreadCount(String currentUserId) {
    return unreadCount[currentUserId] ?? 0;
  }
}
