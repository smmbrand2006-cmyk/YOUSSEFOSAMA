import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Notification Service for incoming messages, calls, and updates
/// Fully handles Android 13+ notification permissions, channels, and heads-up notifications.
class NotificationService {
  NotificationService._();
  static final NotificationService _instance = NotificationService._();
  static NotificationService get instance => _instance;

  final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;

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
}
