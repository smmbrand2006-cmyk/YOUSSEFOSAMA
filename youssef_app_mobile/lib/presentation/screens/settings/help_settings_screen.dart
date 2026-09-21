import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/whatsapp_colors.dart';
import '../../../data/services/firestore_service.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/locale_provider.dart';
import '../chat/chat_screen.dart';

class HelpSettingsScreen extends StatefulWidget {
  const HelpSettingsScreen({super.key});

  @override
  State<HelpSettingsScreen> createState() => _HelpSettingsScreenState();
}

class _HelpSettingsScreenState extends State<HelpSettingsScreen> {
  bool _connectingSupport = false;

  void _openSupportChat() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final user = auth.currentUser;
    if (user == null) return;

    setState(() => _connectingSupport = true);
    try {
      final firestoreService = FirestoreService();
      final supportChat = await firestoreService.getOrCreateSupportChat(user);
      if (!mounted) return;

      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => ChatScreen(chat: supportChat)),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("تعذر الاتصال بالدعم الفني: $e")),
        );
      }
    } finally {
      if (mounted) setState(() => _connectingSupport = false);
    }
  }

  void _showFaqDialog(bool isDark) {
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
    final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
        title: Text("الأسئلة الشائعة", style: TextStyle(color: primaryTextColor)),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("س: كيف يتم تأمين المحادثات؟", style: TextStyle(color: WhatsAppColors.primaryGreen, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text("ج: جميع الرسائل مشفرة بنظام تشفير ديناميكي متعدد الطبقات ولا يمكن لأي طرف ثالث قراءتها.", style: TextStyle(color: secondaryTextColor, fontSize: 13)),
              const SizedBox(height: 12),
              const Text("س: كيف أبدأ محادثة مع شخص جديد؟", style: TextStyle(color: WhatsAppColors.primaryGreen, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text("ج: اضغط على أيقونة المحادثة الجديدة أسفل الشاشة، واكتب اسم المستخدم أو رقم الهاتف ثم اضغط بحث.", style: TextStyle(color: secondaryTextColor, fontSize: 13)),
              const SizedBox(height: 12),
              const Text("س: هل التطبيق مرتبط بالموقع الإلكتروني؟", style: TextStyle(color: WhatsAppColors.primaryGreen, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text("ج: نعم، كلاهما متصلان بنفس قاعدة البيانات في الوقت الفعلي وتصل الرسائل فوراً.", style: TextStyle(color: secondaryTextColor, fontSize: 13)),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("حسناً", style: TextStyle(color: WhatsAppColors.primaryGreen)),
          ),
        ],
      ),
    );
  }

  void _showAppInfoDialog(bool isDark) {
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
    final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
        title: Row(
          children: [
            Image.asset(
              'assets/images/logo.png',
              width: 32,
              height: 32,
              errorBuilder: (_, __, ___) => const Icon(Icons.chat_rounded, color: WhatsAppColors.primaryGreen),
            ),
            const SizedBox(width: 10),
            Text("معلومات التطبيق", style: TextStyle(color: primaryTextColor)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("YOUSSEF APP (WhatsApp Dark Pro)", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Text("الإصدار: 2.4.0 (النسخة الرسمية)", style: TextStyle(color: secondaryTextColor, fontSize: 13)),
            const SizedBox(height: 4),
            Text("قاعدة البيانات: Google Firebase Realtime Cloud", style: TextStyle(color: secondaryTextColor, fontSize: 13)),
            const SizedBox(height: 4),
            Text("التشفير: End-to-End Dynamic Cipher", style: TextStyle(color: secondaryTextColor, fontSize: 13)),
            const SizedBox(height: 10),
            const Text("جميع الحقوق محفوظة © 2026", style: TextStyle(color: WhatsAppColors.primaryGreen, fontSize: 12, fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("إغلاق", style: TextStyle(color: WhatsAppColors.primaryGreen)),
          ),
        ],
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
        title: Text(locale.t('help')),
      ),
      body: ListView(
        children: [
          // Contact Support #123 Direct
          Padding(
            padding: const EdgeInsets.all(16),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: WhatsAppColors.primaryGreen.withOpacity(0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.support_agent_rounded, color: WhatsAppColors.primaryGreen, size: 28),
                      SizedBox(width: 10),
                      Text("تواصل مع فريق الدعم الفني", style: TextStyle(color: WhatsAppColors.primaryGreen, fontSize: 16, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "هل تواجه أي مشكلة أو استفسار؟ ابدأ محادثة مباشرة مع فريق الدعم الفني والمساعدة الرسمي (#123) فوراً.",
                    style: TextStyle(color: secondaryTextColor, fontSize: 13, height: 1.4),
                  ),
                  const SizedBox(height: 14),
                  ElevatedButton.icon(
                    onPressed: _connectingSupport ? null : _openSupportChat,
                    icon: _connectingSupport
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.chat_bubble_outline_rounded, size: 18),
                    label: Text(_connectingSupport ? "جاري الفتح..." : "محادثة الدعم الفني الآن (#123)"),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: WhatsAppColors.primaryGreen,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Divider(),

          // FAQ
          ListTile(
            leading: Icon(Icons.help_center_outlined, color: iconColor),
            title: Text("الأسئلة الشائعة", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text("إجابات سريعة حول استخدام التطبيق وميزاته", style: TextStyle(color: secondaryTextColor, fontSize: 12.5)),
            trailing: Icon(Icons.arrow_forward_ios_rounded, color: secondaryTextColor, size: 14),
            onTap: () => _showFaqDialog(isDark),
          ),

          // Terms and Privacy
          ListTile(
            leading: Icon(Icons.description_outlined, color: iconColor),
            title: Text("شروط الخدمة وسياسة الخصوصية", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text("التزامنا بحماية أمان بياناتك وخصوصيتك", style: TextStyle(color: secondaryTextColor, fontSize: 12.5)),
            trailing: Icon(Icons.arrow_forward_ios_rounded, color: secondaryTextColor, size: 14),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("بياناتك ومحادثاتك آمنة وخاصة بالكامل ولا يتم مشاركتها مطلقاً.")),
              );
            },
          ),

          // App info
          ListTile(
            leading: Icon(Icons.info_outline_rounded, color: iconColor),
            title: Text("معلومات التطبيق", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text("الإصدار 2.4.0 • YOUSSEF APP", style: TextStyle(color: secondaryTextColor, fontSize: 12.5)),
            trailing: Icon(Icons.arrow_forward_ios_rounded, color: secondaryTextColor, size: 14),
            onTap: () => _showAppInfoDialog(isDark),
          ),
        ],
      ),
    );
  }
}
