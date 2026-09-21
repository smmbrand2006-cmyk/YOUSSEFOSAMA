import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/whatsapp_colors.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/theme_provider.dart';
import '../home/home_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  void _handleLogin() async {
    final email = _emailController.text.trim();
    final pass = _passwordController.text.trim();

    if (email.isEmpty || pass.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("يرجى إدخال اسم المستخدم أو البريد وكلمة المرور")),
      );
      return;
    }

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.signIn(email, pass);

    if (!mounted) return;
    if (success) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const HomeScreen()),
        (route) => false,
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(auth.errorMessage ?? "فشل تسجيل الدخول")),
      );
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryTextColor = isDark ? WhatsAppColors.textPrimary : WhatsAppColors.lightTextPrimary;
    final secondaryTextColor = isDark ? WhatsAppColors.textSecondary : WhatsAppColors.lightTextSecondary;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Top Theme Switcher
                Align(
                  alignment: Alignment.topRight,
                  child: IconButton(
                    icon: Icon(isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded, color: isDark ? Colors.amber : WhatsAppColors.primaryGreen),
                    onPressed: () {
                      Provider.of<ThemeProvider>(context, listen: false).setTheme(isDark ? 'light' : 'dark');
                    },
                  ),
                ),
                // Logo
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: WhatsAppColors.primaryGreen.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.chat_bubble_rounded, color: WhatsAppColors.primaryGreen, size: 52),
                ),
                const SizedBox(height: 20),

                Text(
                  "تسجيل الدخول إلى YOUSSEF APP",
                  style: TextStyle(
                    color: primaryTextColor,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  "أدخل اسم المستخدم أو رقم الهاتف وكلمة المرور",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: secondaryTextColor, fontSize: 13.5),
                ),
                const SizedBox(height: 32),

                // Identifier input
                TextField(
                  controller: _emailController,
                  style: TextStyle(color: primaryTextColor),
                  decoration: InputDecoration(
                    prefixIcon: Icon(Icons.person_outline, color: secondaryTextColor),
                    hintText: "اسم المستخدم أو رقم الهاتف",
                    filled: true,
                    fillColor: isDark ? WhatsAppColors.searchBarBg : WhatsAppColors.lightSearchBarBg,
                  ),
                ),
                const SizedBox(height: 16),

                // Password input
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
                    hintText: "كلمة المرور",
                    filled: true,
                    fillColor: isDark ? WhatsAppColors.searchBarBg : WhatsAppColors.lightSearchBarBg,
                  ),
                ),
                const SizedBox(height: 28),

                // Login Button
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: auth.isLoading ? null : _handleLogin,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: WhatsAppColors.primaryGreen,
                      foregroundColor: Colors.white,
                      elevation: 2,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(25)),
                    ),
                    child: auth.isLoading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text(
                            "متابعة والبدء",
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                  ),
                ),
                const SizedBox(height: 20),

                // Go to Register
                TextButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const RegisterScreen()),
                    );
                  },
                  child: const Text(
                    "ليس لديك حساب؟ إنشاء حساب جديد الآن",
                    style: TextStyle(color: WhatsAppColors.primaryGreen, fontSize: 14),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
