import 'dart:convert';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '../../core/constants/whatsapp_colors.dart';
import '../../core/utils/date_formatter.dart';
import '../../data/models/message_model.dart';

class MessageBubble extends StatelessWidget {
  final MessageModel message;
  final bool isMe;
  final bool isGroup;

  const MessageBubble({
    super.key,
    required this.message,
    required this.isMe,
    this.isGroup = false,
  });

  @override
  Widget build(BuildContext context) {
    final text = message.getDecryptedText();
    final timeStr = DateFormatter.formatMessageTime(message.createdAt ?? message.clientTimestamp);
    final isRead = message.readBy.length > 1;

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.78,
          minWidth: 80,
        ),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: isMe ? WhatsAppColors.outgoingBubble : WhatsAppColors.incomingBubble,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(12),
              topRight: const Radius.circular(12),
              bottomLeft: Radius.circular(isMe ? 12 : 2),
              bottomRight: Radius.circular(isMe ? 2 : 12),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.18),
                offset: const Offset(0, 1),
                blurRadius: 1,
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Group sender name
              if (!isMe && isGroup && message.senderName.isNotEmpty) ...[
                Text(
                  message.senderName,
                  style: const TextStyle(
                    color: WhatsAppColors.primaryGreen,
                    fontSize: 12.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
              ],

              // Image content if present
              if (message.messageType == 'image' && message.mediaUrl != null) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: _buildImage(context, message.mediaUrl!),
                ),
                const SizedBox(height: 4),
              ],

              // Text content and timestamp wrap
              Wrap(
                alignment: WrapAlignment.end,
                crossAxisAlignment: WrapCrossAlignment.end,
                spacing: 8,
                children: [
                  if (text.isNotEmpty)
                    Text(
                      text,
                      style: const TextStyle(
                        color: WhatsAppColors.textPrimary,
                        fontSize: 15,
                        height: 1.3,
                      ),
                    ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        timeStr,
                        style: const TextStyle(
                          color: WhatsAppColors.textSecondary,
                          fontSize: 10.5,
                        ),
                      ),
                      if (isMe) ...[
                        const SizedBox(width: 3),
                        Icon(
                          Icons.done_all,
                          size: 15,
                          color: isRead ? WhatsAppColors.blueTick : WhatsAppColors.greyTick,
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildImage(BuildContext context, String url) {
    if (url.startsWith('data:image')) {
      try {
        final clean = url.split(',').last;
        final bytes = base64Decode(clean);
        return Image.memory(
          bytes,
          fit: BoxFit.cover,
          width: double.infinity,
          height: 200,
        );
      } catch (_) {
        return const Icon(Icons.broken_image, color: WhatsAppColors.textSecondary);
      }
    }
    return CachedNetworkImage(
      imageUrl: url,
      fit: BoxFit.cover,
      width: double.infinity,
      height: 200,
      placeholder: (context, url) => Container(
        height: 200,
        color: Colors.black12,
        child: const Center(
          child: CircularProgressIndicator(strokeWidth: 2, color: WhatsAppColors.primaryGreen),
        ),
      ),
      errorWidget: (context, url, error) => const Icon(Icons.broken_image, color: WhatsAppColors.textSecondary),
    );
  }
}
