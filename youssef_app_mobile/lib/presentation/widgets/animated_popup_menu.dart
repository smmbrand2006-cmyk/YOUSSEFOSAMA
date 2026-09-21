import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/constants/whatsapp_colors.dart';

class AnimatedMenuItem {
  final String id;
  final String title;
  final String? subtitle;
  final IconData icon;
  final Color iconColor;
  final VoidCallback onTap;
  final bool isDestructive;

  const AnimatedMenuItem({
    required this.id,
    required this.title,
    this.subtitle,
    required this.icon,
    this.iconColor = WhatsAppColors.primaryGreen,
    required this.onTap,
    this.isDestructive = false,
  });
}

class AnimatedThreeDotsMenuButton extends StatefulWidget {
  final List<AnimatedMenuItem> items;
  final bool isDark;

  const AnimatedThreeDotsMenuButton({
    super.key,
    required this.items,
    required this.isDark,
  });

  @override
  State<AnimatedThreeDotsMenuButton> createState() => _AnimatedThreeDotsMenuButtonState();
}

class _AnimatedThreeDotsMenuButtonState extends State<AnimatedThreeDotsMenuButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _rotationController;

  @override
  void initState() {
    super.initState();
    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
    );
  }

  @override
  void dispose() {
    _rotationController.dispose();
    super.dispose();
  }

  void _showMenu(BuildContext context) {
    HapticFeedback.lightImpact();
    _rotationController.forward().then((_) => _rotationController.reverse());

    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'DismissMenu',
      barrierColor: Colors.black.withOpacity(0.45),
      transitionDuration: const Duration(milliseconds: 280),
      pageBuilder: (ctx, anim1, anim2) => const SizedBox(),
      transitionBuilder: (ctx, anim, secondaryAnim, child) {
        final curved = CurvedAnimation(parent: anim, curve: Curves.easeOutBack);
        final opacity = CurvedAnimation(parent: anim, curve: Curves.easeIn);

        return BackdropFilter(
          filter: ui.ImageFilter.blur(
            sigmaX: 5 * anim.value,
            sigmaY: 5 * anim.value,
          ),
          child: Stack(
            children: [
              // Tap outside to close
              GestureDetector(
                onTap: () => Navigator.of(ctx).pop(),
                behavior: HitTestBehavior.translucent,
                child: const SizedBox.expand(),
              ),

              // Menu Box
              Positioned(
                top: 50,
                right: 16,
                child: Transform.scale(
                  scale: curved.value,
                  alignment: Alignment.topRight,
                  child: Opacity(
                    opacity: opacity.value,
                    child: Material(
                      color: Colors.transparent,
                      child: Container(
                        width: 250,
                        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
                        decoration: BoxDecoration(
                          color: widget.isDark
                              ? const Color(0xFF17222B).withOpacity(0.95)
                              : Colors.white.withOpacity(0.96),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: WhatsAppColors.primaryGreen.withOpacity(0.35),
                            width: 1.2,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.45),
                              blurRadius: 28,
                              offset: const Offset(0, 12),
                            ),
                            BoxShadow(
                              color: WhatsAppColors.primaryGreen.withOpacity(0.12),
                              blurRadius: 16,
                              spreadRadius: 1,
                            ),
                          ],
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: widget.items.asMap().entries.map((entry) {
                            final idx = entry.key;
                            final item = entry.value;

                            return _buildMenuItem(
                              ctx: ctx,
                              item: item,
                              index: idx,
                              total: widget.items.length,
                              anim: anim,
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMenuItem({
    required BuildContext ctx,
    required AnimatedMenuItem item,
    required int index,
    required int total,
    required Animation<double> anim,
  }) {
    final isDestructive = item.isDestructive;
    final primaryTextColor = isDestructive
        ? const Color(0xFFEF4444)
        : (widget.isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary);

    return InkWell(
      onTap: () {
        HapticFeedback.selectionClick();
        Navigator.of(ctx).pop();
        item.onTap();
      },
      borderRadius: BorderRadius.circular(14),
      splashColor: (isDestructive ? Colors.red : WhatsAppColors.primaryGreen).withOpacity(0.15),
      highlightColor: (isDestructive ? Colors.red : WhatsAppColors.primaryGreen).withOpacity(0.08),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
        child: Row(
          children: [
            // Icon container with soft glow
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: (isDestructive ? Colors.red : item.iconColor).withOpacity(0.14),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: (isDestructive ? Colors.red : item.iconColor).withOpacity(0.28),
                  width: 1,
                ),
              ),
              child: Icon(
                item.icon,
                size: 20,
                color: isDestructive ? const Color(0xFFEF4444) : item.iconColor,
              ),
            ),
            const SizedBox(width: 12),

            // Title & Subtitle
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    item.title,
                    style: TextStyle(
                      color: primaryTextColor,
                      fontSize: 14.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (item.subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      item.subtitle!,
                      style: TextStyle(
                        color: widget.isDark ? Colors.white38 : Colors.black38,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return RotationTransition(
      turns: Tween(begin: 0.0, end: 0.25).animate(
        CurvedAnimation(parent: _rotationController, curve: Curves.easeInOut),
      ),
      child: IconButton(
        icon: const Icon(Icons.more_vert_rounded),
        tooltip: 'المزيد من الخيارات',
        onPressed: () => _showMenu(context),
      ),
    );
  }
}
