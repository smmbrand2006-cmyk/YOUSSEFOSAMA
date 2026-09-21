import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/whatsapp_colors.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/chat_provider.dart';
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

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this, initialIndex: 1);
    _tabController.addListener(() {
      setState(() {});
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (auth.currentUser != null) {
        Provider.of<ChatProvider>(context, listen: false).initChats(auth.currentUser!.uid);
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _handleFabAction() {
    final index = _tabController.index;
    if (index == 1) {
      // Chats tab -> New chat
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const SelectContactScreen()),
      );
    } else if (index == 2) {
      // Status tab
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("يمكنك إضافة حالة من قسم 'حالتي' بأعلى الشاشة")),
      );
    } else if (index == 3) {
      // Calls tab
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const SelectContactScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final chatProvider = Provider.of<ChatProvider>(context);
    final totalUnread = chatProvider.chats.fold<int>(
      0,
      (sum, c) => sum + c.getMyUnreadCount(Provider.of<AuthProvider>(context, listen: false).currentUser?.uid ?? ""),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          "WhatsApp",
          style: TextStyle(
            color: WhatsAppColors.textSecondary,
            fontSize: 21,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.5,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.camera_alt_outlined),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("كاميرا WhatsApp")),
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
            color: WhatsAppColors.surfaceCard,
            itemBuilder: (context) => [
              const PopupMenuItem(value: "group", child: Text("مجموعة جديدة")),
              const PopupMenuItem(value: "profile", child: Text("الملف الشخصي")),
              const PopupMenuItem(value: "starred", child: Text("الرسائل المميزة")),
              const PopupMenuItem(value: "settings", child: Text("الإعدادات")),
            ],
            onSelected: (val) {
              if (val == "profile") {
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
        bottom: TabBar(
          controller: _tabController,
          isScrollable: false,
          tabs: [
            const Tab(icon: Icon(Icons.groups_2_rounded, size: 22)),
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text("الدردشات"),
                  if (totalUnread > 0) ...[
                    const SizedBox(width: 5),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: const BoxDecoration(
                        color: WhatsAppColors.unreadBadge,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        totalUnread.toString(),
                        style: const TextStyle(color: Colors.black, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const Tab(text: "المستجدات"),
            const Tab(text: "المكالمات"),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          CommunitiesTab(),
          ChatsTab(),
          StatusTab(),
          CallsTab(),
        ],
      ),
      floatingActionButton: _tabController.index == 0
          ? null
          : FloatingActionButton(
              onPressed: _handleFabAction,
              child: Icon(
                _tabController.index == 1
                    ? Icons.chat_rounded
                    : _tabController.index == 2
                        ? Icons.camera_alt_rounded
                        : Icons.add_call,
                size: 24,
              ),
            ),
    );
  }
}
