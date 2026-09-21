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

  /// Stream of messages for a chat (optionally filter out deleted for user)
  Stream<List<MessageModel>> getMessagesStream(String chatId, [String? currentUserId]) {
    return _firestore
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .snapshots()
        .map((snapshot) {
      final list = snapshot.docs.map((doc) => MessageModel.fromFirestore(doc)).toList();
      // Robust chronological sort: use clientTimestamp (always non-null immediately) or createdAt
      list.sort((a, b) {
        final timeA = a.clientTimestamp ??
            (a.createdAt is Timestamp
                ? (a.createdAt as Timestamp).millisecondsSinceEpoch
                : 0);
        final timeB = b.clientTimestamp ??
            (b.createdAt is Timestamp
                ? (b.createdAt as Timestamp).millisecondsSinceEpoch
                : 0);
        return timeA.compareTo(timeB);
      });
      if (currentUserId != null) {
        return list.where((m) => !m.isDeletedForUser(currentUserId)).toList();
      }
      return list;
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
    Map<String, dynamic>? replyTo,
  }) async {
    final encryptedText = EncryptionHelper.encryptMessageText(text);
    final nowMs = DateTime.now().millisecondsSinceEpoch;

    final messageData = {
      'senderId': senderId,
      'senderName': senderName,
      'text': encryptedText,
      if (mediaUrl != null) 'mediaUrl': mediaUrl,
      'type': messageType,
      'messageType': messageType,
      'readBy': [senderId],
      'reactions': {},
      'isEdited': false,
      'isDeleted': false,
      'deletedFor': [],
      'starredBy': [],
      'isPinned': false,
      if (replyTo != null) 'replyTo': replyTo,
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
        'type': messageType,
        'createdAt': FieldValue.serverTimestamp(),
        'clientTimestamp': nowMs,
      },
      'updatedAt': FieldValue.serverTimestamp(),
      ...unreadUpdates,
    });

    await batch.commit();
  }

  /// Delete message for everyone (only sender can do this)
  Future<void> deleteMessageForEveryone(String chatId, String messageId) async {
    try {
      await _firestore
          .collection('chats')
          .doc(chatId)
          .collection('messages')
          .doc(messageId)
          .update({
        'isDeleted': true,
        'text': EncryptionHelper.encryptMessageText('🚫 تم حذف هذه الرسالة'),
        'deletedAt': FieldValue.serverTimestamp(),
      });
    } catch (_) {}
  }

  /// Delete message for me only (adds userId to deletedFor)
  Future<void> deleteMessageForMe(String chatId, String messageId, String userId) async {
    try {
      await _firestore
          .collection('chats')
          .doc(chatId)
          .collection('messages')
          .doc(messageId)
          .update({
        'deletedFor': FieldValue.arrayUnion([userId]),
      });
    } catch (_) {}
  }

  /// Toggle star on a message
  Future<void> toggleStarMessage(String chatId, String messageId, String userId, bool isStarred) async {
    try {
      await _firestore
          .collection('chats')
          .doc(chatId)
          .collection('messages')
          .doc(messageId)
          .update({
        'starredBy': isStarred ? FieldValue.arrayRemove([userId]) : FieldValue.arrayUnion([userId]),
      });
    } catch (_) {}
  }

  /// Toggle pin message in chat
  Future<void> togglePinMessage(String chatId, String messageId, bool isPinned, {String? previewText}) async {
    try {
      final msgRef = _firestore.collection('chats').doc(chatId).collection('messages').doc(messageId);
      final chatRef = _firestore.collection('chats').doc(chatId);
      final batch = _firestore.batch();
      batch.update(msgRef, {'isPinned': !isPinned});
      batch.update(chatRef, {
        'pinnedMessage': !isPinned ? {'id': messageId, 'text': previewText ?? ''} : FieldValue.delete(),
      });
      await batch.commit();
    } catch (_) {}
  }

  /// Mark chat as read for user
  Future<void> markChatAsRead(String chatId, String userId) async {
    try {
      await _firestore.collection('chats').doc(chatId).update({
        'unreadCount.$userId': 0,
        'lastRead.$userId': FieldValue.serverTimestamp(),  // ✅ Website uses lastRead
      });
    } catch (_) {}
  }

  /// Find or create a direct 1:1 chat between two users
  /// ✅ FIXED: now includes all fields the website expects (isPinned, isArchived, isMuted, lastRead)
  Future<ChatModel> getOrCreateDirectChat({
    required UserModel currentUser,
    required UserModel targetUser,
  }) async {
    // If target is support user (#123), route to support chat
    if (targetUser.userCode == "123") {
      return getOrCreateSupportChat(currentUser);
    }

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

    // Create new direct chat with ALL fields for website compatibility
    final newDoc = _firestore.collection('chats').doc();
    final chatData = {
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
      // ✅ Website compatibility fields
      'lastRead': {
        currentUser.uid: FieldValue.serverTimestamp(),
        targetUser.uid: FieldValue.serverTimestamp(),
      },
      'isPinned': {},
      'isArchived': {},
      'isMuted': {},
      'updatedAt': FieldValue.serverTimestamp(),
      'createdAt': FieldValue.serverTimestamp(),
    };

    await newDoc.set(chatData);

    return ChatModel(
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
  }

  /// ✅ FIXED: Find or create the official Support #123 chat
  /// Dynamically resolves the real support user with userCode == '123' (matches Next.js website)
  Future<ChatModel> getOrCreateSupportChat(UserModel currentUser) async {
    const String supportCode = "123";
    const String defaultSupportName = "الدعم الفني (123) 🎧";

    // 1. Find support user by userCode == '123' (matches Next.js openOrCreateSupportChat)
    String supportUid = "support_official_123";
    String supportName = defaultSupportName;

    final supportQuery = await _firestore
        .collection('users')
        .where('userCode', isEqualTo: supportCode)
        .limit(1)
        .get();

    if (supportQuery.docs.isNotEmpty) {
      final doc = supportQuery.docs.first;
      supportUid = doc.id;
      final data = doc.data();
      supportName = (data['displayName'] as String?)?.isNotEmpty == true
          ? data['displayName']
          : defaultSupportName;
    } else {
      // Fallback create placeholder if no user has code 123
      final supportDocRef = _firestore.collection('users').doc(supportUid);
      final supportDoc = await supportDocRef.get();
      if (!supportDoc.exists) {
        await supportDocRef.set({
          'uid': supportUid,
          'userCode': supportCode,
          'displayName': defaultSupportName,
          'bio': 'فريق الدعم الفني والمساعدة الرسمي',
          'createdAt': FieldValue.serverTimestamp(),
          'lastSeen': FieldValue.serverTimestamp(),
          'isOnline': true,
          'contacts': [],
          'blockedUsers': [],
        });
      }
    }

    // 2. Search for existing direct chat with support
    final chatsQuery = await _firestore
        .collection('chats')
        .where('participants', arrayContains: currentUser.uid)
        .get();

    for (final doc in chatsQuery.docs) {
      final data = doc.data();
      final participants = List<String>.from(data['participants'] ?? []);
      final chatType = data['type'] ?? 'direct';
      // Matches either real supportUid or placeholder support_official_123
      if (chatType == 'direct' && (participants.contains(supportUid) || participants.contains("support_official_123"))) {
        return ChatModel.fromFirestore(doc);
      }
    }

    // 3. Create new support chat with addDoc (auto-generated ID, same as website)
    final welcomeText = EncryptionHelper.encryptMessageText(
      "مرحباً بك في الدعم الفني! كيف يمكننا مساعدتك اليوم؟ 🎧",
    );

    final chatRef = await _firestore.collection('chats').add({
      'type': 'direct',
      'participants': [currentUser.uid, supportUid],
      'participantNames': {
        currentUser.uid: currentUser.displayName,
        supportUid: supportName,
      },
      'lastMessage': {
        'text': welcomeText,
        'senderId': supportUid,
        'type': 'text',
        'createdAt': FieldValue.serverTimestamp(),
        'clientTimestamp': DateTime.now().millisecondsSinceEpoch,
      },
      'lastRead': {
        currentUser.uid: FieldValue.serverTimestamp(),
        supportUid: FieldValue.serverTimestamp(),
      },
      'isPinned': {
        currentUser.uid: true,
      },
      'isArchived': {},
      'isMuted': {},
      'unreadCount': {
        currentUser.uid: 1,
        supportUid: 0,
      },
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });

    // 4. Add initial welcome message
    await chatRef.collection('messages').add({
      'senderId': supportUid,
      'senderName': supportName,
      'text': EncryptionHelper.encryptMessageText(
        "أهلاً بك في الدعم الفني الرسمي! تفضل بكتابة استفسارك أو مشكلتك وسنقوم بالرد عليك في أقرب وقت. 🎧💬",
      ),
      'type': 'text',
      'messageType': 'text',
      'reactions': {},
      'isEdited': false,
      'isDeleted': false,
      'deletedFor': [],
      'clientTimestamp': DateTime.now().millisecondsSinceEpoch,
      'createdAt': FieldValue.serverTimestamp(),
    });

    final newDoc = await chatRef.get();
    return ChatModel.fromFirestore(newDoc);
  }

  /// Search user by userCode, phone number, or displayName
  /// Prioritizes exact matches and requires at least 2-3 characters to avoid dumping users
  Future<List<UserModel>> searchUsers(String query, String currentUid) async {
    final clean = query.trim().replaceAll('#', '');
    if (clean.length < 2) return [];

    final resultsMap = <String, UserModel>{};

    // 1. Exact match by userCode (phone / account code)
    final codeSnap = await _firestore
        .collection('users')
        .where('userCode', isEqualTo: clean)
        .limit(5)
        .get();

    for (final doc in codeSnap.docs) {
      if (doc.id != currentUid) {
        resultsMap[doc.id] = UserModel.fromFirestore(doc);
      }
    }

    // 2. Exact match by displayName
    final nameSnap = await _firestore
        .collection('users')
        .where('displayName', isEqualTo: query.trim())
        .limit(5)
        .get();

    for (final doc in nameSnap.docs) {
      if (doc.id != currentUid) {
        resultsMap[doc.id] = UserModel.fromFirestore(doc);
      }
    }

    // If exact match found, return immediately without broad scanning
    if (resultsMap.isNotEmpty) {
      return resultsMap.values.toList();
    }

    // 3. Substring matching only when search is at least 3 characters
    if (clean.length >= 3) {
      final allSnap = await _firestore
          .collection('users')
          .limit(80)
          .get();

      final lower = clean.toLowerCase();
      for (final doc in allSnap.docs) {
        if (doc.id == currentUid) continue;
        final u = UserModel.fromFirestore(doc);
        final nameLower = u.displayName.toLowerCase();
        final codeLower = u.userCode.toLowerCase();
        if (codeLower == lower || nameLower == lower || nameLower.startsWith(lower) || nameLower.contains(lower)) {
          resultsMap[doc.id] = u;
        }
      }
    }

    return resultsMap.values.toList();
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
