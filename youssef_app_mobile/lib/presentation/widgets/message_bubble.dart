import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/whatsapp_colors.dart';
import '../../core/utils/date_formatter.dart';
import '../../data/models/message_model.dart';

class MessageBubble extends StatelessWidget {
  final MessageModel message;
  final bool isMe;
  final bool isGroup;
  final String currentUserId;
  final ValueChanged<MessageModel>? onReply;
  final ValueChanged<MessageModel>? onPin;
  final ValueChanged<MessageModel>? onStar;
  final ValueChanged<MessageModel>? onDeleteForEveryone;
  final ValueChanged<MessageModel>? onDeleteForMe;

  const MessageBubble({
    super.key,
    required this.message,
    required this.isMe,
    required this.currentUserId,
    this.isGroup = false,
    this.onReply,
    this.onPin,
    this.onStar,
    this.onDeleteForEveryone,
    this.onDeleteForMe,
  });

  void _showActionMenu(BuildContext context) {
    final text = message.getDecryptedText();
    final isStarred = message.isStarredByUser(currentUserId);
    final isPinned = message.isPinned;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 10, bottom: 6),
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? Colors.white24 : Colors.black12,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // 1. Reply
            ListTile(
              leading: const Icon(Icons.reply_rounded, color: WhatsAppColors.primaryGreen),
              title: Text("رد", style: TextStyle(color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary)),
              onTap: () {
                Navigator.pop(ctx);
                onReply?.call(message);
              },
            ),

            // 2. Copy
            if (!message.isDeleted && text.isNotEmpty && text != "📷 صورة")
              ListTile(
                leading: Icon(Icons.content_copy_rounded, color: isDark ? Colors.white70 : Colors.black54),
                title: Text("نسخ", style: TextStyle(color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary)),
                onTap: () {
                  Clipboard.setData(ClipboardData(text: text));
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("تم نسخ النص إلى الحافظة 📋"),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
              ),

            // 3. Pin
            ListTile(
              leading: Icon(
                isPinned ? Icons.push_pin_rounded : Icons.push_pin_outlined,
                color: isPinned ? Colors.amber : (isDark ? Colors.white70 : Colors.black54),
              ),
              title: Text(
                isPinned ? "إلغاء تثبيت الرسالة" : "تثبيت الرسالة في المحادثة",
                style: TextStyle(color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary),
              ),
              onTap: () {
                Navigator.pop(ctx);
                onPin?.call(message);
              },
            ),

            // 4. Star
            ListTile(
              leading: Icon(
                isStarred ? Icons.star_rounded : Icons.star_outline_rounded,
                color: isStarred ? Colors.amber : (isDark ? Colors.white70 : Colors.black54),
              ),
              title: Text(
                isStarred ? "إزالة النجمة" : "تمييز بنجمة",
                style: TextStyle(color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary),
              ),
              onTap: () {
                Navigator.pop(ctx);
                onStar?.call(message);
              },
            ),

            // 5. Delete
            ListTile(
              leading: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent),
              title: const Text("حذف الرسالة...", style: TextStyle(color: Colors.redAccent)),
              onTap: () {
                Navigator.pop(ctx);
                _showDeleteDialog(context);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showDeleteDialog(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
        title: Text("حذف الرسالة؟", style: TextStyle(color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary)),
        content: Text(
          isMe
              ? "هل تريد حذف هذه الرسالة لنفسك فقط أم للجميع في المحادثة؟"
              : "هل تريد حذف هذه الرسالة من جهازك فقط؟",
          style: TextStyle(color: isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text("إلغاء", style: TextStyle(color: isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              onDeleteForMe?.call(message);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("تم الحذف من عندك فقط")),
              );
            },
            child: const Text("الحذف لدي", style: TextStyle(color: Colors.redAccent)),
          ),
          if (isMe)
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
              onPressed: () {
                Navigator.pop(ctx);
                onDeleteForEveryone?.call(message);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("تم الحذف لدى الجميع 🚫")),
                );
              },
              child: const Text("الحذف لدى الجميع", style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
    );
  }

  void _openFullScreenImage(BuildContext context, String url) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.black.withOpacity(0.7),
            title: Text(message.senderName, style: const TextStyle(color: Colors.white)),
            actions: [
              IconButton(
                icon: const Icon(Icons.close_rounded, color: Colors.white),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          body: Center(
            child: InteractiveViewer(
              panEnabled: true,
              boundaryMargin: const EdgeInsets.all(20),
              minScale: 0.5,
              maxScale: 4.0,
              child: _buildRawImage(url),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRawImage(String url) {
    if (url.startsWith('data:image')) {
      try {
        final clean = url.split(',').last;
        final bytes = base64Decode(clean);
        return Image.memory(bytes, fit: BoxFit.contain);
      } catch (_) {
        return const Icon(Icons.broken_image, color: Colors.white, size: 60);
      }
    }
    return Image.network(
      url,
      fit: BoxFit.contain,
      errorBuilder: (_, __, ___) => const Icon(Icons.broken_image, color: Colors.white, size: 60),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final text = message.getDecryptedText();
    final timeStr = DateFormatter.formatMessageTime(message.createdAt ?? message.clientTimestamp);
    final isRead = message.readBy.length > 1;
    final isStarred = message.isStarredByUser(currentUserId);
    final hasRealText = text.isNotEmpty && text != "📷 صورة";

    // Authentic WhatsApp bubble colors:
    // Outgoing: Dark #005C4B, Light #D9FDD3
    // Incoming: Dark #202C33, Light #FFFFFF
    final bubbleBg = isMe
        ? (isDark ? WhatsAppColors.outgoingBubble : WhatsAppColors.lightOutgoingBubble)
        : (isDark ? WhatsAppColors.incomingBubble : WhatsAppColors.lightIncomingBubble);

    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
    final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.78,
        ),
        child: GestureDetector(
          onLongPress: () => _showActionMenu(context),
          child: Container(
            margin: EdgeInsets.only(
              top: 2.5,
              bottom: 2.5,
              left: isMe ? 44 : 10,
              right: isMe ? 10 : 44,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: bubbleBg,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(14),
                topRight: const Radius.circular(14),
                bottomLeft: Radius.circular(isMe ? 14 : 2),
                bottomRight: Radius.circular(isMe ? 2 : 14),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(isDark ? 0.22 : 0.07),
                  offset: const Offset(0, 1),
                  blurRadius: 1.5,
                ),
              ],
            ),
            child: IntrinsicWidth(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Group sender name (only for incoming in groups)
                  if (!isMe && isGroup && message.senderName.isNotEmpty) ...[
                    Padding(
                      padding: const EdgeInsets.only(bottom: 3),
                      child: Text(
                        message.senderName,
                        style: const TextStyle(
                          color: WhatsAppColors.primaryGreen,
                          fontSize: 12.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],

                  // Reply To Quote Box
                  if (message.replyTo != null) ...[
                    Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.black.withOpacity(0.25) : Colors.black.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(6),
                        border: const Border(
                          right: BorderSide(color: WhatsAppColors.primaryGreen, width: 3.5),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            message.replyTo!['senderName'] ?? '',
                            style: const TextStyle(
                              color: WhatsAppColors.primaryGreen,
                              fontSize: 11.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            message.replyTo!['text'] ?? '',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: secondaryTextColor, fontSize: 11.5),
                          ),
                        ],
                      ),
                    ),
                  ],

                  // Deleted Message
                  if (message.isDeleted) ...[
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.block_rounded, size: 14, color: secondaryTextColor),
                          const SizedBox(width: 6),
                          Text(
                            text,
                            style: TextStyle(
                              color: secondaryTextColor,
                              fontStyle: FontStyle.italic,
                              fontSize: 13.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    // Image Message
                    if (message.messageType == 'image' && message.mediaUrl != null) ...[
                      GestureDetector(
                        onTap: () => _openFullScreenImage(context, message.mediaUrl!),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: ConstrainedBox(
                            constraints: BoxConstraints(
                              maxWidth: MediaQuery.of(context).size.width * 0.72,
                              maxHeight: 340,
                            ),
                            child: _buildProportionalImage(message.mediaUrl!),
                          ),
                        ),
                      ),
                      if (hasRealText) const SizedBox(height: 5),
                    ],

                    // Text & Status (Compact Wrap so short text NEVER stretches the bubble!)
                    Wrap(
                      alignment: WrapAlignment.end,
                      crossAxisAlignment: WrapCrossAlignment.end,
                      spacing: 8,
                      runSpacing: 2,
                      children: [
                        if (hasRealText)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 2),
                            child: Text(
                              text,
                              style: TextStyle(
                                color: primaryTextColor,
                                fontSize: 14.5,
                                height: 1.35,
                              ),
                            ),
                          ),

                        // Timestamp, Ticks & Dropdown Trigger Row
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (message.isPinned) ...[
                              const Icon(Icons.push_pin_rounded, size: 12, color: Colors.amber),
                              const SizedBox(width: 3),
                            ],
                            if (isStarred) ...[
                              const Icon(Icons.star_rounded, size: 12, color: Colors.amber),
                              const SizedBox(width: 3),
                            ],
                            Text(
                              timeStr,
                              style: TextStyle(
                                color: secondaryTextColor,
                                fontSize: 10.5,
                              ),
                            ),
                            if (isMe && !message.isDeleted) ...[
                              const SizedBox(width: 3),
                              Icon(
                                isRead ? Icons.done_all_rounded : Icons.done_rounded,
                                size: 15,
                                color: isRead ? WhatsAppColors.blueTick : secondaryTextColor,
                              ),
                            ],
                            // Micro Chevron button that opens action menu
                            InkWell(
                              onTap: () => _showActionMenu(context),
                              borderRadius: BorderRadius.circular(10),
                              child: Padding(
                                padding: const EdgeInsets.only(left: 3),
                                child: Icon(
                                  Icons.keyboard_arrow_down_rounded,
                                  size: 15,
                                  color: secondaryTextColor.withOpacity(0.7),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildProportionalImage(String url) {
    if (url.startsWith('data:image')) {
      try {
        final clean = url.split(',').last;
        final bytes = base64Decode(clean);
        return Image.memory(
          bytes,
          fit: BoxFit.contain,
          width: double.infinity,
        );
      } catch (_) {
        return const Icon(Icons.broken_image, color: WhatsAppColors.textSecondary, size: 50);
      }
    }
    return Image.network(
      url,
      fit: BoxFit.contain,
      width: double.infinity,
      loadingBuilder: (context, child, progress) {
        if (progress == null) return child;
        return Container(
          height: 160,
          color: Colors.black12,
          child: const Center(
            child: CircularProgressIndicator(strokeWidth: 2, color: WhatsAppColors.primaryGreen),
          ),
        );
      },
      errorBuilder: (_, __, ___) => const Icon(Icons.broken_image, color: WhatsAppColors.textSecondary, size: 50),
    );
  }
}
