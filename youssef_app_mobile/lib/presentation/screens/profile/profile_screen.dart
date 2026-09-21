import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/whatsapp_colors.dart';
import '../../../data/services/storage_service.dart';
import '../../../providers/auth_provider.dart';
import '../../widgets/custom_avatar.dart';
import '../auth/login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final StorageService _storageService = StorageService();

  void _editName(BuildContext context, String currentName) {
    final controller = TextEditingController(text: currentName);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: WhatsAppColors.surfaceCard,
        title: const Text("تعديل الاسم"),
        content: TextField(
          controller: controller,
          style: const TextStyle(color: WhatsAppColors.textPrimary),
          decoration: const InputDecoration(hintText: "أدخل اسمك"),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("إلغاء")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: WhatsAppColors.primaryGreen),
            onPressed: () {
              final newName = controller.text.trim();
              if (newName.isNotEmpty) {
                Provider.of<AuthProvider>(context, listen: false).updateProfile(displayName: newName);
              }
              Navigator.pop(ctx);
            },
            child: const Text("حفظ", style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _editBio(BuildContext context, String currentBio) {
    final controller = TextEditingController(text: currentBio);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: WhatsAppColors.surfaceCard,
        title: const Text("تعديل النبذة الشخصية (Bio)"),
        content: TextField(
          controller: controller,
          maxLines: 3,
          style: const TextStyle(color: WhatsAppColors.textPrimary),
          decoration: const InputDecoration(hintText: "أدخل الحالة"),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("إلغاء")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: WhatsAppColors.primaryGreen),
            onPressed: () {
              final newBio = controller.text.trim();
              if (newBio.isNotEmpty) {
                Provider.of<AuthProvider>(context, listen: false).updateProfile(bio: newBio);
              }
              Navigator.pop(ctx);
            },
            child: const Text("حفظ", style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _changeAvatar() async {
    final file = await _storageService.pickImage(ImageSource.gallery);
    if (file == null) return;

    final base64Url = await _storageService.fileToBase64DataUrl(file);
    if (!mounted) return;
    await Provider.of<AuthProvider>(context, listen: false).updateProfile(photoUrl: base64Url);

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("تم تحديث الصورة الشخصية بنجاح 📷")),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;

    if (user == null) return const Scaffold();

    return Scaffold(
      appBar: AppBar(
        title: const Text("الملف الشخصي"),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 20),
        children: [
          // Avatar with camera button
          Center(
            child: Stack(
              children: [
                CustomAvatar(
                  name: user.displayName,
                  photoUrl: user.photoUrl,
                  radius: 65,
                ),
                Positioned(
                  bottom: 0,
                  right: 4,
                  child: GestureDetector(
                    onTap: _changeAvatar,
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: const BoxDecoration(
                        color: WhatsAppColors.primaryGreen,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.camera_alt, color: Colors.white, size: 22),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),

          // User Unique Code (Glowing green card)
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: WhatsAppColors.surfaceCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: WhatsAppColors.primaryGreen.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.qr_code, color: WhatsAppColors.primaryGreen, size: 28),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "كود المستخدم الفريد (User Code)",
                        style: TextStyle(color: WhatsAppColors.textSecondary, fontSize: 12),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        "#${user.userCode}",
                        style: const TextStyle(
                          color: WhatsAppColors.primaryGreen,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 2,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.copy, color: WhatsAppColors.primaryGreen),
                  tooltip: "نسخ الكود",
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: "#${user.userCode}"));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("تم نسخ كود المستخدم إلى الحافظة 📋")),
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Name tile
          ListTile(
            leading: const Icon(Icons.person, color: WhatsAppColors.iconDefault),
            title: const Text("الاسم", style: TextStyle(color: WhatsAppColors.textSecondary, fontSize: 12)),
            subtitle: Text(user.displayName, style: const TextStyle(color: WhatsAppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
            trailing: IconButton(
              icon: const Icon(Icons.edit, color: WhatsAppColors.primaryGreen, size: 20),
              onPressed: () => _editName(context, user.displayName),
            ),
          ),
          const Divider(indent: 72),

          // Bio tile
          ListTile(
            leading: const Icon(Icons.info_outline, color: WhatsAppColors.iconDefault),
            title: const Text("الأخبار / النبذة", style: TextStyle(color: WhatsAppColors.textSecondary, fontSize: 12)),
            subtitle: Text(user.bio, style: const TextStyle(color: WhatsAppColors.textPrimary, fontSize: 15)),
            trailing: IconButton(
              icon: const Icon(Icons.edit, color: WhatsAppColors.primaryGreen, size: 20),
              onPressed: () => _editBio(context, user.bio),
            ),
          ),
          const Divider(indent: 72),

          // Email tile
          ListTile(
            leading: const Icon(Icons.email_outlined, color: WhatsAppColors.iconDefault),
            title: const Text("البريد الإلكتروني", style: TextStyle(color: WhatsAppColors.textSecondary, fontSize: 12)),
            subtitle: Text(user.email, style: const TextStyle(color: WhatsAppColors.textPrimary, fontSize: 15)),
          ),
          const SizedBox(height: 24),

          // Logout Button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: OutlinedButton.icon(
              icon: const Icon(Icons.logout, color: WhatsAppColors.danger),
              label: const Text("تسجيل الخروج", style: TextStyle(color: WhatsAppColors.danger, fontWeight: FontWeight.bold)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: WhatsAppColors.danger),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(25)),
              ),
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    backgroundColor: WhatsAppColors.surfaceCard,
                    title: const Text("تسجيل الخروج"),
                    content: const Text("هل ترغب بالفعل في تسجيل الخروج من هذا الجهاز؟"),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("إلغاء")),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: WhatsAppColors.danger),
                        onPressed: () async {
                          Navigator.pop(ctx);
                          await auth.signOut();
                          if (context.mounted) {
                            Navigator.pushAndRemoveUntil(
                              context,
                              MaterialPageRoute(builder: (_) => const LoginScreen()),
                              (route) => false,
                            );
                          }
                        },
                        child: const Text("نعم، تسجيل الخروج", style: TextStyle(color: Colors.white)),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
