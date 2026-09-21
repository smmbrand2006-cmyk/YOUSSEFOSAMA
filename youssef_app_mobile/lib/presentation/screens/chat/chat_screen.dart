import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/whatsapp_colors.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../data/models/chat_model.dart';
import '../../../data/models/message_model.dart';
import '../../../data/services/storage_service.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/chat_provider.dart';
import '../../widgets/custom_avatar.dart';
import '../../widgets/message_bubble.dart';
import '../../widgets/chat_input_bar.dart';
import '../../widgets/whatsapp_wallpaper.dart';
import '../profile/profile_screen.dart';

class ChatScreen extends StatefulWidget {
  final ChatModel chat;

  const ChatScreen({super.key, required this.chat});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _textController = TextEditingController();
  final _scrollController = ScrollController();
  final StorageService _storageService = StorageService();

  @override
  void initState() {
    super.initState();
    // Mark chat as read
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final chatProvider = Provider.of<ChatProvider>(context, listen: false);
      if (auth.currentUser != null) {
        chatProvider.markAsRead(widget.chat.id, auth.currentUser!.uid);
      }
    });
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent + 60,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    }
  }

  void _handleSendMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    final user = auth.currentUser;
    if (user == null) return;

    _textController.clear();
    chatProvider.setTyping(chatId: widget.chat.id, uid: user.uid, isTyping: false);

    await chatProvider.sendMessage(
      chatId: widget.chat.id,
      currentUser: user,
      text: text,
      participants: widget.chat.participants,
    );

    _scrollToBottom();
  }

  void _handlePickImage(ImageSource source) async {
    final file = await _storageService.pickImage(source);
    if (file == null || !mounted) return;

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    final user = auth.currentUser;
    if (user == null) return;

    final base64Data = await _storageService.fileToBase64DataUrl(file);

    await chatProvider.sendMessage(
      chatId: widget.chat.id,
      currentUser: user,
      text: "📷 صورة",
      mediaUrl: base64Data,
      messageType: "image",
      participants: widget.chat.participants,
    );

    _scrollToBottom();
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final chatProvider = Provider.of<ChatProvider>(context);
    final currentUser = auth.currentUser;

    if (currentUser == null) return const Scaffold();

    final otherUid = widget.chat.getOtherUserId(currentUser.uid);
    final chatTitle = widget.chat.getChatTitle(currentUser.uid);
    final chatAvatar = widget.chat.getChatAvatar(currentUser.uid);

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        leadingWidth: 70,
        leading: Row(
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => Navigator.pop(context),
            ),
            CustomAvatar(
              name: chatTitle,
              photoUrl: chatAvatar,
              radius: 18,
              isSupport: widget.chat.isSupport,
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ProfileScreen()),
                );
              },
            ),
          ],
        ),
        title: GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ProfileScreen()),
            );
          },
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                chatTitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              // Stream presence or typing
              StreamBuilder<bool>(
                stream: chatProvider.getTypingStream(widget.chat.id, currentUser.uid),
                builder: (context, typingSnap) {
                  if (typingSnap.data == true) {
                    return const Text(
                      "يكتب الآن...",
                      style: TextStyle(color: WhatsAppColors.primaryGreen, fontSize: 12),
                    );
                  }
                  if (widget.chat.isSupport) {
                    return const Text(
                      "متواجدون دائماً لخدمتك 24/7",
                      style: TextStyle(color: WhatsAppColors.primaryGreen, fontSize: 12),
                    );
                  }
                  return StreamBuilder<Map<String, dynamic>>(
                    stream: chatProvider.getUserPresence(otherUid),
                    builder: (context, presSnap) {
                      final isOnline = presSnap.data?['isOnline'] == true;
                      if (isOnline) {
                        return const Text(
                          "متصل الآن",
                          style: TextStyle(color: WhatsAppColors.primaryGreen, fontSize: 12),
                        );
                      }
                      final lastSeen = presSnap.data?['lastSeen'];
                      if (lastSeen != null) {
                        return Text(
                          "آخر ظهور ${DateFormatter.formatChatTime(lastSeen)}",
                          style: const TextStyle(color: WhatsAppColors.textSecondary, fontSize: 11.5),
                        );
                      }
                      return const SizedBox();
                    },
                  );
                },
              ),
            ],
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.videocam_rounded),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("جاري الاتصال بالفيديو...")),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.call_rounded),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("جاري الاتصال الصوتي...")),
              );
            },
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            color: WhatsAppColors.surfaceCard,
            itemBuilder: (context) => [
              const PopupMenuItem(value: "profile", child: Text("عرض جهة الاتصال")),
              const PopupMenuItem(value: "mute", child: Text("كتم الإشعارات")),
              const PopupMenuItem(value: "clear", child: Text("مسح محتوى الدردشة")),
            ],
            onSelected: (val) {
              if (val == "profile") {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ProfileScreen()),
                );
              }
            },
          ),
        ],
      ),
      body: WhatsAppWallpaper(
        child: Column(
          children: [
            // Messages list
            Expanded(
              child: StreamBuilder<List<MessageModel>>(
                stream: chatProvider.getMessagesStream(widget.chat.id),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(
                      child: CircularProgressIndicator(color: WhatsAppColors.primaryGreen),
                    );
                  }

                  final messages = snapshot.data ?? [];

                  if (messages.isEmpty) {
                    return Center(
                      child: Container(
                        margin: const EdgeInsets.all(24),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: WhatsAppColors.surfaceCard.withOpacity(0.85),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text(
                          "🔒 الرسائل والمكالمات مشفرة تماماً بتقنية التشفير اليومي الدوار. لا يمكن لأحد قراءتها.",
                          textAlign: TextAlign.center,
                          style: TextStyle(color: WhatsAppColors.textSecondary, fontSize: 12),
                        ),
                      ),
                    );
                  }

                  return ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: messages.length,
                    itemBuilder: (context, index) {
                      final msg = messages[index];
                      final isMe = msg.senderId == currentUser.uid;
                      return MessageBubble(
                        message: msg,
                        isMe: isMe,
                        isGroup: widget.chat.type == 'group',
                      );
                    },
                  );
                },
              ),
            ),

            // Input Bar
            ChatInputBar(
              controller: _textController,
              onChanged: (text) {
                chatProvider.setTyping(
                  chatId: widget.chat.id,
                  uid: currentUser.uid,
                  isTyping: text.trim().isNotEmpty,
                );
              },
              onSend: _handleSendMessage,
              onPickImage: () => _handlePickImage(ImageSource.gallery),
              onPickCamera: () => _handlePickImage(ImageSource.camera),
            ),
          ],
        ),
      ),
    );
  }
}
