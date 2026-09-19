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
    acceptIncomingCall,
    rejectIncomingCall,
    hangUp,
    toggleMute,
    toggleCamera,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // Incoming call overlay
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
          Incoming {incomingCall.type} call...
        </div>

        <div className={styles.incomingCallActions}>
          <div className={styles.incomingCallBtn}>
            <button
              className={`${styles.incomingCallBtnCircle} ${styles.incomingCallReject}`}
              onClick={rejectIncomingCall}
            >
              <PhoneOff size={28} />
            </button>
            <span className={styles.incomingCallLabel}>Decline</span>
          </div>
          <div className={styles.incomingCallBtn}>
            <button
              className={`${styles.incomingCallBtnCircle} ${styles.incomingCallAccept}`}
              onClick={acceptIncomingCall}
            >
              <Phone size={28} />
            </button>
            <span className={styles.incomingCallLabel}>Accept</span>
          </div>
        </div>
      </div>
    );
  }

  // Active call overlay
  if (!isCallActive) return null;

  return (
    <div
      className={`${styles.callOverlay} ${
        callType === "video" ? styles.callOverlayVideo : ""
      }`}
    >
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
        </>
      ) : (
        /* Audio call display */
        <div className={styles.callInfo}>
          <div className={styles.callAvatar}>
            {/* Show remote user avatar */}
            <Volume2 size={60} />
          </div>
          <div className={styles.callName}>Audio Call</div>
          <div className={styles.callDuration}>
            {formatDuration(callDuration)}
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
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <button
          className={`${styles.callControlBtn} ${styles.callControlBtnEnd}`}
          onClick={hangUp}
          title="End call"
        >
          <PhoneOff size={28} />
        </button>

        {callType === "video" && (
          <button
            className={`${styles.callControlBtn} ${
              isCameraOff ? styles.callControlBtnActive : ""
            }`}
            onClick={toggleCamera}
            title={isCameraOff ? "Turn on camera" : "Turn off camera"}
          >
            {isCameraOff ? <VideoOff size={24} /> : <Video size={24} />}
          </button>
        )}
      </div>
    </div>
  );
}
