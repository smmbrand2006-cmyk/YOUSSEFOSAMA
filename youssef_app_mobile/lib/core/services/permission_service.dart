import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/whatsapp_colors.dart';

class PermissionService {
  PermissionService._();
  static final PermissionService instance = PermissionService._();

  static const String _requestedKey = 'youssef_initial_permissions_prompted';

  /// Check and prompt user for all core permissions once upon first entering HomeScreen
  Future<void> promptAllPermissionsIfNeeded(BuildContext context) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final alreadyPrompted = prefs.getBool(_requestedKey) ?? false;
      if (alreadyPrompted) return;

      if (!context.mounted) return;

      // Show beautiful permission bottom sheet
      final agreed = await showModalBottomSheet<bool>(
        context: context,
        isDismissible: false,
        enableDrag: false,
        backgroundColor: Colors.transparent,
        builder: (ctx) => _buildPermissionModal(ctx),
      );

      if (agreed == true) {
        await requestAllCorePermissions();
      }

      await prefs.setBool(_requestedKey, true);
    } catch (e) {
      debugPrint("Error prompting permissions: $e");
    }
  }

  /// Direct sequential permission requests for Camera, Mic, Notifications, and Storage
  Future<Map<Permission, PermissionStatus>> requestAllCorePermissions() async {
    final permissions = [
      Permission.notification,
      Permission.camera,
      Permission.microphone,
      Permission.photos,
      Permission.storage,
    ];

    return await permissions.request();
  }

  Widget _buildPermissionModal(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF111B21),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        border: Border.all(
          color: WhatsAppColors.primaryGreen.withOpacity(0.3),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.6),
            blurRadius: 30,
            offset: const Offset(0, -10),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Header icon
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: WhatsAppColors.primaryGreen.withOpacity(0.15),
              shape: BoxShape.circle,
              border: Border.all(
                color: WhatsAppColors.primaryGreen.withOpacity(0.35),
                width: 1.5,
              ),
            ),
            child: const Icon(
              Icons.verified_user_rounded,
              color: WhatsAppColors.primaryGreen,
              size: 32,
            ),
          ),
          const SizedBox(height: 16),

          const Text(
            "تفعيل صلاحيات YOUSSEF APP 🛡️",
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),

          Text(
            "لضمان تشغيل الإشعارات، إرسال الصور، والمكالمات الصوتية والمرئية بأعلى جودة وبدون انقطاع:",
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white.withOpacity(0.7),
              fontSize: 13,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 20),

          // Features List
          _buildPermItem(
            icon: Icons.notifications_active_rounded,
            color: const Color(0xFF38BDF8),
            title: "الإشعارات الفورية",
            desc: "لتنبيهك فوراً بالرسائل والمكالمات الواردة حتى عند قفل الشاشة",
          ),
          _buildPermItem(
            icon: Icons.mic_rounded,
            color: WhatsAppColors.primaryGreen,
            title: "المايكروفون",
            desc: "لإرسال الرسائل الصوتية وإجراء المكالمات",
          ),
          _buildPermItem(
            icon: Icons.camera_alt_rounded,
            color: const Color(0xFFF59E0B),
            title: "الكاميرا والصور",
            desc: "لمكالمات الفيديو والتقاط وإرسال الصور في الشات",
          ),
          const SizedBox(height: 24),

          // Accept button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: WhatsAppColors.primaryGreen,
                foregroundColor: const Color(0xFF0B141B),
                elevation: 3,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.check_circle_rounded, size: 20),
                  SizedBox(width: 8),
                  Text(
                    "السماح بجميع الصلاحيات الآن 🚀",
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),

          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(
              "لاحقاً",
              style: TextStyle(
                color: Colors.white.withOpacity(0.5),
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPermItem({
    required IconData icon,
    required Color color,
    required String title,
    required String desc,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: color.withOpacity(0.25)),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  desc,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.6),
                    fontSize: 11.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
