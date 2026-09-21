import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/whatsapp_colors.dart';

class AppUpdateBanner extends StatelessWidget {
  const AppUpdateBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance.collection('system_settings').doc('app_update').snapshots(),
      builder: (context, snapshot) {
        if (!snapshot.hasData || !snapshot.data!.exists) {
          return const SizedBox.shrink();
        }

        final data = snapshot.data!.data() as Map<String, dynamic>? ?? {};
        final bool isActive = data['isActive'] == true;
        if (!isActive) return const SizedBox.shrink();

        final version = data['version'] ?? 'الجديد';
        final title = data['title'] ?? 'تحديث جديد متوفر';
        final notes = data['notes'] ?? '';
        final downloadUrl = data['downloadUrl'] ?? 'https://youssefapp.web.app';

        final isDark = Theme.of(context).brightness == Brightness.dark;

        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: isDark 
                  ? [const Color(0xFF005C4B), const Color(0xFF00382E)]
                  : [const Color(0xFFD9FDD3), const Color(0xFFE8FCE3)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: WhatsAppColors.primaryGreen.withOpacity(0.5)),
            boxShadow: [
              BoxShadow(
                color: WhatsAppColors.primaryGreen.withOpacity(0.2),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: const BoxDecoration(
                  color: WhatsAppColors.primaryGreen,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.system_update_rounded, color: Colors.white, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          title,
                          style: TextStyle(
                            color: isDark ? Colors.white : const Color(0xFF111B21),
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                          decoration: BoxDecoration(
                            color: WhatsAppColors.primaryGreen,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            version,
                            style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    if (notes.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(
                        notes,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: WhatsAppColors.primaryGreen,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  minimumSize: Size.zero,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                ),
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
                      title: Row(
                        children: [
                          const Icon(Icons.rocket_launch_rounded, color: WhatsAppColors.primaryGreen),
                          const SizedBox(width: 8),
                          Text(title, style: TextStyle(color: isDark ? Colors.white : const Color(0xFF111B21))),
                        ],
                      ),
                      content: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text("الإصدار: $version", style: const TextStyle(color: WhatsAppColors.primaryGreen, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 8),
                          Text("التحسينات والملاحظات:\n$notes", style: TextStyle(color: isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary, height: 1.4)),
                          const SizedBox(height: 12),
                          Text("رابط التحميل:\n$downloadUrl", style: const TextStyle(color: Colors.blueAccent, fontSize: 12)),
                        ],
                      ),
                      actions: [
                        TextButton(
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: downloadUrl));
                            Navigator.pop(ctx);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text("تم نسخ رابط التحميل إلى الحافظة 📋")),
                            );
                          },
                          child: const Text("نسخ الرابط"),
                        ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: WhatsAppColors.primaryGreen),
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text("حسناً", style: TextStyle(color: Colors.white)),
                        ),
                      ],
                    ),
                  );
                },
                child: const Text("تحديث", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        );
      },
    );
  }
}
