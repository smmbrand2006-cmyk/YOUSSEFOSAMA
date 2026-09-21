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
  bool _hasSearched = false;

  void _handleSearch(String query) async {
    final clean = query.trim();
    if (clean.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("يرجى كتابة حرفين على الأقل للبحث عن مستخدم"),
          duration: Duration(seconds: 2),
        ),
      );
      return;
    }

    setState(() {
      _isSearching = true;
      _hasSearched = true;
    });

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
    } else {
      if (mounted) setState(() => _isSearching = false);
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
    final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("محادثة جديدة", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: primaryTextColor)),
            Text("ابحث باسم المستخدم أو رقم الهاتف", style: TextStyle(fontSize: 12, color: secondaryTextColor)),
          ],
        ),
      ),
      body: Column(
        children: [
          // Search box with explicit search action button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    textInputAction: TextInputAction.search,
                    onSubmitted: _handleSearch,
                    style: TextStyle(color: primaryTextColor),
                    decoration: InputDecoration(
                      hintText: "اكتب اسم المستخدم أو رقم الهاتف...",
                      prefixIcon: const Icon(Icons.search, color: WhatsAppColors.iconDefault),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, color: WhatsAppColors.iconDefault),
                              onPressed: () {
                                _searchController.clear();
                                setState(() {
                                  _searchResults = [];
                                  _hasSearched = false;
                                });
                              },
                            )
                          : null,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: () => _handleSearch(_searchController.text),
                  icon: const Icon(Icons.search, size: 18),
                  label: const Text("بحث", style: TextStyle(fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: WhatsAppColors.primaryGreen,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  ),
                ),
              ],
            ),
          ),

          // Search results or initial guidance
          Expanded(
            child: _isSearching
                ? const Center(child: CircularProgressIndicator(color: WhatsAppColors.primaryGreen))
                : _hasSearched && _searchResults.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.person_off_outlined, size: 54, color: WhatsAppColors.textSecondary),
                              const SizedBox(height: 12),
                              Text(
                                "لم يتم العثور على مستخدم مطابق لـ \"${_searchController.text}\"",
                                textAlign: TextAlign.center,
                                style: TextStyle(color: primaryTextColor, fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                "تأكد من كتابة اسم المستخدم كاملاً أو رقم الهاتف المسجل بشكل صحيح ثم اضغط بحث.",
                                textAlign: TextAlign.center,
                                style: TextStyle(color: secondaryTextColor, fontSize: 13, height: 1.5),
                              ),
                            ],
                          ),
                        ),
                      )
                    : !_hasSearched
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(24),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.person_search_rounded, size: 64, color: WhatsAppColors.primaryGreen.withOpacity(0.6)),
                                  const SizedBox(height: 16),
                                  Text(
                                    "البحث عن أصدقاء",
                                    style: TextStyle(color: primaryTextColor, fontSize: 18, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    "اكتب اسم المستخدم أو رقم هاتف الشخص الذي تريد مراسلته ثم اضغط زر \"بحث\" لبدء المحادثة مباشرة.",
                                    textAlign: TextAlign.center,
                                    style: TextStyle(color: secondaryTextColor, fontSize: 13.5, height: 1.5),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView.separated(
                            itemCount: _searchResults.length,
                            separatorBuilder: (_, __) => const Divider(height: 1, indent: 76),
                            itemBuilder: (context, index) {
                              final user = _searchResults[index];
                              return ListTile(
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                                leading: CustomAvatar(
                                  name: user.displayName,
                                  photoUrl: user.photoUrl,
                                  isOnline: user.isOnline,
                                  radius: 24,
                                ),
                                title: Text(
                                  user.displayName,
                                  style: TextStyle(
                                    color: primaryTextColor,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                subtitle: Text(
                                  user.bio.isNotEmpty ? user.bio : "مرحباً! أنا أستخدم تطبيق يوسف.",
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(color: secondaryTextColor, fontSize: 13),
                                ),
                                trailing: const Icon(Icons.chat_bubble_outline_rounded, color: WhatsAppColors.primaryGreen, size: 22),
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
