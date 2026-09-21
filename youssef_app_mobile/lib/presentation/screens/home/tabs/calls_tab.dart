import 'package:flutter/material.dart';
import '../../../../core/constants/whatsapp_colors.dart';
import '../../../widgets/custom_avatar.dart';

class CallsTab extends StatelessWidget {
  const CallsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        // Create call link
        ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          leading: const CircleAvatar(
            radius: 24,
            backgroundColor: WhatsAppColors.primaryGreen,
            child: Icon(Icons.link, color: Colors.white),
          ),
          title: const Text(
            "إنشاء رابط مكالمة",
            style: TextStyle(color: WhatsAppColors.textPrimary, fontWeight: FontWeight.w600),
          ),
          subtitle: const Text(
            "مشاركة رابط لمكالمتك مع أي شخص",
            style: TextStyle(color: WhatsAppColors.textSecondary, fontSize: 13),
          ),
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text("تم نسخ رابط المكالمة السريعة")),
            );
          },
        ),

        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text(
            "الأخيرة",
            style: TextStyle(
              color: WhatsAppColors.textSecondary,
              fontSize: 13.5,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),

        // Support call log
        ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          leading: const CustomAvatar(
            name: "الدعم الفني",
            radius: 24,
            isSupport: true,
          ),
          title: const Text(
            "الدعم الفني الرسمي (#123)",
            style: TextStyle(color: WhatsAppColors.textPrimary, fontWeight: FontWeight.w600),
          ),
          subtitle: const Row(
            children: [
              Icon(Icons.call_received, color: WhatsAppColors.primaryGreen, size: 16),
              SizedBox(width: 4),
              Text(
                "أمس، 8:15 م",
                style: TextStyle(color: WhatsAppColors.textSecondary, fontSize: 13),
              ),
            ],
          ),
          trailing: const Icon(Icons.call, color: WhatsAppColors.primaryGreen),
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text("جاري بدء الاتصال بالدعم الفني...")),
            );
          },
        ),
      ],
    );
  }
}
