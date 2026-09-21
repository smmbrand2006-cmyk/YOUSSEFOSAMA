import 'package:cloud_firestore/cloud_firestore.dart';
import '../../core/utils/encryption_helper.dart';
import '../models/chat_model.dart';
import '../models/message_model.dart';
import '../models/status_model.dart';
import '../models/user_model.dart';

class FirestoreService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Stream of user chats with protected ordering to prevent bounce
  Stream<List<ChatModel>> getChatsStream(String currentUid) {
    return _firestore
        .collection('chats')
        .where('participants', arrayContains: currentUid)
        .snapshots()
        .map((snapshot) {
      final chats = snapshot.docs.map((doc) => ChatModel.fromFirestore(doc)).toList();

      // Sort chats descending by last activity timestamp
      chats.sort((a, b) {
        final timeA = _getChatLastTime(a);
        final timeB = _getChatLastTime(b);
        return timeB.compareTo(timeA);
      });

      return chats;
    });
  }

  int _getChatLastTime(ChatModel chat) {
    final lastMsg = chat.lastMessage;
    if (lastMsg != null) {
      if (lastMsg['clientTimestamp'] is num) {
        return (lastMsg['clientTimestamp'] as num).toInt();
      }
      final created = lastMsg['createdAt'];
      if (created is Timestamp) {
        return created.millisecondsSinceEpoch;
      }
    }
    if (chat.updatedAt is Timestamp) {
      return (chat.updatedAt as Timestamp).millisecondsSinceEpoch;
    }
    return 0;
  }

  /// Stream of messages for a chat
  Stream<List<MessageModel>> getMessagesStream(String chatId) {
    return _firestore
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('createdAt', descending: false)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) => MessageModel.fromFirestore(doc)).toList();
    });
  }

  /// Send encrypted message and update chat preview atomically
  Future<void> sendMessage({
    required String chatId,
    required String senderId,
    required String senderName,
    required String text,
    String? mediaUrl,
    String messageType = "text",
    required List<String> participants,
  }) async {
    final encryptedText = EncryptionHelper.encryptMessageText(text);
    final nowMs = DateTime.now().millisecondsSinceEpoch;

    final messageData = {
      'senderId': senderId,
      'senderName': senderName,
      'text': encryptedText,
      if (mediaUrl != null) 'mediaUrl': mediaUrl,
      'messageType': messageType,
      'readBy': [senderId],
      'createdAt': FieldValue.serverTimestamp(),
      'clientTimestamp': nowMs,
    };

    final messageRef = _firestore
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .doc();

    final chatRef = _firestore.collection('chats').doc(chatId);

    // Build unread increments for other participants
    final unreadUpdates = <String, dynamic>{};
    for (final p in participants) {
      if (p != senderId) {
        unreadUpdates['unreadCount.$p'] = FieldValue.increment(1);
      }
    }

    final batch = _firestore.batch();
    batch.set(messageRef, messageData);
    batch.update(chatRef, {
      'lastMessage': {
        'text': encryptedText,
        'senderId': senderId,
        'senderName': senderName,
        'createdAt': FieldValue.serverTimestamp(),
        'clientTimestamp': nowMs,
      },
      'updatedAt': FieldValue.serverTimestamp(),
      ...unreadUpdates,
    });

    await batch.commit();
  }

  /// Mark chat as read for user
  Future<void> markChatAsRead(String chatId, String userId) async {
    try {
      await _firestore.collection('chats').doc(chatId).update({
        'unreadCount.$userId': 0,
      });
    } catch (_) {}
  }

  /// Find or create a direct 1:1 chat between two users
  Future<ChatModel> getOrCreateDirectChat({
    required UserModel currentUser,
    required UserModel targetUser,
  }) async {
    // Check if chat already exists
    final query = await _firestore
        .collection('chats')
        .where('type', isEqualTo: 'direct')
        .where('participants', arrayContains: currentUser.uid)
        .get();

    for (final doc in query.docs) {
      final chat = ChatModel.fromFirestore(doc);
      if (chat.participants.contains(targetUser.uid)) {
        return chat;
      }
    }

    // Create new direct chat
    final newDoc = _firestore.collection('chats').doc();
    final newChat = ChatModel(
      id: newDoc.id,
      type: "direct",
      participants: [currentUser.uid, targetUser.uid],
      participantNames: {
        currentUser.uid: currentUser.displayName,
        targetUser.uid: targetUser.displayName,
      },
      participantAvatars: {
        if (currentUser.photoUrl != null) currentUser.uid: currentUser.photoUrl!,
        if (targetUser.photoUrl != null) targetUser.uid: targetUser.photoUrl!,
      },
      unreadCount: {
        currentUser.uid: 0,
        targetUser.uid: 0,
      },
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    );

    await newDoc.set({
      'type': 'direct',
      'participants': [currentUser.uid, targetUser.uid],
      'participantNames': {
        currentUser.uid: currentUser.displayName,
        targetUser.uid: targetUser.displayName,
      },
      'participantAvatars': {
        if (currentUser.photoUrl != null) currentUser.uid: currentUser.photoUrl!,
        if (targetUser.photoUrl != null) targetUser.uid: targetUser.photoUrl!,
      },
      'unreadCount': {
        currentUser.uid: 0,
        targetUser.uid: 0,
      },
      'updatedAt': FieldValue.serverTimestamp(),
      'createdAt': FieldValue.serverTimestamp(),
    });

    return newChat;
  }

  /// Find or create the official Support #123 chat
  Future<ChatModel> getOrCreateSupportChat(UserModel currentUser) async {
    final supportId = "support_official_123_${currentUser.uid}";
    final docRef = _firestore.collection('chats').doc(supportId);
    final doc = await docRef.get();

    if (doc.exists) {
      return ChatModel.fromFirestore(doc);
    }

    final welcomeText = EncryptionHelper.encryptMessageText(
      "أهلاً بك في الدعم الفني الرسمي لتطبيق يوسف شات! فريقنا متواجد 24/7 لمساعدتك في أي استفسار."
    );

    final chat = ChatModel(
      id: supportId,
      type: "direct",
      name: "الدعم الفني الرسمي (#123)",
      participants: [currentUser.uid, "support_official_123"],
      participantNames: {
        currentUser.uid: currentUser.displayName,
        "support_official_123": "الدعم الفني الرسمي (#123)",
      },
      isSupport: true,
      lastMessage: {
        'text': welcomeText,
        'senderId': "support_official_123",
        'senderName': "الدعم الفني",
        'createdAt': FieldValue.serverTimestamp(),
        'clientTimestamp': DateTime.now().millisecondsSinceEpoch,
      },
      unreadCount: {
        currentUser.uid: 0,
        "support_official_123": 0,
      },
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    );

    await docRef.set({
      'type': 'direct',
      'isSupport': true,
      'name': 'الدعم الفني الرسمي (#123)',
      'participants': [currentUser.uid, "support_official_123"],
      'participantNames': {
        currentUser.uid: currentUser.displayName,
        "support_official_123": "الدعم الفني الرسمي (#123)",
      },
      'lastMessage': {
        'text': welcomeText,
        'senderId': "support_official_123",
        'senderName': "الدعم الفني",
        'createdAt': FieldValue.serverTimestamp(),
        'clientTimestamp': DateTime.now().millisecondsSinceEpoch,
      },
      'unreadCount': {
        currentUser.uid: 0,
        "support_official_123": 0,
      },
      'updatedAt': FieldValue.serverTimestamp(),
      'createdAt': FieldValue.serverTimestamp(),
    });

    // Also add initial welcome message
    await docRef.collection('messages').add({
      'senderId': 'support_official_123',
      'senderName': 'الدعم الفني الرسمي (#123)',
      'text': welcomeText,
      'messageType': 'text',
      'readBy': [currentUser.uid],
      'createdAt': FieldValue.serverTimestamp(),
      'clientTimestamp': DateTime.now().millisecondsSinceEpoch,
    });

    return chat;
  }

  /// Search user by userCode (exact) or displayName
  Future<List<UserModel>> searchUsers(String query, String currentUid) async {
    final clean = query.trim().replaceAll('#', '');
    if (clean.isEmpty) return [];

    final results = <UserModel>[];

    // Try finding by userCode first
    final codeSnap = await _firestore
        .collection('users')
        .where('userCode', isEqualTo: clean)
        .limit(5)
        .get();

    for (final doc in codeSnap.docs) {
      if (doc.id != currentUid) {
        results.add(UserModel.fromFirestore(doc));
      }
    }

    if (results.isNotEmpty) return results;

    // Search by display name
    final nameSnap = await _firestore
        .collection('users')
        .where('displayName', isGreaterThanOrEqualTo: clean)
        .where('displayName', isLessThanOrEqualTo: '$clean\uf8ff')
        .limit(10)
        .get();

    for (final doc in nameSnap.docs) {
      if (doc.id != currentUid && !results.any((u) => u.uid == doc.id)) {
        results.add(UserModel.fromFirestore(doc));
      }
    }

    return results;
  }

  /// Block / Unblock User
  Future<void> toggleBlockUser(String currentUid, String targetUid, bool block) async {
    await _firestore.collection('users').doc(currentUid).update({
      'blockedUsers': block
          ? FieldValue.arrayUnion([targetUid])
          : FieldValue.arrayRemove([targetUid]),
    });
  }

  /// Stream of active 24h statuses
  Stream<List<StatusModel>> getActiveStatusesStream() {
    final dayAgo = DateTime.now().subtract(const Duration(hours: 24));
    return _firestore
        .collection('statuses')
        .where('createdAt', isGreaterThan: Timestamp.fromDate(dayAgo))
        .snapshots()
        .map((snapshot) {
      final list = snapshot.docs.map((d) => StatusModel.fromFirestore(d)).toList();
      list.sort((a, b) {
        final tA = a.createdAt is Timestamp ? (a.createdAt as Timestamp).millisecondsSinceEpoch : 0;
        final tB = b.createdAt is Timestamp ? (b.createdAt as Timestamp).millisecondsSinceEpoch : 0;
        return tB.compareTo(tA);
      });
      return list;
    });
  }

  /// Publish new status
  Future<void> publishStatus({
    required String userId,
    required String userName,
    String? userAvatar,
    required String type, // "text" | "image"
    String? content,
    String? backgroundColor,
    String? mediaUrl,
  }) async {
    final now = DateTime.now();
    await _firestore.collection('statuses').add({
      'userId': userId,
      'userName': userName,
      if (userAvatar != null) 'userAvatar': userAvatar,
      'type': type,
      if (content != null) 'content': content,
      if (backgroundColor != null) 'backgroundColor': backgroundColor,
      if (mediaUrl != null) 'mediaUrl': mediaUrl,
      'viewers': [],
      'createdAt': FieldValue.serverTimestamp(),
      'expiresAt': Timestamp.fromDate(now.add(const Duration(hours: 24))),
    });
  }

  /// Record status view
  Future<void> recordStatusView({
    required String statusId,
    required String viewerId,
    required String viewerName,
    String? viewerAvatar,
  }) async {
    final docRef = _firestore.collection('statuses').doc(statusId);
    final doc = await docRef.get();
    if (!doc.exists) return;

    final data = doc.data() as Map<String, dynamic>;
    final viewers = List<Map<String, dynamic>>.from(data['viewers'] ?? []);

    if (viewers.any((v) => v['userId'] == viewerId)) return; // Already viewed

    viewers.add({
      'userId': viewerId,
      'userName': viewerName,
      if (viewerAvatar != null) 'userAvatar': viewerAvatar,
      'viewedAt': Timestamp.now(),
    });

    await docRef.update({'viewers': viewers});
  }
}
