import 'dart:convert';
import 'package:cached_network_image/cached_network_image.dart';
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
        // Base64
        try {
          final clean = photoUrl!.split(',').last;
          final bytes = base64Decode(clean);
          avatarWidget = CircleAvatar(
            radius: radius,
            backgroundImage: MemoryImage(bytes),
          );
        } catch (_) {
          avatarWidget = _buildFallback();
        }
      } else {
        // Network URL
        avatarWidget = CachedNetworkImage(
          imageUrl: photoUrl!,
          imageBuilder: (context, imageProvider) => CircleAvatar(
            radius: radius,
            backgroundImage: imageProvider,
          ),
          placeholder: (context, url) => CircleAvatar(
            radius: radius,
            backgroundColor: WhatsAppColors.surfaceCard,
            child: const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2, color: WhatsAppColors.primaryGreen),
            ),
          ),
          errorWidget: (context, url, error) => _buildFallback(),
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
                  border: Border.all(color: WhatsAppColors.background, width: 2),
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
