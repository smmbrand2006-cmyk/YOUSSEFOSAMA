"use client";

import { useEffect, useRef, useState } from "react";
import { useCall } from "@/lib/contexts/CallContext";
import { formatDuration } from "@/lib/utils/formatDate";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  AlertTriangle,
} from "lucide-react";
import styles from "@/styles/calls.module.css";

export default function CallOverlay() {
  const {
    incomingCall,
    isCallActive,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    isRealMic,
    callType,
    callDuration,
    callStatus,
    otherUser,
    acceptIncomingCall,
    rejectIncomingCall,
    hangUp,
    toggleMute,
    toggleCamera,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [remoteSpeaking, setRemoteSpeaking] = useState(false);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video and audio elements (CRITICAL for hearing each other)
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current
        .play()
        .then(() => setAutoplayBlocked(false))
        .catch((e) => {
          console.warn("Audio autoplay blocked or waiting for user gesture:", e);
          setAutoplayBlocked(true);
        });
    }
  }, [remoteStream]);

  // Real-time Web Audio Analyser for Speaking Activity Detection
  useEffect(() => {
    if (!isCallActive) return;
    const AudioCtxClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return;

    let ctx: AudioContext | null = null;
    let localAnalyser: AnalyserNode | null = null;
    let remoteAnalyser: AnalyserNode | null = null;
    let localSource: MediaStreamAudioSourceNode | null = null;
    let remoteSource: MediaStreamAudioSourceNode | null = null;
    let animId: number;

    try {
      ctx = new AudioCtxClass();

      if (localStream && localStream.getAudioTracks().length > 0 && isRealMic) {
        localAnalyser = ctx.createAnalyser();
        localAnalyser.fftSize = 128;
        localSource = ctx.createMediaStreamSource(localStream);
        localSource.connect(localAnalyser);
      }

      if (remoteStream && remoteStream.getAudioTracks().length > 0) {
        remoteAnalyser = ctx.createAnalyser();
        remoteAnalyser.fftSize = 128;
        remoteSource = ctx.createMediaStreamSource(remoteStream);
        remoteSource.connect(remoteAnalyser);
      }

      const checkAudio = () => {
        if (localAnalyser && !isMuted && isRealMic) {
          const lData = new Uint8Array(localAnalyser.frequencyBinCount);
          localAnalyser.getByteFrequencyData(lData);
          let sum = 0;
          for (let i = 0; i < lData.length; i++) sum += lData[i];
          const avg = sum / lData.length;
          setLocalSpeaking(avg > 18);
        } else {
          setLocalSpeaking(false);
        }

        if (remoteAnalyser) {
          const rData = new Uint8Array(remoteAnalyser.frequencyBinCount);
          remoteAnalyser.getByteFrequencyData(rData);
          let sum = 0;
          for (let i = 0; i < rData.length; i++) sum += rData[i];
          const avg = sum / rData.length;
          setRemoteSpeaking(avg > 18);
        } else {
          setRemoteSpeaking(false);
        }

        animId = requestAnimationFrame(checkAudio);
      };

      animId = requestAnimationFrame(checkAudio);
    } catch (e) {
      console.warn("Call audio analyzer note:", e);
    }

    return () => {
      cancelAnimationFrame(animId);
      try {
        localSource?.disconnect();
        remoteSource?.disconnect();
        ctx?.close();
      } catch (e) {}
    };
  }, [isCallActive, localStream, remoteStream, isMuted, isRealMic]);

  // Touch/Click to unlock audio if browser autoplay was blocked
  const handleUnlockAudio = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current
        .play()
        .then(() => setAutoplayBlocked(false))
        .catch((e) => console.warn("Retry audio play error:", e));
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "#";
    return name
      .trim()
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // Incoming call overlay (Receiver sees this)
  if (incomingCall && !isCallActive) {
    return (
      <div className={styles.incomingCallOverlay}>
        <div className={styles.incomingCallAvatar}>
          {incomingCall.callerPhoto ? (
            <img src={incomingCall.callerPhoto} alt="" />
          ) : (
            getInitials(incomingCall.callerName)
          )}
        </div>
        <div className={styles.incomingCallName}>
          {incomingCall.callerName}
        </div>
        <div className={styles.incomingCallType}>
          مكالمة {incomingCall.type === "video" ? "فيديو" : "صوتية"} واردة...
        </div>

        <div className={styles.incomingCallActions}>
          <div className={styles.incomingCallBtn}>
            <button
              className={`${styles.incomingCallBtnCircle} ${styles.incomingCallReject}`}
              onClick={rejectIncomingCall}
              title="رفض"
            >
              <PhoneOff size={28} />
            </button>
            <span className={styles.incomingCallLabel}>رفض</span>
          </div>
          <div className={styles.incomingCallBtn}>
            <button
              className={`${styles.incomingCallBtnCircle} ${styles.incomingCallAccept}`}
              onClick={acceptIncomingCall}
              title="رد"
            >
              <Phone size={28} />
            </button>
            <span className={styles.incomingCallLabel}>رد</span>
          </div>
        </div>
      </div>
    );
  }

  // Active call overlay (Either Caller or Receiver during call)
  if (!isCallActive) return null;

  const displayName = otherUser?.name || "مكالمة";

  return (
    <div
      className={`${styles.callOverlay} ${
        callType === "video" ? styles.callOverlayVideo : ""
      }`}
      onClick={autoplayBlocked ? handleUnlockAudio : undefined}
    >
      {/* 🔊 Dedicated Remote Audio element (Ensures audio is always heard in voice & video calls) */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Autoplay blocked banner (tap to unmute) */}
      {autoplayBlocked && (
        <div className={styles.callAudioBlockedAlert} onClick={handleUnlockAudio}>
          <Volume2 size={18} />
          <span>الصوت مكتوم من المتصفح - اضغط هنا لسماع الطرف الآخر 🔊</span>
        </div>
      )}

      {/* Dummy/Silent Mic warning banner */}
      {!isRealMic && (
        <div className={styles.callMicBlockedAlert}>
          <AlertTriangle size={18} />
          <span>الميكروفون محظور بهاتفك - الطرف الآخر لا يمكنه سماعك ⚠️</span>
        </div>
      )}

      {callType === "video" ? (
        <>
          {/* Remote video (fullscreen) */}
          {remoteStream && (
            <video
              ref={remoteVideoRef}
              className={styles.remoteVideo}
              autoPlay
              playsInline
            />
          )}

          {/* Local video (small window) */}
          <div className={styles.localVideo}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
            />
          </div>

          <div className={styles.videoCallHeader}>
            <div className={styles.videoCallName}>{displayName}</div>
            <div className={styles.videoCallDuration}>
              {callStatus === "ringing"
                ? "يرن الآن... 🔔"
                : formatDuration(callDuration)}
            </div>
            {/* Live speaking badges */}
            <div className={styles.speakingIndicatorRow}>
              {localSpeaking && (
                <span className={styles.localSpeakingBadge}>
                  <Mic size={14} className={styles.speakingWaveIcon} />
                  أنت تتحدث 🎙️
                </span>
              )}
              {remoteSpeaking && (
                <span className={styles.remoteSpeakingBadge}>
                  <Volume2 size={14} className={styles.speakingWaveIcon} />
                  الطرف الآخر يتحدث 🔊
                </span>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Audio call display */
        <div className={styles.callInfo}>
          <div className={styles.callAvatar}>
            {otherUser?.photo ? (
              <img src={otherUser.photo} alt="" />
            ) : (
              getInitials(displayName)
            )}
          </div>
          <div className={styles.callName}>{displayName}</div>
          <div className={styles.callStatus}>
            {callStatus === "ringing" ? "يرن الآن... 🔔" : "متصل 🟢"}
          </div>
          <div className={styles.callDuration}>
            {callStatus === "ringing"
              ? "في انتظار الرد..."
              : formatDuration(callDuration)}
          </div>

          {/* Live speaking status row */}
          <div className={styles.speakingIndicatorRow}>
            {localSpeaking && (
              <span className={styles.localSpeakingBadge}>
                <Mic size={14} className={styles.speakingWaveIcon} />
                أنت تتحدث 🎙️
              </span>
            )}
            {remoteSpeaking && (
              <span className={styles.remoteSpeakingBadge}>
                <Volume2 size={14} className={styles.speakingWaveIcon} />
                الطرف الآخر يتحدث 🔊
              </span>
            )}
            {!localSpeaking && !remoteSpeaking && callStatus === "connected" && (
              <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)" }}>
                الصوت متصل ونشط 🎧
              </span>
            )}
          </div>
        </div>
      )}

      {/* Call controls */}
      <div className={styles.callControls}>
        <button
          className={`${styles.callControlBtn} ${
            isMuted ? styles.callControlBtnActive : ""
          }`}
          onClick={toggleMute}
          title={isMuted ? "إلغاء كتم الصوت" : "كتم الصوت"}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <button
          className={`${styles.callControlBtn} ${styles.callControlBtnEnd}`}
          onClick={hangUp}
          title="إنهاء المكالمة"
        >
          <PhoneOff size={28} />
        </button>

        {callType === "video" && (
          <button
            className={`${styles.callControlBtn} ${
              isCameraOff ? styles.callControlBtnActive : ""
            }`}
            onClick={toggleCamera}
            title={isCameraOff ? "تشغيل الكاميرا" : "إيقاف الكاميرا"}
          >
            {isCameraOff ? <VideoOff size={24} /> : <Video size={24} />}
          </button>
        )}
      </div>
    </div>
  );
}
