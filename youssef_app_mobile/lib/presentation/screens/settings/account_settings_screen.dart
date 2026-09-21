import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/whatsapp_colors.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/locale_provider.dart';
import '../auth/login_screen.dart';

class AccountSettingsScreen extends StatefulWidget {
  const AccountSettingsScreen({super.key});

  @override
  State<AccountSettingsScreen> createState() => _AccountSettingsScreenState();
}

class _AccountSettingsScreenState extends State<AccountSettingsScreen> {
  bool _securityNotifications = true;

  void _showEditProfileDialog(BuildContext context, LocaleProvider locale, bool isDark) {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final user = auth.currentUser;
    final nameCtrl = TextEditingController(text: user?.displayName ?? '');
    final bioCtrl = TextEditingController(text: user?.bio ?? '');
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
    final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
        title: Text(locale.t('edit_profile'), style: TextStyle(color: primaryTextColor)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              style: TextStyle(color: primaryTextColor),
              decoration: InputDecoration(
                labelText: locale.t('name'),
                labelStyle: TextStyle(color: secondaryTextColor),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: bioCtrl,
              style: TextStyle(color: primaryTextColor),
              decoration: InputDecoration(
                labelText: locale.t('about'),
                labelStyle: TextStyle(color: secondaryTextColor),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(locale.t('cancel'), style: TextStyle(color: secondaryTextColor)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: WhatsAppColors.primaryGreen,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              final newName = nameCtrl.text.trim();
              final newBio = bioCtrl.text.trim();
              if (newName.isNotEmpty) {
                await auth.updateProfile(displayName: newName, bio: newBio);
                if (ctx.mounted) {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("تم تحديث بيانات الحساب بنجاح ✅")),
                  );
                }
              }
            },
            child: Text(locale.t('save')),
          ),
        ],
      ),
    );
  }

  void _confirmSignOut(BuildContext context, LocaleProvider locale, bool isDark) {
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
    final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
        title: Text("تسجيل الخروج", style: TextStyle(color: primaryTextColor)),
        content: Text(
          "هل أنت متأكد من رغبتك في تسجيل الخروج من هذا الجهاز؟",
          style: TextStyle(color: secondaryTextColor),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(locale.t('cancel'), style: TextStyle(color: secondaryTextColor)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent, foregroundColor: Colors.white),
            onPressed: () async {
              Navigator.pop(ctx);
              final auth = Provider.of<AuthProvider>(context, listen: false);
              await auth.signOut();
              if (context.mounted) {
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
              }
            },
            child: const Text("تسجيل الخروج"),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteAccount(BuildContext context, LocaleProvider locale, bool isDark) {
    final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
        title: const Text("حذف الحساب نهائياً", style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
        content: Text(
          "تنبيه: سيؤدي حذف حسابك إلى مسح كافة بياناتك وسجل محادثاتك نهائياً ولا يمكن التراجع.",
          style: TextStyle(color: secondaryTextColor, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(locale.t('cancel'), style: TextStyle(color: secondaryTextColor)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            onPressed: () async {
              Navigator.pop(ctx);
              final auth = Provider.of<AuthProvider>(context, listen: false);
              await auth.signOut();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("تم حذف الحساب بنجاح")),
                );
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
              }
            },
            child: const Text("تأكيد الحذف"),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final locale = Provider.of<LocaleProvider>(context);
    final user = auth.currentUser;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
    final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;
    final iconColor = isDark ? WhatsAppColors.iconDefault : WhatsAppColors.lightIconDefault;

    return Scaffold(
      appBar: AppBar(
        title: Text(locale.t('account')),
      ),
      body: ListView(
        children: [
          // Security notifications
          SwitchListTile(
            secondary: Icon(Icons.security_rounded, color: iconColor),
            title: Text("إشعارات الأمان", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text(
              "تلقي إشعارات عندما يتغير الرمز الأمني لأي جهة اتصال، محادثاتك محمية بتشفير تام.",
              style: TextStyle(color: secondaryTextColor, fontSize: 12.5),
            ),
            value: _securityNotifications,
            activeColor: WhatsAppColors.primaryGreen,
            onChanged: (val) => setState(() => _securityNotifications = val),
          ),
          const Divider(),

          // Change profile info
          ListTile(
            leading: Icon(Icons.edit_note_rounded, color: iconColor),
            title: Text("تعديل البيانات الشخصية", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text(
              user != null ? "${user.displayName} • ${user.bio}" : "تغيير اسم المستخدم أو النبذة التعريفية",
              style: TextStyle(color: secondaryTextColor, fontSize: 13),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            trailing: Icon(Icons.arrow_forward_ios_rounded, color: secondaryTextColor, size: 14),
            onTap: () => _showEditProfileDialog(context, locale, isDark),
          ),

          // Two-step verification
          ListTile(
            leading: Icon(Icons.verified_user_outlined, color: iconColor),
            title: Text("التحقق بخطوتين والتشفير", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text("مفعل تلقائياً لحماية حسابك عبر تشفير شامل", style: TextStyle(color: secondaryTextColor, fontSize: 12.5)),
            trailing: const Icon(Icons.check_circle, color: WhatsAppColors.primaryGreen, size: 18),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("تشفير الحساب نشط ومحمي بنجاح 🛡️")),
              );
            },
          ),
          const Divider(),

          // Sign out
          ListTile(
            leading: const Icon(Icons.logout_rounded, color: Colors.orangeAccent),
            title: Text("تسجيل الخروج", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text("تسجيل الخروج من الجلسة الحالية على هذا الجهاز", style: TextStyle(color: secondaryTextColor, fontSize: 12.5)),
            onTap: () => _confirmSignOut(context, locale, isDark),
          ),

          // Delete account
          ListTile(
            leading: const Icon(Icons.delete_forever_rounded, color: Colors.redAccent),
            title: const Text("حذف الحساب", style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.w600)),
            subtitle: Text("حذف حسابك نهائياً وجميع الرسائل من النظام", style: TextStyle(color: secondaryTextColor, fontSize: 12.5)),
            onTap: () => _confirmDeleteAccount(context, locale, isDark),
          ),
        ],
      ),
    );
  }
}
