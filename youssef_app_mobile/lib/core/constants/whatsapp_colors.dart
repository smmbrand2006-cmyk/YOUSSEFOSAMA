import 'package:flutter/material.dart';

/// Authentic WhatsApp Dark Mode Colors & Tokens
class WhatsAppColors {
  WhatsAppColors._();

  // Primary brand colors
  static const Color primaryGreen = Color(0xFF00A884); // WhatsApp emerald green
  static const Color darkGreen = Color(0xFF008069);
  static const Color lightGreen = Color(0xFF25D366);
  static const Color teaGreen = Color(0xFFD9FDD3);

  // Background surfaces (WhatsApp Dark Mode)
  static const Color background = Color(0xFF111B21); // Main window background
  static const Color appBarColor = Color(0xFF1F2C34); // Header / App bar
  static const Color chatBackground = Color(0xFF0B141A); // Chat canvas dark wallpaper
  static const Color surfaceCard = Color(0xFF1F2C34); // Cards & modals
  static const Color searchBarBg = Color(0xFF1F2C34); // Search capsule
  static const Color searchBarInput = Color(0xFF2A3942); // Search field inner

  // Message Bubbles
  static const Color outgoingBubble = Color(0xFF005C4B); // Sent message bubble
  static const Color incomingBubble = Color(0xFF202C33); // Received message bubble

  // Text Colors
  static const Color textPrimary = Color(0xFFE9EDEF); // White/silver primary text
  static const Color textSecondary = Color(0xFF8696A0); // Grey subtitle/time text
  static const Color textMuted = Color(0xFF667781);
  static const Color textLink = Color(0xFF53BDEB);

  // Ticks & Receipts
  static const Color blueTick = Color(0xFF53BDEB); // Read receipt double check
  static const Color greyTick = Color(0xFF8696A0); // Sent/delivered check

  // Accents & Badges
  static const Color unreadBadge = Color(0xFF00A884); // Green circle with count
  static const Color fabGreen = Color(0xFF00A884); // Floating action button
  static const Color iconDefault = Color(0xFFAEBAC1); // WhatsApp top icon tint
  static const Color divider = Color(0xFF202C33); // Thin item separator
  static const Color danger = Color(0xFFEA4335); // Delete/Block red
}
