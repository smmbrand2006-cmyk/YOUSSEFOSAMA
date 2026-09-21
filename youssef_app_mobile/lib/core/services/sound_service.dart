import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/services.dart';

/// Professional sound service for WhatsApp-like sounds
/// Handles message sounds, call ringtones, and notifications
class SoundService {
  SoundService._();
  static final SoundService _instance = SoundService._();
  static SoundService get instance => _instance;

  final AudioPlayer _messageSentPlayer = AudioPlayer();
  final AudioPlayer _messageReceivedPlayer = AudioPlayer();
  final AudioPlayer _callRingtonePlayer = AudioPlayer();
  final AudioPlayer _notificationPlayer = AudioPlayer();

  bool _initialized = false;
  bool _soundEnabled = true;

  bool get soundEnabled => _soundEnabled;

  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;

    // Pre-configure players for low latency
    await _messageSentPlayer.setReleaseMode(ReleaseMode.stop);
    await _messageReceivedPlayer.setReleaseMode(ReleaseMode.stop);
    await _callRingtonePlayer.setReleaseMode(ReleaseMode.loop);
    await _notificationPlayer.setReleaseMode(ReleaseMode.stop);

    // Set volumes
    await _messageSentPlayer.setVolume(0.5);
    await _messageReceivedPlayer.setVolume(0.7);
    await _callRingtonePlayer.setVolume(1.0);
    await _notificationPlayer.setVolume(0.8);
  }

  void toggleSound(bool enabled) {
    _soundEnabled = enabled;
  }

  /// Play message sent sound (short pop)
  Future<void> playMessageSent() async {
    if (!_soundEnabled) return;
    try {
      // Use system sound as a clean pop sound
      await HapticFeedback.lightImpact();
      await _messageSentPlayer.play(
        AssetSource('sounds/message_sent.wav'),
        volume: 0.5,
      );
    } catch (_) {
      // Fallback: just haptic
      await HapticFeedback.lightImpact();
    }
  }

  /// Play message received sound (WhatsApp-style notification ding)
  Future<void> playMessageReceived() async {
    if (!_soundEnabled) return;
    try {
      await _messageReceivedPlayer.play(
        AssetSource('sounds/message_received.wav'),
        volume: 0.7,
      );
    } catch (_) {
      await HapticFeedback.mediumImpact();
    }
  }

  /// Play voice call ringtone (classic phone ring)
  Future<void> playVoiceCallRingtone() async {
    if (!_soundEnabled) return;
    try {
      await _callRingtonePlayer.setReleaseMode(ReleaseMode.loop);
      await _callRingtonePlayer.play(
        AssetSource('sounds/voice_call_ringtone.wav'),
        volume: 1.0,
      );
    } catch (_) {}
  }

  /// Play video call ringtone (different from voice call)
  Future<void> playVideoCallRingtone() async {
    if (!_soundEnabled) return;
    try {
      await _callRingtonePlayer.setReleaseMode(ReleaseMode.loop);
      await _callRingtonePlayer.play(
        AssetSource('sounds/video_call_ringtone.wav'),
        volume: 1.0,
      );
    } catch (_) {}
  }

  /// Play notification sound
  Future<void> playNotification() async {
    if (!_soundEnabled) return;
    try {
      await _notificationPlayer.play(
        AssetSource('sounds/notification.wav'),
        volume: 0.8,
      );
    } catch (_) {}
  }

  /// Stop call ringtone
  Future<void> stopCallRingtone() async {
    await _callRingtonePlayer.stop();
  }

  /// Dispose all players
  Future<void> dispose() async {
    await _messageSentPlayer.dispose();
    await _messageReceivedPlayer.dispose();
    await _callRingtonePlayer.dispose();
    await _notificationPlayer.dispose();
  }
}
