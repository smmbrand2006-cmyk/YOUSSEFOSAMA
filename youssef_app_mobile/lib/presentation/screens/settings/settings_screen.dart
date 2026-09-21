import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/whatsapp_colors.dart';
import '../../../providers/auth_provider.dart';
import '../../widgets/custom_avatar.dart';
import '../profile/profile_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;

    return Scaffold(
      appBar: AppBar(
        title: const Text("الإعدادات"),
      ),
      body: ListView(
        children: [
          // Profile header tile
          if (user != null)
            ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              leading: CustomAvatar(name: user.displayName, photoUrl: user.photoUrl, radius: 28),
              title: Text(user.displayName, style: const TextStyle(color: WhatsAppColors.textPrimary, fontSize: 17, fontWeight: FontWeight.bold)),
              subtitle: Text(user.bio, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: WhatsAppColors.textSecondary, fontSize: 13.5)),
              trailing: const Icon(Icons.qr_code, color: WhatsAppColors.primaryGreen),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ProfileScreen()),
                );
              },
            ),
          const Divider(),

          // Settings list
          _buildItem(icon: Icons.key_outlined, title: "الحساب", subtitle: "إشعارات الأمان، تغيير الرقم، حذف الحساب"),
          _buildItem(icon: Icons.lock_outline, title: "الخصوصية", subtitle: "حظر جهات الاتصال، مؤشرات القراءة"),
          _buildItem(icon: Icons.chat_outlined, title: "الدردشات", subtitle: "المظهر، خلفيات الشاشة، سجل الدردشة"),
          _buildItem(icon: Icons.notifications_outlined, title: "الإشعارات", subtitle: "نغمات الرسائل والمجموعات والمكالمات"),
          _buildItem(icon: Icons.data_usage_outlined, title: "التخزين والبيانات", subtitle: "التنزيل التلقائي للوسائط، استخدام الشبكة"),
          _buildItem(icon: Icons.language_outlined, title: "لغة التطبيق", subtitle: "العربية (لغة الجهاز)"),
          _buildItem(
            icon: Icons.help_outline,
            title: "المساعدة",
            subtitle: "مركز المساعدة، تواصل مع الدعم الفني (#123)",
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("يمكنك محادثة الدعم الفني من قائمة الدردشات")),
              );
            },
          ),
          const Divider(),

          // Invite friend
          ListTile(
            leading: const Icon(Icons.group_outlined, color: WhatsAppColors.iconDefault),
            title: const Text("دعوة صديق", style: TextStyle(color: WhatsAppColors.textPrimary, fontWeight: FontWeight.w600)),
            subtitle: const Text("شارك كود حسابك مع أصدقائك لينضموا إليك", style: TextStyle(color: WhatsAppColors.textSecondary, fontSize: 13)),
            onTap: () {
              if (user != null) {
                Clipboard.setData(ClipboardData(text: "تواصل معي على تطبيق يوسف شات عبر كود حسابي: #${user.userCode}"));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("تم نسخ دعوة كود الحساب إلى الحافظة")),
                );
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildItem({
    required IconData icon,
    required String title,
    required String subtitle,
    VoidCallback? onTap,
  }) {
    return ListTile(
      leading: Icon(icon, color: WhatsAppColors.iconDefault),
      title: Text(title, style: const TextStyle(color: WhatsAppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 15.5)),
      subtitle: Text(subtitle, style: const TextStyle(color: WhatsAppColors.textSecondary, fontSize: 12.5)),
      onTap: onTap,
    );
  }
}
