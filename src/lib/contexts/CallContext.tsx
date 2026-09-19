"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import {
  createCall,
  answerCall,
  endCall,
  rejectCall,
  listenForIncomingCalls,
} from "@/lib/firebase/webrtc";
import { Call } from "@/lib/types/call";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { dispatchAppNotification, playNotificationChime } from "@/lib/utils/pwaNotifications";

interface CallContextType {
  incomingCall: (Call & { id: string }) | null;
  activeCallId: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isCallActive: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  callType: "audio" | "video" | null;
  callDuration: number;
  callStatus: "idle" | "ringing" | "connected";
  otherUser: { name: string; photo?: string } | null;
  initiateCall: (
    receiverId: string,
    receiverName: string,
    receiverPhoto: string,
    type: "audio" | "video"
  ) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  rejectIncomingCall: () => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
}

const CallContext = createContext<CallContextType>({
  incomingCall: null,
  activeCallId: null,
  localStream: null,
  remoteStream: null,
  isCallActive: false,
  isMuted: false,
  isCameraOff: false,
  callType: null,
  callDuration: 0,
  callStatus: "idle",
  otherUser: null,
  initiateCall: async () => {},
  acceptIncomingCall: async () => {},
  rejectIncomingCall: async () => {},
  hangUp: async () => {},
  toggleMute: () => {},
  toggleCamera: () => {},
});

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { userProfile } = useAuth();

  const [incomingCall, setIncomingCall] = useState<
    (Call & { id: string }) | null
  >(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callType, setCallType] = useState<"audio" | "video" | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<"idle" | "ringing" | "connected">("idle");
  const [otherUser, setOtherUser] = useState<{ name: string; photo?: string } | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for incoming calls
  useEffect(() => {
    if (!userProfile) return;
    const unsub = listenForIncomingCalls(userProfile.uid, (call) => {
      if (!isCallActive) {
        setIncomingCall(call);
        if (call) {
          playNotificationChime();
          dispatchAppNotification({
            title: "مكالمة واردة 📞",
            body: `مكالمة ${call.type === "video" ? "فيديو" : "صوتية"} من ${call.callerName || "مستخدم"}`,
            tag: `call-${call.id}`,
            url: "/calls",
          });
        }
      }
    });
    return () => unsub();
  }, [userProfile?.uid, isCallActive]);

  // Listen for status changes on the active call (for caller and receiver)
  useEffect(() => {
    if (!activeCallId) return;

    const unsub = onSnapshot(doc(db, "calls", activeCallId), (snap) => {
      if (!snap.exists()) {
        hangUp();
        return;
      }
      const data = snap.data();
      if (data?.status === "active") {
        setCallStatus("connected");
        // Start duration timer only after connection is active!
        if (!durationIntervalRef.current) {
          durationIntervalRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        }
      } else if (data?.status === "rejected") {
        alert("تم رفض المكالمة من الطرف الآخر.");
        hangUp();
      } else if (data?.status === "ended") {
        hangUp();
      }
    });

    return () => unsub();
  }, [activeCallId]);

  const initiateCall = async (
    receiverId: string,
    receiverName: string,
    receiverPhoto: string,
    type: "audio" | "video"
  ) => {
    if (!userProfile) return;

    try {
      setOtherUser({ name: receiverName, photo: receiverPhoto });
      setCallStatus("ringing");
      setCallType(type);
      setIsCallActive(true);
      setCallDuration(0);

      const { callId, peerConnection, localStream: ls } = await createCall(
        userProfile.uid,
        userProfile.displayName,
        "",
        receiverId,
        receiverName,
        receiverPhoto || "",
        type
      );

      peerConnectionRef.current = peerConnection;
      setLocalStream(ls);
      setActiveCallId(callId);

      // Listen for remote audio/video tracks
      peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };
    } catch (err) {
      console.error("Failed to initiate call:", err);
      hangUp();
      throw err;
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall) return;

    try {
      setOtherUser({
        name: incomingCall.callerName,
        photo: incomingCall.callerPhoto,
      });
      const { peerConnection, localStream: ls } = await answerCall(
        incomingCall.id
      );

      peerConnectionRef.current = peerConnection;
      setLocalStream(ls);
      setActiveCallId(incomingCall.id);
      setCallType(incomingCall.type);
      setCallStatus("connected");
      setIsCallActive(true);
      setIncomingCall(null);
      setCallDuration(0);

      // Listen for remote audio/video tracks
      peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      // Start duration timer for callee
      if (!durationIntervalRef.current) {
        durationIntervalRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }
    } catch (err: any) {
      console.error("Failed to answer call:", err);
      alert(
        "تعذر الرد على المكالمة: " +
          (err.message || "يرجى التأكد من منح صلاحيات الميكروفون.")
      );
    }
  };

  const rejectIncomingCall = async () => {
    if (!incomingCall) return;
    try {
      await rejectCall(incomingCall.id);
    } catch (e) {}
    setIncomingCall(null);
  };

  const hangUp = async () => {
    if (activeCallId) {
      try {
        await endCall(activeCallId);
      } catch (e) {}
    }

    // Cleanup WebRTC & media
    try {
      peerConnectionRef.current?.close();
    } catch (e) {}
    peerConnectionRef.current = null;

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    setActiveCallId(null);
    setLocalStream(null);
    setRemoteStream(null);
    setIsCallActive(false);
    setCallStatus("idle");
    setOtherUser(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setCallType(null);
    setCallDuration(0);
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  return (
    <CallContext.Provider
      value={{
        incomingCall,
        activeCallId,
        localStream,
        remoteStream,
        isCallActive,
        isMuted,
        isCameraOff,
        callType,
        callDuration,
        callStatus,
        otherUser,
        initiateCall,
        acceptIncomingCall,
        rejectIncomingCall,
        hangUp,
        toggleMute,
        toggleCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  return useContext(CallContext);
}
