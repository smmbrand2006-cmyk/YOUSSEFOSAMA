import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/constants/whatsapp_colors.dart';

class CustomAvatar extends StatelessWidget {
  final String name;
  final String? photoUrl;
  final double radius;
  final bool isOnline;
  final bool isSupport;
  final VoidCallback? onTap;

  const CustomAvatar({
    super.key,
    required this.name,
    this.photoUrl,
    this.radius = 24,
    this.isOnline = false,
    this.isSupport = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Widget avatarWidget;

    if (isSupport) {
      avatarWidget = CircleAvatar(
        radius: radius,
        backgroundColor: WhatsAppColors.primaryGreen,
        child: Icon(Icons.headset_mic, color: Colors.white, size: radius * 1.1),
      );
    } else if (photoUrl != null && photoUrl!.isNotEmpty) {
      if (photoUrl!.startsWith('data:image')) {
        // Base64 image
        try {
          final clean = photoUrl!.split(',').last;
          final bytes = base64Decode(clean);
          avatarWidget = ClipOval(
            child: Image.memory(
              bytes,
              width: radius * 2,
              height: radius * 2,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => _buildFallback(),
            ),
          );
        } catch (_) {
          avatarWidget = _buildFallback();
        }
      } else {
        // Network URL (Image.network works flawlessly on Web & Mobile without CORS issues)
        avatarWidget = ClipOval(
          child: Image.network(
            photoUrl!,
            width: radius * 2,
            height: radius * 2,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) => _buildFallback(),
            loadingBuilder: (context, child, progress) {
              if (progress == null) return child;
              return CircleAvatar(
                radius: radius,
                backgroundColor: WhatsAppColors.surfaceCard,
                child: const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: WhatsAppColors.primaryGreen),
                ),
              );
            },
          ),
        );
      }
    } else {
      avatarWidget = _buildFallback();
    }

    return GestureDetector(
      onTap: onTap,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          avatarWidget,
          if (isOnline)
            Positioned(
              bottom: 0,
              right: 0,
              child: Container(
                width: radius * 0.55,
                height: radius * 0.55,
                decoration: BoxDecoration(
                  color: WhatsAppColors.lightGreen,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: Theme.of(context).brightness == Brightness.dark
                        ? WhatsAppColors.background
                        : Colors.white,
                    width: 2,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFallback() {
    final initial = name.isNotEmpty ? name.substring(0, 1).toUpperCase() : "U";
    return CircleAvatar(
      radius: radius,
      backgroundColor: const Color(0xFF6B7C85),
      child: Text(
        initial,
        style: TextStyle(
          color: Colors.white,
          fontSize: radius * 0.85,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
