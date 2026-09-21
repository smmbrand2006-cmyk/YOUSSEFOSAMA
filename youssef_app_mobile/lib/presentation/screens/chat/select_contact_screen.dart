import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/whatsapp_colors.dart';
import '../../../data/models/user_model.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/chat_provider.dart';
import '../../widgets/custom_avatar.dart';
import 'chat_screen.dart';

class SelectContactScreen extends StatefulWidget {
  const SelectContactScreen({super.key});

  @override
  State<SelectContactScreen> createState() => _SelectContactScreenState();
}

class _SelectContactScreenState extends State<SelectContactScreen> {
  final _searchController = TextEditingController();
  List<UserModel> _searchResults = [];
  bool _isSearching = false;

  void _handleSearch(String query) async {
    final clean = query.trim();
    if (clean.isEmpty) {
      setState(() {
        _searchResults = [];
        _isSearching = false;
      });
      return;
    }

    setState(() => _isSearching = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);

    if (auth.currentUser != null) {
      final results = await chatProvider.searchUsers(clean, auth.currentUser!.uid);
      if (mounted) {
        setState(() {
          _searchResults = results;
          _isSearching = false;
        });
      }
    }
  }

  void _openChatWithUser(UserModel targetUser) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    final currentUser = auth.currentUser;
    if (currentUser == null) return;

    final chat = await chatProvider.getOrCreateDirectChat(currentUser, targetUser);
    if (!mounted) return;

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => ChatScreen(chat: chat)),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("تحديد جهة اتصال", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            Text("البحث بالاسم أو الكود (#Code)", style: TextStyle(fontSize: 12, color: WhatsAppColors.textSecondary)),
          ],
        ),
      ),
      body: Column(
        children: [
          // Search box
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _searchController,
              onChanged: _handleSearch,
              style: const TextStyle(color: WhatsAppColors.textPrimary),
              decoration: InputDecoration(
                hintText: "ابحث بكود المستخدم (مثال: #123456) أو الاسم...",
                prefixIcon: const Icon(Icons.search, color: WhatsAppColors.iconDefault),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: WhatsAppColors.iconDefault),
                        onPressed: () {
                          _searchController.clear();
                          _handleSearch("");
                        },
                      )
                    : null,
              ),
            ),
          ),

          // Quick action items
          if (_searchController.text.isEmpty) ...[
            ListTile(
              leading: const CircleAvatar(
                backgroundColor: WhatsAppColors.primaryGreen,
                child: Icon(Icons.group_add, color: Colors.white),
              ),
              title: const Text("مجموعة جديدة", style: TextStyle(color: WhatsAppColors.textPrimary, fontWeight: FontWeight.bold)),
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("إنشاء المجموعات متاح")),
                );
              },
            ),
            ListTile(
              leading: const CircleAvatar(
                backgroundColor: WhatsAppColors.primaryGreen,
                child: Icon(Icons.person_add, color: Colors.white),
              ),
              title: const Text("جهة اتصال جديدة", style: TextStyle(color: WhatsAppColors.textPrimary, fontWeight: FontWeight.bold)),
              onTap: () {},
            ),
            const Divider(),
          ],

          // Search results
          Expanded(
            child: _isSearching
                ? const Center(child: CircularProgressIndicator(color: WhatsAppColors.primaryGreen))
                : _searchController.text.isNotEmpty && _searchResults.isEmpty
                    ? Center(
                        child: Text(
                          "لم يتم العثور على مستخدم مطابق للكود \"${_searchController.text}\"",
                          style: const TextStyle(color: WhatsAppColors.textSecondary),
                        ),
                      )
                    : ListView.builder(
                        itemCount: _searchResults.length,
                        itemBuilder: (context, index) {
                          final user = _searchResults[index];
                          return ListTile(
                            leading: CustomAvatar(
                              name: user.displayName,
                              photoUrl: user.photoUrl,
                              isOnline: user.isOnline,
                            ),
                            title: Row(
                              children: [
                                Text(user.displayName, style: const TextStyle(color: WhatsAppColors.textPrimary, fontWeight: FontWeight.bold)),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: WhatsAppColors.primaryGreen.withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    "#${user.userCode}",
                                    style: const TextStyle(color: WhatsAppColors.primaryGreen, fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                            subtitle: Text(user.bio, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: WhatsAppColors.textSecondary)),
                            onTap: () => _openChatWithUser(user),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
