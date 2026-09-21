import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants/whatsapp_colors.dart';

class WhatsAppTheme {
  WhatsAppTheme._();

  /// Dark Theme (Dark Mode)
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
      tabBarTheme: const TabBarThemeData(
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
      dialogTheme: DialogThemeData(
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
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: WhatsAppColors.appBarColor,
        surfaceTintColor: Colors.transparent,
        indicatorColor: WhatsAppColors.primaryGreen.withOpacity(0.15),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const TextStyle(
              color: WhatsAppColors.primaryGreen,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            );
          }
          return const TextStyle(
            color: WhatsAppColors.textSecondary,
            fontSize: 11,
            fontWeight: FontWeight.w500,
          );
        }),
      ),
    );
  }

  /// Light Theme (White Mode / الوضع الفاتح)
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: WhatsAppColors.lightBackground,
      primaryColor: WhatsAppColors.primaryGreen,
      colorScheme: const ColorScheme.light(
        primary: WhatsAppColors.primaryGreen,
        secondary: WhatsAppColors.primaryGreen,
        surface: WhatsAppColors.lightSurfaceCard,
        error: WhatsAppColors.danger,
        onPrimary: Colors.white,
        onSurface: WhatsAppColors.lightTextPrimary,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: WhatsAppColors.lightAppBarColor,
        foregroundColor: WhatsAppColors.lightTextPrimary,
        elevation: 0.5,
        centerTitle: false,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: WhatsAppColors.lightAppBarColor,
          statusBarIconBrightness: Brightness.dark,
          systemNavigationBarColor: WhatsAppColors.lightBackground,
          systemNavigationBarIconBrightness: Brightness.dark,
        ),
        titleTextStyle: TextStyle(
          color: WhatsAppColors.lightTextPrimary,
          fontSize: 20,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.2,
        ),
        iconTheme: IconThemeData(
          color: WhatsAppColors.lightIconDefault,
          size: 24,
        ),
        actionsIconTheme: IconThemeData(
          color: WhatsAppColors.lightIconDefault,
          size: 24,
        ),
      ),
      tabBarTheme: const TabBarThemeData(
        indicatorColor: WhatsAppColors.primaryGreen,
        indicatorSize: TabBarIndicatorSize.tab,
        labelColor: WhatsAppColors.primaryGreen,
        unselectedLabelColor: WhatsAppColors.lightTextSecondary,
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
        color: WhatsAppColors.lightDivider,
        thickness: 0.6,
        space: 0,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: WhatsAppColors.lightSurfaceCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        titleTextStyle: const TextStyle(
          color: WhatsAppColors.lightTextPrimary,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
        contentTextStyle: const TextStyle(
          color: WhatsAppColors.lightTextSecondary,
          fontSize: 14,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: WhatsAppColors.lightSearchBarBg,
        hintStyle: const TextStyle(color: WhatsAppColors.lightTextSecondary, fontSize: 14),
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
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: WhatsAppColors.lightAppBarColor,
        surfaceTintColor: Colors.transparent,
        indicatorColor: WhatsAppColors.primaryGreen.withOpacity(0.12),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const TextStyle(
              color: WhatsAppColors.primaryGreen,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            );
          }
          return const TextStyle(
            color: WhatsAppColors.lightTextSecondary,
            fontSize: 11,
            fontWeight: FontWeight.w500,
          );
        }),
      ),
    );
  }
}
