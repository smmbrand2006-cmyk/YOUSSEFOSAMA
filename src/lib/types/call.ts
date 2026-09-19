import { Timestamp } from "firebase/firestore";

export type CallType = "audio" | "video";
export type CallStatus = "ringing" | "active" | "ended" | "missed" | "rejected";

export interface Call {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto?: string;
  receiverId: string;
  receiverName: string;
  receiverPhoto?: string;
  type: CallType;
  status: CallStatus;
  startedAt: Timestamp;
  endedAt?: Timestamp;
  duration?: number;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
}

export interface ICECandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}
