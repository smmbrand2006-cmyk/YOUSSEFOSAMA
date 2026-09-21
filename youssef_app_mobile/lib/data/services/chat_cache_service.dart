import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/message_model.dart';

class ChatCacheService {
  static final ChatCacheService instance = ChatCacheService._internal();
  ChatCacheService._internal();

  final Map<String, List<MessageModel>> _memoryMessages = {};
  SharedPreferences? _prefs;
  bool _isInitialized = false;

  /// Initialize local storage cache
  Future<void> init() async {
    if (_isInitialized) return;
    try {
      _prefs = await SharedPreferences.getInstance();
      _isInitialized = true;
    } catch (_) {}
  }

  /// Get cached messages synchronously for 0ms loading
  List<MessageModel> getCachedMessages(String chatId) {
    if (_memoryMessages.containsKey(chatId)) {
      return List.from(_memoryMessages[chatId]!);
    }

    // Attempt to load from disk if memory is empty
    if (_prefs != null) {
      final rawJson = _prefs!.getString('chat_cache_$chatId');
      if (rawJson != null && rawJson.isNotEmpty) {
        try {
          final List<dynamic> decoded = jsonDecode(rawJson);
          final list = decoded.map((item) => MessageModel.fromJson(Map<String, dynamic>.from(item))).toList();
          _memoryMessages[chatId] = list;
          return List.from(list);
        } catch (_) {}
      }
    }

    return [];
  }

  /// Cache messages to memory and persist up to 100 recent messages to disk
  Future<void> cacheMessages(String chatId, List<MessageModel> messages) async {
    _memoryMessages[chatId] = List.from(messages);

    if (_prefs == null) {
      await init();
    }

    if (_prefs != null) {
      try {
        // Keep the latest 100 messages for fast disk I/O
        final toSave = messages.length > 100 ? messages.sublist(messages.length - 100) : messages;
        final jsonList = toSave.map((m) => m.toJson()).toList();
        await _prefs!.setString('chat_cache_$chatId', jsonEncode(jsonList));
      } catch (_) {}
    }
  }

  /// Add an optimistic message locally before server confirmation
  void addOptimisticMessage(String chatId, MessageModel message) {
    final current = _memoryMessages[chatId] ?? [];
    if (!current.any((m) => m.id == message.id)) {
      current.add(message);
      _memoryMessages[chatId] = current;
    }
  }

  /// Clear cache for a chat
  Future<void> clearChatCache(String chatId) async {
    _memoryMessages.remove(chatId);
    if (_prefs != null) {
      await _prefs!.remove('chat_cache_$chatId');
    }
  }
}
