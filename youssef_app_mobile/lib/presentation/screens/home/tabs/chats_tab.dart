import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/whatsapp_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../data/models/chat_model.dart';
import '../../../../providers/auth_provider.dart';
import '../../../../providers/chat_provider.dart';
import '../../../widgets/custom_avatar.dart';
import '../../chat/chat_screen.dart';

class ChatsTab extends StatelessWidget {
  const ChatsTab({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final chatProvider = Provider.of<ChatProvider>(context);
    final currentUser = auth.currentUser;

    if (currentUser == null) {
      return const Center(child: CircularProgressIndicator(color: WhatsAppColors.primaryGreen));
    }

    if (chatProvider.isLoadingChats) {
      return const Center(
        child: CircularProgressIndicator(color: WhatsAppColors.primaryGreen),
      );
    }

    final allChats = chatProvider.chats;

    return ListView(
      children: [
        // Pinned Support Chat (#123)
        ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          leading: const CustomAvatar(
            name: "الدعم الفني",
            radius: 25,
            isSupport: true,
          ),
          title: const Row(
            children: [
              Text(
                "الدعم الفني الرسمي (#123)",
                style: TextStyle(
                  color: WhatsAppColors.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              SizedBox(width: 6),
              Icon(Icons.verified, color: WhatsAppColors.primaryGreen, size: 16),
            ],
          ),
          subtitle: const Text(
            "فريق خدمة العملاء متواجد 24/7 لخدمتك فوراً",
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(color: WhatsAppColors.primaryGreen, fontSize: 13.5),
          ),
          trailing: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: WhatsAppColors.primaryGreen.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Text(
              "24/7",
              style: TextStyle(color: WhatsAppColors.primaryGreen, fontSize: 11.5, fontWeight: FontWeight.bold),
            ),
          ),
          onTap: () async {
            final supportChat = await chatProvider.getOrCreateSupportChat(currentUser);
            if (!context.mounted) return;
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => ChatScreen(chat: supportChat),
              ),
            );
          },
        ),

        const Divider(indent: 72),

        // Normal Chats List
        if (allChats.isEmpty) ...[
          const SizedBox(height: 60),
          Center(
            child: Column(
              children: [
                Icon(Icons.mark_chat_unread_outlined, size: 64, color: WhatsAppColors.textMuted.withOpacity(0.5)),
                const SizedBox(height: 12),
                const Text(
                  "لا توجد محادثات بعد",
                  style: TextStyle(color: WhatsAppColors.textSecondary, fontSize: 16),
                ),
                const SizedBox(height: 6),
                const Text(
                  "اضغط على الزر الأخضر بالأسفل لبدء محادثة جديدة بالكود (#)",
                  style: TextStyle(color: WhatsAppColors.textMuted, fontSize: 13),
                ),
              ],
            ),
          ),
        ] else ...[
          for (final chat in allChats) ...[
            _buildChatTile(context, chat, currentUser.uid),
            const Divider(indent: 72),
          ],
        ],
      ],
    );
  }

  Widget _buildChatTile(BuildContext context, ChatModel chat, String currentUid) {
    final title = chat.getChatTitle(currentUid);
    final lastMessageText = chat.getDecryptedLastMessage();
    final avatarUrl = chat.getChatAvatar(currentUid);
    final unreadCount = chat.getMyUnreadCount(currentUid);
    final timeStr = DateFormatter.formatChatTime(chat.lastMessage?['createdAt'] ?? chat.updatedAt);
    final isMe = chat.lastMessage?['senderId'] == currentUid;

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: CustomAvatar(
        name: title,
        photoUrl: avatarUrl,
        radius: 25,
        isSupport: chat.isSupport,
      ),
      title: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: WhatsAppColors.textPrimary,
                fontSize: 16,
                fontWeight: unreadCount > 0 ? FontWeight.bold : FontWeight.w600,
              ),
            ),
          ),
          Text(
            timeStr,
            style: TextStyle(
              color: unreadCount > 0 ? WhatsAppColors.primaryGreen : WhatsAppColors.textSecondary,
              fontSize: 12,
              fontWeight: unreadCount > 0 ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ],
      ),
      subtitle: Row(
        children: [
          if (isMe) ...[
            const Icon(Icons.done_all, size: 16, color: WhatsAppColors.greyTick),
            const SizedBox(width: 4),
          ],
          Expanded(
            child: Text(
              lastMessageText.isNotEmpty ? lastMessageText : "ابدأ المحادثة الآن",
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: unreadCount > 0 ? WhatsAppColors.textPrimary : WhatsAppColors.textSecondary,
                fontSize: 13.5,
                fontWeight: unreadCount > 0 ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ),
          if (unreadCount > 0)
            Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(
                color: WhatsAppColors.unreadBadge,
                shape: BoxShape.circle,
              ),
              child: Text(
                unreadCount.toString(),
                style: const TextStyle(
                  color: Colors.black,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
        ],
      ),
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ChatScreen(chat: chat),
          ),
        );
      },
    );
  }
}
