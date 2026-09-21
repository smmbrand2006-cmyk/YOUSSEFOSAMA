import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/whatsapp_colors.dart';
import '../../providers/theme_provider.dart';

class FontSizeDialog extends StatefulWidget {
  const FontSizeDialog({super.key});

  static Future<void> show(BuildContext context) {
    return showDialog(
      context: context,
      builder: (_) => const FontSizeDialog(),
    );
  }

  @override
  State<FontSizeDialog> createState() => _FontSizeDialogState();
}

class _FontSizeDialogState extends State<FontSizeDialog> {
  late double _currentScale;

  @override
  void initState() {
    super.initState();
    _currentScale = Provider.of<ThemeProvider>(context, listen: false).fontScale;
  }

  void _applyScale(double scale, {String? preset}) {
    final clamped = (scale * 100).round() / 100.0;
    final finalScale = clamped.clamp(0.80, 1.40);
    setState(() => _currentScale = finalScale);
    Provider.of<ThemeProvider>(context, listen: false).setFontScale(finalScale, presetKey: preset);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
    final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;

    final percent = (_currentScale * 100).round();

    return AlertDialog(
      backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      titlePadding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: WhatsAppColors.primaryGreen.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.format_size_rounded, color: WhatsAppColors.primaryGreen, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "حجم خط التطبيق",
                  style: TextStyle(
                    color: primaryTextColor,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  "تكبير أو تصغير الخطوط بالكامل",
                  style: TextStyle(
                    color: secondaryTextColor,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          // Percentage badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: WhatsAppColors.primaryGreen,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              "$percent%",
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
      content: SizedBox(
        width: 360,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 10),

            // Live Preview Card (Looks like a WhatsApp Chat Bubble!)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? WhatsAppColors.outgoingBubble : WhatsAppColors.lightOutgoingBubble,
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(isDark ? 0.25 : 0.08),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.verified_user_rounded, size: 16, color: WhatsAppColors.primaryGreen),
                      const SizedBox(width: 6),
                      Text(
                        "معاينة فورية لحجم الخط:",
                        style: TextStyle(
                          color: isDark ? Colors.white70 : WhatsAppColors.lightTextSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "مرحباً بك في YOUSSEF APP! الرسائل والمكالمات مشفرة تماماً بتقنية الحماية المتقدمة.",
                    style: TextStyle(
                      color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary,
                      fontSize: 14.5,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text(
                        "10:30 م",
                        style: TextStyle(
                          color: isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary,
                          fontSize: 11,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.done_all_rounded, size: 15, color: WhatsAppColors.blueTick),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Interactive Slider with - and + buttons
            Row(
              children: [
                IconButton(
                  tooltip: "تصغير الخط",
                  icon: const Icon(Icons.remove_circle_outline_rounded, color: WhatsAppColors.primaryGreen, size: 28),
                  onPressed: _currentScale > 0.80
                      ? () => _applyScale(_currentScale - 0.05)
                      : null,
                ),
                Expanded(
                  child: SliderTheme(
                    data: SliderTheme.of(context).copyWith(
                      activeTrackColor: WhatsAppColors.primaryGreen,
                      inactiveTrackColor: isDark ? Colors.white24 : Colors.black12,
                      thumbColor: WhatsAppColors.primaryGreen,
                      overlayColor: WhatsAppColors.primaryGreen.withOpacity(0.2),
                      trackHeight: 5,
                    ),
                    child: Slider(
                      value: _currentScale,
                      min: 0.80,
                      max: 1.40,
                      divisions: 12,
                      onChanged: (val) => _applyScale(val),
                    ),
                  ),
                ),
                IconButton(
                  tooltip: "تكبير الخط",
                  icon: const Icon(Icons.add_circle_outline_rounded, color: WhatsAppColors.primaryGreen, size: 28),
                  onPressed: _currentScale < 1.40
                      ? () => _applyScale(_currentScale + 0.05)
                      : null,
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Preset Quick Buttons
            Wrap(
              spacing: 8,
              runSpacing: 6,
              alignment: WrapAlignment.center,
              children: [
                _buildPresetChip("صغير (85%)", 0.85, "small", isDark),
                _buildPresetChip("افتراضي (100%)", 1.0, "medium", isDark),
                _buildPresetChip("كبير (118%)", 1.18, "large", isDark),
                _buildPresetChip("ضخم (135%)", 1.35, "extra_large", isDark),
              ],
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () {
            _applyScale(1.0, preset: "medium");
          },
          child: const Text("إعادة للافتراضي (100%)", style: TextStyle(color: WhatsAppColors.primaryGreen)),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: WhatsAppColors.primaryGreen,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          ),
          onPressed: () {
            Navigator.pop(context);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text("تم تطبيق حجم الخط ($percent%) لكامل التطبيق بنجاح 🔤"),
                duration: const Duration(seconds: 2),
              ),
            );
          },
          child: const Text("حفظ وتطبيق", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }

  Widget _buildPresetChip(String label, double scale, String key, bool isDark) {
    final isSelected = (_currentScale - scale).abs() < 0.03;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => _applyScale(scale, preset: key),
      selectedColor: WhatsAppColors.primaryGreen,
      backgroundColor: isDark ? Colors.white10 : Colors.black.withOpacity(0.05),
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : (isDark ? Colors.white70 : Colors.black87),
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        fontSize: 12,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      side: BorderSide(
        color: isSelected ? WhatsAppColors.primaryGreen : Colors.transparent,
      ),
    );
  }
}
