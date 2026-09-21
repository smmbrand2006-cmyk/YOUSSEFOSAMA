import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'core/services/notification_service.dart';
import 'core/services/sound_service.dart';
import 'core/theme/whatsapp_theme.dart';
import 'data/services/chat_cache_service.dart';
import 'presentation/screens/splash_screen.dart';
import 'providers/auth_provider.dart';
import 'providers/chat_provider.dart';
import 'providers/locale_provider.dart';
import 'providers/theme_provider.dart';

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

  // Enable offline persistence for Firestore
  try {
    FirebaseFirestore.instance.settings = const Settings(
      persistenceEnabled: true,
      cacheSizeBytes: Settings.CACHE_SIZE_UNLIMITED,
    );
  } catch (_) {}

  // Initialize Chat Cache Service (0ms loading)
  await ChatCacheService.instance.init();

  // Initialize Sound Service
  await SoundService.instance.initialize();

  // Initialize Notification Service
  await NotificationService.instance.initialize();

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
        ChangeNotifierProvider(create: (_) => LocaleProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
      ],
      child: Consumer2<LocaleProvider, ThemeProvider>(
        builder: (context, localeProvider, themeProvider, _) {
          return MaterialApp(
            title: 'YOUSSEF APP',
            debugShowCheckedModeBanner: false,
            theme: WhatsAppTheme.lightTheme,
            darkTheme: WhatsAppTheme.darkTheme,
            themeMode: themeProvider.themeMode,
            builder: (context, child) {
              final mediaQuery = MediaQuery.of(context);
              return Directionality(
                textDirection: localeProvider.isRtl ? TextDirection.rtl : TextDirection.ltr,
                child: MediaQuery(
                  data: mediaQuery.copyWith(
                    textScaler: TextScaler.linear(themeProvider.fontScale),
                  ),
                  child: child ?? const SizedBox(),
                ),
              );
            },
            home: const SplashScreen(),
          );
        },
      ),
    );
  }
}

