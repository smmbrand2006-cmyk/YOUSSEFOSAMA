import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/whatsapp_colors.dart';
import '../../../../providers/locale_provider.dart';
import '../../../widgets/custom_avatar.dart';
import '../../calls/call_screen.dart';

class CallsTab extends StatelessWidget {
  const CallsTab({super.key});

  void _showCreateCallLinkDialog(BuildContext context, LocaleProvider locale) {
    const callLink = "https://youssef-app.web.app/call/pro-enc-9921";
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
    final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: WhatsAppColors.primaryGreen.withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.link_rounded, color: WhatsAppColors.primaryGreen, size: 36),
            ),
            const SizedBox(height: 12),
            Text(
              locale.t('create_call_link'),
              style: TextStyle(
                color: primaryTextColor,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              locale.t('call_link_sub'),
              textAlign: TextAlign.center,
              style: TextStyle(color: secondaryTextColor, fontSize: 13),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isDark ? WhatsAppColors.background : const Color(0xFFF0F2F5),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: isDark ? Colors.white12 : Colors.black12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.lock_rounded, color: WhatsAppColors.primaryGreen, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      callLink,
                      style: TextStyle(color: primaryTextColor, fontSize: 13),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.copy_rounded, color: WhatsAppColors.primaryGreen, size: 20),
                    onPressed: () {
                      Clipboard.setData(const ClipboardData(text: callLink));
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(locale.t('call_copied'))),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              icon: const Icon(Icons.call, size: 18),
              label: Text(locale.t('start_call_now')),
              style: ElevatedButton.styleFrom(
                backgroundColor: WhatsAppColors.primaryGreen,
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(45),
              ),
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => CallScreen(
                      callerName: locale.t('encrypted_group_call'),
                      isVideo: false,
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  void _startCall(BuildContext context, String name, bool isVideo, {bool isSupport = false}) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CallScreen(
          callerName: name,
          isVideo: isVideo,
          isSupport: isSupport,
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

    return ListView(
      children: [
        // Create call link tile
        ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          leading: const CircleAvatar(
            radius: 24,
            backgroundColor: WhatsAppColors.primaryGreen,
            child: Icon(Icons.link_rounded, color: Colors.white),
          ),
          title: Text(
            locale.t('create_call_link'),
            style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600),
          ),
          subtitle: Text(
            locale.t('call_link_sub'),
            style: TextStyle(color: secondaryTextColor, fontSize: 13),
          ),
          onTap: () => _showCreateCallLinkDialog(context, locale),
        ),

        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text(
            locale.t('recent_calls'),
            style: TextStyle(
              color: secondaryTextColor,
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
          title: Text(
            locale.t('tech_support'),
            style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600),
          ),
          subtitle: Row(
            children: [
              const Icon(Icons.call_received, color: WhatsAppColors.primaryGreen, size: 16),
              const SizedBox(width: 4),
              Text(
                locale.t('yesterday_time'),
                style: TextStyle(color: secondaryTextColor, fontSize: 13),
              ),
            ],
          ),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                icon: const Icon(Icons.videocam_rounded, color: WhatsAppColors.primaryGreen),
                onPressed: () => _startCall(context, "الدعم الفني الرسمي (#123)", true, isSupport: true),
              ),
              IconButton(
                icon: const Icon(Icons.call, color: WhatsAppColors.primaryGreen),
                onPressed: () => _startCall(context, "الدعم الفني الرسمي (#123)", false, isSupport: true),
              ),
            ],
          ),
          onTap: () => _startCall(context, "الدعم الفني الرسمي (#123)", false, isSupport: true),
        ),

        // Another realistic sample call
        ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          leading: const CustomAvatar(
            name: "Youssef Osama",
            radius: 24,
          ),
          title: Text(
            "Youssef Osama (مطور التطبيق)",
            style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600),
          ),
          subtitle: Row(
            children: [
              const Icon(Icons.call_made, color: WhatsAppColors.primaryGreen, size: 16),
              const SizedBox(width: 4),
              Text(
                locale.t('today_video_call'),
                style: TextStyle(color: secondaryTextColor, fontSize: 13),
              ),
            ],
          ),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                icon: const Icon(Icons.videocam_rounded, color: WhatsAppColors.primaryGreen),
                onPressed: () => _startCall(context, "Youssef Osama", true),
              ),
              IconButton(
                icon: const Icon(Icons.call, color: WhatsAppColors.primaryGreen),
                onPressed: () => _startCall(context, "Youssef Osama", false),
              ),
            ],
          ),
          onTap: () => _startCall(context, "Youssef Osama", true),
        ),
      ],
    );
  }
}
