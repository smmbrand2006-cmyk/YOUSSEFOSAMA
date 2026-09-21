import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/whatsapp_colors.dart';
import '../../../providers/locale_provider.dart';

class PrivacySettingsScreen extends StatefulWidget {
  const PrivacySettingsScreen({super.key});

  @override
  State<PrivacySettingsScreen> createState() => _PrivacySettingsScreenState();
}

class _PrivacySettingsScreenState extends State<PrivacySettingsScreen> {
  String _lastSeen = "الجميع";
  String _profilePhoto = "الجميع";
  String _about = "الجميع";
  bool _readReceipts = true;
  bool _appLock = false;

  void _showChoiceDialog({
    required BuildContext context,
    required String title,
    required String currentValue,
    required List<String> options,
    required ValueChanged<String> onSelected,
    required bool isDark,
  }) {
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
        title: Text(title, style: TextStyle(color: primaryTextColor)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: options.map((opt) {
            return RadioListTile<String>(
              title: Text(opt, style: TextStyle(color: primaryTextColor)),
              value: opt,
              groupValue: currentValue,
              activeColor: WhatsAppColors.primaryGreen,
              onChanged: (val) {
                if (val != null) {
                  onSelected(val);
                  Navigator.pop(ctx);
                }
              },
            );
          }).toList(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = Provider.of<LocaleProvider>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
    final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;
    final iconColor = isDark ? WhatsAppColors.iconDefault : WhatsAppColors.lightIconDefault;

    return Scaffold(
      appBar: AppBar(
        title: Text(locale.t('privacy')),
      ),
      body: ListView(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Text(
              "من يمكنه رؤية معلوماتي الشخصية",
              style: const TextStyle(color: WhatsAppColors.primaryGreen, fontSize: 13, fontWeight: FontWeight.bold),
            ),
          ),

          // Last seen & online
          ListTile(
            leading: Icon(Icons.access_time_rounded, color: iconColor),
            title: Text("آخر ظهور والمتصل الآن", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text(_lastSeen, style: TextStyle(color: secondaryTextColor, fontSize: 13)),
            trailing: Icon(Icons.arrow_forward_ios_rounded, color: secondaryTextColor, size: 14),
            onTap: () {
              _showChoiceDialog(
                context: context,
                isDark: isDark,
                title: "من يمكنه رؤية آخر ظهور لي",
                currentValue: _lastSeen,
                options: const ["الجميع", "جهات اتصالي", "لا أحد"],
                onSelected: (val) => setState(() => _lastSeen = val),
              );
            },
          ),

          // Profile photo
          ListTile(
            leading: Icon(Icons.account_circle_outlined, color: iconColor),
            title: Text(locale.t('profile_photo'), style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text(_profilePhoto, style: TextStyle(color: secondaryTextColor, fontSize: 13)),
            trailing: Icon(Icons.arrow_forward_ios_rounded, color: secondaryTextColor, size: 14),
            onTap: () {
              _showChoiceDialog(
                context: context,
                isDark: isDark,
                title: "من يمكنه رؤية صورتي الشخصية",
                currentValue: _profilePhoto,
                options: const ["الجميع", "جهات اتصالي", "لا أحد"],
                onSelected: (val) => setState(() => _profilePhoto = val),
              );
            },
          ),

          // About
          ListTile(
            leading: Icon(Icons.info_outline_rounded, color: iconColor),
            title: Text(locale.t('about'), style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text(_about, style: TextStyle(color: secondaryTextColor, fontSize: 13)),
            trailing: Icon(Icons.arrow_forward_ios_rounded, color: secondaryTextColor, size: 14),
            onTap: () {
              _showChoiceDialog(
                context: context,
                isDark: isDark,
                title: "من يمكنه رؤية أخباري",
                currentValue: _about,
                options: const ["الجميع", "جهات اتصالي", "لا أحد"],
                onSelected: (val) => setState(() => _about = val),
              );
            },
          ),
          const Divider(),

          // Read receipts
          SwitchListTile(
            secondary: const Icon(Icons.done_all_rounded, color: WhatsAppColors.primaryGreen),
            title: Text("مؤشرات قراءة الرسائل", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text(
              "إذا أوقفت تشغيل هذا الخيار، فلن تتمكن من إرسال أو استقبال مؤشرات قراءة الرسائل (الصحين الزرقاء).",
              style: TextStyle(color: secondaryTextColor, fontSize: 12.5),
            ),
            value: _readReceipts,
            activeColor: WhatsAppColors.primaryGreen,
            onChanged: (val) {
              setState(() => _readReceipts = val);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(val ? "تم تفعيل مؤشرات القراءة (الصحين الزرقاء) ✅" : "تم تعطيل مؤشرات القراءة"),
                  duration: const Duration(seconds: 2),
                ),
              );
            },
          ),
          const Divider(),

          // Blocked contacts
          ListTile(
            leading: Icon(Icons.block_rounded, color: iconColor),
            title: Text("جهات الاتصال المحظورة", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text("لا توجد جهات اتصال محظورة حالياً", style: TextStyle(color: secondaryTextColor, fontSize: 12.5)),
            trailing: Icon(Icons.arrow_forward_ios_rounded, color: secondaryTextColor, size: 14),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("قائمة الحظر فارغة. يمكنك حظر أي شخص من داخل محادثته.")),
              );
            },
          ),

          // App Lock
          SwitchListTile(
            secondary: Icon(Icons.fingerprint_rounded, color: iconColor),
            title: Text("قفل التطبيق ببصمة الإصبع", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text(
              "عند تفعيل هذا الخيار ستحتاج إلى استخدام بصمة الإصبع لفتح التطبيق.",
              style: TextStyle(color: secondaryTextColor, fontSize: 12.5),
            ),
            value: _appLock,
            activeColor: WhatsAppColors.primaryGreen,
            onChanged: (val) {
              setState(() => _appLock = val);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(val ? "تم تفعيل حماية البصمة وقفل التطبيق 🔒" : "تم إلغاء قفل التطبيق")),
              );
            },
          ),
        ],
      ),
    );
  }
}
