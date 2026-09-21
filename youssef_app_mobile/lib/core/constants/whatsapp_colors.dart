import 'package:flutter/material.dart';

/// Authentic WhatsApp Colors & Tokens for both Dark Mode and Light Mode (White Mode)
class WhatsAppColors {
  WhatsAppColors._();

  // Primary brand colors
  static const Color primaryGreen = Color(0xFF00A884); // WhatsApp emerald green
  static const Color darkGreen = Color(0xFF008069);
  static const Color lightGreen = Color(0xFF25D366);
  static const Color teaGreen = Color(0xFFD9FDD3);

  // Dark Mode Tokens
  static const Color background = Color(0xFF111B21);
  static const Color appBarColor = Color(0xFF1F2C34);
  static const Color chatBackground = Color(0xFF0B141A);
  static const Color surfaceCard = Color(0xFF1F2C34);
  static const Color surface = surfaceCard;
  static const Color searchBarBg = Color(0xFF1F2C34);
  static const Color searchBarInput = Color(0xFF2A3942);
  static const Color outgoingBubble = Color(0xFF005C4B);
  static const Color incomingBubble = Color(0xFF202C33);
  static const Color textPrimary = Color(0xFFE9EDEF);
  static const Color textSecondary = Color(0xFF8696A0);
  static const Color textMuted = Color(0xFF667781);
  static const Color textLink = Color(0xFF53BDEB);

  // Light Mode Tokens (White Mode)
  static const Color lightBackground = Color(0xFFFFFFFF);
  static const Color lightAppBarColor = Color(0xFFFFFFFF);
  static const Color lightChatBackground = Color(0xFFEFEAE2);
  static const Color lightSurfaceCard = Color(0xFFFFFFFF);
  static const Color lightSearchBarBg = Color(0xFFF0F2F5);
  static const Color lightOutgoingBubble = Color(0xFFD9FDD3);
  static const Color lightIncomingBubble = Color(0xFFFFFFFF);
  static const Color lightTextPrimary = Color(0xFF111B21);
  static const Color lightTextSecondary = Color(0xFF667781);
  static const Color lightIconDefault = Color(0xFF54656F);
  static const Color lightDivider = Color(0xFFE9EDEF);

  // Ticks & Receipts
  static const Color blueTick = Color(0xFF53BDEB);
  static const Color greyTick = Color(0xFF8696A0);

  // Accents & Badges
  static const Color unreadBadge = Color(0xFF00A884);
  static const Color fabGreen = Color(0xFF00A884);
  static const Color iconDefault = Color(0xFFAEBAC1);
  static const Color divider = Color(0xFF202C33);
  static const Color danger = Color(0xFFEA4335);

  // Dynamic color helpers based on brightness
  static Color getBackground(bool isDark) => isDark ? background : lightBackground;
  static Color getAppBarColor(bool isDark) => isDark ? appBarColor : lightAppBarColor;
  static Color getChatBackground(bool isDark) => isDark ? chatBackground : lightChatBackground;
  static Color getSurfaceCard(bool isDark) => isDark ? surfaceCard : lightSurfaceCard;
  static Color getOutgoingBubble(bool isDark) => isDark ? outgoingBubble : lightOutgoingBubble;
  static Color getIncomingBubble(bool isDark) => isDark ? incomingBubble : lightIncomingBubble;
  static Color getTextPrimary(bool isDark) => isDark ? textPrimary : lightTextPrimary;
  static Color getTextSecondary(bool isDark) => isDark ? textSecondary : lightTextSecondary;
  static Color getIconDefault(bool isDark) => isDark ? iconDefault : lightIconDefault;
  static Color getDivider(bool isDark) => isDark ? divider : lightDivider;
  static Color getSearchBarBg(bool isDark) => isDark ? searchBarBg : lightSearchBarBg;

  // Context-aware dynamic getters
  static bool isDarkMode(BuildContext context) => Theme.of(context).brightness == Brightness.dark;
  static Color backgroundOf(BuildContext context) => isDarkMode(context) ? background : lightBackground;
  static Color appBarColorOf(BuildContext context) => isDarkMode(context) ? appBarColor : lightAppBarColor;
  static Color chatBackgroundOf(BuildContext context) => isDarkMode(context) ? chatBackground : lightChatBackground;
  static Color surfaceOf(BuildContext context) => isDarkMode(context) ? surfaceCard : lightSurfaceCard;
  static Color outgoingBubbleOf(BuildContext context) => isDarkMode(context) ? outgoingBubble : lightOutgoingBubble;
  static Color incomingBubbleOf(BuildContext context) => isDarkMode(context) ? incomingBubble : lightIncomingBubble;
  static Color textPrimaryOf(BuildContext context) => isDarkMode(context) ? textPrimary : lightTextPrimary;
  static Color textSecondaryOf(BuildContext context) => isDarkMode(context) ? textSecondary : lightTextSecondary;
  static Color iconDefaultOf(BuildContext context) => isDarkMode(context) ? iconDefault : lightIconDefault;
  static Color dividerOf(BuildContext context) => isDarkMode(context) ? divider : lightDivider;
  static Color searchBarBgOf(BuildContext context) => isDarkMode(context) ? searchBarBg : lightSearchBarBg;
}

