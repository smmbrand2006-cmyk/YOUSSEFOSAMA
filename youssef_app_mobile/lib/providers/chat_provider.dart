import 'dart:async';
import 'package:flutter/foundation.dart';
import '../data/models/chat_model.dart';
import '../data/models/message_model.dart';
import '../data/models/user_model.dart';
import '../data/services/firestore_service.dart';
import '../data/services/realtime_service.dart';

class ChatProvider extends ChangeNotifier {
  final FirestoreService _firestoreService = FirestoreService();
  final RealtimeService _realtimeService = RealtimeService();

  List<ChatModel> _chats = [];
  bool _isLoadingChats = true;
  StreamSubscription<List<ChatModel>>? _chatsSub;

  List<ChatModel> get chats => _chats;
  bool get isLoadingChats => _isLoadingChats;

  void initChats(String currentUid) {
    _chatsSub?.cancel();
    _isLoadingChats = true;
    notifyListeners();

    _chatsSub = _firestoreService.getChatsStream(currentUid).listen((list) {
      _chats = list;
      _isLoadingChats = false;
      notifyListeners();
    }, onError: (e) {
      _isLoadingChats = false;
      notifyListeners();
    });
  }

  Stream<List<MessageModel>> getMessagesStream(String chatId) {
    return _firestoreService.getMessagesStream(chatId);
  }

  Future<void> sendMessage({
    required String chatId,
    required UserModel currentUser,
    required String text,
    String? mediaUrl,
    String messageType = "text",
    required List<String> participants,
  }) async {
    await _firestoreService.sendMessage(
      chatId: chatId,
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      text: text,
      mediaUrl: mediaUrl,
      messageType: messageType,
      participants: participants,
    );
  }

  Future<void> markAsRead(String chatId, String userId) async {
    await _firestoreService.markChatAsRead(chatId, userId);
  }

  void setTyping({required String chatId, required String uid, required bool isTyping}) {
    _realtimeService.setTyping(chatId: chatId, uid: uid, isTyping: isTyping);
  }

  Stream<bool> getTypingStream(String chatId, String currentUid) {
    return _realtimeService.getTypingStream(chatId: chatId, currentUid: currentUid);
  }

  Stream<Map<String, dynamic>> getUserPresence(String uid) {
    return _realtimeService.getUserPresenceStream(uid);
  }

  Future<ChatModel> getOrCreateDirectChat(UserModel currentUser, UserModel targetUser) async {
    return await _firestoreService.getOrCreateDirectChat(
      currentUser: currentUser,
      targetUser: targetUser,
    );
  }

  Future<ChatModel> getOrCreateSupportChat(UserModel currentUser) async {
    return await _firestoreService.getOrCreateSupportChat(currentUser);
  }

  Future<List<UserModel>> searchUsers(String query, String currentUid) async {
    return await _firestoreService.searchUsers(query, currentUid);
  }

  @override
  void dispose() {
    _chatsSub?.cancel();
    super.dispose();
  }
}
