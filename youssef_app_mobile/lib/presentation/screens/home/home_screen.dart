import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/whatsapp_colors.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/chat_provider.dart';
import '../../../providers/locale_provider.dart';
import '../../../providers/theme_provider.dart';
import '../chat/select_contact_screen.dart';
import '../profile/profile_screen.dart';
import '../settings/settings_screen.dart';
import 'tabs/calls_tab.dart';
import 'tabs/chats_tab.dart';
import 'tabs/communities_tab.dart';
import 'tabs/status_tab.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0; // Default to Chats tab

  final List<Widget> _screens = const [
    ChatsTab(),
    StatusTab(),
    CommunitiesTab(),
    CallsTab(),
  ];

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (auth.currentUser != null) {
        Provider.of<ChatProvider>(context, listen: false).initChats(auth.currentUser!.uid);
      }
    });
  }

  void _handleFabAction() {
    switch (_currentIndex) {
      case 0: // Chats tab -> New chat
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const SelectContactScreen()),
        );
        break;
      case 1: // Status tab -> Add status
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("يمكنك إضافة حالة من قسم 'حالتي' بأعلى الشاشة")),
        );
        break;
      case 3: // Calls tab -> New call
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const SelectContactScreen()),
        );
        break;
    }
  }

  IconData _getFabIcon() {
    switch (_currentIndex) {
      case 0:
        return Icons.chat_rounded;
      case 1:
        return Icons.camera_alt_rounded;
      case 3:
        return Icons.add_call;
      default:
        return Icons.chat_rounded;
    }
  }

  String _getAppBarTitle(LocaleProvider locale) {
    switch (_currentIndex) {
      case 0:
        return "YOUSSEF APP";
      case 1:
        return locale.t('updates');
      case 2:
        return locale.t('communities');
      case 3:
        return locale.t('calls');
      default:
        return "YOUSSEF APP";
    }
  }

  @override
  Widget build(BuildContext context) {
    final chatProvider = Provider.of<ChatProvider>(context);
    final locale = Provider.of<LocaleProvider>(context);
    final themeProvider = Provider.of<ThemeProvider>(context);
    final totalUnread = chatProvider.chats.fold<int>(
      0,
      (sum, c) => sum + c.getMyUnreadCount(Provider.of<AuthProvider>(context, listen: false).currentUser?.uid ?? ""),
    );

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
    final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text(
          _getAppBarTitle(locale),
          style: TextStyle(
            color: _currentIndex == 0 ? WhatsAppColors.primaryGreen : primaryTextColor,
            fontSize: _currentIndex == 0 ? 24 : 21,
            fontWeight: FontWeight.bold,
            letterSpacing: _currentIndex == 0 ? 0.5 : 0,
          ),
        ),
        actions: [
          // ☀️ Instant 1-Tap White / Dark Mode Toggle!
          IconButton(
            tooltip: isDark ? "تفعيل الوضع الفاتح (White Mode)" : "تفعيل الوضع الداكن (Dark Mode)",
            icon: AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              transitionBuilder: (child, anim) => RotationTransition(turns: anim, child: ScaleTransition(scale: anim, child: child)),
              child: Icon(
                isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                key: ValueKey<bool>(isDark),
                color: isDark ? Colors.amber : WhatsAppColors.primaryGreen,
              ),
            ),
            onPressed: () {
              final newMode = isDark ? 'light' : 'dark';
              themeProvider.setTheme(newMode);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(isDark ? "تم تفعيل الوضع الفاتح (White Mode) ☀️" : "تم تفعيل الوضع الداكن (Dark Mode) 🌙"),
                  duration: const Duration(seconds: 1),
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SelectContactScreen()),
              );
            },
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            color: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
            itemBuilder: (context) => [
              PopupMenuItem(
                value: "theme",
                child: Row(
                  children: [
                    Icon(isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded, size: 18, color: isDark ? Colors.amber : WhatsAppColors.primaryGreen),
                    const SizedBox(width: 8),
                    Text(isDark ? "الوضع الفاتح ☀️" : "الوضع الداكن 🌙", style: TextStyle(color: primaryTextColor)),
                  ],
                ),
              ),
              PopupMenuItem(value: "group", child: Text(locale.t('new_group'), style: TextStyle(color: primaryTextColor))),
              PopupMenuItem(value: "profile", child: Text(locale.t('profile'), style: TextStyle(color: primaryTextColor))),
              PopupMenuItem(value: "starred", child: Text(locale.t('starred_messages'), style: TextStyle(color: primaryTextColor))),
              PopupMenuItem(value: "settings", child: Text(locale.t('settings'), style: TextStyle(color: primaryTextColor))),
            ],
            onSelected: (val) {
              if (val == "theme") {
                themeProvider.setTheme(isDark ? 'light' : 'dark');
              } else if (val == "profile") {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ProfileScreen()),
                );
              } else if (val == "settings") {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const SettingsScreen()),
                );
              } else if (val == "group") {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const SelectContactScreen()),
                );
              }
            },
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      // ✅ Modern WhatsApp Bottom Navigation Bar
      bottomNavigationBar: NavigationBar(
        backgroundColor: isDark ? WhatsAppColors.appBarColor : WhatsAppColors.lightAppBarColor,
        surfaceTintColor: Colors.transparent,
        indicatorColor: WhatsAppColors.primaryGreen.withOpacity(isDark ? 0.15 : 0.12),
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        height: 65,
        destinations: [
          NavigationDestination(
            icon: Badge(
              isLabelVisible: totalUnread > 0,
              label: Text(
                totalUnread.toString(),
                style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
              ),
              backgroundColor: WhatsAppColors.primaryGreen,
              child: Icon(Icons.chat_outlined, size: 24, color: secondaryTextColor),
            ),
            selectedIcon: Badge(
              isLabelVisible: totalUnread > 0,
              label: Text(
                totalUnread.toString(),
                style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
              ),
              backgroundColor: WhatsAppColors.primaryGreen,
              child: const Icon(Icons.chat_rounded, size: 24, color: WhatsAppColors.primaryGreen),
            ),
            label: locale.t('chats'),
          ),
          NavigationDestination(
            icon: Icon(Icons.donut_large_rounded, size: 24, color: secondaryTextColor),
            selectedIcon: const Icon(Icons.donut_large_rounded, size: 24, color: WhatsAppColors.primaryGreen),
            label: locale.t('updates'),
          ),
          NavigationDestination(
            icon: Icon(Icons.groups_2_outlined, size: 26, color: secondaryTextColor),
            selectedIcon: const Icon(Icons.groups_2_rounded, size: 26, color: WhatsAppColors.primaryGreen),
            label: locale.t('communities'),
          ),
          NavigationDestination(
            icon: Icon(Icons.call_outlined, size: 24, color: secondaryTextColor),
            selectedIcon: const Icon(Icons.call_rounded, size: 24, color: WhatsAppColors.primaryGreen),
            label: locale.t('calls'),
          ),
        ],
      ),

      floatingActionButton: _currentIndex == 2
          ? null
          : FloatingActionButton(
              onPressed: _handleFabAction,
              child: Icon(
                _getFabIcon(),
                size: 24,
              ),
            ),
    );
  }
}
