import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/whatsapp_colors.dart';
import '../../../data/services/storage_service.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/locale_provider.dart';
import '../../widgets/custom_avatar.dart';
import '../auth/login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final StorageService _storageService = StorageService();
  bool _isUpdatingAvatar = false;

  static const List<Map<String, String>> _presetAvatars = [
    {
      'title': 'أخضر مميز',
      'url': 'https://api.dicebear.com/7.x/bottts/png?seed=Youssef&backgroundColor=00a884',
    },
    {
      'title': 'أزرق أنيق',
      'url': 'https://api.dicebear.com/7.x/bottts/png?seed=Cyber&backgroundColor=1f75fe',
    },
    {
      'title': 'شخصية عصرية',
      'url': 'https://api.dicebear.com/7.x/avataaars/png?seed=Alex&backgroundColor=b6e3f4',
    },
    {
      'title': 'مغامر فضاء',
      'url': 'https://api.dicebear.com/7.x/avataaars/png?seed=Sam&backgroundColor=ffdfbf',
    },
    {
      'title': 'بنفسجي متألق',
      'url': 'https://api.dicebear.com/7.x/bottts/png?seed=Star&backgroundColor=8a2be2',
    },
    {
      'title': 'ذهبي بريميوم',
      'url': 'https://api.dicebear.com/7.x/bottts/png?seed=Hero&backgroundColor=e6b800',
    },
    {
      'title': 'روبوت حديث',
      'url': 'https://api.dicebear.com/7.x/bottts/png?seed=Modern&backgroundColor=111b21',
    },
    {
      'title': 'زمرد كلاسيكي',
      'url': 'https://api.dicebear.com/7.x/bottts/png?seed=Pro&backgroundColor=005c4b',
    },
    {
      'title': 'نيون فائق',
      'url': 'https://api.dicebear.com/7.x/bottts/png?seed=Neon&backgroundColor=ff007f',
    },
  ];

  void _editName(BuildContext context, String currentName, LocaleProvider locale) {
    final controller = TextEditingController(text: currentName);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
        title: Text(locale.t('name'), style: TextStyle(color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary)),
        content: TextField(
          controller: controller,
          style: TextStyle(color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary),
          decoration: InputDecoration(hintText: locale.t('name')),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(locale.t('cancel'), style: TextStyle(color: isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: WhatsAppColors.primaryGreen),
            onPressed: () {
              final newName = controller.text.trim();
              if (newName.isNotEmpty) {
                Provider.of<AuthProvider>(context, listen: false).updateProfile(displayName: newName);
              }
              Navigator.pop(ctx);
            },
            child: Text(locale.t('save'), style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _editBio(BuildContext context, String currentBio, LocaleProvider locale) {
    final controller = TextEditingController(text: currentBio);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
        title: Text(locale.t('about'), style: TextStyle(color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary)),
        content: TextField(
          controller: controller,
          maxLines: 3,
          style: TextStyle(color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary),
          decoration: InputDecoration(hintText: locale.t('about')),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(locale.t('cancel'), style: TextStyle(color: isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: WhatsAppColors.primaryGreen),
            onPressed: () {
              final newBio = controller.text.trim();
              if (newBio.isNotEmpty) {
                Provider.of<AuthProvider>(context, listen: false).updateProfile(bio: newBio);
              }
              Navigator.pop(ctx);
            },
            child: Text(locale.t('save'), style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showAvatarOptions(BuildContext context, LocaleProvider locale) {
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
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 14),
              child: Text(
                locale.t('choose_avatar'),
                style: TextStyle(
                  color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.camera_alt_rounded, color: WhatsAppColors.primaryGreen),
              title: Text(locale.t('camera'), style: TextStyle(color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary)),
              onTap: () {
                Navigator.pop(ctx);
                _pickAndSetAvatar(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_rounded, color: Color(0xFFAC44CF)),
              title: Text(locale.t('gallery'), style: TextStyle(color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary)),
              onTap: () {
                Navigator.pop(ctx);
                _pickAndSetAvatar(ImageSource.gallery);
              },
            ),
            ListTile(
              leading: const Icon(Icons.face_rounded, color: Color(0xFFE95928)),
              title: Text(locale.t('preset_avatars'), style: TextStyle(color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary)),
              onTap: () {
                Navigator.pop(ctx);
                _showPresetAvatarsDialog(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.link_rounded, color: Color(0xFF1E88E5)),
              title: Text("رابط صورة من الإنترنت", style: TextStyle(color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary)),
              onTap: () {
                Navigator.pop(ctx);
                _showImageUrlDialog(context, locale);
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent),
              title: Text(locale.t('remove_photo'), style: const TextStyle(color: Colors.redAccent)),
              onTap: () async {
                Navigator.pop(ctx);
                setState(() => _isUpdatingAvatar = true);
                await Provider.of<AuthProvider>(context, listen: false).updateProfile(photoUrl: "");
                if (!mounted) return;
                setState(() => _isUpdatingAvatar = false);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("تمت إزالة الصورة الشخصية")),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showImageUrlDialog(BuildContext context, LocaleProvider locale) {
    final controller = TextEditingController();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
        title: Text("رابط صورة من الإنترنت", style: TextStyle(color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary)),
        content: TextField(
          controller: controller,
          style: TextStyle(color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary),
          decoration: const InputDecoration(
            hintText: "https://example.com/avatar.jpg",
            prefixIcon: Icon(Icons.link_rounded, color: WhatsAppColors.primaryGreen),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(locale.t('cancel'), style: TextStyle(color: isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: WhatsAppColors.primaryGreen),
            onPressed: () async {
              final url = controller.text.trim();
              if (url.isNotEmpty && (url.startsWith('http://') || url.startsWith('https://'))) {
                Navigator.pop(ctx);
                setState(() => _isUpdatingAvatar = true);
                await Provider.of<AuthProvider>(context, listen: false).updateProfile(photoUrl: url);
                if (mounted) {
                  setState(() => _isUpdatingAvatar = false);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("تم حفظ الصورة الشخصية بنجاح 🌐")),
                  );
                }
              }
            },
            child: Text(locale.t('save'), style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showPresetAvatarsDialog(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
        title: Text(
          "اختر صورة رمزية جاهزة",
          style: TextStyle(color: isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary),
        ),
        content: SizedBox(
          width: 320,
          child: GridView.builder(
            shrinkWrap: true,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: _presetAvatars.length,
            itemBuilder: (context, idx) {
              final item = _presetAvatars[idx];
              return InkWell(
                borderRadius: BorderRadius.circular(35),
                onTap: () async {
                  Navigator.pop(ctx);
                  setState(() => _isUpdatingAvatar = true);
                  await Provider.of<AuthProvider>(context, listen: false).updateProfile(photoUrl: item['url']);
                  if (!mounted) return;
                  setState(() => _isUpdatingAvatar = false);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("تم تطبيق الصورة الرمزية بنجاح 🌟")),
                  );
                },
                child: CircleAvatar(
                  radius: 35,
                  backgroundImage: NetworkImage(item['url']!),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  void _pickAndSetAvatar(ImageSource source) async {
    setState(() => _isUpdatingAvatar = true);
    try {
      final file = await _storageService.pickAvatarImage(source);
      if (file == null) {
        if (mounted) setState(() => _isUpdatingAvatar = false);
        return;
      }

      final auth = Provider.of<AuthProvider>(context, listen: false);
      final uid = auth.currentUser?.uid;
      String? photoUrl;

      // 1. Try Firebase Storage first (guaranteed secure URL under 200 chars)
      if (uid != null) {
        try {
          photoUrl = await _storageService.uploadProfileAvatar(uid: uid, file: file);
        } catch (storageErr) {
          debugPrint("Firebase Storage upload fallback: $storageErr");
        }
      }

      // 2. Fallback to compact Base64 (<30KB) if storage is offline or denied
      if (photoUrl == null || photoUrl.isEmpty) {
        photoUrl = await _storageService.fileToBase64DataUrl(file, isAvatar: true);
      }

      if (!mounted) return;
      await auth.updateProfile(photoUrl: photoUrl);

      if (mounted) {
        setState(() => _isUpdatingAvatar = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("تم تحديث الصورة الشخصية بنجاح 📷")),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUpdatingAvatar = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("تعذر تحديث الصورة: $e")),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final locale = Provider.of<LocaleProvider>(context);
    final user = auth.currentUser;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
    final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;

    if (user == null) return const Scaffold();

    return Scaffold(
      appBar: AppBar(
        title: Text(locale.t('profile_title')),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 20),
        children: [
          // Avatar with camera button
          Center(
            child: Stack(
              alignment: Alignment.center,
              children: [
                GestureDetector(
                  onTap: () => _showAvatarOptions(context, locale),
                  child: CustomAvatar(
                    name: user.displayName,
                    photoUrl: user.photoUrl,
                    radius: 65,
                  ),
                ),
                if (_isUpdatingAvatar)
                  Container(
                    width: 130,
                    height: 130,
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.5),
                      shape: BoxShape.circle,
                    ),
                    child: const Center(
                      child: CircularProgressIndicator(color: WhatsAppColors.primaryGreen),
                    ),
                  ),
                Positioned(
                  bottom: 0,
                  right: 4,
                  child: GestureDetector(
                    onTap: () => _showAvatarOptions(context, locale),
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
              color: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: WhatsAppColors.primaryGreen.withOpacity(0.3)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(isDark ? 0.2 : 0.05),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                const Icon(Icons.qr_code, color: WhatsAppColors.primaryGreen, size: 28),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        locale.t('user_code'),
                        style: TextStyle(color: secondaryTextColor, fontSize: 12),
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
                  tooltip: locale.t('code_copied'),
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: "#${user.userCode}"));
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(locale.t('code_copied'))),
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Name tile
          ListTile(
            leading: Icon(Icons.person, color: isDark ? WhatsAppColors.iconDefault : WhatsAppColors.lightIconDefault),
            title: Text(locale.t('name'), style: TextStyle(color: secondaryTextColor, fontSize: 12)),
            subtitle: Text(user.displayName, style: TextStyle(color: primaryTextColor, fontSize: 16, fontWeight: FontWeight.bold)),
            trailing: IconButton(
              icon: const Icon(Icons.edit, color: WhatsAppColors.primaryGreen, size: 20),
              onPressed: () => _editName(context, user.displayName, locale),
            ),
          ),
          const Divider(indent: 72),

          // Bio tile
          ListTile(
            leading: Icon(Icons.info_outline, color: isDark ? WhatsAppColors.iconDefault : WhatsAppColors.lightIconDefault),
            title: Text(locale.t('about'), style: TextStyle(color: secondaryTextColor, fontSize: 12)),
            subtitle: Text(user.bio, style: TextStyle(color: primaryTextColor, fontSize: 15)),
            trailing: IconButton(
              icon: const Icon(Icons.edit, color: WhatsAppColors.primaryGreen, size: 20),
              onPressed: () => _editBio(context, user.bio, locale),
            ),
          ),
          const Divider(indent: 72),

          // Email tile
          ListTile(
            leading: Icon(Icons.email_outlined, color: isDark ? WhatsAppColors.iconDefault : WhatsAppColors.lightIconDefault),
            title: Text(locale.t('phone_number'), style: TextStyle(color: secondaryTextColor, fontSize: 12)),
            subtitle: Text(user.email, style: TextStyle(color: primaryTextColor, fontSize: 15)),
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
                    backgroundColor: isDark ? WhatsAppColors.surfaceCard : WhatsAppColors.lightSurfaceCard,
                    title: Text("تسجيل الخروج", style: TextStyle(color: primaryTextColor)),
                    content: Text("هل ترغب بالفعل في تسجيل الخروج من هذا الجهاز؟", style: TextStyle(color: secondaryTextColor)),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx), child: Text(locale.t('cancel'), style: TextStyle(color: secondaryTextColor))),
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

