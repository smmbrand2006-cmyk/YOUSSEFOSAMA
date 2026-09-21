import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/constants/whatsapp_colors.dart';
import '../../../providers/auth_provider.dart';
import '../auth/login_screen.dart';
import '../home/home_screen.dart';

class IntroScreen extends StatefulWidget {
  const IntroScreen({super.key});

  @override
  State<IntroScreen> createState() => _IntroScreenState();
}

class _IntroScreenState extends State<IntroScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<Map<String, dynamic>> _slides = [
    {
      'badge': '🇪🇬 صُنع بفخر في مصر',
      'title': 'YOUSSEF APP\nتطبيق المراسلة المصري الأول',
      'desc': 'تجربة مراسلة ومكالمات عربية حقيقية بمواصفات عالمية، صُمم بكل فخر بأيدي مصرية ليمنحك الحرية والسرعة.',
      'icon': Icons.public_rounded,
      'accentColor': const Color(0xFF00A884),
    },
    {
      'badge': '🔐 خصوصيتك خط أحمر',
      'title': 'تشفير تام للرسائل\nبدون أي تجسس نهائياً',
      'desc': 'رسائلك ومكالماتك مشفرة بالكامل من الطرفين (End-to-End). محادثاتك لك وحدك، بدون تتبع، وبدون إعلانات مزعجة.',
      'icon': Icons.security_rounded,
      'accentColor': const Color(0xFF25D366),
    },
    {
      'badge': '⚡ أداء خارق',
      'title': 'سريع وخفيف\nحتى مع أضعف إنترنت',
      'desc': 'تقنيات ضغط متطورة تضمن إرسال الرسائل والصور بأقل استهلاك للباقة وبأسرع استجابة بدون أي تقطيع.',
      'icon': Icons.bolt_rounded,
      'accentColor': const Color(0xFF34B7F1),
    },
  ];

  Future<void> _completeIntro() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('youssef_seen_intro', true);
    } catch (_) {}

    if (!mounted) return;
    final auth = Provider.of<AuthProvider>(context, listen: false);
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
      backgroundColor: const Color(0xFF0B141B),
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar with Skip
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: WhatsAppColors.primaryGreen.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: WhatsAppColors.primaryGreen.withOpacity(0.3)),
                        ),
                        child: const Icon(Icons.chat_bubble_rounded, color: WhatsAppColors.primaryGreen, size: 20),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        "YOUSSEF APP",
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                  TextButton(
                    onPressed: _completeIntro,
                    child: Text(
                      "تخطي",
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.6),
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Carousel Slides
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: _slides.length,
                onPageChanged: (idx) => setState(() => _currentPage = idx),
                itemBuilder: (ctx, i) {
                  final slide = _slides[i];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 28),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Glowing Icon Container
                        Container(
                          width: 130,
                          height: 130,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: RadialGradient(
                              colors: [
                                (slide['accentColor'] as Color).withOpacity(0.25),
                                Colors.transparent,
                              ],
                            ),
                          ),
                          child: Center(
                            child: Container(
                              width: 88,
                              height: 88,
                              decoration: BoxDecoration(
                                color: (slide['accentColor'] as Color).withOpacity(0.15),
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: (slide['accentColor'] as Color).withOpacity(0.4),
                                  width: 2,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: (slide['accentColor'] as Color).withOpacity(0.3),
                                    blurRadius: 20,
                                    spreadRadius: 2,
                                  ),
                                ],
                              ),
                              child: Icon(
                                slide['icon'] as IconData,
                                color: slide['accentColor'] as Color,
                                size: 44,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 32),

                        // Egyptian Badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.06),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.white.withOpacity(0.12)),
                          ),
                          child: Text(
                            slide['badge'] as String,
                            style: const TextStyle(
                              color: WhatsAppColors.primaryGreen,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Title
                        Text(
                          slide['title'] as String,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            height: 1.3,
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Description
                        Text(
                          slide['desc'] as String,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.7),
                            fontSize: 14.5,
                            height: 1.6,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),

            // Dots & Action Button
            Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                children: [
                  // Dot indicators
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(_slides.length, (idx) {
                      final isActive = idx == _currentPage;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: isActive ? 24 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: isActive ? WhatsAppColors.primaryGreen : Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 24),

                  // Button
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: () {
                        if (_currentPage < _slides.length - 1) {
                          _pageController.nextPage(
                            duration: const Duration(milliseconds: 300),
                            curve: Curves.easeInOut,
                          );
                        } else {
                          _completeIntro();
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: WhatsAppColors.primaryGreen,
                        foregroundColor: const Color(0xFF0B141B),
                        elevation: 4,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: Text(
                        _currentPage == _slides.length - 1 ? "ابدأ استخدام التطبيق 🚀" : "التالي ←",
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
