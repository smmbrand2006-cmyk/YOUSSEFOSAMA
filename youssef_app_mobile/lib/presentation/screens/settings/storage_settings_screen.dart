import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/whatsapp_colors.dart';
import '../../../providers/locale_provider.dart';

class StorageSettingsScreen extends StatefulWidget {
  const StorageSettingsScreen({super.key});

  @override
  State<StorageSettingsScreen> createState() => _StorageSettingsScreenState();
}

class _StorageSettingsScreenState extends State<StorageSettingsScreen> {
  bool _autoDownloadWifi = true;
  bool _autoDownloadCellular = false;
  double _cacheSizeMb = 14.8;

  void _clearCache() {
    setState(() => _cacheSizeMb = 0.0);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("تم تفريغ الذاكرة المؤقتة بنجاح وتحرير المساحة 🧹")),
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
        title: Text(locale.t('storage')),
      ),
      body: ListView(
        children: [
          // Storage overview
          Padding(
            padding: const EdgeInsets.all(16),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(isDark ? 0.2 : 0.05),
                    blurRadius: 6,
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("إدارة مساحة التخزين", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("${_cacheSizeMb.toStringAsFixed(1)} MB مستخدمة", style: const TextStyle(color: WhatsAppColors.primaryGreen, fontWeight: FontWeight.w600)),
                      Text("64 GB المساحة المتبقية", style: TextStyle(color: secondaryTextColor, fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: _cacheSizeMb > 0 ? 0.22 : 0.02,
                      backgroundColor: isDark ? Colors.white12 : Colors.black12,
                      color: WhatsAppColors.primaryGreen,
                      minHeight: 8,
                    ),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: _cacheSizeMb > 0 ? _clearCache : null,
                    icon: const Icon(Icons.cleaning_services_rounded, size: 16),
                    label: const Text("تفريغ الذاكرة المؤقتة"),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: WhatsAppColors.primaryGreen,
                      side: const BorderSide(color: WhatsAppColors.primaryGreen),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Divider(),

          // Network usage
          ListTile(
            leading: Icon(Icons.data_usage_rounded, color: iconColor),
            title: Text("استخدام الشبكة", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text("المرسل: 2.4 MB • المستلم: 8.9 MB", style: TextStyle(color: secondaryTextColor, fontSize: 12.5)),
            trailing: Icon(Icons.arrow_forward_ios_rounded, color: secondaryTextColor, size: 14),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("استهلاك الشبكة ومعدل نقل البيانات في المعدل الطبيعي والموفر.")),
              );
            },
          ),
          const Divider(),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Text("التنزيل التلقائي للوسائط", style: const TextStyle(color: WhatsAppColors.primaryGreen, fontSize: 13, fontWeight: FontWeight.bold)),
          ),

          // Wi-Fi auto download
          SwitchListTile(
            secondary: Icon(Icons.wifi_rounded, color: iconColor),
            title: Text("أثناء الاتصال بشبكة Wi-Fi", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text("تنزيل الصور والمستندات الصوتية تلقائياً", style: TextStyle(color: secondaryTextColor, fontSize: 12.5)),
            value: _autoDownloadWifi,
            activeColor: WhatsAppColors.primaryGreen,
            onChanged: (val) => setState(() => _autoDownloadWifi = val),
          ),

          // Cellular auto download
          SwitchListTile(
            secondary: Icon(Icons.network_cell_rounded, color: iconColor),
            title: Text("أثناء استخدام بيانات الهاتف", style: TextStyle(color: primaryTextColor, fontWeight: FontWeight.w600)),
            subtitle: Text("توفير باقة الإنترنت والتنزيل عند النقر فقط", style: TextStyle(color: secondaryTextColor, fontSize: 12.5)),
            value: _autoDownloadCellular,
            activeColor: WhatsAppColors.primaryGreen,
            onChanged: (val) => setState(() => _autoDownloadCellular = val),
          ),
        ],
      ),
    );
  }
}
