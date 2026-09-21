import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/whatsapp_colors.dart';
import '../../../providers/locale_provider.dart';
import '../../../providers/theme_provider.dart';
import '../../widgets/font_size_dialog.dart';

class ChatSettingsScreen extends StatefulWidget {
  const ChatSettingsScreen({super.key});

  @override
  State<ChatSettingsScreen> createState() => _ChatSettingsScreenState();
}

class _ChatSettingsScreenState extends State<ChatSettingsScreen> {
  bool _enterIsSend = true;
  bool _mediaVisibility = true;

  void _showThemeDialog(ThemeProvider themeProvider, LocaleProvider locale) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
        title: Text(locale.t('theme'), style: TextStyle(color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            {"code": "dark", "title": "داكن (Dark Mode)"},
            {"code": "light", "title": "فاتح (White Mode)"},
            {"code": "system", "title": "الافتراضي للنظام (System)"},
          ].map((t) {
            final code = t["code"]!;
            final title = t["title"]!;
            return RadioListTile<String>(
              title: Text(title, style: TextStyle(color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary)),
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




  void _showWallpaperPreview() {
    showModalBottomSheet(
      context: context,
      backgroundColor: WhatsAppColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text("خلفية شاشة الدردشة", style: TextStyle(color: WhatsAppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text("معاينة ألوان ونقوش خلفية واتساب الرسمية المشفرة", style: TextStyle(color: WhatsAppColors.textSecondary, fontSize: 13)),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildWallpaperOption("داكن كلاسيكي", const Color(0xFF0B141A), true),
                _buildWallpaperOption("رمادي داكن", const Color(0xFF1F2C34), false),
                _buildWallpaperOption("أخضر زمردي", const Color(0xFF005C4B), false),
                _buildWallpaperOption("كحلي ليلي", const Color(0xFF0F1A24), false),
              ],
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: WhatsAppColors.primaryGreen,
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(45),
              ),
              onPressed: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("تم تطبيق خلفية الشاشة لجميع الدردشات بنجاح 🎨")),
                );
              },
              child: const Text("تعيين كخلفية لجميع المحادثات"),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWallpaperOption(String label, Color color, bool selected) {
    return Column(
      children: [
        Container(
          width: 55,
          height: 80,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: selected ? WhatsAppColors.primaryGreen : Colors.white24,
              width: selected ? 2.5 : 1,
            ),
          ),
          child: selected ? const Icon(Icons.check, color: Colors.white, size: 20) : null,
        ),
        const SizedBox(height: 6),
        Text(label, style: const TextStyle(color: WhatsAppColors.textSecondary, fontSize: 11)),
      ],
    );
  }

  void _confirmClearChats() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: WhatsAppColors.surface,
        title: const Text("مسح سجل الدردشات", style: TextStyle(color: Colors.redAccent)),
        content: const Text(
          "هل تريد بالتأكيد مسح كافة الرسائل من جميع المحادثات على هذا الجهاز؟",
          style: TextStyle(color: WhatsAppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("إلغاء", style: TextStyle(color: WhatsAppColors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent, foregroundColor: Colors.white),
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("تم مسح السجل المحلي للمحادثات بنجاح")),
              );
            },
            child: const Text("مسح الجميع"),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);
    final locale = Provider.of<LocaleProvider>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
    final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;
    final iconColor = isDark ? WhatsAppColors.iconDefault : WhatsAppColors.lightIconDefault;

    return Scaffold(
      appBar: AppBar(
        title: Text(locale.t('chats_settings_title')),
      ),
      body: ListView(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Text(
              locale.t('display_section'),
              style: const TextStyle(color: WhatsAppColors.primaryGreen, fontSize: 13, fontWeight: FontWeight.bold),
            ),
          ),

          // Theme
          ListTile(
            leading: Icon(Icons.brightness_medium_rounded, color: iconColor),
            title: Text(locale.t('theme'), style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text(themeProvider.currentThemeTitle, style: TextStyle(color: secondaryTextColor, fontSize: 13)),
            onTap: () => _showThemeDialog(themeProvider, locale),
          ),

          // Wallpaper
          ListTile(
            leading: Icon(Icons.wallpaper_rounded, color: iconColor),
            title: Text(locale.t('wallpaper'), style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text(locale.t('wallpaper_sub'), style: TextStyle(color: secondaryTextColor, fontSize: 13)),
            onTap: _showWallpaperPreview,
          ),
          const Divider(),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Text(
              locale.t('chat_settings_section'),
              style: const TextStyle(color: WhatsAppColors.primaryGreen, fontSize: 13, fontWeight: FontWeight.bold),
            ),
          ),

          // Enter is send
          SwitchListTile(
            secondary: Icon(Icons.keyboard_return_rounded, color: iconColor),
            title: Text(locale.t('enter_is_send'), style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text(locale.t('enter_is_send_sub'), style: TextStyle(color: secondaryTextColor, fontSize: 12.5)),
            value: _enterIsSend,
            activeColor: WhatsAppColors.primaryGreen,
            onChanged: (val) => setState(() => _enterIsSend = val),
          ),

          // Media visibility
          SwitchListTile(
            secondary: Icon(Icons.photo_library_outlined, color: iconColor),
            title: Text(locale.t('media_visibility'), style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text(locale.t('media_visibility_sub'), style: TextStyle(color: secondaryTextColor, fontSize: 12.5)),
            value: _mediaVisibility,
            activeColor: WhatsAppColors.primaryGreen,
            onChanged: (val) => setState(() => _mediaVisibility = val),
          ),

          // Font size
          ListTile(
            leading: Icon(Icons.format_size_rounded, color: iconColor),
            title: Text(locale.t('font_size'), style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text(themeProvider.currentFontSizeTitle, style: TextStyle(color: secondaryTextColor, fontSize: 13)),
            onTap: () => FontSizeDialog.show(context),
          ),
          const Divider(),

          // Clear history
          ListTile(
            leading: const Icon(Icons.delete_sweep_rounded, color: Colors.redAccent),
            title: Text(locale.t('clear_chat_history'), style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.w600)),
            subtitle: Text(locale.t('clear_chat_history_sub'), style: TextStyle(color: secondaryTextColor, fontSize: 12.5)),
            onTap: _confirmClearChats,
          ),
        ],
      ),
    );
  }
}
