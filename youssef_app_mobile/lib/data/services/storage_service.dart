import 'dart:convert';
import 'dart:ui' as ui;
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';

class StorageService {
  final FirebaseStorage _storage = FirebaseStorage.instance;
  final ImagePicker _picker = ImagePicker();

  /// Pick image from camera or gallery using cross-platform XFile
  Future<XFile?> pickImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 70,
      );
      return picked;
    } catch (_) {
      // Fallback to gallery on web/desktop if camera is unavailable
      if (source == ImageSource.camera) {
        try {
          return await _picker.pickImage(source: ImageSource.gallery);
        } catch (_) {}
      }
      return null;
    }
  }

  /// Pick avatar image (compact dimensions to keep Base64 safe & fast on web/mobile)
  Future<XFile?> pickAvatarImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(
        source: source,
        maxWidth: 256,
        maxHeight: 256,
        imageQuality: 50,
      );
      return picked;
    } catch (_) {
      if (source == ImageSource.camera) {
        try {
          return await _picker.pickImage(
            source: ImageSource.gallery,
            maxWidth: 256,
            maxHeight: 256,
            imageQuality: 50,
          );
        } catch (_) {}
      }
      return null;
    }
  }

  /// Downscale and compress image bytes to ultra-compact size (<30KB) using Flutter's native engine
  Future<Uint8List> compressAvatarBytes(Uint8List inputBytes, {int targetWidth = 220}) async {
    try {
      final codec = await ui.instantiateImageCodec(
        inputBytes,
        targetWidth: targetWidth,
      );
      final frame = await codec.getNextFrame();
      final byteData = await frame.image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        return byteData.buffer.asUint8List();
      }
    } catch (e) {
      debugPrint("Avatar compression note: $e");
    }
    return inputBytes;
  }

  /// Convert XFile to Base64 data URL for instant delivery (Web & Mobile safe)
  Future<String> fileToBase64DataUrl(XFile file, {bool isAvatar = false}) async {
    Uint8List bytes = await file.readAsBytes();
    if (isAvatar || bytes.length > 150 * 1024) {
      bytes = await compressAvatarBytes(bytes, targetWidth: isAvatar ? 220 : 600);
    }
    final base64String = base64Encode(bytes);
    return 'data:image/png;base64,$base64String';
  }

  /// Upload file to Firebase Storage (works across all platforms)
  Future<String> uploadChatMedia({
    required String chatId,
    required XFile file,
    required String extension,
  }) async {
    final fileName = "${DateTime.now().millisecondsSinceEpoch}_${file.name}";
    final ref = _storage.ref().child('chats').child(chatId).child(fileName);
    final bytes = await file.readAsBytes();
    final task = await ref.putData(bytes);
    return await task.ref.getDownloadURL();
  }

  /// Upload user profile avatar to Storage path matching security rules
  Future<String> uploadProfileAvatar({
    required String uid,
    required XFile file,
  }) async {
    final ref = _storage.ref().child('profiles').child(uid).child('avatar.jpg');
    final bytes = await file.readAsBytes();
    final metadata = SettableMetadata(contentType: 'image/jpeg');
    final task = await ref.putData(bytes, metadata);
    return await task.ref.getDownloadURL();
  }
}
