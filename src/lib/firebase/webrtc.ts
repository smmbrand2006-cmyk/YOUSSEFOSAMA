import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";
import { Call, ICECandidate } from "@/lib/types/call";

// Enhanced multi-STUN configuration for seamless Emulator <-> Mobile Phone traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
};

/**
 * Safe getUserMedia with multi-tier fallback for emulators and cross-device calling
 * (Handles missing webcam, missing mic in emulators, overconstrained devices, etc.)
 */
async function getSafeUserMedia(type: "audio" | "video"): Promise<MediaStream & { isRealMic?: boolean }> {
  const audioConstraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  // 1. If video requested, attempt user-facing video first
  if (type === "video") {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      }) as MediaStream & { isRealMic?: boolean };
      s.isRealMic = true;
      return s;
    } catch (vErr1) {
      console.warn("User-facing video failed, trying simple video:", vErr1);
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        }) as MediaStream & { isRealMic?: boolean };
        s.isRealMic = true;
        return s;
      } catch (vErr2) {
        console.warn("Video failed completely on this device/emulator. Falling back to audio only:", vErr2);
      }
    }
  }

  // 2. Try optimized audio
  try {
    const s = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
      video: false,
    }) as MediaStream & { isRealMic?: boolean };
    s.isRealMic = true;
    return s;
  } catch (aErr1) {
    console.warn("Optimized audio constraints failed, trying basic audio:", aErr1);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      }) as MediaStream & { isRealMic?: boolean };
      s.isRealMic = true;
      return s;
    } catch (aErr2) {
      console.warn(
        "No microphone detected (common in Android emulators or PCs without input device). Creating virtual silent audio track to enable connection:",
        aErr2
      );
      // 3. Last-resort virtual audio stream (allows connection so caller/callee can still connect & hear)
      try {
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const dst = ctx.createMediaStreamDestination();
          const gain = ctx.createGain();
          gain.gain.value = 0; // Silent
          osc.connect(gain);
          gain.connect(dst);
          osc.start();
          const s = dst.stream as MediaStream & { isRealMic?: boolean };
          s.isRealMic = false;
          return s;
        }
      } catch (ctxErr) {
        console.error("Failed to create fallback audio stream:", ctxErr);
      }
      throw new Error("تعذر الوصول لأي جهاز صوت أو ميكروفون. يرجى تفعيل إذن الميكروفون.");
    }
  }
}

/**
 * Create a new call (caller side)
 */
export async function createCall(
  callerId: string,
  callerName: string,
  callerPhoto: string = "",
  receiverId: string,
  receiverName: string,
  receiverPhoto: string = "",
  type: "audio" | "video",
  onRemoteStream?: (stream: MediaStream) => void
): Promise<{
  callId: string;
  peerConnection: RTCPeerConnection;
  localStream: MediaStream & { isRealMic?: boolean };
}> {
  // 1. Get local media stream (safe for emulators and phones)
  const localStream = await getSafeUserMedia(type);

  // 2. Create peer connection
  const peerConnection = new RTCPeerConnection(ICE_SERVERS);

  // 3. Hook remote track listener immediately so tracks are never dropped
  peerConnection.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      onRemoteStream?.(event.streams[0]);
    } else if (event.track) {
      const s = new MediaStream([event.track]);
      onRemoteStream?.(s);
    }
  };

  // 4. Add tracks to peer connection with explicit enabled state
  localStream.getTracks().forEach((track) => {
    track.enabled = true;
    peerConnection.addTrack(track, localStream);
  });

  // 5. Create call document in Firestore
  const callDoc = doc(collection(db, "calls"));
  const callId = callDoc.id;

  await setDoc(callDoc, {
    callerId,
    callerName,
    callerPhoto,
    receiverId,
    receiverName,
    receiverPhoto,
    type,
    status: "ringing",
    startedAt: serverTimestamp(),
  });

  // 5. Send local ICE candidates to Firestore
  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      try {
        await addDoc(collection(db, "calls", callId, "callerCandidates"), {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        });
      } catch (err) {
        console.warn("Failed to save caller candidate:", err);
      }
    }
  };

  // 6. Create & set local offer
  const offer = await peerConnection.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: type === "video",
  });
  await peerConnection.setLocalDescription(offer);

  await updateDoc(callDoc, {
    offer: {
      type: offer.type,
      sdp: offer.sdp,
    },
  });

  // 7. Candidate queue to prevent InvalidStateError on emulator/mobile
  const pendingCandidates: RTCIceCandidateInit[] = [];

  // 8. Listen for receiver's answer
  onSnapshot(callDoc, async (snapshot) => {
    const data = snapshot.data();
    if (data?.answer && !peerConnection.currentRemoteDescription) {
      try {
        const answer = new RTCSessionDescription(data.answer);
        await peerConnection.setRemoteDescription(answer);

        // Drain queued ICE candidates
        while (pendingCandidates.length > 0) {
          const cand = pendingCandidates.shift();
          if (cand) {
            try {
              await peerConnection.addIceCandidate(new RTCIceCandidate(cand));
            } catch (candErr) {
              console.warn("Queued candidate error:", candErr);
            }
          }
        }
      } catch (sdpErr) {
        console.error("Failed to set remote description:", sdpErr);
      }
    }

    // Handle call ended/rejected
    if (data?.status === "ended" || data?.status === "rejected") {
      peerConnection.close();
      localStream.getTracks().forEach((track) => track.stop());
    }
  });

  // 9. Listen for callee ICE candidates
  onSnapshot(
    collection(db, "calls", callId, "calleeCandidates"),
    async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === "added") {
          const data = change.doc.data() as ICECandidate;
          const candidateInit = {
            candidate: data.candidate,
            sdpMid: data.sdpMid,
            sdpMLineIndex: data.sdpMLineIndex,
          };

          if (peerConnection.remoteDescription) {
            try {
              await peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
            } catch (err) {
              console.warn("Direct candidate add error:", err);
            }
          } else {
            pendingCandidates.push(candidateInit);
          }
        }
      }
    }
  );

  return { callId, peerConnection, localStream };
}

/**
 * Answer a call (callee side)
 */
export async function answerCall(
  callId: string,
  onRemoteStream?: (stream: MediaStream) => void
): Promise<{
  peerConnection: RTCPeerConnection;
  localStream: MediaStream & { isRealMic?: boolean };
}> {
  const callDoc = doc(db, "calls", callId);
  const callSnap = await getDoc(callDoc);
  const callData = callSnap.data() as Call;

  // 1. Get local media stream (safe for emulators and phones)
  const localStream = await getSafeUserMedia(callData.type);

  // 2. Create peer connection
  const peerConnection = new RTCPeerConnection(ICE_SERVERS);

  // 3. Hook remote track listener immediately so tracks arriving with offer are captured
  peerConnection.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      onRemoteStream?.(event.streams[0]);
    } else if (event.track) {
      const s = new MediaStream([event.track]);
      onRemoteStream?.(s);
    }
  };

  // 4. Add tracks with explicit enabled state
  localStream.getTracks().forEach((track) => {
    track.enabled = true;
    peerConnection.addTrack(track, localStream);
  });

  // 4. Send local ICE candidates to Firestore
  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      try {
        await addDoc(collection(db, "calls", callId, "calleeCandidates"), {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        });
      } catch (err) {
        console.warn("Failed to save callee candidate:", err);
      }
    }
  };

  // 5. Candidate queue
  const pendingCandidates: RTCIceCandidateInit[] = [];

  // 6. Set remote description (offer from caller)
  if (callData.offer) {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(callData.offer)
    );
  }

  // 7. Create answer
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  await updateDoc(callDoc, {
    answer: {
      type: answer.type,
      sdp: answer.sdp,
    },
    status: "active",
  });

  // Drain any queued candidates
  while (pendingCandidates.length > 0) {
    const cand = pendingCandidates.shift();
    if (cand) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {}
    }
  }

  // 8. Listen for caller ICE candidates
  onSnapshot(
    collection(db, "calls", callId, "callerCandidates"),
    async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === "added") {
          const data = change.doc.data() as ICECandidate;
          const candidateInit = {
            candidate: data.candidate,
            sdpMid: data.sdpMid,
            sdpMLineIndex: data.sdpMLineIndex,
          };

          if (peerConnection.remoteDescription) {
            try {
              await peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
            } catch (err) {
              console.warn("Direct candidate add error:", err);
            }
          } else {
            pendingCandidates.push(candidateInit);
          }
        }
      }
    }
  );

  return { peerConnection, localStream };
}

/**
 * End a call
 */
export async function endCall(callId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "calls", callId), {
      status: "ended",
      endedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Error ending call:", err);
  }
}

/**
 * Reject a call
 */
export async function rejectCall(callId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "calls", callId), {
      status: "rejected",
      endedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Error rejecting call:", err);
  }
}

/**
 * Listen for incoming calls (Recent ringing calls only)
 */
export function listenForIncomingCalls(
  uid: string,
  callback: (call: Call & { id: string }) => void
) {
  const q = collection(db, "calls");
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const data = change.doc.data() as Call;
        if (data.receiverId === uid && data.status === "ringing") {
          // Verify call was placed recently (within last 60 seconds)
          const startedAt = data.startedAt?.toDate ? data.startedAt.toDate() : new Date();
          const ageMs = Date.now() - startedAt.getTime();
          if (ageMs < 60000) {
            callback({ ...data, id: change.doc.id });
          }
        }
      }
    });
  });
}
