import 'dart:async';
import 'package:flutter/foundation.dart';
import '../data/models/user_model.dart';
import '../data/services/auth_service.dart';
import '../data/services/realtime_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  final RealtimeService _realtimeService = RealtimeService();
  final Completer<void> _initCompleter = Completer<void>();

  UserModel? _currentUser;
  bool _isLoading = true;
  String? _errorMessage;

  UserModel? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _currentUser != null;
  String? get errorMessage => _errorMessage;
  Future<void> get initializationDone => _initCompleter.future;

  AuthProvider() {
    _init();
  }

  Future<void> _init() async {
    _isLoading = true;

    // 1. Instant 0ms cached user restore
    try {
      final cached = await _authService.getCachedUser();
      if (cached != null) {
        _currentUser = cached;
        _isLoading = false;
        notifyListeners();
      }
    } catch (_) {}

    // 2. Validate/refresh with Firestore & Auth
    try {
      final user = await _authService.getCurrentUserProfile();
      if (user != null) {
        _currentUser = user;
        _realtimeService.setupPresence(user.uid);
      }
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      if (!_initCompleter.isCompleted) {
        _initCompleter.complete();
      }
      notifyListeners();
    }
  }

  Future<bool> signIn(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final user = await _authService.signIn(email: email, password: password);
      _currentUser = user;
      _realtimeService.setupPresence(user.uid);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = _cleanAuthError(e.toString());
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String displayName,
    required String email,
    required String password,
    String? bio,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final user = await _authService.register(
        displayName: displayName,
        email: email,
        password: password,
        bio: bio,
      );
      _currentUser = user;
      _realtimeService.setupPresence(user.uid);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = _cleanAuthError(e.toString());
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> updateProfile({String? displayName, String? bio, String? photoUrl}) async {
    try {
      await _authService.updateProfile(
        displayName: displayName,
        bio: bio,
        photoUrl: photoUrl,
      );
      _currentUser = _currentUser?.copyWith(
        displayName: displayName,
        bio: bio,
        photoUrl: photoUrl,
      );
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    if (_currentUser != null) {
      await _realtimeService.setOffline(_currentUser!.uid);
    }
    await _authService.signOut();
    _currentUser = null;
    notifyListeners();
  }

  String _cleanAuthError(String raw) {
    if (raw.contains("user-not-found") ||
        raw.contains("wrong-password") ||
        raw.contains("invalid-credential") ||
        raw.contains("invalid-email")) {
      return "بيانات الدخول غير صحيحة، يرجى التأكد من اسم المستخدم أو رقم الهاتف وكلمة المرور.";
    }
    if (raw.contains("email-already-in-use")) {
      return "هذا الحساب أو الرقم مسجل بالفعل، يرجى تسجيل الدخول.";
    }
    if (raw.contains("weak-password")) {
      return "كلمة المرور ضعيفة جداً، يرجى اختيار كلمة مرور أطول (6 خانات أو أكثر).";
    }
    if (raw.contains("network-request-failed")) {
      return "تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت.";
    }
    return "تعذر تسجيل الدخول، يرجى التأكد من صحة البيانات والمحاولة مجدداً.";
  }
}
