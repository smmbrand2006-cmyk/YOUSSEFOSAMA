"use client";

import { useEffect, useRef } from "react";
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
      remoteAudioRef.current.play().catch((e) => {
        console.warn("Audio autoplay blocked or waiting for user gesture:", e);
      });
    }
  }, [remoteStream]);

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
    >
      {/* 🔊 Dedicated Remote Audio element (Ensures audio is always heard in voice & video calls) */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

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
