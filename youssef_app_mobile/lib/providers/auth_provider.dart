import 'package:flutter/foundation.dart';
import '../data/models/user_model.dart';
import '../data/services/auth_service.dart';
import '../data/services/realtime_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  final RealtimeService _realtimeService = RealtimeService();

  UserModel? _currentUser;
  bool _isLoading = true;
  String? _errorMessage;

  UserModel? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _currentUser != null;
  String? get errorMessage => _errorMessage;

  AuthProvider() {
    _init();
  }

  Future<void> _init() async {
    _isLoading = true;
    notifyListeners();

    try {
      final user = await _authService.getCurrentUserProfile();
      _currentUser = user;
      if (user != null) {
        _realtimeService.setupPresence(user.uid);
      }
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
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
    if (raw.contains("user-not-found") || raw.contains("wrong-password") || raw.contains("invalid-credential")) {
      return "بيانات الدخول غير صحيحة، يرجى التأكد والمحاولة مرة أخرى.";
    }
    if (raw.contains("email-already-in-use")) {
      return "هذا الحساب مسجل بالفعل، يرجى تسجيل الدخول.";
    }
    if (raw.contains("weak-password")) {
      return "كلمة المرور ضعيفة جداً، يرجى اختيار كلمة مرور أطول.";
    }
    return "حدث خطأ أثناء المصادقة: $raw";
  }
}
