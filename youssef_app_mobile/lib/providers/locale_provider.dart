import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocaleProvider extends ChangeNotifier {
  static const String _prefKey = 'app_language_code';

  String _languageCode = 'ar'; // Default: Arabic

  String get languageCode => _languageCode;
  bool get isRtl => _languageCode == 'ar';

  String get currentLanguageTitle {
    switch (_languageCode) {
      case 'en':
        return 'English';
      case 'franco':
        return 'Franco-Arabic (3arabizi)';
      case 'ar':
      default:
        return 'العربية (لغة الجهاز)';
    }
  }

  LocaleProvider() {
    _loadSavedLanguage();
  }

  Future<void> _loadSavedLanguage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_prefKey);
      if (saved != null && ['ar', 'en', 'franco'].contains(saved)) {
        _languageCode = saved;
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> setLanguage(String code) async {
    if (_languageCode == code) return;
    _languageCode = code;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKey, code);
    } catch (_) {}
  }

  /// Translation dictionary for keys across the application
  String t(String key) {
    final Map<String, Map<String, String>> strings = {
      // Home & Tabs
      'app_title': {
        'ar': 'YOUSSEF APP',
        'en': 'YOUSSEF APP',
        'franco': 'YOUSSEF APP',
      },
      'chats': {
        'ar': 'الدردشات',
        'en': 'Chats',
        'franco': 'Chats',
      },
      'updates': {
        'ar': 'المستجدات',
        'en': 'Updates',
        'franco': 'Updates',
      },
      'communities': {
        'ar': 'المجتمعات',
        'en': 'Communities',
        'franco': 'Communities',
      },
      'calls': {
        'ar': 'المكالمات',
        'en': 'Calls',
        'franco': 'Calls',
      },

      // Menu
      'new_group': {
        'ar': 'مجموعة جديدة',
        'en': 'New group',
        'franco': 'New group',
      },
      'profile': {
        'ar': 'الملف الشخصي',
        'en': 'Profile',
        'franco': 'Profile',
      },
      'starred_messages': {
        'ar': 'الرسائل المميزة',
        'en': 'Starred messages',
        'franco': 'Starred msg',
      },
      'settings': {
        'ar': 'الإعدادات',
        'en': 'Settings',
        'franco': 'Settings',
      },

      // Settings Screen
      'account': {
        'ar': 'الحساب',
        'en': 'Account',
        'franco': 'Account',
      },
      'account_sub': {
        'ar': 'إشعارات الأمان، تعديل البيانات، تسجيل الخروج، حذف الحساب',
        'en': 'Security notifications, edit info, sign out, delete account',
        'franco': 'Security, edit data, logout, delete account',
      },
      'privacy': {
        'ar': 'الخصوصية',
        'en': 'Privacy',
        'franco': 'Privacy',
      },
      'privacy_sub': {
        'ar': 'آخر ظهور، الصورة الشخصية، مؤشرات القراءة، حظر جهات الاتصال',
        'en': 'Last seen, profile photo, read receipts, blocked contacts',
        'franco': 'Last seen, profile pic, blue ticks, block list',
      },
      'chat_settings': {
        'ar': 'الدردشات',
        'en': 'Chats',
        'franco': 'Chats',
      },
      'chat_settings_sub': {
        'ar': 'المظهر، خلفيات الشاشة، مفتاح الإدخال للإرسال، مسح السجل',
        'en': 'Theme, wallpapers, enter is send, clear history',
        'franco': 'Theme, wallpaper, enter send, clear chats',
      },
      'notifications': {
        'ar': 'الإشعارات',
        'en': 'Notifications',
        'franco': 'Notifications',
      },
      'notifications_sub': {
        'ar': 'نغمات الرسائل، رنين المكالمات، الاهتزاز، معاينة الأصوات',
        'en': 'Message tones, ringtones, vibration, preview sounds',
        'franco': 'Msg sounds, ringtones, vibration, preview',
      },
      'storage': {
        'ar': 'التخزين والبيانات',
        'en': 'Storage and Data',
        'franco': 'Storage & Data',
      },
      'storage_sub': {
        'ar': 'إدارة مساحة التخزين، التنزيل التلقائي، تفريغ الذاكرة المؤقتة',
        'en': 'Manage storage, auto download, clear cache',
        'franco': 'Manage space, auto download, clear cache',
      },
      'app_language': {
        'ar': 'لغة التطبيق',
        'en': 'App Language',
        'franco': 'App Language',
      },
      'help': {
        'ar': 'المساعدة',
        'en': 'Help',
        'franco': 'Help & Support',
      },
      'help_sub': {
        'ar': 'تواصل مع الدعم الفني (#123)، الأسئلة الشائعة، معلومات التطبيق',
        'en': 'Contact support (#123), FAQ, app info',
        'franco': 'Support chat (#123), FAQ, app info',
      },
      'invite_friend': {
        'ar': 'دعوة صديق',
        'en': 'Invite a friend',
        'franco': 'Invite a friend',
      },
      'invite_friend_sub': {
        'ar': 'شارك رابط تحميل التطبيق وتواصل مع أصدقائك',
        'en': 'Share app download link and connect with friends',
        'franco': 'Share APK link ma3 sohabak',
      },

      // Language Screen
      'choose_language': {
        'ar': 'اختر لغة واجهة التطبيق المفضلة لديك:',
        'en': 'Choose your preferred app interface language:',
        'franco': 'Ekhtar loghet el-application el-mofaddala:',
      },
      'lang_changed': {
        'ar': 'تم تغيير لغة التطبيق بنجاح 🌐',
        'en': 'App language changed successfully 🌐',
        'franco': 'Loghet el-app etghayyaret benaga7 🌐',
      },

      // Calls Tab
      'create_call_link': {
        'ar': 'إنشاء رابط مكالمة',
        'en': 'Create call link',
        'franco': 'Create call link',
      },
      'call_link_sub': {
        'ar': 'مشاركة رابط لمكالمتك مع أي شخص',
        'en': 'Share a link for your call with anyone',
        'franco': 'Share link el-mokalma ma3 ay 7ad',
      },
      'recent_calls': {
        'ar': 'الأخيرة',
        'en': 'Recent',
        'franco': 'Recent',
      },
      'tech_support': {
        'ar': 'الدعم الفني الرسمي (#123)',
        'en': 'Official Tech Support (#123)',
        'franco': 'Official Support (#123)',
      },
      'call_copied': {
        'ar': 'تم نسخ رابط المكالمة السريعة المشفرة بنجاح 📋',
        'en': 'Encrypted call link copied to clipboard 📋',
        'franco': 'Call link etnasa5 fel-clipboard 📋',
      },

      // Status Tab
      'my_status': {
        'ar': 'حالتي',
        'en': 'My Status',
        'franco': 'My Status',
      },
      'add_status_sub': {
        'ar': 'انقر لإضافة تحديث إلى حالتك',
        'en': 'Tap to add status update',
        'franco': 'Dous 3ashan t7ot status',
      },
      'active_statuses': {
        'ar': 'حالة نشطة • انقر للعرض',
        'en': 'active updates • Tap to view',
        'franco': 'active status • Tap to view',
      },
      'recent_updates': {
        'ar': 'المستجدات الحديثة',
        'en': 'Recent updates',
        'franco': 'Recent updates',
      },

      // Common
      'cancel': {
        'ar': 'إلغاء',
        'en': 'Cancel',
        'franco': 'Cancel',
      },
      'save': {
        'ar': 'حفظ',
        'en': 'Save',
        'franco': 'Save',
      },
      'delete': {
        'ar': 'حذف',
        'en': 'Delete',
        'franco': 'Delete',
      },
      'search': {
        'ar': 'بحث...',
        'en': 'Search...',
        'franco': 'Search...',
      },

      // Profile Screen
      'profile_title': {
        'ar': 'الملف الشخصي',
        'en': 'Profile',
        'franco': 'Profile',
      },
      'name': {
        'ar': 'الاسم',
        'en': 'Name',
        'franco': 'Name',
      },
      'about': {
        'ar': 'النبذة التعريفية (Bio)',
        'en': 'About',
        'franco': 'About',
      },
      'phone_number': {
        'ar': 'رقم الهاتف',
        'en': 'Phone number',
        'franco': 'Phone number',
      },
      'user_code': {
        'ar': 'كود المستخدم الفريد',
        'en': 'Unique User Code',
        'franco': 'User Code',
      },
      'code_copied': {
        'ar': 'تم نسخ كود المستخدم إلى الحافظة 📋',
        'en': 'User code copied to clipboard 📋',
        'franco': 'User code etnasa5 📋',
      },
      'avatar_updated': {
        'ar': 'تم تحديث الصورة الشخصية بنجاح 📷',
        'en': 'Profile picture updated successfully 📷',
        'franco': 'Profile picture updated 📷',
      },
      'choose_avatar': {
        'ar': 'صورة الملف الشخصي',
        'en': 'Profile photo',
        'franco': 'Profile photo',
      },
      'camera': {
        'ar': 'الكاميرا',
        'en': 'Camera',
        'franco': 'Camera',
      },
      'gallery': {
        'ar': 'المعرض',
        'en': 'Gallery',
        'franco': 'Gallery',
      },
      'preset_avatars': {
        'ar': 'صور رمزية مميزة',
        'en': 'Preset Avatars',
        'franco': 'Avatars',
      },
      'remove_photo': {
        'ar': 'إزالة الصورة',
        'en': 'Remove photo',
        'franco': 'Remove photo',
      },

      // Chat Settings Screen
      'display_and_theme': {
        'ar': 'المظهر والعرض',
        'en': 'Display & Theme',
        'franco': 'Display & Theme',
      },
      'theme': {
        'ar': 'المظهر',
        'en': 'Theme',
        'franco': 'Theme',
      },
      'wallpaper': {
        'ar': 'خلفية الشاشة',
        'en': 'Wallpaper',
        'franco': 'Wallpaper',
      },
      'wallpaper_sub': {
        'ar': 'تغيير صورة ولون خلفية شاشة المحادثات',
        'en': 'Change chat wallpaper theme and style',
        'franco': 'Change chat wallpaper',
      },
      'chat_settings_section': {
        'ar': 'إعدادات الدردشة',
        'en': 'Chat settings',
        'franco': 'Chat settings',
      },
      'enter_is_send': {
        'ar': 'مفتاح الإدخال للإرسال',
        'en': 'Enter is send',
        'franco': 'Enter is send',
      },
      'enter_is_send_sub': {
        'ar': 'سيؤدي الضغط على مفتاح Enter إلى إرسال رسالتك فوراً',
        'en': 'Enter key will send your message immediately',
        'franco': 'Enter key will send message',
      },
      'media_visibility': {
        'ar': 'رؤية الوسائط',
        'en': 'Media visibility',
        'franco': 'Media visibility',
      },
      'media_visibility_sub': {
        'ar': 'إظهار الوسائط التي تم تنزيلها حديثاً في معرض هاتفك',
        'en': 'Show newly downloaded media in your phone gallery',
        'franco': 'Show media in gallery',
      },
      'font_size': {
        'ar': 'حجم الخط',
        'en': 'Font size',
        'franco': 'Font size',
      },
      'clear_chats': {
        'ar': 'مسح سجل الدردشات',
        'en': 'Clear all chats',
        'franco': 'Clear all chats',
      },
      'clear_chats_sub': {
        'ar': 'مسح كافة الرسائل والمحادثات المخزنة محلياً',
        'en': 'Clear all messages and local chat history',
        'franco': 'Clear chat history',
      },
      'font_small': {
        'ar': 'صغير',
        'en': 'Small',
        'franco': 'Small',
      },
      'font_medium': {
        'ar': 'متوسط',
        'en': 'Medium',
        'franco': 'Medium',
      },
      'font_large': {
        'ar': 'كبير',
        'en': 'Large',
        'franco': 'Large',
      },

      // Communities
      'communities_title': {
        'ar': 'حافظ على تواصل مجتمعك',
        'en': 'Stay connected with your community',
        'franco': 'Stay connected with your community',
      },
      'communities_desc': {
        'ar': 'تتيح لك المجتمعات الجمع بين المجموعات ذات الاهتمامات المشتركة وإرسال إعلانات لجميع الأعضاء بسهولة.',
        'en': 'Communities bring related groups together and make it easy to manage group conversations.',
        'franco': 'Communities bring related groups together easily.',
      },
      'start_community': {
        'ar': 'بدء مجتمع جديد',
        'en': 'Start a new community',
        'franco': 'Start community',
      },

      // Chat Screen
      'typing': {
        'ar': 'يكتب الآن...',
        'en': 'typing...',
        'franco': 'typing...',
      },
      'online': {
        'ar': 'متصل الآن',
        'en': 'online',
        'franco': 'online',
      },
      'last_seen': {
        'ar': 'آخر ظهور',
        'en': 'last seen',
        'franco': 'last seen',
      },
      'pinned_msg': {
        'ar': 'رسالة مثبتة',
        'en': 'Pinned message',
        'franco': 'Pinned msg',
      },
      'type_message': {
        'ar': 'مراسلة...',
        'en': 'Message...',
        'franco': 'Message...',
      },
      'copied_clipboard': {
        'ar': 'تم نسخ النص إلى الحافظة 📋',
        'en': 'Copied to clipboard 📋',
        'franco': 'Copied to clipboard 📋',
      },
      'reply': {
        'ar': 'رد',
        'en': 'Reply',
        'franco': 'Reply',
      },
      'copy': {
        'ar': 'نسخ',
        'en': 'Copy',
        'franco': 'Copy',
      },
      'pin': {
        'ar': 'تثبيت الرسالة',
        'en': 'Pin message',
        'franco': 'Pin msg',
      },
      'unpin': {
        'ar': 'إلغاء التثبيت',
        'en': 'Unpin message',
        'franco': 'Unpin msg',
      },
      'star': {
        'ar': 'تمييز بنجمة',
        'en': 'Star message',
        'franco': 'Star msg',
      },
      'unstar': {
        'ar': 'إزالة النجمة',
        'en': 'Unstar',
        'franco': 'Unstar',
      },
      'delete_for_me': {
        'ar': 'الحذف لدي',
        'en': 'Delete for me',
        'franco': 'Delete for me',
      },
      'delete_for_everyone': {
        'ar': 'الحذف لدى الجميع',
        'en': 'Delete for everyone',
        'franco': 'Delete for everyone',
      },
      'msg_deleted': {
        'ar': '🚫 تم حذف هذه الرسالة',
        'en': '🚫 This message was deleted',
        'franco': '🚫 This msg was deleted',
      },
      'start_call_now': {
        'ar': 'بدء المكالمة الآن',
        'en': 'Start call now',
        'franco': 'Start call now',
      },
      'encrypted_group_call': {
        'ar': 'مكالمة جماعية مشفرة',
        'en': 'Encrypted group call',
        'franco': 'Encrypted call',
      },
      'yesterday_time': {
        'ar': 'أمس، 8:15 م',
        'en': 'Yesterday, 8:15 PM',
        'franco': 'Yesterday, 8:15 PM',
      },
      'today_video_call': {
        'ar': 'اليوم، 4:30 م • مكالمة فيديو',
        'en': 'Today, 4:30 PM • Video call',
        'franco': 'Today, 4:30 PM • Video call',
      },
      'app_update_available': {
        'ar': 'تحديث جديد متوفر!',
        'en': 'New update available!',
        'franco': 'New update available!',
      },
      'download_now': {
        'ar': 'تحميل الآن',
        'en': 'Download now',
        'franco': 'Download now',
      },
      'update_notes': {
        'ar': 'ملاحظات التحديث',
        'en': 'Release notes',
        'franco': 'Release notes',
      },
    };

    final entry = strings[key];
    if (entry == null) return key;
    return entry[_languageCode] ?? entry['ar'] ?? key;
  }
}
