import 'dart:async';
import 'package:firebase_database/firebase_database.dart';

class RealtimeService {
  final FirebaseDatabase _rtdb = FirebaseDatabase.instance;
  Timer? _typingTimer;

  /// Setup presence for logged in user with automatic onDisconnect
  void setupPresence(String uid) {
    try {
      final statusRef = _rtdb.ref('status/$uid');
      final connectedRef = _rtdb.ref('.info/connected');

      connectedRef.onValue.listen((event) {
        final isConnected = event.snapshot.value == true;
        if (isConnected) {
          // Set offline on disconnect
          statusRef.onDisconnect().set({
            'isOnline': false,
            'lastSeen': ServerValue.timestamp,
          }).catchError((_) {});

          // Set online now
          statusRef.set({
            'isOnline': true,
            'lastSeen': ServerValue.timestamp,
          }).catchError((_) {});
        }
      }, onError: (_) {});
    } catch (_) {}
  }

  /// Mark offline on logout
  Future<void> setOffline(String uid) async {
    try {
      await _rtdb.ref('status/$uid').set({
        'isOnline': false,
        'lastSeen': ServerValue.timestamp,
      }).catchError((_) {});
    } catch (_) {}
  }

  /// Stream of a user's presence
  Stream<Map<String, dynamic>> getUserPresenceStream(String uid) {
    try {
      return _rtdb.ref('status/$uid').onValue.map((event) {
        if (!event.snapshot.exists) {
          return {'isOnline': false, 'lastSeen': null};
        }
        final data = Map<String, dynamic>.from(event.snapshot.value as Map);
        return {
          'isOnline': data['isOnline'] == true,
          'lastSeen': data['lastSeen'],
        };
      }).handleError((_) => {'isOnline': false, 'lastSeen': null});
    } catch (_) {
      return Stream.value({'isOnline': false, 'lastSeen': null});
    }
  }

  /// Set typing status in a chat (auto cancels after 2.5 seconds)
  void setTyping({required String chatId, required String uid, required bool isTyping}) {
    try {
      final ref = _rtdb.ref('typing/$chatId/$uid');
      _typingTimer?.cancel();

      if (isTyping) {
        ref.set(true).catchError((_) {});
        ref.onDisconnect().remove().catchError((_) {});

        _typingTimer = Timer(const Duration(milliseconds: 2500), () {
          ref.remove().catchError((_) {});
        });
      } else {
        ref.remove().catchError((_) {});
      }
    } catch (_) {}
  }

  /// Stream of who is typing in a chat (excluding current user)
  Stream<bool> getTypingStream({required String chatId, required String currentUid}) {
    try {
      return _rtdb.ref('typing/$chatId').onValue.map((event) {
        if (!event.snapshot.exists) return false;
        final map = event.snapshot.value as Map?;
        if (map == null) return false;
        return map.keys.any((key) => key.toString() != currentUid && map[key] == true);
      }).handleError((_) => false);
    } catch (_) {
      return Stream.value(false);
    }
  }
}
