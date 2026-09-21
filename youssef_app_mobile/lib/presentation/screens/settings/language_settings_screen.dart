import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/whatsapp_colors.dart';
import '../../../providers/locale_provider.dart';

class LanguageSettingsScreen extends StatelessWidget {
  const LanguageSettingsScreen({super.key});

  final List<Map<String, String>> _languages = const [
    {
      "code": "ar",
      "title": "العربية (لغة الجهاز)",
      "subtitle": "Arabic • الافتراضية (يمين إلى يسار)",
    },
    {
      "code": "en",
      "title": "English",
      "subtitle": "الإنجليزية • English (Left to Right)",
    },
    {
      "code": "franco",
      "title": "Franco-Arabic",
      "subtitle": "فرانكو • 3arabizi (Left to Right)",
    },
  ];

  @override
  Widget build(BuildContext context) {
    final localeProvider = Provider.of<LocaleProvider>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
    final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;

    return Scaffold(
      appBar: AppBar(
        title: Text(localeProvider.t('app_language')),
      ),
      body: ListView(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              localeProvider.t('choose_language'),
              style: TextStyle(color: secondaryTextColor, fontSize: 13.5),
            ),
          ),
          ..._languages.map((lang) {
            final code = lang["code"]!;
            final title = lang["title"]!;
            final subtitle = lang["subtitle"]!;
            final isSelected = localeProvider.languageCode == code;

            return RadioListTile<String>(
              value: code,
              groupValue: localeProvider.languageCode,
              activeColor: WhatsAppColors.primaryGreen,
              title: Text(
                title,
                style: TextStyle(
                  color: isSelected ? WhatsAppColors.primaryGreen : primaryTextColor,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                ),
              ),
              subtitle: Text(
                subtitle,
                style: TextStyle(color: secondaryTextColor, fontSize: 12.5),
              ),
              onChanged: (val) {
                if (val != null) {
                  localeProvider.setLanguage(val);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(localeProvider.t('lang_changed')),
                      duration: const Duration(seconds: 2),
                      backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
                    ),
                  );
                }
              },
            );
          }),
        ],
      ),
    );
  }
}
