import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/whatsapp_colors.dart';
import '../../../../providers/locale_provider.dart';

class CommunitiesTab extends StatelessWidget {
  const CommunitiesTab({super.key});

  @override
  Widget build(BuildContext context) {
    final locale = Provider.of<LocaleProvider>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
    final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.groups_2_rounded,
                size: 72,
                color: WhatsAppColors.primaryGreen,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              locale.t('communities_title'),
              textAlign: TextAlign.center,
              style: TextStyle(
                color: primaryTextColor,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              locale.t('communities_desc'),
              textAlign: TextAlign.center,
              style: TextStyle(
                color: secondaryTextColor,
                fontSize: 14,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 28),
            ElevatedButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(locale.t('start_community'))),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: WhatsAppColors.primaryGreen,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(25)),
              ),
              child: Text(locale.t('start_community'), style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
