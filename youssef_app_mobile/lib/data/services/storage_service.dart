import 'dart:convert';
import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:image_picker/image_picker.dart';

class StorageService {
  final FirebaseStorage _storage = FirebaseStorage.instance;
  final ImagePicker _picker = ImagePicker();

  /// Pick image from camera or gallery
  Future<File?> pickImage(ImageSource source) async {
    final picked = await _picker.pickImage(
      source: source,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 70,
    );
    if (picked == null) return null;
    return File(picked.path);
  }

  /// Convert file to Base64 data URL for ultra-fast instant delivery
  Future<String> fileToBase64DataUrl(File file) async {
    final bytes = await file.readAsBytes();
    final base64String = base64Encode(bytes);
    return 'data:image/jpeg;base64,$base64String';
  }

  /// Upload file to Firebase Storage
  Future<String> uploadChatMedia({
    required String chatId,
    required File file,
    required String extension,
  }) async {
    final fileName = "${DateTime.now().millisecondsSinceEpoch}_${file.path.split('/').last}";
    final ref = _storage.ref().child('chats').child(chatId).child(fileName);
    final task = await ref.putFile(file);
    return await task.ref.getDownloadURL();
  }

  /// Upload user profile avatar
  Future<String> uploadProfileAvatar({
    required String uid,
    required File file,
  }) async {
    final ref = _storage.ref().child('avatars').child('$uid.jpg');
    final task = await ref.putFile(file);
    return await task.ref.getDownloadURL();
  }
}
