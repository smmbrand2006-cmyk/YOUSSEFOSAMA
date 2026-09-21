import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/constants/whatsapp_colors.dart';
import '../../../core/services/sound_service.dart';
import '../../widgets/custom_avatar.dart';

class CallScreen extends StatefulWidget {
  final String callerName;
  final String? callerAvatar;
  final bool isVideo;
  final bool isSupport;

  const CallScreen({
    super.key,
    required this.callerName,
    this.callerAvatar,
    this.isVideo = false,
    this.isSupport = false,
  });

  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> {
  bool _isMuted = false;
  bool _isSpeaker = false;
  bool _isVideoOff = false;
  bool _isConnected = false;
  int _seconds = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();

    // Start ringtone
    if (widget.isVideo) {
      SoundService.instance.playVideoCallRingtone();
    } else {
      SoundService.instance.playVoiceCallRingtone();
    }

    // Simulate answer after 3 seconds
    Future.delayed(const Duration(seconds: 3), () {
      if (!mounted) return;
      SoundService.instance.stopCallRingtone();
      setState(() {
        _isConnected = true;
      });
      _startTimer();
    });
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return;
      setState(() {
        _seconds++;
      });
    });
  }

  void _endCall() {
    SoundService.instance.stopCallRingtone();
    _timer?.cancel();
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("انتهت المكالمة 📞"),
        duration: Duration(seconds: 2),
      ),
    );
  }

  String _formatDuration(int seconds) {
    final mins = (seconds ~/ 60).toString().padLeft(2, '0');
    final secs = (seconds % 60).toString().padLeft(2, '0');
    return "$mins:$secs";
  }

  @override
  void dispose() {
    SoundService.instance.stopCallRingtone();
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF101D25),
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 30),

            // Top security badge
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.lock_rounded, color: WhatsAppColors.primaryGreen, size: 14),
                const SizedBox(width: 6),
                Text(
                  widget.isVideo ? "مكالمة فيديو مشفرة تماماً" : "مكالمة صوتية مشفرة تماماً",
                  style: const TextStyle(color: WhatsAppColors.textSecondary, fontSize: 12),
                ),
              ],
            ),

            const SizedBox(height: 25),

            // Caller name
            Text(
              widget.callerName,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 8),

            // Call status / duration
            Text(
              _isConnected ? _formatDuration(_seconds) : "جاري الاتصال...",
              style: TextStyle(
                color: _isConnected ? WhatsAppColors.primaryGreen : WhatsAppColors.textSecondary,
                fontSize: 16,
                fontWeight: _isConnected ? FontWeight.bold : FontWeight.normal,
              ),
            ),

            const Spacer(),

            // Avatar / Video preview
            Center(
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Animated pulsing ring when connecting
                  if (!_isConnected)
                    Container(
                      width: 170,
                      height: 170,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: WhatsAppColors.primaryGreen.withOpacity(0.35),
                          width: 4,
                        ),
                      ),
                    ),
                  CustomAvatar(
                    name: widget.callerName,
                    photoUrl: widget.callerAvatar,
                    radius: 65,
                    isSupport: widget.isSupport,
                  ),
                ],
              ),
            ),

            const Spacer(),

            // In-call action bar
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              decoration: BoxDecoration(
                color: const Color(0xFF1F2C34),
                borderRadius: BorderRadius.circular(30),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  // Speaker
                  IconButton(
                    icon: Icon(
                      _isSpeaker ? Icons.volume_up_rounded : Icons.volume_down_rounded,
                      color: _isSpeaker ? WhatsAppColors.primaryGreen : Colors.white,
                      size: 28,
                    ),
                    onPressed: () => setState(() => _isSpeaker = !_isSpeaker),
                  ),

                  // Video toggle (if video call)
                  if (widget.isVideo)
                    IconButton(
                      icon: Icon(
                        _isVideoOff ? Icons.videocam_off_rounded : Icons.videocam_rounded,
                        color: _isVideoOff ? Colors.redAccent : Colors.white,
                        size: 28,
                      ),
                      onPressed: () => setState(() => _isVideoOff = !_isVideoOff),
                    ),

                  // Mute
                  IconButton(
                    icon: Icon(
                      _isMuted ? Icons.mic_off_rounded : Icons.mic_rounded,
                      color: _isMuted ? Colors.redAccent : Colors.white,
                      size: 28,
                    ),
                    onPressed: () => setState(() => _isMuted = !_isMuted),
                  ),

                  // End call button
                  GestureDetector(
                    onTap: _endCall,
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.call_end_rounded, color: Colors.white, size: 28),
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
