import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Hand,
  MessageSquare,
  Users,
  ShieldCheck,
  Lock,
  Unlock,
  Settings,
  MoreVertical,
  Copy,
  Check,
  Sparkles,
  Paperclip,
  Smile,
  Send,
  X,
  Volume2,
  VolumeX,
  UserX,
  Crown,
  Shield,
  Circle,
  Download,
  FileText,
  Signal,
  RefreshCw,
  Camera,
  Layers,
  Zap,
  Info,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/lib/AuthContext";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";
import { AudioVolumeAnalyzer, createNoiseSuppressionStream } from "@/lib/audioProcessing";
import { CallRecorder } from "@/lib/recorder";

interface ParticipantState {
  socketId: string;
  userId: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isCohost: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  isHandRaised: boolean;
  isSpeaking: boolean;
  stream?: MediaStream;
}

interface ChatMessage {
  id: string;
  senderSocketId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  emoji?: string;
  file?: { name: string; size: string; dataUrl: string; type: string };
  timestamp: string;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export default function MeetingRoomPage() {
  const router = useRouter();
  const { roomId, passcode } = router.query;
  const { user } = useUser();

  // Socket & Peers
  const socketRef = useRef<any>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Room state
  const [isJoined, setIsJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isCohost, setIsCohost] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [permissions, setPermissions] = useState({ allowScreenShare: true, allowChat: true });

  const [participants, setParticipants] = useState<Map<string, ParticipantState>>(new Map());

  // Local Media
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const noiseCleanupRef = useRef<(() => void) | null>(null);

  // Bandwidth / Resolution mode
  const [qualityMode, setQualityMode] = useState<"auto" | "720p" | "360p" | "audio-only">("auto");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // Call Duration
  const [duration, setDuration] = useState(0);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Panels
  const [activePanel, setActivePanel] = useState<"none" | "chat" | "participants" | "settings">("none");
  const [unreadMessages, setUnreadMessages] = useState(0);

  // In-Call Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Participant Search
  const [participantSearch, setParticipantSearch] = useState("");

  // Recording
  const recorderRef = useRef<CallRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedResult, setRecordedResult] = useState<{ url: string; duration: number } | null>(null);

  // Display name & Auth
  const [displayName, setDisplayName] = useState<string>("User");
  const [copiedLink, setCopiedLink] = useState(false);

  // Audio Analyzer for local mic
  const audioAnalyzerRef = useRef<AudioVolumeAnalyzer | null>(null);

  // Pin / Spotlight
  const [pinnedSocketId, setPinnedSocketId] = useState<string | null>(null);

  // Local Video Ref
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Setup user details from session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = sessionStorage.getItem("meet_displayName");
      const savedMic = sessionStorage.getItem("meet_micOn");
      const savedCam = sessionStorage.getItem("meet_camOn");
      const savedNoise = sessionStorage.getItem("meet_noiseSuppression");

      if (savedName) setDisplayName(savedName);
      else if (user?.name) setDisplayName(user.name);

      if (savedMic !== null) setIsMicOn(JSON.parse(savedMic));
      if (savedCam !== null) setIsCamOn(JSON.parse(savedCam));
      if (savedNoise !== null) setNoiseSuppression(JSON.parse(savedNoise));
    }
  }, [user]);

  // Main Socket & Peer Connection Setup
  useEffect(() => {
    if (!roomId) return;

    const socket = getSocket();
    socketRef.current = socket;
    if (!socket.connected) socket.connect();

    // Start local media stream first
    initLocalMedia().then((stream) => {
      // Join Room
      const userPayload = {
        id: user?._id || user?.id || socket.id,
        name: displayName,
        avatar: user?.image || "",
      };

      socket.emit("join-room", {
        roomId,
        user: userPayload,
        passcode: passcode || "",
      });
    });

    // Socket Event Listeners
    socket.on("room-joined", ({ isHost: hostFlag, isCohost: cohostFlag, roomState }: any) => {
      setIsJoined(true);
      setIsHost(hostFlag);
      setIsCohost(cohostFlag);
      setIsLocked(roomState.isLocked);
      setPermissions(roomState.permissions);
      setChatMessages(roomState.chatMessages || []);

      const pMap = new Map<string, ParticipantState>();
      roomState.participants.forEach((p: ParticipantState) => {
        pMap.set(p.socketId, p);
      });
      setParticipants(pMap);

      // Start call duration timer
      if (!durationTimerRef.current) {
        durationTimerRef.current = setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);
      }

      toast.success("Joined meeting room!");
    });

    socket.on("join-error", ({ message }: any) => {
      toast.error(message || "Failed to join room");
      router.push("/meet");
    });

    socket.on("user-joined", ({ participant }: any) => {
      setParticipants((prev) => {
        const next = new Map(prev);
        next.set(participant.socketId, participant);
        return next;
      });

      toast.info(`${participant.name} joined the meeting`);

      // Initiate WebRTC peer connection (as existing member to new member)
      createPeerConnection(participant.socketId, true);
    });

    socket.on("user-left", ({ socketId, name }: any) => {
      if (name) toast.info(`${name} left the meeting`);
      closePeerConnection(socketId);
      setParticipants((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    });

    socket.on("signal-offer", async ({ senderSocketId, offer }: any) => {
      let pc = peersRef.current.get(senderSocketId);
      if (!pc) {
        pc = createPeerConnection(senderSocketId, false);
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("signal-answer", { targetSocketId: senderSocketId, answer });
      } catch (e) {
        console.error("Error handling offer:", e);
      }
    });

    socket.on("signal-answer", async ({ senderSocketId, answer }: any) => {
      const pc = peersRef.current.get(senderSocketId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (e) {
          console.error("Error handling answer:", e);
        }
      }
    });

    socket.on("signal-ice-candidate", async ({ senderSocketId, candidate }: any) => {
      const pc = peersRef.current.get(senderSocketId);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding candidate:", e);
        }
      }
    });

    socket.on("user-state-changed", ({ socketId, updates }: any) => {
      setParticipants((prev) => {
        const next = new Map(prev);
        const existing = next.get(socketId);
        if (existing) {
          next.set(socketId, { ...existing, ...updates });
        }
        return next;
      });
    });

    socket.on("new-chat-message", ({ chatMsg }: any) => {
      setChatMessages((prev) => [...prev, chatMsg]);
      setActivePanel((current) => {
        if (current !== "chat") {
          setUnreadMessages((u) => u + 1);
        }
        return current;
      });
    });

    socket.on("force-muted", ({ by }: any) => {
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
      }
      setIsMicOn(false);
      socket.emit("update-state", { isMuted: true });
      toast.warning(`You were muted by ${by}`);
    });

    socket.on("kicked-from-meeting", ({ reason }: any) => {
      toast.error(reason || "You were removed from the meeting");
      cleanupCall();
      router.push("/meet");
    });

    socket.on("meeting-ended", ({ reason }: any) => {
      toast.error(reason || "The host ended the meeting");
      cleanupCall();
      router.push("/meet");
    });

    socket.on("room-lock-changed", ({ isLocked: lockVal, by }: any) => {
      setIsLocked(lockVal);
      toast.info(`Meeting ${lockVal ? "locked" : "unlocked"} by ${by}`);
    });

    socket.on("cohost-status-changed", ({ isCohost: coVal }: any) => {
      setIsCohost(coVal);
      toast.success(coVal ? "You are now a Co-Host!" : "Co-Host privileges removed.");
    });

    socket.on("permissions-changed", ({ permissions: newPerms }: any) => {
      setPermissions(newPerms);
      toast.info("Meeting permissions updated by host");
    });

    return () => {
      cleanupCall();
    };
  }, [roomId]);

  // Media Stream Initialization
  const initLocalMedia = async () => {
    try {
      let stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: noiseSuppression,
        },
        video: {
          width: { ideal: qualityMode === "360p" ? 640 : 1280 },
          height: { ideal: qualityMode === "360p" ? 360 : 720 },
          facingMode: facingMode,
        },
      });

      if (noiseSuppression) {
        const { processedStream, cleanup } = createNoiseSuppressionStream(stream);
        noiseCleanupRef.current = cleanup;
        stream = processedStream;
      }

      // Apply initial mic/cam toggles
      stream.getAudioTracks().forEach((t) => (t.enabled = isMicOn));
      stream.getVideoTracks().forEach((t) => (t.enabled = isCamOn));

      localStreamRef.current = stream;
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Local speaking detection
      if (audioAnalyzerRef.current) audioAnalyzerRef.current.stop();
      audioAnalyzerRef.current = new AudioVolumeAnalyzer(stream, (vol, isSpeaking) => {
        if (socketRef.current && isMicOn) {
          socketRef.current.emit("update-state", { isSpeaking });
        }
      });

      return stream;
    } catch (err: any) {
      console.warn("Camera/Mic initialization fallback:", err);
      toast.error("Could not open camera/mic: " + err.message);
      return new MediaStream();
    }
  };

  // Peer Connection Management
  const createPeerConnection = (targetSocketId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current.set(targetSocketId, pc);

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming stream from remote peer
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setParticipants((prev) => {
        const next = new Map(prev);
        const p = next.get(targetSocketId);
        if (p) {
          next.set(targetSocketId, { ...p, stream: remoteStream });
        }
        return next;
      });
    };

    // Handle ICE Candidate
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("signal-ice-candidate", {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    // ICE connection state monitor for quality & auto-reconnect
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        console.warn(`ICE connection state with ${targetSocketId}: ${pc.iceConnectionState}`);
        // Attempt ICE restart
        if (isInitiator) {
          pc.createOffer({ iceRestart: true }).then((offer) => {
            pc.setLocalDescription(offer);
            socketRef.current?.emit("signal-offer", { targetSocketId, offer });
          });
        }
      }
    };

    // If initiator, create offer
    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          socketRef.current?.emit("signal-offer", {
            targetSocketId,
            offer: pc.localDescription,
          });
        })
        .catch((err) => console.error("Error creating offer:", err));
    }

    return pc;
  };

  const closePeerConnection = (socketId: string) => {
    const pc = peersRef.current.get(socketId);
    if (pc) {
      pc.close();
      peersRef.current.delete(socketId);
    }
  };

  const cleanupCall = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (audioAnalyzerRef.current) {
      audioAnalyzerRef.current.stop();
      audioAnalyzerRef.current = null;
    }
    if (noiseCleanupRef.current) {
      noiseCleanupRef.current();
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();

    if (socketRef.current) {
      socketRef.current.emit("leave-room");
      socketRef.current.off();
    }
  };

  // Toggle Controls
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => (t.enabled = !isMicOn));
    }
    const nextState = !isMicOn;
    setIsMicOn(nextState);
    if (socketRef.current) {
      socketRef.current.emit("update-state", { isMuted: !nextState });
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((t) => (t.enabled = !isCamOn));
    }
    const nextState = !isCamOn;
    setIsCamOn(nextState);
    if (socketRef.current) {
      socketRef.current.emit("update-state", { isCameraOff: !nextState });
    }
  };

  // Switch Facing Camera (Front/Rear on mobile)
  const switchFacingCamera = async () => {
    const nextFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacing);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing },
      });
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (localStreamRef.current) {
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) oldVideoTrack.stop();
        localStreamRef.current.removeTrack(oldVideoTrack);
        localStreamRef.current.addTrack(newVideoTrack);
      }

      // Replace track on all active peer connections
      peersRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      toast.success(`Switched camera to ${nextFacing === "user" ? "Front" : "Rear"}`);
    } catch (err) {
      toast.error("Could not switch camera device");
    }
  };

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    if (!permissions.allowScreenShare && !isHost && !isCohost) {
      toast.error("Screen sharing is disabled by the meeting host");
      return;
    }

    if (isScreenSharing) {
      // Revert back to camera
      initLocalMedia().then((camStream) => {
        const videoTrack = camStream.getVideoTracks()[0];
        peersRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
          if (sender && videoTrack) sender.replaceTrack(videoTrack);
        });
        setIsScreenSharing(false);
        toast.info("Stopped screen sharing");
      });
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        const screenVideoTrack = screenStream.getVideoTracks()[0];

        // Replace track on peer connections
        peersRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
          if (sender) sender.replaceTrack(screenVideoTrack);
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenVideoTrack.onended = () => {
          toggleScreenShare(); // Handle user clicking native "Stop sharing" bar
        };

        setIsScreenSharing(true);
        toast.success("Sharing screen with meeting");
      } catch (err) {
        console.warn("Screen share cancelled or failed:", err);
      }
    }
  };

  // Raise Hand
  const toggleRaiseHand = () => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    if (socketRef.current) {
      socketRef.current.emit("update-state", { isHandRaised: nextState });
    }
    toast(nextState ? "Raised your hand ✋" : "Lowered your hand");
  };

  // Send Chat Message
  const handleSendMessage = (e?: React.FormEvent, emoji?: string) => {
    if (e) e.preventDefault();

    if (!permissions.allowChat && !isHost && !isCohost) {
      toast.error("Chat is disabled by the host");
      return;
    }

    if (!chatInput.trim() && !emoji) return;

    const messageData = {
      text: chatInput.trim(),
      emoji: emoji || null,
    };

    socketRef.current?.emit("send-message", { message: messageData });
    setChatInput("");
  };

  // File Upload in Chat
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size limit is 5MB for in-call sharing");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const fileData = {
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB",
        type: file.type,
        dataUrl: reader.result as string,
      };

      socketRef.current?.emit("send-message", {
        message: { text: `Shared a file: ${file.name}`, file: fileData },
      });

      toast.success("File uploaded to chat!");
    };
    reader.readAsDataURL(file);
  };

  // Recording Controls
  const toggleRecording = async () => {
    if (isRecording) {
      if (recorderRef.current) {
        try {
          const result = await recorderRef.current.stop();
          setIsRecording(false);
          setRecordedResult({ url: result.url, duration: result.duration });
          toast.success("Call recording saved! You can preview or download it now.");
        } catch (e) {
          toast.error("Error stopping recording");
        }
      }
    } else {
      if (!localStreamRef.current) return;
      const recorder = new CallRecorder((sec) => setRecordingDuration(sec));
      recorderRef.current = recorder;
      const started = recorder.start(localStreamRef.current);
      if (started) {
        setIsRecording(true);
        toast.info("Started recording meeting call");
      } else {
        toast.error("Could not start recording");
      }
    }
  };

  // Host Moderation Actions
  const handleMuteParticipant = (socketId: string) => {
    socketRef.current?.emit("mute-participant", { targetSocketId: socketId });
    toast.success("Muted participant");
  };

  const handleMuteAll = () => {
    socketRef.current?.emit("mute-all");
    toast.success("Muted all non-host participants");
  };

  const handleRemoveParticipant = (socketId: string) => {
    socketRef.current?.emit("remove-participant", { targetSocketId: socketId });
    toast.success("Removed user from meeting");
  };

  const handleToggleLock = () => {
    const nextLock = !isLocked;
    socketRef.current?.emit("toggle-lock", { isLocked: nextLock });
  };

  const handleToggleCohost = (socketId: string, currentStatus: boolean) => {
    socketRef.current?.emit("toggle-cohost", { targetSocketId: socketId, isCohost: !currentStatus });
  };

  const handleEndCall = (forAll: boolean = false) => {
    if (forAll && isHost) {
      socketRef.current?.emit("end-meeting-for-all");
    }
    cleanupCall();
    router.push("/meet");
  };

  // Format Duration HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => (n < 10 ? "0" + n : n);
    return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
  };

  // Copy Meeting URL
  const copyMeetingLink = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Copied meeting link to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Combine participants array for layout
  const participantList = Array.from(participants.values());
  const filteredParticipants = participantList.filter((p) =>
    p.name.toLowerCase().includes(participantSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-white overflow-hidden select-none">
      <Head>
        <title>Meeting Room {roomId} - YourTube Meet</title>
      </Head>

      {/* TOP NAVBAR */}
      <header className="h-14 bg-zinc-900/90 backdrop-blur border-b border-zinc-800/80 px-4 flex items-center justify-between z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 p-1.5 rounded-xl shadow-md shadow-red-600/30">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">YourTube Meet</span>
              <span className="text-xs font-mono text-red-400 bg-red-950/80 border border-red-800/50 px-2 py-0.5 rounded-md">
                {roomId}
              </span>
              <button
                onClick={copyMeetingLink}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
                title="Copy Meeting Link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Center: Live Timer & Indicators */}
        <div className="flex items-center gap-3">
          <div className="bg-zinc-800/80 border border-zinc-700/60 px-3 py-1 rounded-full text-xs font-mono text-zinc-300 flex items-center gap-1.5 shadow-sm">
            <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500 animate-pulse" />
            <span>{formatTime(duration)}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-3 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>E2EE Active</span>
          </div>

          {isLocked && (
            <div className="flex items-center gap-1 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2.5 py-1 rounded-full">
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Locked</span>
            </div>
          )}

          {isRecording && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/60 border border-red-800/60 px-3 py-1 rounded-full animate-pulse font-mono">
              <Circle className="w-2.5 h-2.5 fill-red-500 text-red-500" />
              <span>REC {formatTime(recordingDuration)}</span>
            </div>
          )}
        </div>

        {/* Right side: Host badge & Panel Toggles */}
        <div className="flex items-center gap-2">
          {isHost && (
            <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-400" /> Host
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActivePanel(activePanel === "participants" ? "none" : "participants")}
            className={`relative rounded-xl text-zinc-300 ${activePanel === "participants" ? "bg-zinc-800 text-white" : ""}`}
          >
            <Users className="w-4 h-4 mr-1.5" />
            <span className="text-xs font-semibold">{participantList.length}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActivePanel(activePanel === "chat" ? "none" : "chat");
              setUnreadMessages(0);
            }}
            className={`relative rounded-xl text-zinc-300 ${activePanel === "chat" ? "bg-zinc-800 text-white" : ""}`}
          >
            <MessageSquare className="w-4 h-4 mr-1.5" />
            <span className="text-xs font-semibold">Chat</span>
            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {unreadMessages}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* MAIN VIDEO & SIDEBAR AREA */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* VIDEO GRID / MAIN CANVAS */}
        <div className="flex-1 p-4 bg-zinc-950 flex flex-col justify-center items-center overflow-auto relative">
          {/* Main Video Grid */}
          <div
            className={`w-full h-full max-w-7xl mx-auto grid gap-4 place-items-center ${
              pinnedSocketId || isScreenSharing
                ? "grid-cols-1 md:grid-cols-4"
                : participantList.length <= 1
                ? "grid-cols-1"
                : participantList.length <= 2
                ? "grid-cols-1 md:grid-cols-2"
                : participantList.length <= 4
                ? "grid-cols-2"
                : participantList.length <= 9
                ? "grid-cols-2 lg:grid-cols-3"
                : "grid-cols-3 lg:grid-cols-4"
            }`}
          >
            {/* Local Video Tile */}
            <div
              className={`relative bg-zinc-900 rounded-2xl overflow-hidden border transition-all duration-200 shadow-xl w-full h-full min-h-[220px] max-h-[75vh] flex items-center justify-center ${
                socketRef.current?.id && participants.get(socketRef.current?.id)?.isSpeaking
                  ? "border-emerald-500 shadow-emerald-500/20 ring-2 ring-emerald-500/40"
                  : "border-zinc-800"
              }`}
            >
              {isCamOn ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === "user" ? "transform -scale-x-100" : ""}`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-600 to-rose-400 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                    {displayName[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="text-xs text-zinc-400 font-medium">{displayName} (You)</span>
                </div>
              )}

              {/* Bottom Tag Overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/60 backdrop-blur px-3 py-1.5 rounded-xl border border-zinc-700/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                    {displayName} (You)
                  </span>
                  {isHost && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                </div>

                <div className="flex items-center gap-1.5">
                  {isHandRaised && (
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md text-[10px] font-bold animate-bounce flex items-center gap-1">
                      <Hand className="w-3 h-3" /> Raised
                    </span>
                  )}
                  {isMicOn ? (
                    <Mic className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <MicOff className="w-4 h-4 text-red-400" />
                  )}
                  <span title="Connection: HD (15ms)">
                    <Signal className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                </div>
              </div>
            </div>

            {/* Remote Participants Tiles */}
            {participantList
              .filter((p) => p.socketId !== socketRef.current?.id)
              .map((participant) => (
                <div
                  key={participant.socketId}
                  className={`relative bg-zinc-900 rounded-2xl overflow-hidden border transition-all duration-200 shadow-xl w-full h-full min-h-[220px] max-h-[75vh] flex items-center justify-center ${
                    participant.isSpeaking
                      ? "border-emerald-500 shadow-emerald-500/20 ring-2 ring-emerald-500/40"
                      : "border-zinc-800"
                  }`}
                >
                  {participant.stream && !participant.isCameraOff ? (
                    <video
                      ref={(el) => {
                        if (el && participant.stream) el.srcObject = participant.stream;
                      }}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                        {participant.name[0]?.toUpperCase() || "P"}
                      </div>
                      <span className="text-xs text-zinc-400 font-medium">{participant.name}</span>
                    </div>
                  )}

                  {/* Remote Tile Bottom Tag */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/60 backdrop-blur px-3 py-1.5 rounded-xl border border-zinc-700/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                        {participant.name}
                      </span>
                      {participant.isHost && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                      {participant.isCohost && <Shield className="w-3.5 h-3.5 text-blue-400" />}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {participant.isHandRaised && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md text-[10px] font-bold animate-bounce flex items-center gap-1">
                          <Hand className="w-3 h-3" /> Raised
                        </span>
                      )}
                      {!participant.isMuted ? (
                        <Mic className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <MicOff className="w-4 h-4 text-red-400" />
                      )}
                      <span title="Connection: Good">
                        <Signal className="w-3.5 h-3.5 text-emerald-400" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* IN-CALL CHAT DRAWER */}
        {activePanel === "chat" && (
          <aside className="w-80 md:w-96 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full z-20 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-red-500" /> In-Call Chat
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActivePanel("none")}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages Container */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center text-zinc-500 text-xs py-10">
                  No messages yet. Send a message or share files with participants!
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span className="font-semibold text-zinc-200">{msg.senderName}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div className="bg-zinc-800/80 border border-zinc-700/60 rounded-xl p-3 text-xs text-white leading-relaxed">
                      {msg.text && <p>{msg.text}</p>}
                      {msg.emoji && <span className="text-xl block mt-1">{msg.emoji}</span>}
                      {msg.file && (
                        <div className="mt-2 pt-2 border-t border-zinc-700 flex items-center justify-between bg-zinc-900/60 p-2 rounded-lg">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <div className="truncate">
                              <p className="font-medium truncate text-xs">{msg.file.name}</p>
                              <p className="text-[10px] text-zinc-400">{msg.file.size}</p>
                            </div>
                          </div>
                          <a
                            href={msg.file.dataUrl}
                            download={msg.file.name}
                            className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-md flex-shrink-0"
                            title="Download File"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Emoji React Bar */}
            <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800/80 flex items-center gap-2">
              {["👍", "❤️", "👏", "🎉", "😮", "🔥"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendMessage(undefined, emoji)}
                  className="hover:scale-125 transition-transform text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={(e) => handleSendMessage(e)} className="p-3 border-t border-zinc-800 bg-zinc-900/90 flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl"
                title="Share File"
              >
                <Paperclip className="w-4 h-4" />
              </Button>

              <Input
                type="text"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white text-xs rounded-xl flex-1 focus:ring-red-500"
              />

              <Button
                type="submit"
                size="icon"
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </aside>
        )}

        {/* PARTICIPANTS LIST DRAWER */}
        {activePanel === "participants" && (
          <aside className="w-80 md:w-96 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full z-20 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Participants ({participantList.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActivePanel("none")}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Host Controls Quick Bar */}
            {(isHost || isCohost) && (
              <div className="p-3 bg-zinc-950/60 border-b border-zinc-800 space-y-2">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Host Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMuteAll}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs h-8"
                  >
                    Mute All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleToggleLock}
                    className={`text-xs h-8 border-zinc-700 ${isLocked ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "text-zinc-300 hover:bg-zinc-800"}`}
                  >
                    {isLocked ? "Unlock Room" : "Lock Room"}
                  </Button>
                </div>
              </div>
            )}

            {/* Search Input */}
            <div className="p-3 border-b border-zinc-800">
              <Input
                type="text"
                placeholder="Search participants..."
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white text-xs rounded-xl"
              />
            </div>

            {/* Participant Items */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2">
              {filteredParticipants.map((p) => (
                <div
                  key={p.socketId}
                  className="bg-zinc-800/60 border border-zinc-700/50 p-3 rounded-xl flex items-center justify-between hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center font-bold text-xs text-white">
                      {p.name[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                        {p.name} {p.socketId === socketRef.current?.id && "(You)"}
                      </p>
                      <div className="flex items-center gap-1 text-[10px]">
                        {p.isHost && <span className="text-amber-400">Host</span>}
                        {p.isCohost && <span className="text-blue-400">Co-Host</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {p.isHandRaised && <Hand className="w-4 h-4 text-amber-400 animate-bounce" />}
                    {!p.isMuted ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-red-400" />}

                    {/* Host action dropdown */}
                    {(isHost || isCohost) && p.socketId !== socketRef.current?.id && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleMuteParticipant(p.socketId)}
                          className="h-7 w-7 text-zinc-400 hover:text-white"
                          title="Mute Participant"
                        >
                          <VolumeX className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveParticipant(p.socketId)}
                          className="h-7 w-7 text-red-400 hover:text-red-300"
                          title="Remove from Meeting"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* BOTTOM CONTROL TOOLBAR */}
      <footer className="h-20 bg-zinc-900/90 backdrop-blur border-t border-zinc-800 px-4 flex items-center justify-between z-30 flex-shrink-0">
        {/* Left: Meeting Info */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyMeetingLink}
            className="text-xs text-zinc-400 hover:text-white bg-zinc-800/80 rounded-xl"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Link
          </Button>
        </div>

        {/* Center: Main Call Controls */}
        <div className="flex items-center gap-3 mx-auto sm:mx-0">
          {/* Mute Mic */}
          <button
            type="button"
            onClick={toggleMic}
            className={`p-3.5 rounded-2xl border transition-all ${
              isMicOn
                ? "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 shadow-md"
                : "bg-red-600 border-red-500 text-white hover:bg-red-700 shadow-lg shadow-red-600/30"
            }`}
            title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Camera Toggle */}
          <button
            type="button"
            onClick={toggleCam}
            className={`p-3.5 rounded-2xl border transition-all ${
              isCamOn
                ? "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 shadow-md"
                : "bg-red-600 border-red-500 text-white hover:bg-red-700 shadow-lg shadow-red-600/30"
            }`}
            title={isCamOn ? "Turn Off Camera" : "Turn On Camera"}
          >
            {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Switch Facing Camera (Front / Rear) */}
          <button
            type="button"
            onClick={switchFacingCamera}
            className="p-3.5 rounded-2xl bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 transition-all shadow-md"
            title="Switch Camera (Front/Rear)"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* Screen Share */}
          <button
            type="button"
            onClick={toggleScreenShare}
            className={`p-3.5 rounded-2xl border transition-all ${
              isScreenSharing
                ? "bg-blue-600 border-blue-500 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30"
                : "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 shadow-md"
            }`}
            title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </button>

          {/* Raise Hand */}
          <button
            type="button"
            onClick={toggleRaiseHand}
            className={`p-3.5 rounded-2xl border transition-all ${
              isHandRaised
                ? "bg-amber-500 border-amber-400 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/30"
                : "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 shadow-md"
            }`}
            title="Raise / Lower Hand"
          >
            <Hand className="w-5 h-5" />
          </button>

          {/* Call Recording */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`p-3.5 rounded-2xl border transition-all ${
              isRecording
                ? "bg-red-600 border-red-500 text-white hover:bg-red-700 animate-pulse shadow-lg shadow-red-600/40"
                : "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 shadow-md"
            }`}
            title={isRecording ? "Stop Call Recording" : "Record Meeting Call"}
          >
            <Circle className={`w-5 h-5 ${isRecording ? "fill-white text-white" : "text-red-500"}`} />
          </button>

          {/* End / Leave Call Button */}
          <button
            type="button"
            onClick={() => handleEndCall(false)}
            className="p-3.5 rounded-2xl bg-red-600 hover:bg-red-700 border border-red-500 text-white font-medium shadow-lg shadow-red-600/30 transition-all ml-2"
            title="Leave Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

        {/* Right side: Host Controls & Options */}
        <div className="hidden lg:flex items-center gap-2">
          {isHost && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEndCall(true)}
              className="border-red-600/50 text-red-400 hover:bg-red-950/60 text-xs rounded-xl"
            >
              End Call for All
            </Button>
          )}
        </div>
      </footer>

      {/* RECORDING DOWNLOAD PREVIEW MODAL */}
      {recordedResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Circle className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                Meeting Recording Ready
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRecordedResult(null)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </Button>
            </div>

            <p className="text-xs text-zinc-400">
              Recorded duration: <span className="font-mono text-white">{formatTime(recordedResult.duration)}</span>
            </p>

            <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-black aspect-video">
              <video src={recordedResult.url} controls className="w-full h-full object-contain" />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setRecordedResult(null)}
                className="text-zinc-400 hover:text-white text-xs"
              >
                Close
              </Button>
              <a
                href={recordedResult.url}
                download={`yourtube-meet-${roomId}-${Date.now()}.webm`}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-red-600/30"
              >
                <Download className="w-4 h-4" /> Download Recording
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
