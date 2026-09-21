import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'sound_service.dart';

/// Notification Service for incoming messages, calls, and updates
/// Fully handles Android 13+ notification permissions, channels, and heads-up notifications.
class NotificationService {
  NotificationService._();
  static final NotificationService _instance = NotificationService._();
  static NotificationService get instance => _instance;

  final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;
  String? activeChatId;
  final Map<String, StreamSubscription> _chatListeners = {};
  StreamSubscription? _chatsListSub;
  DateTime _serviceStartTime = DateTime.now();

  static const String _messageChannelId = 'whatsapp_messages_channel';
  static const String _messageChannelName = 'رسائل المحادثات';
  static const String _messageChannelDesc = 'إشعارات الرسائل الجديدة الفورية';

  static const String _callChannelId = 'whatsapp_calls_channel';
  static const String _callChannelName = 'المكالمات الواردة';
  static const String _callChannelDesc = 'إشعارات المكالمات الصوتية والمرئية';

  Future<void> initialize() async {
    if (_initialized || kIsWeb) return;
    _initialized = true;

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _notificationsPlugin.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        // Handle notification click
        debugPrint('Notification clicked with payload: ${response.payload}');
      },
    );

    // Request Android 13+ permission
    await _requestPermissions();

    // Create notification channels for Android
    await _createChannels();
  }

  Future<void> _requestPermissions() async {
    if (kIsWeb) return;
    try {
      final androidImplementation = _notificationsPlugin
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>();
      await androidImplementation?.requestNotificationsPermission();
    } catch (e) {
      debugPrint('Error requesting notification permissions: $e');
    }
  }

  Future<void> _createChannels() async {
    if (kIsWeb) return;
    try {
      final androidImplementation = _notificationsPlugin
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>();

      const messageChannel = AndroidNotificationChannel(
        _messageChannelId,
        _messageChannelName,
        description: _messageChannelDesc,
        importance: Importance.high,
        enableVibration: true,
        playSound: true,
      );

      const callChannel = AndroidNotificationChannel(
        _callChannelId,
        _callChannelName,
        description: _callChannelDesc,
        importance: Importance.max,
        enableVibration: true,
        playSound: true,
      );

      await androidImplementation?.createNotificationChannel(messageChannel);
      await androidImplementation?.createNotificationChannel(callChannel);
    } catch (e) {
      debugPrint('Error creating notification channels: $e');
    }
  }

  /// Show incoming message notification
  Future<void> showMessageNotification({
    required int id,
    required String senderName,
    required String messageText,
    String? chatId,
  }) async {
    if (kIsWeb) return;
    try {
      const androidDetails = AndroidNotificationDetails(
        _messageChannelId,
        _messageChannelName,
        channelDescription: _messageChannelDesc,
        importance: Importance.high,
        priority: Priority.high,
        showWhen: true,
        enableVibration: true,
        category: AndroidNotificationCategory.message,
        styleInformation: DefaultStyleInformation(true, true),
      );

      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );

      const notificationDetails = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      await _notificationsPlugin.show(
        id,
        senderName,
        messageText,
        notificationDetails,
        payload: chatId,
      );
    } catch (e) {
      debugPrint('Failed to show message notification: $e');
    }
  }

  /// Show incoming call notification
  Future<void> showCallNotification({
    required int id,
    required String callerName,
    required bool isVideo,
    String? callId,
  }) async {
    if (kIsWeb) return;
    try {
      final callType = isVideo ? 'مكالمة فيديو واردة' : 'مكالمة صوتية واردة';

      const androidDetails = AndroidNotificationDetails(
        _callChannelId,
        _callChannelName,
        channelDescription: _callChannelDesc,
        importance: Importance.max,
        priority: Priority.max,
        fullScreenIntent: true,
        ongoing: true,
        autoCancel: false,
        category: AndroidNotificationCategory.call,
      );

      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );

      const notificationDetails = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      await _notificationsPlugin.show(
        id,
        callType,
        callerName,
        notificationDetails,
        payload: callId,
      );
    } catch (e) {
      debugPrint('Failed to show call notification: $e');
    }
  }

  /// Cancel notification by id
  Future<void> cancel(int id) async {
    if (kIsWeb) return;
    await _notificationsPlugin.cancel(id);
  }

  /// Cancel all notifications
  Future<void> cancelAll() async {
    if (kIsWeb) return;
    await _notificationsPlugin.cancelAll();
  }

  /// Set the currently active open chat screen (avoids duplicate notification when already in chat)
  void setActiveChat(String? chatId) {
    activeChatId = chatId;
  }

  /// Start live real-time listener for incoming messages across all conversations
  void startListeningForUser(String currentUid) {
    if (kIsWeb || currentUid.isEmpty) return;
    _serviceStartTime = DateTime.now();
    stopListening();

    try {
      _chatsListSub = FirebaseFirestore.instance
          .collection('chats')
          .where('participants', arrayContains: currentUid)
          .snapshots()
          .listen((chatsSnap) {
        for (final doc in chatsSnap.docs) {
          final chatId = doc.id;
          if (_chatListeners.containsKey(chatId)) continue;

          // Attach listener for the latest message in this conversation
          _chatListeners[chatId] = FirebaseFirestore.instance
              .collection('chats')
              .doc(chatId)
              .collection('messages')
              .orderBy('timestamp', descending: true)
              .limit(1)
              .snapshots()
              .listen((msgSnap) {
            if (msgSnap.docs.isEmpty) return;
            final msgDoc = msgSnap.docs.first;
            final data = msgDoc.data();
            final senderId = data['senderId']?.toString() ?? '';

            // Ignore messages sent by current user
            if (senderId == currentUid) return;

            // Ignore if user is currently looking at this active chat
            if (chatId == activeChatId) return;

            // Only notify for messages arriving after listener started
            final ts = data['timestamp'];
            DateTime? msgTime;
            if (ts is Timestamp) {
              msgTime = ts.toDate();
            }
            if (msgTime != null && msgTime.isBefore(_serviceStartTime)) {
              return;
            }

            final senderName = data['senderName']?.toString() ?? 'رسالة جديدة';
            String text = data['text']?.toString() ?? '';
            final messageType = data['type']?.toString() ?? 'text';

            if (messageType == 'image') {
              text = '📷 أرسل صورة جديدة';
            } else if (messageType == 'audio') {
              text = '🎤 تسجيل صوتي جديد';
            } else if (messageType == 'video') {
              text = '🎥 مقطع فيديو';
            } else if (messageType == 'call') {
              text = '📞 مكالمة واردة';
            } else if (text.startsWith('🔒#YF:')) {
              text = '🔒 رسالة مشفرة جديدة';
            }

            // Fire high-priority Heads-up Notification
            showMessageNotification(
              id: msgDoc.id.hashCode,
              senderName: senderName,
              messageText: text,
              chatId: chatId,
            );

            // Play incoming sound
            SoundService.instance.playMessageReceived();
          }, onError: (err) {
            debugPrint('Error in chat message listener: $err');
          });
        }
      }, onError: (err) {
        debugPrint('Error in chats list listener: $err');
      });
    } catch (e) {
      debugPrint('Failed to initialize startListeningForUser: $e');
    }
  }

  /// Stop and clean up listeners
  void stopListening() {
    _chatsListSub?.cancel();
    _chatsListSub = null;
    for (final sub in _chatListeners.values) {
      sub.cancel();
    }
    _chatListeners.clear();
  }
}
