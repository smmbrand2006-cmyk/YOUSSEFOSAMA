import 'package:flutter/material.dart';
import '../../core/constants/whatsapp_colors.dart';

class WhatsAppWallpaper extends StatelessWidget {
  final Widget child;

  const WhatsAppWallpaper({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      color: isDark ? WhatsAppColors.chatBackground : WhatsAppColors.lightChatBackground,
      child: CustomPaint(
        painter: _WhatsAppDoodlePainter(isDark: isDark),
        child: child,
      ),
    );
  }
}

class _WhatsAppDoodlePainter extends CustomPainter {
  final bool isDark;
  _WhatsAppDoodlePainter({this.isDark = true});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = isDark
          ? const Color(0xFF182229).withOpacity(0.35)
          : const Color(0xFFD1D7DB).withOpacity(0.55)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;


    const spacing = 70.0;
    for (double x = 20; x < size.width; x += spacing) {
      for (double y = 20; y < size.height; y += spacing) {
        // Draw small subtle WhatsApp icons (chat bubble, heart, coffee, smiley)
        final index = ((x + y) ~/ spacing) % 4;
        switch (index) {
          case 0:
            // Chat bubble doodle
            canvas.drawRRect(
              RRect.fromRectAndRadius(
                Rect.fromCenter(center: Offset(x, y), width: 14, height: 10),
                const Radius.circular(3),
              ),
              paint,
            );
            break;
          case 1:
            // Small circle / emoji
            canvas.drawCircle(Offset(x, y), 5, paint);
            break;
          case 2:
            // Star or cross
            canvas.drawLine(Offset(x - 4, y), Offset(x + 4, y), paint);
            canvas.drawLine(Offset(x, y - 4), Offset(x, y + 4), paint);
            break;
          case 3:
            // Curved arc
            canvas.drawArc(
              Rect.fromCenter(center: Offset(x, y), width: 10, height: 10),
              0,
              3.14,
              false,
              paint,
            );
            break;
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
