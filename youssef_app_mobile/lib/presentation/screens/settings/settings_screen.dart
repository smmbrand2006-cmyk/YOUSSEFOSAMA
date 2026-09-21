import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/whatsapp_colors.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/locale_provider.dart';
import '../../../providers/theme_provider.dart';
import '../../widgets/custom_avatar.dart';
import '../profile/profile_screen.dart';
import 'account_settings_screen.dart';
import 'privacy_settings_screen.dart';
import 'chat_settings_screen.dart';
import 'notification_settings_screen.dart';
import 'storage_settings_screen.dart';
import 'language_settings_screen.dart';
import 'help_settings_screen.dart';
import '../../widgets/font_size_dialog.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  void _showInviteModal(BuildContext context, String? userCode, bool isDark) {
    const apkUrl = "https://github.com/smmbrand2006-cmyk/YOUSSEFOSAMA/releases/latest/download/YOUSSEF_APP.apk";
    const inviteText = "حمّل تطبيق WhatsApp Pro (YOUSSEF APP) واستمتع بمحادثات ومكالمات مشفرة وسريعة!\nرابط تحميل APK المباشر:\n$apkUrl";
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
    final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const Icon(Icons.share_rounded, color: WhatsAppColors.primaryGreen, size: 40),
            const SizedBox(height: 12),
            Text(
              "دعوة صديق للانضمام إلى التطبيق",
              style: TextStyle(color: primaryTextColor, fontSize: 17, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              "شارك رابط تحميل تطبيق أندرويد الحقيقي (APK) مباشرة مع أصدقائك لبدء المحادثة معك.",
              textAlign: TextAlign.center,
              style: TextStyle(color: secondaryTextColor, fontSize: 13, height: 1.4),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: isDark ? WhatsAppColors.background : const Color(0xFFF0F2F5),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: isDark ? Colors.white12 : Colors.black12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.android, color: WhatsAppColors.primaryGreen, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      apkUrl,
                      style: TextStyle(color: primaryTextColor, fontSize: 12.5),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.copy_rounded, color: WhatsAppColors.primaryGreen, size: 18),
                    onPressed: () {
                      Clipboard.setData(const ClipboardData(text: apkUrl));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("تم نسخ رابط تحميل التطبيق إلى الحافظة 📋")),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              icon: const Icon(Icons.content_copy_rounded, size: 18),
              label: const Text("نسخ رسالة الدعوة بالكامل"),
              style: ElevatedButton.styleFrom(
                backgroundColor: WhatsAppColors.primaryGreen,
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(45),
              ),
              onPressed: () {
                Clipboard.setData(const ClipboardData(text: inviteText));
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("تم نسخ نص الدعوة ورابط التحميل بنجاح ✅")),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showThemeDialog(BuildContext context, ThemeProvider themeProvider, LocaleProvider locale, bool isDark) {
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
        title: Text(locale.t('theme'), style: TextStyle(color: primaryTextColor)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            {"code": "light", "title": "فاتح (White Mode) ☀️"},
            {"code": "dark", "title": "داكن (Dark Mode) 🌙"},
            {"code": "system", "title": "الافتراضي للنظام (System) ⚙️"},
          ].map((t) {
            final code = t["code"]!;
            final title = t["title"]!;
            return RadioListTile<String>(
              title: Text(title, style: TextStyle(color: primaryTextColor)),
              value: code,
              groupValue: themeProvider.themeModeString,
              activeColor: WhatsAppColors.primaryGreen,
              onChanged: (val) {
                if (val != null) {
                  themeProvider.setTheme(val);
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text("تم تفعيل $title بنجاح 🎨")),
                  );
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
    final auth = Provider.of<AuthProvider>(context);
    final locale = Provider.of<LocaleProvider>(context);
    final themeProvider = Provider.of<ThemeProvider>(context);
    final user = auth.currentUser;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
    final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;
    final iconColor = isDark ? WhatsAppColors.iconDefault : WhatsAppColors.lightIconDefault;

    return Scaffold(
      appBar: AppBar(
        title: Text(locale.t('settings')),
      ),
      body: ListView(
        children: [
          // Profile header tile
          if (user != null)
            ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              leading: CustomAvatar(name: user.displayName, photoUrl: user.photoUrl, radius: 28),
              title: Text(user.displayName, style: TextStyle(color: primaryTextColor, fontSize: 17, fontWeight: FontWeight.bold)),
              subtitle: Text(user.bio, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: secondaryTextColor, fontSize: 13.5)),
              trailing: const Icon(Icons.qr_code, color: WhatsAppColors.primaryGreen),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ProfileScreen()),
                );
              },
            ),
          const Divider(),

          // 0. Theme Toggle
          _buildItem(
            icon: isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
            title: locale.t('theme'),
            subtitle: themeProvider.currentThemeTitle,
            primaryTextColor: primaryTextColor,
            secondaryTextColor: secondaryTextColor,
            iconColor: isDark ? Colors.amber : WhatsAppColors.primaryGreen,
            onTap: () => _showThemeDialog(context, themeProvider, locale, isDark),
          ),

          // 0.1 Global Font Size Scaling
          _buildItem(
            icon: Icons.format_size_rounded,
            title: "حجم خط التطبيق (Font Size)",
            subtitle: "تكبير/تصغير خط التطبيق بالكامل (${(themeProvider.fontScale * 100).toInt()}%)",
            primaryTextColor: primaryTextColor,
            secondaryTextColor: secondaryTextColor,
            iconColor: WhatsAppColors.primaryGreen,
            onTap: () => FontSizeDialog.show(context),
          ),

          // 1. Account Settings
          _buildItem(
            icon: Icons.key_outlined,
            title: locale.t('account'),
            subtitle: locale.t('account_sub'),
            primaryTextColor: primaryTextColor,
            secondaryTextColor: secondaryTextColor,
            iconColor: iconColor,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const AccountSettingsScreen()),
              );
            },
          ),

          // 2. Privacy Settings
          _buildItem(
            icon: Icons.lock_outline,
            title: locale.t('privacy'),
            subtitle: locale.t('privacy_sub'),
            primaryTextColor: primaryTextColor,
            secondaryTextColor: secondaryTextColor,
            iconColor: iconColor,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const PrivacySettingsScreen()),
              );
            },
          ),

          // 3. Chat Settings
          _buildItem(
            icon: Icons.chat_outlined,
            title: locale.t('chat_settings'),
            subtitle: locale.t('chat_settings_sub'),
            primaryTextColor: primaryTextColor,
            secondaryTextColor: secondaryTextColor,
            iconColor: iconColor,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ChatSettingsScreen()),
              );
            },
          ),

          // 4. Notifications Settings
          _buildItem(
            icon: Icons.notifications_outlined,
            title: locale.t('notifications'),
            subtitle: locale.t('notifications_sub'),
            primaryTextColor: primaryTextColor,
            secondaryTextColor: secondaryTextColor,
            iconColor: iconColor,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const NotificationSettingsScreen()),
              );
            },
          ),

          // 5. Storage Settings
          _buildItem(
            icon: Icons.data_usage_outlined,
            title: locale.t('storage'),
            subtitle: locale.t('storage_sub'),
            primaryTextColor: primaryTextColor,
            secondaryTextColor: secondaryTextColor,
            iconColor: iconColor,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const StorageSettingsScreen()),
              );
            },
          ),

          // 6. App Language Settings
          _buildItem(
            icon: Icons.language_outlined,
            title: locale.t('app_language'),
            subtitle: locale.currentLanguageTitle,
            primaryTextColor: primaryTextColor,
            secondaryTextColor: secondaryTextColor,
            iconColor: iconColor,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const LanguageSettingsScreen()),
              );
            },
          ),

          // 7. Help & Support
          _buildItem(
            icon: Icons.help_outline,
            title: locale.t('help'),
            subtitle: locale.t('help_sub'),
            primaryTextColor: primaryTextColor,
            secondaryTextColor: secondaryTextColor,
            iconColor: iconColor,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const HelpSettingsScreen()),
              );
            },
          ),
          const Divider(),

          // 8. Invite friend
          ListTile(
            leading: Icon(Icons.group_outlined, color: iconColor),
            title: Text(locale.t('invite_friend'), style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text(locale.t('invite_friend_sub'), style: TextStyle(color: secondaryTextColor, fontSize: 13)),
            trailing: Icon(Icons.arrow_forward_ios_rounded, color: secondaryTextColor, size: 14),
            onTap: () => _showInviteModal(context, user?.userCode, isDark),
          ),
        ],
      ),
    );
  }

  Widget _buildItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color primaryTextColor,
    required Color secondaryTextColor,
    required Color iconColor,
    VoidCallback? onTap,
  }) {
    return ListTile(
      leading: Icon(icon, color: iconColor),
      title: Text(title, style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600, fontSize: 15.5)),
      subtitle: Text(subtitle, style: TextStyle(color: secondaryTextColor, fontSize: 12.5)),
      trailing: Icon(Icons.arrow_forward_ios_rounded, color: secondaryTextColor, size: 14),
      onTap: onTap,
    );
  }
}
