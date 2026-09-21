import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants/whatsapp_colors.dart';
import '../../providers/auth_provider.dart';
import 'auth/login_screen.dart';
import 'home/home_screen.dart';
import 'intro/intro_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    // 1. Splash minimum brand display
    await Future.delayed(const Duration(milliseconds: 1200));
    if (!mounted) return;

    final auth = Provider.of<AuthProvider>(context, listen: false);

    // 2. Wait for auth initialization (local cache and remote) to complete
    if (auth.isLoading) {
      await auth.initializationDone;
    }
    if (!mounted) return;

    // 3. Check if user saw Egyptian intro onboarding
    try {
      final prefs = await SharedPreferences.getInstance();
      final seenIntro = prefs.getBool('youssef_seen_intro') ?? false;
      if (!mounted) return;
      if (!seenIntro) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const IntroScreen()),
        );
        return;
      }
    } catch (_) {}

    if (!mounted) return;

    // 4. If authenticated, straight to Home
    if (auth.isAuthenticated) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const HomeScreen()),
      );
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WhatsAppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(),
            Center(
              child: Image.asset(
                'assets/images/logo.png',
                width: 90,
                height: 90,
                errorBuilder: (_, __, ___) => const Icon(
                  Icons.chat_bubble_rounded,
                  size: 80,
                  color: WhatsAppColors.primaryGreen,
                ),
              ),
            ),
            const Spacer(),
            const Text(
              "from",
              style: TextStyle(
                color: WhatsAppColors.textSecondary,
                fontSize: 12,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              "YOUSSEF APP",
              style: TextStyle(
                color: WhatsAppColors.primaryGreen,
                fontSize: 16,
                fontWeight: FontWeight.bold,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
