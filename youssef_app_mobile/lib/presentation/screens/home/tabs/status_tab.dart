import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/whatsapp_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../data/models/status_model.dart';
import '../../../../data/services/firestore_service.dart';
import '../../../../data/services/storage_service.dart';
import '../../../../providers/auth_provider.dart';
import '../../../widgets/custom_avatar.dart';

class StatusTab extends StatefulWidget {
  const StatusTab({super.key});

  @override
  State<StatusTab> createState() => _StatusTabState();
}

class _StatusTabState extends State<StatusTab> {
  final FirestoreService _firestoreService = FirestoreService();
  final StorageService _storageService = StorageService();

  void _showAddTextStatusDialog() {
    final textController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: WhatsAppColors.surfaceCard,
        title: const Text("نشر حالة نصية جديدة ✍️"),
        content: TextField(
          controller: textController,
          maxLines: 4,
          style: const TextStyle(color: WhatsAppColors.textPrimary),
          decoration: const InputDecoration(
            hintText: "اكتب حالتك هنا...",
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("إلغاء", style: TextStyle(color: WhatsAppColors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: WhatsAppColors.primaryGreen),
            onPressed: () async {
              final text = textController.text.trim();
              if (text.isEmpty) return;
              Navigator.pop(ctx);

              final auth = Provider.of<AuthProvider>(context, listen: false);
              final user = auth.currentUser;
              if (user == null) return;

              await _firestoreService.publishStatus(
                userId: user.uid,
                userName: user.displayName,
                userAvatar: user.photoUrl,
                type: "text",
                content: text,
                backgroundColor: "#005C4B",
              );

              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("تم نشر الحالة بنجاح 🟢")),
                );
              }
            },
            child: const Text("نشر الآن", style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _pickAndPublishImageStatus() async {
    final file = await _storageService.pickImage(ImageSource.gallery);
    if (file == null || !mounted) return;

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final user = auth.currentUser;
    if (user == null) return;

    final base64Url = await _storageService.fileToBase64DataUrl(file);
    await _firestoreService.publishStatus(
      userId: user.uid,
      userName: user.displayName,
      userAvatar: user.photoUrl,
      type: "image",
      mediaUrl: base64Url,
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("تم نشر حالة الصورة بنجاح 📷")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final currentUser = auth.currentUser;

    if (currentUser == null) return const SizedBox();

    return StreamBuilder<List<StatusModel>>(
      stream: _firestoreService.getActiveStatusesStream(),
      builder: (context, snapshot) {
        final allStatuses = snapshot.data ?? [];
        final myStatuses = allStatuses.where((s) => s.userId == currentUser.uid).toList();
        final othersStatuses = allStatuses.where((s) => s.userId != currentUser.uid).toList();

        return ListView(
          children: [
            // My Status Section
            ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              leading: Stack(
                children: [
                  CustomAvatar(
                    name: currentUser.displayName,
                    photoUrl: currentUser.photoUrl,
                    radius: 26,
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: const BoxDecoration(
                        color: WhatsAppColors.primaryGreen,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.add, color: Colors.white, size: 16),
                    ),
                  ),
                ],
              ),
              title: const Text(
                "حالتي",
                style: TextStyle(
                  color: WhatsAppColors.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              subtitle: Text(
                myStatuses.isNotEmpty
                    ? "${myStatuses.length} حالة نشطة • انقر للعرض"
                    : "انقر لإضافة تحديث إلى حالتك",
                style: const TextStyle(color: WhatsAppColors.textSecondary, fontSize: 13),
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.edit, color: WhatsAppColors.iconDefault),
                    onPressed: _showAddTextStatusDialog,
                  ),
                  IconButton(
                    icon: const Icon(Icons.camera_alt, color: WhatsAppColors.iconDefault),
                    onPressed: _pickAndPublishImageStatus,
                  ),
                ],
              ),
              onTap: () {
                if (myStatuses.isNotEmpty) {
                  _viewStatus(myStatuses.first);
                } else {
                  _showAddTextStatusDialog();
                }
              },
            ),

            if (othersStatuses.isNotEmpty) ...[
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Text(
                  "المستجدات الحديثة",
                  style: TextStyle(
                    color: WhatsAppColors.textSecondary,
                    fontSize: 13.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              for (final status in othersStatuses) ...[
                _buildStatusTile(status, currentUser.uid),
                const Divider(indent: 72),
              ],
            ],
          ],
        );
      },
    );
  }

  Widget _buildStatusTile(StatusModel status, String currentUid) {
    final isViewed = status.isViewedBy(currentUid);
    final timeStr = DateFormatter.formatChatTime(status.createdAt);

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: Container(
        padding: const EdgeInsets.all(2.5),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: isViewed ? WhatsAppColors.greyTick : WhatsAppColors.primaryGreen,
            width: 2.2,
          ),
        ),
        child: CustomAvatar(
          name: status.userName,
          photoUrl: status.userAvatar,
          radius: 23,
        ),
      ),
      title: Text(
        status.userName,
        style: const TextStyle(
          color: WhatsAppColors.textPrimary,
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
      subtitle: Text(
        timeStr,
        style: const TextStyle(color: WhatsAppColors.textSecondary, fontSize: 13),
      ),
      onTap: () => _viewStatus(status),
    );
  }

  void _viewStatus(StatusModel status) {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final user = auth.currentUser;
    if (user != null && status.userId != user.uid) {
      _firestoreService.recordStatusView(
        statusId: status.id,
        viewerId: user.uid,
        viewerName: user.displayName,
        viewerAvatar: user.photoUrl,
      );
    }

    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.black,
        insetPadding: EdgeInsets.zero,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Status content
            Center(
              child: status.type == 'image' && status.mediaUrl != null
                  ? Image.network(status.mediaUrl!, fit: BoxFit.contain)
                  : Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        status.content ?? "",
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
            ),
            // Header
            Positioned(
              top: 40,
              left: 16,
              right: 16,
              child: Row(
                children: [
                  CustomAvatar(name: status.userName, photoUrl: status.userAvatar, radius: 20),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        status.userName,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Text(
                        DateFormatter.formatChatTime(status.createdAt),
                        style: const TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                    ],
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            // Viewers for owner
            if (user != null && status.userId == user.uid)
              Positioned(
                bottom: 20,
                left: 0,
                right: 0,
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.visibility, color: Colors.white, size: 18),
                        const SizedBox(width: 6),
                        Text(
                          "${status.viewers.length} مشاهدة",
                          style: const TextStyle(color: Colors.white, fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
