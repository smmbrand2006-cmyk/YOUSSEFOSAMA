import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants/whatsapp_colors.dart';

class WhatsAppTheme {
  WhatsAppTheme._();

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: WhatsAppColors.background,
      primaryColor: WhatsAppColors.primaryGreen,
      colorScheme: const ColorScheme.dark(
        primary: WhatsAppColors.primaryGreen,
        secondary: WhatsAppColors.primaryGreen,
        surface: WhatsAppColors.appBarColor,
        error: WhatsAppColors.danger,
        onPrimary: Colors.black,
        onSurface: WhatsAppColors.textPrimary,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: WhatsAppColors.appBarColor,
        foregroundColor: WhatsAppColors.textPrimary,
        elevation: 0,
        centerTitle: false,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: WhatsAppColors.appBarColor,
          statusBarIconBrightness: Brightness.light,
          systemNavigationBarColor: WhatsAppColors.background,
          systemNavigationBarIconBrightness: Brightness.light,
        ),
        titleTextStyle: TextStyle(
          color: WhatsAppColors.textPrimary,
          fontSize: 20,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.2,
        ),
        iconTheme: IconThemeData(
          color: WhatsAppColors.iconDefault,
          size: 24,
        ),
        actionsIconTheme: IconThemeData(
          color: WhatsAppColors.iconDefault,
          size: 24,
        ),
      ),
      tabBarTheme: const TabBarTheme(
        indicatorColor: WhatsAppColors.primaryGreen,
        indicatorSize: TabBarIndicatorSize.tab,
        labelColor: WhatsAppColors.primaryGreen,
        unselectedLabelColor: WhatsAppColors.textSecondary,
        labelStyle: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
        ),
        unselectedLabelStyle: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: WhatsAppColors.fabGreen,
        foregroundColor: Colors.white,
        elevation: 4,
        shape: CircleBorder(),
      ),
      dividerTheme: const DividerThemeData(
        color: WhatsAppColors.divider,
        thickness: 0.6,
        space: 0,
      ),
      dialogTheme: DialogTheme(
        backgroundColor: WhatsAppColors.surfaceCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        titleTextStyle: const TextStyle(
          color: WhatsAppColors.textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
        contentTextStyle: const TextStyle(
          color: WhatsAppColors.textSecondary,
          fontSize: 14,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: WhatsAppColors.searchBarBg,
        hintStyle: const TextStyle(color: WhatsAppColors.textSecondary, fontSize: 14),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: const BorderSide(color: WhatsAppColors.primaryGreen, width: 1.5),
        ),
      ),
    );
  }
}
