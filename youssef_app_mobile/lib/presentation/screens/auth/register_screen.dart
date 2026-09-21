import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/whatsapp_colors.dart';
import '../../../providers/auth_provider.dart';
import '../home/home_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _bioController = TextEditingController(text: "مرحباً! أنا أستخدم تطبيق يوسف.");
  bool _obscurePassword = true;

  void _handleRegister() async {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final pass = _passwordController.text.trim();
    final bio = _bioController.text.trim();

    if (name.isEmpty || email.isEmpty || pass.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("يرجى ملء جميع الحقول المطلوبة")),
      );
      return;
    }

    if (pass.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل")),
      );
      return;
    }

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.register(
      displayName: name,
      email: email,
      password: pass,
      bio: bio,
    );

    if (!mounted) return;
    if (success) {
      // Show generated code dialog
      final user = auth.currentUser;
      if (user != null) {
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            backgroundColor: WhatsAppColors.surfaceCard,
            title: const Text("تهانينا! تم إنشاء حسابك بنجاح 🎉"),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text("كود حسابك الخاص للتواصل مع الأصدقاء:"),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: WhatsAppColors.primaryGreen.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: WhatsAppColors.primaryGreen),
                  ),
                  child: Text(
                    "#${user.userCode}",
                    style: const TextStyle(
                      color: WhatsAppColors.primaryGreen,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  "يمكن لأي صديق العثور عليك فوراً بكتابة هذا الكود في خانة البحث.",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: WhatsAppColors.textSecondary, fontSize: 13),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(builder: (_) => const HomeScreen()),
                    (route) => false,
                  );
                },
                child: const Text("ابدأ المحادثة الآن 🚀", style: TextStyle(color: WhatsAppColors.primaryGreen, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        );
      } else {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const HomeScreen()),
          (route) => false,
        );
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(auth.errorMessage ?? "فشل إنشاء الحساب")),
      );
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
    final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;

    return Scaffold(
      appBar: AppBar(
        title: Text("إنشاء حساب جديد", style: TextStyle(color: primaryTextColor)),
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: primaryTextColor),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            children: [
              Text(
                "أدخل بياناتك للحصول على كود المستخدم الخاص بك فورياً",
                textAlign: TextAlign.center,
                style: TextStyle(color: secondaryTextColor, fontSize: 13.5),
              ),
              const SizedBox(height: 24),

              // Name
              TextField(
                controller: _nameController,
                style: TextStyle(color: primaryTextColor),
                decoration: InputDecoration(
                  prefixIcon: Icon(Icons.person, color: secondaryTextColor),
                  hintText: "الاسم الظاهر (مثال: يوسف أسامة)",
                  filled: true,
                  fillColor: isDark ? WhatsAppColors.searchBarBg : WhatsAppColors.lightSearchBarBg,
                ),
              ),
              const SizedBox(height: 16),

              // Email / Username
              TextField(
                controller: _emailController,
                style: TextStyle(color: primaryTextColor),
                decoration: InputDecoration(
                  prefixIcon: Icon(Icons.alternate_email, color: secondaryTextColor),
                  hintText: "اسم المستخدم أو البريد الإلكتروني",
                  filled: true,
                  fillColor: isDark ? WhatsAppColors.searchBarBg : WhatsAppColors.lightSearchBarBg,
                ),
              ),
              const SizedBox(height: 16),

              // Password
              TextField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                style: TextStyle(color: primaryTextColor),
                decoration: InputDecoration(
                  prefixIcon: Icon(Icons.lock_outline, color: secondaryTextColor),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword ? Icons.visibility_off : Icons.visibility,
                      color: secondaryTextColor,
                    ),
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                  ),
                  hintText: "كلمة المرور (6 خانات على الأقل)",
                  filled: true,
                  fillColor: isDark ? WhatsAppColors.searchBarBg : WhatsAppColors.lightSearchBarBg,
                ),
              ),
              const SizedBox(height: 16),

              // Bio
              TextField(
                controller: _bioController,
                style: TextStyle(color: primaryTextColor),
                decoration: InputDecoration(
                  prefixIcon: Icon(Icons.info_outline, color: secondaryTextColor),
                  hintText: "الحالة / النبذة الشخصية (Bio)",
                  filled: true,
                  fillColor: isDark ? WhatsAppColors.searchBarBg : WhatsAppColors.lightSearchBarBg,
                ),
              ),
              const SizedBox(height: 32),

              // Register button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: auth.isLoading ? null : _handleRegister,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: WhatsAppColors.primaryGreen,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(25)),
                  ),
                  child: auth.isLoading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text(
                          "إنشاء الحساب الآن",
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
