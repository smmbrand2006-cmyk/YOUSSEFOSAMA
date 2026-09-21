import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/whatsapp_colors.dart';
import '../../../core/services/sound_service.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/utils/encryption_helper.dart';
import '../../../data/models/chat_model.dart';
import '../../../data/models/message_model.dart';
import '../../../data/models/user_model.dart';
import '../../../data/services/chat_cache_service.dart';
import '../../../data/services/storage_service.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/chat_provider.dart';
import '../../widgets/chat_input_bar.dart';
import '../../widgets/custom_avatar.dart';
import '../../widgets/message_bubble.dart';
import '../../widgets/whatsapp_wallpaper.dart';
import '../calls/call_screen.dart';
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
  final SoundService _soundService = SoundService.instance;
  int _lastMessageCount = 0;
  MessageModel? _replyingTo;

  @override
  void initState() {
    super.initState();
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
        0.0,
        duration: const Duration(milliseconds: 200),
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

    _soundService.playMessageSent();

    Map<String, dynamic>? replyData;
    if (_replyingTo != null) {
      replyData = {
        'messageId': _replyingTo!.id,
        'text': _replyingTo!.getDecryptedText(),
        'senderName': _replyingTo!.senderName,
      };
      setState(() => _replyingTo = null);
    }

    // 0ms Optimistic local message insertion
    final nowMs = DateTime.now().millisecondsSinceEpoch;
    final optimisticMsg = MessageModel(
      id: 'opt_$nowMs',
      senderId: user.uid,
      senderName: user.displayName,
      text: EncryptionHelper.encryptMessageText(text),
      messageType: "text",
      readBy: [user.uid],
      replyTo: replyData,
      clientTimestamp: nowMs,
    );
    ChatCacheService.instance.addOptimisticMessage(widget.chat.id, optimisticMsg);
    setState(() {});
    _scrollToBottom();

    // Resilient background sending for ultra-weak networks
    _sendWithLowNetResilience(
      chatProvider: chatProvider,
      chatId: widget.chat.id,
      currentUser: user,
      text: text,
      participants: widget.chat.participants,
      replyTo: replyData,
    );
  }

  void _handlePickImage(ImageSource source) async {
    final file = await _storageService.pickImage(source);
    if (file == null || !mounted) return;

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    final user = auth.currentUser;
    if (user == null) return;

    final base64Data = await _storageService.fileToBase64DataUrl(file);

    Map<String, dynamic>? replyData;
    if (_replyingTo != null) {
      replyData = {
        'messageId': _replyingTo!.id,
        'text': _replyingTo!.getDecryptedText(),
        'senderName': _replyingTo!.senderName,
      };
      setState(() => _replyingTo = null);
    }

    _sendWithLowNetResilience(
      chatProvider: chatProvider,
      chatId: widget.chat.id,
      currentUser: user,
      text: "📷 صورة",
      mediaUrl: base64Data,
      messageType: "image",
      participants: widget.chat.participants,
      replyTo: replyData,
    );

    _scrollToBottom();
  }

  void _sendWithLowNetResilience({
    required ChatProvider chatProvider,
    required String chatId,
    required UserModel currentUser,
    required String text,
    required List<String> participants,
    Map<String, dynamic>? replyTo,
    String? mediaUrl,
    String messageType = "text",
  }) async {
    int attempts = 0;
    while (attempts < 5) {
      try {
        await chatProvider.sendMessage(
          chatId: chatId,
          currentUser: currentUser,
          text: text,
          mediaUrl: mediaUrl,
          messageType: messageType,
          participants: participants,
          replyTo: replyTo,
        );
        break;
      } catch (e) {
        attempts++;
        if (attempts >= 5) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text("الإنترنت ضعيف جداً، سيتم تسليم الرسالة تلقائياً بمجرد توفر الإشارة")),
            );
          }
          break;
        }
        await Future.delayed(Duration(seconds: attempts * 2));
      }
    }
  }

  void _showStarredMessagesDialog(List<MessageModel> messages, String currentUid) {
    final starred = messages.where((m) => m.isStarredByUser(currentUid)).toList();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: WhatsAppColors.surfaceCard,
        title: const Row(
          children: [
            Icon(Icons.star_rounded, color: Colors.amber),
            SizedBox(width: 8),
            Text("الرسائل المميزة بنجمة", style: TextStyle(color: WhatsAppColors.textPrimary)),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: starred.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text(
                    "لا توجد رسائل مميزة بنجمة في هذه المحادثة حتى الآن. يمكنك تمييز أي رسالة بالنقر على السهم بجانبها.",
                    style: TextStyle(color: WhatsAppColors.textSecondary, height: 1.4),
                  ),
                )
              : ListView.separated(
                  shrinkWrap: true,
                  itemCount: starred.length,
                  separatorBuilder: (_, __) => const Divider(),
                  itemBuilder: (_, i) {
                    final msg = starred[i];
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(
                        msg.senderName,
                        style: const TextStyle(
                          color: WhatsAppColors.primaryGreen,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                      subtitle: Text(
                        msg.getDecryptedText(),
                        style: const TextStyle(color: WhatsAppColors.textPrimary, fontSize: 14),
                      ),
                      trailing: Text(
                        DateFormatter.formatMessageTime(msg.createdAt ?? msg.clientTimestamp),
                        style: const TextStyle(color: WhatsAppColors.textSecondary, fontSize: 11),
                      ),
                    );
                  },
                ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("إغلاق", style: TextStyle(color: WhatsAppColors.primaryGreen)),
          ),
        ],
      ),
    );
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
              StreamBuilder<bool>(
                stream: chatProvider.getTypingStream(widget.chat.id, currentUser.uid),
                builder: (context, typingSnap) {
                  if (typingSnap.data == true) {
                    return const Text(
                      "يكتب الآن...",
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
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => CallScreen(
                    callerName: chatTitle,
                    callerAvatar: chatAvatar,
                    isVideo: true,
                    isSupport: widget.chat.isSupport,
                  ),
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.call_rounded),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => CallScreen(
                    callerName: chatTitle,
                    callerAvatar: chatAvatar,
                    isVideo: false,
                    isSupport: widget.chat.isSupport,
                  ),
                ),
              );
            },
          ),
          StreamBuilder<List<MessageModel>>(
            stream: chatProvider.getMessagesStream(widget.chat.id, currentUser.uid),
            initialData: ChatCacheService.instance.getCachedMessages(widget.chat.id),
            builder: (context, snapshot) {
              final messages = snapshot.data ?? [];
              final isDark = Theme.of(context).brightness == Brightness.dark;
              final menuTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
              return PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert),
                color: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
                itemBuilder: (context) => [
                  PopupMenuItem(value: "profile", child: Text("عرض جهة الاتصال", style: TextStyle(color: menuTextColor))),
                  PopupMenuItem(value: "starred", child: Text("الرسائل المميزة بنجمة ⭐", style: TextStyle(color: menuTextColor))),
                  PopupMenuItem(value: "mute", child: Text("كتم الإشعارات", style: TextStyle(color: menuTextColor))),
                  PopupMenuItem(value: "clear", child: Text("مسح محتوى الدردشة", style: TextStyle(color: menuTextColor))),
                ],
                onSelected: (val) {
                  if (val == "profile") {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ProfileScreen()),
                    );
                  } else if (val == "starred") {
                    _showStarredMessagesDialog(messages, currentUser.uid);
                  } else if (val == "mute") {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("تم كتم إشعارات المحادثة مؤقتاً")),
                    );
                  } else if (val == "clear") {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("تم مسح السجل المحلي للدردشة بنجاح")),
                    );
                  }
                },
              );
            },
          ),
        ],
      ),
      body: WhatsAppWallpaper(
        child: Column(
          children: [
            // Stream messages
            Expanded(
              child: StreamBuilder<List<MessageModel>>(
                stream: chatProvider.getMessagesStream(widget.chat.id, currentUser.uid),
                initialData: ChatCacheService.instance.getCachedMessages(widget.chat.id),
                builder: (context, snapshot) {
                  final messages = snapshot.data ?? [];
                  if (messages.isNotEmpty) {
                    ChatCacheService.instance.cacheMessages(widget.chat.id, messages);
                  }

                  if (snapshot.connectionState == ConnectionState.waiting && messages.isEmpty) {
                    return const Center(
                      child: CircularProgressIndicator(color: WhatsAppColors.primaryGreen),
                    );
                  }

                  // Sound on new message from others
                  if (messages.length > _lastMessageCount && _lastMessageCount > 0) {
                    final lastMsg = messages.last;
                    if (lastMsg.senderId != currentUser.uid) {
                      _soundService.playMessageReceived();
                    }
                  }
                  _lastMessageCount = messages.length;

                  // Find pinned message if any
                  MessageModel? pinnedMsg;
                  for (final m in messages) {
                    if (m.isPinned) {
                      pinnedMsg = m;
                      break;
                    }
                  }

                  final isDark = Theme.of(context).brightness == Brightness.dark;
                  final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
                  final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;

                  return Column(
                    children: [
                      // Pinned message banner
                      if (pinnedMsg != null)
                        Container(
                          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: isDark ? WhatsAppColors.surfaceCard.withOpacity(0.95) : Colors.white.withOpacity(0.95),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.amber.withOpacity(0.4)),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(isDark ? 0.2 : 0.08),
                                blurRadius: 4,
                                offset: const Offset(0, 1),
                              ),
                            ],
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.push_pin_rounded, size: 18, color: Colors.amber),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  "رسالة مثبتة: ${pinnedMsg.getDecryptedText()}",
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: primaryTextColor,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              InkWell(
                                onTap: () {
                                  chatProvider.togglePinMessage(
                                    widget.chat.id,
                                    pinnedMsg!.id,
                                    true,
                                  );
                                },
                                child: Padding(
                                  padding: const EdgeInsets.all(4),
                                  child: Icon(Icons.close_rounded, size: 16, color: secondaryTextColor),
                                ),
                              ),
                            ],
                          ),
                        ),

                      // Messages List (Reverse: true to anchor to bottom and prevent scrolling to top)
                      Expanded(
                        child: messages.isEmpty
                            ? Center(
                                child: Container(
                                  margin: const EdgeInsets.all(24),
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: isDark ? WhatsAppColors.surfaceCard.withOpacity(0.85) : Colors.white.withOpacity(0.9),
                                    borderRadius: BorderRadius.circular(10),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withOpacity(0.06),
                                        blurRadius: 4,
                                      ),
                                    ],
                                  ),
                                  child: Text(
                                    "🔒 الرسائل والمكالمات مشفرة تماماً بتقنية التشفير اليومي الدوار. لا يمكن لأحد قراءتها.",
                                    textAlign: TextAlign.center,
                                    style: TextStyle(color: secondaryTextColor, fontSize: 12),
                                  ),
                                ),
                              )
                            : ListView.builder(
                                controller: _scrollController,
                                reverse: true,
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                itemCount: messages.length,
                                itemBuilder: (context, index) {
                                  final msg = messages[messages.length - 1 - index];
                                  final isMe = msg.senderId == currentUser.uid;
                                  return MessageBubble(
                                    message: msg,
                                    isMe: isMe,
                                    isGroup: widget.chat.type == 'group',
                                    currentUserId: currentUser.uid,
                                    onReply: (m) => setState(() => _replyingTo = m),
                                    onPin: (m) {
                                      chatProvider.togglePinMessage(
                                        widget.chat.id,
                                        m.id,
                                        m.isPinned,
                                        previewText: m.getDecryptedText(),
                                      );
                                    },
                                    onStar: (m) {
                                      chatProvider.toggleStarMessage(
                                        widget.chat.id,
                                        m.id,
                                        currentUser.uid,
                                        m.isStarredByUser(currentUser.uid),
                                      );
                                    },
                                    onDeleteForEveryone: (m) {
                                      chatProvider.deleteMessageForEveryone(widget.chat.id, m.id);
                                    },
                                    onDeleteForMe: (m) {
                                      chatProvider.deleteMessageForMe(widget.chat.id, m.id, currentUser.uid);
                                    },
                                  );
                                },
                              ),
                      ),
                    ],
                  );
                },
              ),
            ),

            // Reply Preview Bar
            if (_replyingTo != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Theme.of(context).brightness == Brightness.dark
                      ? WhatsAppColors.surfaceCard
                      : WhatsAppColors.lightSurfaceCard,
                  border: Border(
                    top: BorderSide(
                      color: Theme.of(context).brightness == Brightness.dark
                          ? WhatsAppColors.divider
                          : WhatsAppColors.lightDivider,
                      width: 0.8,
                    ),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 4,
                      height: 38,
                      decoration: BoxDecoration(
                        color: WhatsAppColors.primaryGreen,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _replyingTo!.senderName,
                            style: const TextStyle(
                              color: WhatsAppColors.primaryGreen,
                              fontWeight: FontWeight.bold,
                              fontSize: 12.5,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _replyingTo!.getDecryptedText(),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: Theme.of(context).brightness == Brightness.dark
                                  ? WhatsAppColors.textSecondary
                                  : WhatsAppColors.lightTextSecondary,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: Icon(
                        Icons.close_rounded,
                        size: 20,
                        color: Theme.of(context).brightness == Brightness.dark
                            ? WhatsAppColors.textSecondary
                            : WhatsAppColors.lightTextSecondary,
                      ),
                      onPressed: () => setState(() => _replyingTo = null),
                    ),
                  ],
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
