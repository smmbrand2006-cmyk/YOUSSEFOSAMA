import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

/// YOUSSEF APP - End-to-End Dynamic Daily Encryption & Archiving Engine (ARC3)
/// Ported to Dart for 100% interoperability with Next.js web application.
class EncryptionHelper {
  EncryptionHelper._();

  static const String _masterSeed = "YOUSSEF_APP_ULTRA_SECURE_CIPHER_KEY_2026_CMYK_ARCHIVE_SEC";
  static const String arc3Prefix = "ARC3\$";
  static const String legacyPrefix = "🔒#YF:";
  static final int _baseEpochMs = DateTime.utc(2025, 1, 1).millisecondsSinceEpoch;
  static const int _dayMs = 86400000;

  static int _imul(int a, int b) {
    int ah = (a >> 16) & 0xffff;
    int al = a & 0xffff;
    int bh = (b >> 16) & 0xffff;
    int bl = b & 0xffff;
    return ((al * bl) + (((ah * bl + al * bh) << 16) & 0xffffffff)) & 0xffffffff;
  }

  static int getDayEpochIndex([DateTime? date]) {
    final now = (date ?? DateTime.now()).toUtc().millisecondsSinceEpoch;
    return max(0, (now - _baseEpochMs) ~/ _dayMs);
  }

  static _DayKey _deriveDayKey(int dayIndex) {
    final seedString = "$dayIndex:$_masterSeed:DAY_${dayIndex * 31}";
    int h1 = (0x811c9dc5 ^ (dayIndex * 0x01000193)) & 0xffffffff;
    int h2 = (0x9e3779b9 ^ (dayIndex * 0x85ebca6b)) & 0xffffffff;
    int h3 = (0xc2b2ae35 ^ (dayIndex * 0x27d4eb2f)) & 0xffffffff;

    for (int i = 0; i < seedString.length; i++) {
      final ch = seedString.codeUnitAt(i);
      h1 = _imul(h1 ^ ch, 16777619) & 0xffffffff;
      h2 = _imul(h2 ^ (ch << 3), 2246822507) & 0xffffffff;
      h3 = _imul(h3 ^ (ch >> 2), 3266489909) & 0xffffffff;
    }

    // 256-byte keystream
    final keystream = Uint8List(256);
    int state = (h1 ^ h2 ^ h3) & 0xffffffff;
    for (int i = 0; i < 256; i++) {
      state = (_imul(state, 1103515245) + 12345) & 0x7fffffff;
      keystream[i] = (state >> 16) & 0xff;
    }

    // Dynamic S-Box (Fisher-Yates)
    final sBox = Uint8List(256);
    for (int i = 0; i < 256; i++) {
      sBox[i] = i;
    }
    int sState = (h2 ^ (h3 << 5)) & 0xffffffff;
    for (int i = 255; i > 0; i--) {
      sState = (_imul(sState, 1664525) + 1013904223) & 0xffffffff;
      final j = (sState >> 16) % (i + 1);
      final tmp = sBox[i];
      sBox[i] = sBox[j];
      sBox[j] = tmp;
    }

    final invSBox = Uint8List(256);
    for (int i = 0; i < 256; i++) {
      invSBox[sBox[i]] = i;
    }

    return _DayKey(keystream: keystream, sBox: sBox, invSBox: invSBox);
  }

  static int _computeMac(Uint8List bytes, int dayIndex) {
    int a = (dayIndex & 0xff) ^ 0x5a;
    int b = ((dayIndex >> 8) & 0xff) ^ 0xa5;
    for (int i = 0; i < bytes.length; i++) {
      a = (a + bytes[i]) & 0xff;
      b = (b + a + (i & 0x0f)) & 0xff;
    }
    return ((b << 8) | a) & 0xffff;
  }

  static Uint8List _generateRandomIV() {
    final rnd = Random.secure();
    final iv = Uint8List(4);
    for (int i = 0; i < 4; i++) {
      iv[i] = rnd.nextInt(256);
    }
    return iv;
  }

  /// Encrypt a plain text string into ARC3 daily-rotating ciphertext
  static String encryptMessageText(String plainText) {
    if (plainText.isEmpty) return "";
    if (plainText.startsWith(arc3Prefix) || plainText.startsWith(legacyPrefix)) {
      return plainText;
    }

    final dayIndex = getDayEpochIndex();
    final key = _deriveDayKey(dayIndex);
    final iv = _generateRandomIV();

    final utf8Bytes = Uint8List.fromList(utf8.encode(plainText));
    final encryptedBytes = Uint8List(utf8Bytes.length);

    for (int i = 0; i < utf8Bytes.length; i++) {
      final rawByte = utf8Bytes[i];
      final keyByte = key.keystream[(i + iv[i % 4]) % 256];
      final x1 = rawByte ^ keyByte;
      final s1 = key.sBox[x1];
      final enc = (s1 + iv[(i + 1) % 4] + (i * 3)) & 0xff;
      encryptedBytes[i] = enc;
    }

    final mac = _computeMac(encryptedBytes, dayIndex);

    final dayHex = dayIndex.toRadixString(16).padLeft(4, "0");
    final ivHex = iv.map((b) => b.toRadixString(16).padLeft(2, "0")).join("");
    final cipherHex = encryptedBytes.map((b) => b.toRadixString(16).padLeft(2, "0")).join("");
    final macHex = mac.toRadixString(16).padLeft(4, "0");

    return "$arc3Prefix$dayHex\$$ivHex\$$cipherHex\$$macHex";
  }

  /// Decrypt ARC3 or Legacy ciphertext back into plain text
  static String decryptMessageText(String cipherText) {
    if (cipherText.isEmpty) return "";
    if (!cipherText.startsWith(arc3Prefix) && !cipherText.startsWith(legacyPrefix)) {
      return cipherText;
    }

    // Handle ARC3
    if (cipherText.startsWith(arc3Prefix)) {
      try {
        final raw = cipherText.substring(arc3Prefix.length);
        final parts = raw.split("\$");
        if (parts.length < 4) return cipherText;

        final dayIndex = int.tryParse(parts[0], radix: 16);
        if (dayIndex == null) return cipherText;

        final key = _deriveDayKey(dayIndex);

        // Parse IV
        final ivHex = parts[1];
        final iv = Uint8List(4);
        for (int i = 0; i < 4; i++) {
          iv[i] = int.parse(ivHex.substring(i * 2, i * 2 + 2), radix: 16);
        }

        // Parse Cipher
        final cipherHex = parts[2];
        final byteLen = cipherHex.length ~/ 2;
        final cipherBytes = Uint8List(byteLen);
        for (int i = 0; i < byteLen; i++) {
          cipherBytes[i] = int.parse(cipherHex.substring(i * 2, i * 2 + 2), radix: 16);
        }

        // Decrypt
        final decryptedBytes = Uint8List(byteLen);
        for (int i = 0; i < byteLen; i++) {
          final encByte = cipherBytes[i];
          final s1 = (encByte - iv[(i + 1) % 4] - (i * 3)) & 0xff;
          final x1 = key.invSBox[s1];
          final keyByte = key.keystream[(i + iv[i % 4]) % 256];
          decryptedBytes[i] = x1 ^ keyByte;
        }

        return utf8.decode(decryptedBytes, allowMalformed: true);
      } catch (e) {
        return cipherText;
      }
    }

    // Handle Legacy 🔒#YF:
    if (cipherText.startsWith(legacyPrefix)) {
      try {
        final body = cipherText.substring(legacyPrefix.length);
        final parts = body.split(":");
        if (parts.length < 2) return cipherText;

        final dayStamp = parts[0];
        final hex = parts[1];
        if (hex.length < 4 || hex.length % 2 != 0) return cipherText;

        final combined = "$dayStamp:YOUSSEF_APP_ULTRA_SECURE_CIPHER_KEY_2026_CMYK:$dayStamp";
        final legacyKeyBytes = <int>[];
        int h1 = 0xdeadbeef;
        int h2 = 0x41c64e6d;
        for (int i = 0; i < combined.length; i++) {
          final ch = combined.codeUnitAt(i);
          h1 = _imul(h1 ^ ch, 2654435761);
          h2 = _imul(h2 ^ ch, 1597334677);
        }
        h1 = (_imul(h1 ^ (h1 >> 16), 2246822507) ^ _imul(h2 ^ (h2 >> 13), 3266489909)) & 0xffffffff;
        h2 = (_imul(h2 ^ (h2 >> 16), 2246822507) ^ _imul(h1 ^ (h1 >> 13), 3266489909)) & 0xffffffff;
        int state = (h1 ^ h2).abs() & 0x7fffffff;
        for (int i = 0; i < 64; i++) {
          state = (_imul(state, 1103515245) + 12345) & 0x7fffffff;
          legacyKeyBytes.add(state % 256);
        }

        final allBytes = <int>[];
        for (int i = 0; i < hex.length; i += 2) {
          allBytes.add(int.parse(hex.substring(i, i + 2), radix: 16));
        }

        final iv1 = allBytes[0];
        final iv2 = allBytes[1];
        final payloadBytes = allBytes.sublist(2);
        final decrypted = Uint8List(payloadBytes.length);

        for (int i = 0; i < payloadBytes.length; i++) {
          final encByte = payloadBytes[i];
          final keyByte = legacyKeyBytes[(i + iv1 + iv2) % legacyKeyBytes.length];
          decrypted[i] = (encByte ^ ((iv1 + i * 3) & 0xff) ^ keyByte) & 0xff;
        }

        return utf8.decode(decrypted, allowMalformed: true);
      } catch (e) {
        return cipherText;
      }
    }

    return cipherText;
  }
}

class _DayKey {
  final Uint8List keystream;
  final Uint8List sBox;
  final Uint8List invSBox;

  _DayKey({
    required this.keystream,
    required this.sBox,
    required this.invSBox,
  });
}
