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
  bool _showEmoji = false;
  int _selectedEmojiCategory = 0;

  static const List<Map<String, dynamic>> _emojiCategories = [
    {
      'icon': '😀',
      'name': 'الابتسامات والمشاعر',
      'emojis': [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '🥹',
        '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗',
        '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓',
        '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕',
        '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😮‍💨',
        '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
        '😰', '😥', '😓', '🤗', '🤔', '🫣', '🫢', '🫡', '🤫', '🫠',
        '🤥', '😶', '😐', '😑', '😬', '🫨', '🙄', '😯', '😦', '😧',
      ],
    },
    {
      'icon': '👍',
      'name': 'الإيماءات واليدين',
      'emojis': [
        '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘',
        '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️',
        '✋', '🖖', '🫱', '🫲', '🫸', '🫷', '🫳', '🫴', '👏', '🙌',
        '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾',
      ],
    },
    {
      'icon': '❤️',
      'name': 'القلوب والمشاعر',
      'emojis': [
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
        '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
        '💟', '🔥', '✨', '🌟', '💫', '💥', '💯', '💢', '💤', '💨',
      ],
    },
    {
      'icon': '🎉',
      'name': 'الاحتفال والأشياء',
      'emojis': [
        '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '⚽', '🏀', '🎮', '📱',
        '💻', '📷', '🎥', '☕', '🍕', '🍔', '🍟', '🍰', '🍩', '🍫',
        '🚗', '✈️', '🚀', '💡', '⏰', '🔔', '🎵', '🎶', '🎤', '🎧',
      ],
    },
    {
      'icon': '⭐',
      'name': 'الرموز والأعلام',
      'emojis': [
        '✅', '❌', '⚠️', '❓', '❗', '💬', '💭', '🇵🇸', '🇪🇬', '🇸🇦',
        '🇦🇪', '🇯🇴', '🇰🇼', '🇶🇦', '🇧🇭', '🇴🇲', '🇮🇶', '🇸🇾', '🇱🇧', '🇲🇦',
        '🇩🇿', '🇹🇳', '🇱🇾', '🇸🇩', '🇾🇪', '🌍', '🌎', '🌏', '☀️', '🌙',
      ],
    },
  ];

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

  void _insertEmoji(String emoji) {
    final text = widget.controller.text;
    final selection = widget.controller.selection;
    if (selection.isValid && selection.start >= 0) {
      final newText = text.replaceRange(selection.start, selection.end, emoji);
      widget.controller.value = TextEditingValue(
        text: newText,
        selection: TextSelection.collapsed(offset: selection.start + emoji.length),
      );
    } else {
      widget.controller.text = text + emoji;
      widget.controller.selection = TextSelection.collapsed(offset: widget.controller.text.length);
    }
    widget.onChanged(widget.controller.text);
  }

  void _handleBackspace() {
    final text = widget.controller.text;
    if (text.isEmpty) return;

    final selection = widget.controller.selection;
    if (selection.isValid && selection.start > 0) {
      final runes = text.runes.toList();
      runes.removeLast();
      final newText = String.fromCharCodes(runes);
      widget.controller.value = TextEditingValue(
        text: newText,
        selection: TextSelection.collapsed(offset: newText.length),
      );
    } else {
      final runes = text.runes.toList();
      runes.removeLast();
      widget.controller.text = String.fromCharCodes(runes);
      widget.controller.selection = TextSelection.collapsed(offset: widget.controller.text.length);
    }
    widget.onChanged(widget.controller.text);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_handleTextChange);
    super.dispose();
  }

  void _showAttachmentBottomSheet() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
          borderRadius: BorderRadius.circular(20),
          boxShadow: isDark
              ? null
              : [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.12),
                    blurRadius: 10,
                  ),
                ],
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
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
            style: TextStyle(
              color: isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final iconColor = isDark ? WhatsAppColors.iconDefault : WhatsAppColors.lightIconDefault;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Input Row
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
          color: Colors.transparent,
          child: Row(
            children: [
              // Left Pill Container
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: isDark ? WhatsAppColors.searchBarBg : Colors.white,
                    borderRadius: BorderRadius.circular(25),
                    boxShadow: isDark
                        ? null
                        : [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.08),
                              offset: const Offset(0, 1),
                              blurRadius: 3,
                            ),
                          ],
                  ),
                  child: Row(
                    children: [
                      // Emoji / Keyboard toggle button
                      IconButton(
                        icon: Icon(
                          _showEmoji ? Icons.keyboard_rounded : Icons.emoji_emotions_outlined,
                          color: _showEmoji ? WhatsAppColors.primaryGreen : iconColor,
                        ),
                        onPressed: () {
                          setState(() {
                            _showEmoji = !_showEmoji;
                          });
                        },
                      ),
                      Expanded(
                        child: TextField(
                          controller: widget.controller,
                          maxLines: 4,
                          minLines: 1,
                          onTap: () {
                            // If emoji keyboard was open, tapping textfield can allow normal input
                          },
                          style: TextStyle(
                            color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary,
                            fontSize: 15.5,
                          ),
                          decoration: InputDecoration(
                            hintText: "مراسلة...",
                            hintStyle: TextStyle(
                              color: isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary,
                              fontSize: 15,
                            ),
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
                          ),
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.attach_file, color: iconColor),
                        onPressed: _showAttachmentBottomSheet,
                      ),
                      if (!_hasText)
                        IconButton(
                          icon: Icon(Icons.camera_alt, color: iconColor),
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
        ),

        // Emoji Keyboard Panel
        if (_showEmoji)
          Container(
            height: 250,
            decoration: BoxDecoration(
              color: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSearchBarBg,
              border: Border(
                top: BorderSide(
                  color: isDark ? WhatsAppColors.divider : WhatsAppColors.lightDivider,
                  width: 0.8,
                ),
              ),
            ),
            child: Column(
              children: [
                // Category Tabs Bar
                Container(
                  height: 40,
                  decoration: BoxDecoration(
                    color: isDark ? WhatsAppColors.background : Colors.white,
                    border: Border(
                      bottom: BorderSide(
                        color: isDark ? WhatsAppColors.divider : WhatsAppColors.lightDivider,
                        width: 0.5,
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      for (int i = 0; i < _emojiCategories.length; i++)
                        Expanded(
                          child: InkWell(
                            onTap: () => setState(() => _selectedEmojiCategory = i),
                            child: Container(
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                border: Border(
                                  bottom: BorderSide(
                                    color: _selectedEmojiCategory == i
                                        ? WhatsAppColors.primaryGreen
                                        : Colors.transparent,
                                    width: 2.5,
                                  ),
                                ),
                              ),
                              child: Text(
                                _emojiCategories[i]['icon'] as String,
                                style: TextStyle(
                                  fontSize: 18,
                                  color: _selectedEmojiCategory == i
                                      ? null
                                      : Colors.grey,
                                ),
                              ),
                            ),
                          ),
                        ),
                      // Backspace Button
                      InkWell(
                        onTap: _handleBackspace,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          alignment: Alignment.center,
                          child: Icon(
                            Icons.backspace_outlined,
                            size: 19,
                            color: isDark ? Colors.white70 : Colors.black54,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Emojis Grid
                Expanded(
                  child: GridView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 8,
                      mainAxisSpacing: 6,
                      crossAxisSpacing: 6,
                    ),
                    itemCount: (_emojiCategories[_selectedEmojiCategory]['emojis'] as List<String>).length,
                    itemBuilder: (context, idx) {
                      final emoji = (_emojiCategories[_selectedEmojiCategory]['emojis'] as List<String>)[idx];
                      return InkWell(
                        borderRadius: BorderRadius.circular(8),
                        onTap: () => _insertEmoji(emoji),
                        child: Center(
                          child: Text(
                            emoji,
                            style: const TextStyle(fontSize: 24),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

