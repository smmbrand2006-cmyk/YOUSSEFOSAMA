import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'core/theme/whatsapp_theme.dart';
import 'presentation/screens/splash_screen.dart';
import 'providers/auth_provider.dart';
import 'providers/chat_provider.dart';

// Firebase configuration (shared across Android & Web)
const FirebaseOptions _firebaseOptions = FirebaseOptions(
  apiKey: 'AIzaSyBUlsPbGCznAkncC7tZjRfDYMoTC0H_QaI',
  authDomain: 'rubber-f0574.firebaseapp.com',
  projectId: 'rubber-f0574',
  storageBucket: 'rubber-f0574.firebasestorage.app',
  messagingSenderId: '608921253339',
  appId: '1:608921253339:web:35e350e02608777fab23fe',
  databaseURL: 'https://rubber-f0574-default-rtdb.firebaseio.com',
);

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set system UI overlay style (Android only)
  if (!kIsWeb) {
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        systemNavigationBarColor: Color(0xFF111B21),
        systemNavigationBarIconBrightness: Brightness.light,
      ),
    );
  }

  // Initialize Firebase - Web needs explicit options, Android uses google-services.json
  await Firebase.initializeApp(
    options: kIsWeb ? _firebaseOptions : null,
  );

  runApp(const YoussefApp());
}

class YoussefApp extends StatelessWidget {
  const YoussefApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ChatProvider()),
      ],
      child: MaterialApp(
        title: 'YOUSSEF APP',
        debugShowCheckedModeBanner: false,
        theme: WhatsAppTheme.darkTheme,
        builder: (context, child) {
          // Wrap with RTL Directionality for authentic Arabic WhatsApp experience
          return Directionality(
            textDirection: TextDirection.rtl,
            child: child ?? const SizedBox(),
          );
        },
        home: const SplashScreen(),
      ),
    );
  }
}
