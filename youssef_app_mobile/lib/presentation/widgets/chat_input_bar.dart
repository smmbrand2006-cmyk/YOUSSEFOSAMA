import 'package:flutter/material.dart';
import '../../core/constants/whatsapp_colors.dart';

class ChatInputBar extends StatefulWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onSend;
  final VoidCallback onPickImage;
  final VoidCallback onPickCamera;

  const ChatInputBar({
    super.key,
    required this.controller,
    required this.onChanged,
    required this.onSend,
    required this.onPickImage,
    required this.onPickCamera,
  });

  @override
  State<ChatInputBar> createState() => _ChatInputBarState();
}

class _ChatInputBarState extends State<ChatInputBar> {
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    _hasText = widget.controller.text.trim().isNotEmpty;
    widget.controller.addListener(_handleTextChange);
  }

  void _handleTextChange() {
    final nowHasText = widget.controller.text.trim().isNotEmpty;
    if (nowHasText != _hasText) {
      setState(() {
        _hasText = nowHasText;
      });
    }
    widget.onChanged(widget.controller.text);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_handleTextChange);
    super.dispose();
  }

  void _showAttachmentBottomSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: WhatsAppColors.surfaceCard,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Wrap(
          spacing: 24,
          runSpacing: 20,
          alignment: WrapAlignment.center,
          children: [
            _buildAttachItem(
              icon: Icons.insert_photo,
              label: "المعرض",
              color: const Color(0xFFAC44CF),
              onTap: () {
                Navigator.pop(context);
                widget.onPickImage();
              },
            ),
            _buildAttachItem(
              icon: Icons.camera_alt,
              label: "الكاميرا",
              color: const Color(0xFFD3396D),
              onTap: () {
                Navigator.pop(context);
                widget.onPickCamera();
              },
            ),
            _buildAttachItem(
              icon: Icons.headphones,
              label: "صوتيات",
              color: const Color(0xFFE95928),
              onTap: () => Navigator.pop(context),
            ),
            _buildAttachItem(
              icon: Icons.person,
              label: "جهة اتصال",
              color: const Color(0xFF0F9D58),
              onTap: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAttachItem({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: color,
            child: Icon(icon, color: Colors.white, size: 28),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(color: WhatsAppColors.textSecondary, fontSize: 12),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
      color: Colors.transparent,
      child: Row(
        children: [
          // Left Pill Container
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: WhatsAppColors.searchBarBg,
                borderRadius: BorderRadius.circular(25),
              ),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.emoji_emotions_outlined, color: WhatsAppColors.iconDefault),
                    onPressed: () {},
                  ),
                  Expanded(
                    child: TextField(
                      controller: widget.controller,
                      maxLines: 4,
                      minLines: 1,
                      style: const TextStyle(color: WhatsAppColors.textPrimary, fontSize: 15.5),
                      decoration: const InputDecoration(
                        hintText: "مراسلة...",
                        hintStyle: TextStyle(color: WhatsAppColors.textSecondary, fontSize: 15),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(horizontal: 4, vertical: 10),
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.attach_file, color: WhatsAppColors.iconDefault),
                    onPressed: _showAttachmentBottomSheet,
                  ),
                  if (!_hasText)
                    IconButton(
                      icon: const Icon(Icons.camera_alt, color: WhatsAppColors.iconDefault),
                      onPressed: widget.onPickCamera,
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 5),

          // Right Circular Action Button
          CircleAvatar(
            radius: 23,
            backgroundColor: WhatsAppColors.fabGreen,
            child: IconButton(
              icon: Icon(
                _hasText ? Icons.send : Icons.mic,
                color: Colors.white,
                size: 21,
              ),
              onPressed: () {
                if (_hasText) {
                  widget.onSend();
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("اضغط مع الاستمرار لتسجيل رسالة صوتية (Voice Note)"),
                      duration: Duration(seconds: 1),
                    ),
                  );
                }
              },
            ),
          ),
        ],
      ),
    );
  }
}
