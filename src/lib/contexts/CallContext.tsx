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

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for incoming calls
  useEffect(() => {
    if (!userProfile) return;
    const unsub = listenForIncomingCalls(userProfile.uid, (call) => {
      if (!isCallActive) {
        setIncomingCall(call);
      }
    });
    return () => unsub();
  }, [userProfile?.uid, isCallActive]);

  const initiateCall = async (
    receiverId: string,
    receiverName: string,
    receiverPhoto: string,
    type: "audio" | "video"
  ) => {
    if (!userProfile) return;

    try {
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
      setCallType(type);
      setIsCallActive(true);
      setCallDuration(0);

      // Listen for remote stream
      const rs = new MediaStream();
      peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          rs.addTrack(track);
        });
        setRemoteStream(rs);
      };

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to initiate call:", err);
      throw err;
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall) return;

    try {
      const { peerConnection, localStream: ls } = await answerCall(
        incomingCall.id
      );

      peerConnectionRef.current = peerConnection;
      setLocalStream(ls);
      setActiveCallId(incomingCall.id);
      setCallType(incomingCall.type);
      setIsCallActive(true);
      setIncomingCall(null);
      setCallDuration(0);

      // Listen for remote stream
      const rs = new MediaStream();
      peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          rs.addTrack(track);
        });
        setRemoteStream(rs);
      };

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to answer call:", err);
    }
  };

  const rejectIncomingCall = async () => {
    if (!incomingCall) return;
    await rejectCall(incomingCall.id);
    setIncomingCall(null);
  };

  const hangUp = async () => {
    if (activeCallId) {
      await endCall(activeCallId);
    }

    // Cleanup
    peerConnectionRef.current?.close();
    localStream?.getTracks().forEach((track) => track.stop());
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    setActiveCallId(null);
    setLocalStream(null);
    setRemoteStream(null);
    setIsCallActive(false);
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
