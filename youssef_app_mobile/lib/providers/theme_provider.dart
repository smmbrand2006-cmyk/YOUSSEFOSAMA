import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeProvider extends ChangeNotifier {
  static const String _prefKey = 'app_theme_mode';
  static const String _fontScaleKey = 'app_font_scale_factor';
  static const String _fontSizeKeyPref = 'app_font_size_key';

  String _themeModeString = 'dark'; // 'dark' | 'light' | 'system'
  double _fontScale = 1.0;
  String _fontSizeKey = 'medium'; // 'small' | 'medium' | 'large' | 'extra_large'

  String get themeModeString => _themeModeString;
  double get fontScale => _fontScale;
  String get fontSizeKey => _fontSizeKey;

  ThemeMode get themeMode {
    switch (_themeModeString) {
      case 'light':
        return ThemeMode.light;
      case 'system':
        return ThemeMode.system;
      case 'dark':
      default:
        return ThemeMode.dark;
    }
  }

  bool get isDark {
    if (_themeModeString == 'light') return false;
    if (_themeModeString == 'dark') return true;
    return WidgetsBinding.instance.platformDispatcher.platformBrightness == Brightness.dark;
  }

  String get currentThemeTitle {
    switch (_themeModeString) {
      case 'light':
        return "فاتح (White Mode) ☀️";
      case 'system':
        return "الافتراضي للنظام (System) ⚙️";
      case 'dark':
      default:
        return "داكن (Dark Mode) 🌙";
    }
  }

  String get currentFontSizeTitle {
    switch (_fontSizeKey) {
      case 'small':
        return "صغير (85%)";
      case 'large':
        return "كبير (118%)";
      case 'extra_large':
        return "كبير جداً (135%)";
      case 'medium':
      default:
        return "متوسط - افتراضي (${(_fontScale * 100).toInt()}%)";
    }
  }

  ThemeProvider() {
    _loadSavedSettings();
  }

  Future<void> _loadSavedSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_prefKey);
      if (saved != null && ['dark', 'light', 'system'].contains(saved)) {
        _themeModeString = saved;
      }

      final savedScale = prefs.getDouble(_fontScaleKey);
      if (savedScale != null && savedScale >= 0.75 && savedScale <= 1.5) {
        _fontScale = savedScale;
      }

      final savedKey = prefs.getString(_fontSizeKeyPref);
      if (savedKey != null) {
        _fontSizeKey = savedKey;
      }
      notifyListeners();
    } catch (_) {}
  }

  Future<void> setTheme(String mode) async {
    if (_themeModeString == mode) return;
    _themeModeString = mode;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKey, mode);
    } catch (_) {}
  }

  Future<void> setFontScale(double scale, {String? presetKey}) async {
    final clamped = (scale * 100).round() / 100.0;
    _fontScale = clamped.clamp(0.75, 1.45);
    if (presetKey != null) {
      _fontSizeKey = presetKey;
    } else {
      if (_fontScale <= 0.88) {
        _fontSizeKey = 'small';
      } else if (_fontScale <= 1.08) {
        _fontSizeKey = 'medium';
      } else if (_fontScale <= 1.25) {
        _fontSizeKey = 'large';
      } else {
        _fontSizeKey = 'extra_large';
      }
    }
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setDouble(_fontScaleKey, _fontScale);
      await prefs.setString(_fontSizeKeyPref, _fontSizeKey);
    } catch (_) {}
  }

  Future<void> setFontSizePreset(String preset) async {
    double scale = 1.0;
    switch (preset) {
      case 'small':
        scale = 0.85;
        break;
      case 'medium':
        scale = 1.0;
        break;
      case 'large':
        scale = 1.18;
        break;
      case 'extra_large':
        scale = 1.35;
        break;
    }
    await setFontScale(scale, presetKey: preset);
  }
}
