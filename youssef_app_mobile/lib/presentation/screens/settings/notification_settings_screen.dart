import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/whatsapp_colors.dart';
import '../../../core/services/sound_service.dart';
import '../../../providers/locale_provider.dart';

class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() => _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen> {
  bool _conversationTones = SoundService.instance.soundEnabled;
  bool _highPriority = true;
  String _vibration = "افتراضي";

  void _showVibrationDialog(bool isDark) {
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
        title: Text("الاهتزاز", style: TextStyle(color: primaryTextColor)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: ["إيقاف", "افتراضي", "قصير", "طويل"].map((v) {
            return RadioListTile<String>(
              title: Text(v, style: TextStyle(color: primaryTextColor)),
              value: v,
              groupValue: _vibration,
              activeColor: WhatsAppColors.primaryGreen,
              onChanged: (val) {
                if (val != null) {
                  setState(() => _vibration = val);
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
        title: Text(locale.t('notifications')),
      ),
      body: ListView(
        children: [
          // Conversation tones
          SwitchListTile(
            secondary: const Icon(Icons.volume_up_rounded, color: WhatsAppColors.primaryGreen),
            title: Text("نغمات المحادثات", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text("تشغيل الأصوات للرسائل الصادرة والواردة داخل المحادثات", style: TextStyle(color: secondaryTextColor, fontSize: 12.5)),
            value: _conversationTones,
            activeColor: WhatsAppColors.primaryGreen,
            onChanged: (val) {
              setState(() {
                _conversationTones = val;
                SoundService.instance.toggleSound(val);
              });
              if (val) {
                SoundService.instance.playMessageReceived();
              }
            },
          ),
          const Divider(),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Text("معاينة نغمات الرسائل والمكالمات", style: const TextStyle(color: WhatsAppColors.primaryGreen, fontSize: 13, fontWeight: FontWeight.bold)),
          ),

          // Message Received tone preview
          ListTile(
            leading: Icon(Icons.notifications_active_outlined, color: iconColor),
            title: Text("نغمة استلام رسالة", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text("نغمة واتساب الأصلية للرسائل الواردة", style: TextStyle(color: secondaryTextColor, fontSize: 12.5)),
            trailing: IconButton(
              icon: const Icon(Icons.play_circle_fill_rounded, color: WhatsAppColors.primaryGreen, size: 28),
              onPressed: () => SoundService.instance.playMessageReceived(),
            ),
          ),

          // Message Sent tone preview
          ListTile(
            leading: Icon(Icons.send_rounded, color: iconColor),
            title: Text("نغمة إرسال رسالة", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text("نغمة تأكيد الإرسال الخفيفة (Pop Tone)", style: TextStyle(color: secondaryTextColor, fontSize: 12.5)),
            trailing: IconButton(
              icon: const Icon(Icons.play_circle_fill_rounded, color: WhatsAppColors.primaryGreen, size: 28),
              onPressed: () => SoundService.instance.playMessageSent(),
            ),
          ),

          // Voice Call Ringtone preview
          ListTile(
            leading: Icon(Icons.phone_in_talk_rounded, color: iconColor),
            title: Text("رنين المكالمات الصوتية", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text("نغمة رنين المكالمات المتناغمة", style: TextStyle(color: secondaryTextColor, fontSize: 12.5)),
            trailing: IconButton(
              icon: const Icon(Icons.play_circle_fill_rounded, color: WhatsAppColors.primaryGreen, size: 28),
              onPressed: () => SoundService.instance.playVoiceCallRingtone(),
            ),
          ),

          // Video Call Ringtone preview
          ListTile(
            leading: Icon(Icons.videocam_rounded, color: iconColor),
            title: Text("رنين مكالمات الفيديو", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text("نغمة إلكترونية صاعدة لمكالمات الفيديو", style: TextStyle(color: secondaryTextColor, fontSize: 12.5)),
            trailing: IconButton(
              icon: const Icon(Icons.play_circle_fill_rounded, color: WhatsAppColors.primaryGreen, size: 28),
              onPressed: () => SoundService.instance.playVideoCallRingtone(),
            ),
          ),
          const Divider(),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Text("الاهتزاز والتنبيهات المرتفعة", style: const TextStyle(color: WhatsAppColors.primaryGreen, fontSize: 13, fontWeight: FontWeight.bold)),
          ),

          // Vibration
          ListTile(
            leading: Icon(Icons.vibration_rounded, color: iconColor),
            title: Text("الاهتزاز", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text(_vibration, style: TextStyle(color: secondaryTextColor, fontSize: 13)),
            onTap: () => _showVibrationDialog(isDark),
          ),

          // High Priority Notifications
          SwitchListTile(
            secondary: Icon(Icons.priority_high_rounded, color: iconColor),
            title: Text("إشعارات ذات أولوية مرتفعة", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text("إظهار معاينات للإشعارات الواردة في أعلى الشاشة", style: TextStyle(color: secondaryTextColor, fontSize: 12.5)),
            value: _highPriority,
            activeColor: WhatsAppColors.primaryGreen,
            onChanged: (val) => setState(() => _highPriority = val),
          ),
        ],
      ),
    );
  }
}
