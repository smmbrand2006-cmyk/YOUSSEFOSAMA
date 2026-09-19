import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./config";
import { Call, ICECandidate } from "@/lib/types/call";

// Free STUN servers (for development; add TURN for production)
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

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
  type: "audio" | "video"
): Promise<{
  callId: string;
  peerConnection: RTCPeerConnection;
  localStream: MediaStream;
}> {
  // Get local media stream
  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: type === "video",
  });

  // Create peer connection
  const peerConnection = new RTCPeerConnection(ICE_SERVERS);

  // Add tracks to peer connection
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // Create call document in Firestore
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

  // Listen for ICE candidates and add to Firestore
  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      await addDoc(collection(db, "calls", callId, "callerCandidates"), {
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
      });
    }
  };

  // Create offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  await updateDoc(callDoc, {
    offer: {
      type: offer.type,
      sdp: offer.sdp,
    },
  });

  // Listen for answer
  onSnapshot(callDoc, (snapshot) => {
    const data = snapshot.data();
    if (data?.answer && !peerConnection.currentRemoteDescription) {
      const answer = new RTCSessionDescription(data.answer);
      peerConnection.setRemoteDescription(answer);
    }
    // Handle call ended/rejected
    if (data?.status === "ended" || data?.status === "rejected") {
      peerConnection.close();
      localStream.getTracks().forEach((track) => track.stop());
    }
  });

  // Listen for callee ICE candidates
  onSnapshot(
    collection(db, "calls", callId, "calleeCandidates"),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data() as ICECandidate;
          peerConnection.addIceCandidate(
            new RTCIceCandidate({
              candidate: data.candidate,
              sdpMid: data.sdpMid,
              sdpMLineIndex: data.sdpMLineIndex,
            })
          );
        }
      });
    }
  );

  return { callId, peerConnection, localStream };
}

/**
 * Answer a call (callee side)
 */
export async function answerCall(
  callId: string
): Promise<{
  peerConnection: RTCPeerConnection;
  localStream: MediaStream;
}> {
  const callDoc = doc(db, "calls", callId);
  const callSnap = await getDoc(callDoc);
  const callData = callSnap.data() as Call;

  // Get local media stream
  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: callData.type === "video",
  });

  // Create peer connection
  const peerConnection = new RTCPeerConnection(ICE_SERVERS);

  // Add tracks
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // Listen for ICE candidates
  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      await addDoc(collection(db, "calls", callId, "calleeCandidates"), {
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
      });
    }
  };

  // Set remote description (offer from caller)
  if (callData.offer) {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(callData.offer)
    );
  }

  // Create answer
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  await updateDoc(callDoc, {
    answer: {
      type: answer.type,
      sdp: answer.sdp,
    },
    status: "active",
  });

  // Listen for caller ICE candidates
  onSnapshot(
    collection(db, "calls", callId, "callerCandidates"),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data() as ICECandidate;
          peerConnection.addIceCandidate(
            new RTCIceCandidate({
              candidate: data.candidate,
              sdpMid: data.sdpMid,
              sdpMLineIndex: data.sdpMLineIndex,
            })
          );
        }
      });
    }
  );

  return { peerConnection, localStream };
}

/**
 * End a call
 */
export async function endCall(callId: string): Promise<void> {
  await updateDoc(doc(db, "calls", callId), {
    status: "ended",
    endedAt: serverTimestamp(),
  });
}

/**
 * Reject a call
 */
export async function rejectCall(callId: string): Promise<void> {
  await updateDoc(doc(db, "calls", callId), {
    status: "rejected",
    endedAt: serverTimestamp(),
  });
}

/**
 * Listen for incoming calls
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
          callback({ ...data, id: change.doc.id });
        }
      }
    });
  });
}
