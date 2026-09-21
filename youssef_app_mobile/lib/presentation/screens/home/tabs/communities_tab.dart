import 'package:flutter/material.dart';
import '../../../../core/constants/whatsapp_colors.dart';

class CommunitiesTab extends StatelessWidget {
  const CommunitiesTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(
                color: WhatsAppColors.surfaceCard,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.groups_2_rounded,
                size: 72,
                color: WhatsAppColors.primaryGreen,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              "حافظ على تواصل مجتمعك",
              textAlign: TextAlign.center,
              style: TextStyle(
                color: WhatsAppColors.textPrimary,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              "تتيح لك المجتمعات الجمع بين المجموعات ذات الاهتمامات المشتركة وإرسال إعلانات لجميع الأعضاء بسهولة.",
              textAlign: TextAlign.center,
              style: TextStyle(
                color: WhatsAppColors.textSecondary,
                fontSize: 14,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 28),
            ElevatedButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("ميزة إنشاء المجتمعات ستتوفر قريباً")),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: WhatsAppColors.primaryGreen,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(25)),
              ),
              child: const Text("بدء مجتمع جديد", style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
