import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  Plus,
  Link as LinkIcon,
  ShieldCheck,
  Settings,
  Lock,
  Users,
  Sparkles,
  Volume2,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
  RefreshCw,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/lib/AuthContext";
import { toast } from "sonner";
import { AudioVolumeAnalyzer, createNoiseSuppressionStream } from "@/lib/audioProcessing";

export default function MeetLobbyPage() {
  const router = useRouter();
  const { user } = useUser();

  const [roomIdInput, setRoomIdInput] = useState("");
  const [passcodeInput, setPasscodeInput] = useState("");

  // Create room modal / state
  const [newPasscode, setNewPasscode] = useState("");
  const [enablePasscode, setEnablePasscode] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Pre-join preview state
  const [showPreJoinModal, setShowPreJoinModal] = useState(false);
  const [targetRoomId, setTargetRoomId] = useState("");
  const [displayName, setDisplayName] = useState(user?.name || "User " + Math.floor(1000 + Math.random() * 9000));

  // Device states
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [volumeLevel, setVolumeLevel] = useState(0);

  const [permissionError, setPermissionError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioAnalyzerRef = useRef<AudioVolumeAnalyzer | null>(null);

  useEffect(() => {
    if (user?.name) {
      setDisplayName(user.name);
    }
  }, [user]);

  // Load available devices
  const loadDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevs = devices.filter((d) => d.kind === "audioinput");
      const videoDevs = devices.filter((d) => d.kind === "videoinput");
      setAudioInputDevices(audioDevs);
      setVideoInputDevices(videoDevs);
      if (audioDevs.length > 0 && !selectedAudioDevice) setSelectedAudioDevice(audioDevs[0].deviceId);
      if (videoDevs.length > 0 && !selectedVideoDevice) setSelectedVideoDevice(videoDevs[0].deviceId);
    } catch (e) {
      console.warn("Could not enumerate devices:", e);
    }
  };

  // Start media stream for pre-join test
  const startPreviewStream = async () => {
    setPermissionError(null);
    stopPreviewStream();

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: noiseSuppression,
        },
        video: {
          deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Audio analyzer
      if (audioAnalyzerRef.current) audioAnalyzerRef.current.stop();
      audioAnalyzerRef.current = new AudioVolumeAnalyzer(stream, (vol) => {
        setVolumeLevel(vol);
      });

      await loadDevices();
    } catch (err: any) {
      console.error("Camera/Mic error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionError("Camera or Microphone access was denied by your browser. Please update site permissions.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setPermissionError("No camera or microphone device found on your system.");
      } else {
        setPermissionError("Failed to access media devices: " + err.message);
      }
    }
  };

  const stopPreviewStream = () => {
    if (audioAnalyzerRef.current) {
      audioAnalyzerRef.current.stop();
      audioAnalyzerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
  };

  useEffect(() => {
    if (showPreJoinModal) {
      startPreviewStream();
    } else {
      stopPreviewStream();
    }
    return () => stopPreviewStream();
  }, [showPreJoinModal, selectedAudioDevice, selectedVideoDevice, noiseSuppression]);

  // Toggle track states in preview stream
  const toggleMicPreview = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => (t.enabled = !isMicOn));
    }
    setIsMicOn(!isMicOn);
  };

  const toggleCamPreview = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((t) => (t.enabled = !isCamOn));
    }
    setIsCamOn(!isCamOn);
  };

  // Create new instant meeting
  const handleCreateInstantMeeting = () => {
    const randomId = "yt-" + Math.random().toString(36).substring(2, 6) + "-" + Math.random().toString(36).substring(2, 6);
    setTargetRoomId(randomId);
    setShowPreJoinModal(true);
  };

  // Generate meeting link for later
  const handleGenerateLink = () => {
    const randomId = "yt-" + Math.random().toString(36).substring(2, 6) + "-" + Math.random().toString(36).substring(2, 6);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const passQuery = enablePasscode && newPasscode ? `?passcode=${encodeURIComponent(newPasscode)}` : "";
    const fullUrl = `${origin}/meet/${randomId}${passQuery}`;
    setCreatedLink(fullUrl);
  };

  // Join meeting with input
  const handleJoinByInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomIdInput.trim()) {
      toast.error("Please enter a valid Meeting Room ID or Link");
      return;
    }

    let parsedRoomId = roomIdInput.trim();
    if (parsedRoomId.includes("/meet/")) {
      const parts = parsedRoomId.split("/meet/");
      parsedRoomId = parts[1].split("?")[0];
    }

    setTargetRoomId(parsedRoomId);
    setShowPreJoinModal(true);
  };

  // Proceed to room
  const handleEnterCall = () => {
    if (!displayName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    // Save preferences in sessionStorage for smooth handoff to room page
    sessionStorage.setItem("meet_displayName", displayName.trim());
    sessionStorage.setItem("meet_micOn", JSON.stringify(isMicOn));
    sessionStorage.setItem("meet_camOn", JSON.stringify(isCamOn));
    sessionStorage.setItem("meet_noiseSuppression", JSON.stringify(noiseSuppression));
    if (selectedAudioDevice) sessionStorage.setItem("meet_audioDeviceId", selectedAudioDevice);
    if (selectedVideoDevice) sessionStorage.setItem("meet_videoDeviceId", selectedVideoDevice);

    const passcode = passcodeInput || (enablePasscode ? newPasscode : "");
    const passParam = passcode ? `?passcode=${encodeURIComponent(passcode)}` : "";

    stopPreviewStream();
    router.push(`/meet/${targetRoomId}${passParam}`);
  };

  const playSpeakerTest = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
      toast.success("Speaker test chime played!");
    } catch (e) {
      toast.error("Could not play test audio");
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex-1 bg-gradient-to-br from-slate-900 via-zinc-900 to-black text-white p-6 md:p-10 flex flex-col justify-between">
      {/* Top Banner Header */}
      <div className="max-w-6xl w-full mx-auto">
        <div className="flex items-center justify-between pb-8 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2.5 rounded-2xl shadow-lg shadow-red-600/30">
              <Video className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                YourTube Meet
                <span className="text-xs bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-medium">
                  HD Real-Time
                </span>
              </h1>
              <p className="text-sm text-zinc-400">
                Secure, end-to-end encrypted 1-on-1 and group video conferencing
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 bg-zinc-800/80 px-3 py-1.5 rounded-full border border-zinc-700/50">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>E2E Encrypted</span>
            </div>
            <div className="flex items-center gap-1.5 bg-zinc-800/80 px-3 py-1.5 rounded-full border border-zinc-700/50">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Noise Cancellation</span>
            </div>
          </div>
        </div>

        {/* Main Grid: Create & Join Options */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-10">
          {/* Left Column: Create Instant or Scheduled Meetings */}
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl -z-10 group-hover:bg-red-600/20 transition-all duration-500" />
            <div>
              <div className="w-12 h-12 bg-red-600/20 border border-red-500/30 text-red-500 rounded-2xl flex items-center justify-center mb-4">
                <Video className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Create a New Meeting</h2>
              <p className="text-sm text-zinc-400 mb-6">
                Start an instant meeting with high-quality audio & video, or create a unique meeting room link with optional passcode protection.
              </p>

              <div className="space-y-4">
                <Button
                  onClick={handleCreateInstantMeeting}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-6 rounded-xl shadow-lg shadow-red-600/20 text-base flex items-center justify-center gap-2 group-hover:scale-[1.01] transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Start Instant Meeting
                </Button>

                <div className="border-t border-zinc-800 pt-4">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                    Meeting Security & Passcode
                  </h3>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-zinc-300 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enablePasscode}
                        onChange={(e) => setEnablePasscode(e.target.checked)}
                        className="rounded bg-zinc-800 border-zinc-700 text-red-600 focus:ring-red-500"
                      />
                      <span>Protect meeting with passcode</span>
                    </label>
                  </div>
                  {enablePasscode && (
                    <Input
                      type="text"
                      placeholder="Set passcode (e.g. 123456)"
                      value={newPasscode}
                      onChange={(e) => setNewPasscode(e.target.value)}
                      className="bg-zinc-800/80 border-zinc-700 text-white text-sm rounded-lg mb-3"
                    />
                  )}
                  <Button
                    variant="outline"
                    onClick={handleGenerateLink}
                    className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl py-5 text-sm flex items-center justify-center gap-2"
                  >
                    <LinkIcon className="w-4 h-4 text-red-500" />
                    Create Meeting Link for Later
                  </Button>
                </div>

                {createdLink && (
                  <div className="bg-zinc-800/90 border border-zinc-700/80 rounded-xl p-4 mt-4 animate-in fade-in slide-in-from-top-2">
                    <p className="text-xs text-zinc-400 mb-1 font-medium">Generated Meeting Link:</p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={createdLink}
                        className="flex-1 bg-zinc-900 border border-zinc-700 text-xs text-red-400 px-3 py-2 rounded-lg truncate font-mono"
                      />
                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white px-3"
                        onClick={() => {
                          navigator.clipboard.writeText(createdLink);
                          setCopiedLink(true);
                          toast.success("Meeting link copied to clipboard!");
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                      >
                        {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Max 50 Participants
              </span>
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Secure Room Auth
              </span>
            </div>
          </div>

          {/* Right Column: Join Existing Meeting */}
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -z-10 group-hover:bg-blue-600/20 transition-all duration-500" />
            <div>
              <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
                <LinkIcon className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Join a Meeting</h2>
              <p className="text-sm text-zinc-400 mb-6">
                Have a meeting link or Room ID? Enter it below to join the call immediately.
              </p>

              <form onSubmit={handleJoinByInput} className="space-y-4">
                <div>
                  <Label className="text-xs text-zinc-400 mb-1.5 block">Meeting Room ID or Full Link</Label>
                  <Input
                    type="text"
                    placeholder="e.g. yt-abcd-1234 or paste full link"
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value)}
                    className="bg-zinc-800/80 border-zinc-700 text-white rounded-xl py-6 text-base focus:border-blue-500"
                  />
                </div>

                <div>
                  <Label className="text-xs text-zinc-400 mb-1.5 block">Passcode (if required by host)</Label>
                  <Input
                    type="password"
                    placeholder="Enter passcode"
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    className="bg-zinc-800/80 border-zinc-700 text-white rounded-xl py-5 text-sm"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6 rounded-xl shadow-lg shadow-blue-600/20 text-base flex items-center justify-center gap-2 group-hover:scale-[1.01] transition-all"
                >
                  Join Meeting Now
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </form>
            </div>

            <div className="mt-8 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
              <span>Supports Desktop & Mobile Web</span>
              <span>Screen Share & In-Call Chat</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pre-Join Stage Device Setup Modal */}
      {showPreJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-red-500" />
                  Ready to join meeting?
                </h3>
                <p className="text-xs text-zinc-400">Room ID: <span className="font-mono text-red-400">{targetRoomId}</span></p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreJoinModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </Button>
            </div>

            {/* Permission Denied Alert Banner */}
            {permissionError && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 text-amber-400 text-xs">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <p className="font-semibold">{permissionError}</p>
                  <p className="text-zinc-400 mt-1">
                    To fix: Click the lock icon next to your browser URL bar, enable "Camera" and "Microphone", then click retry below.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={startPreviewStream}
                    className="mt-2 border-amber-500/40 text-amber-300 hover:bg-amber-500/20 text-xs h-7"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry Access
                  </Button>
                </div>
              </div>
            )}

            {/* Video Preview & Controls */}
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-inner flex items-center justify-center">
              {isCamOn && !permissionError ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-500 space-y-2">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-2xl font-bold text-white">
                    {displayName[0]?.toUpperCase() || "U"}
                  </div>
                  <p className="text-xs font-medium">Camera is turned off</p>
                </div>
              )}

              {/* Floating Bottom Media Bar */}
              <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={toggleMicPreview}
                  className={`p-3 rounded-full border transition-all ${
                    isMicOn
                      ? "bg-zinc-800/90 border-zinc-700 text-white hover:bg-zinc-700"
                      : "bg-red-600 border-red-500 text-white hover:bg-red-700"
                  }`}
                  title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
                >
                  {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>

                <button
                  type="button"
                  onClick={toggleCamPreview}
                  className={`p-3 rounded-full border transition-all ${
                    isCamOn
                      ? "bg-zinc-800/90 border-zinc-700 text-white hover:bg-zinc-700"
                      : "bg-red-600 border-red-500 text-white hover:bg-red-700"
                  }`}
                  title={isCamOn ? "Turn Off Camera" : "Turn On Camera"}
                >
                  {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>

                <button
                  type="button"
                  onClick={playSpeakerTest}
                  className="p-3 rounded-full bg-zinc-800/90 border border-zinc-700 text-white hover:bg-zinc-700 transition-all"
                  title="Test Speaker Output"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              {/* Live Volume Meter */}
              {isMicOn && (
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-2 border border-zinc-700/50">
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  <div className="w-16 bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full transition-all duration-75"
                      style={{ width: `${volumeLevel}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* User Name & Device Selection */}
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-zinc-400 mb-1 block">Your Display Name</Label>
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white rounded-xl text-sm"
                  placeholder="Enter name"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-zinc-400 mb-1 block">Microphone Device</Label>
                  <select
                    value={selectedAudioDevice}
                    onChange={(e) => setSelectedAudioDevice(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl p-2.5 text-xs focus:ring-red-500"
                  >
                    {audioInputDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Microphone ${d.deviceId.substring(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs text-zinc-400 mb-1 block">Camera Device</Label>
                  <select
                    value={selectedVideoDevice}
                    onChange={(e) => setSelectedVideoDevice(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl p-2.5 text-xs focus:ring-red-500"
                  >
                    {videoInputDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.substring(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Noise Suppression Toggle */}
              <div className="flex items-center justify-between bg-zinc-800/50 p-3 rounded-xl border border-zinc-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="text-xs font-medium text-white">AI Noise Suppression</p>
                    <p className="text-[11px] text-zinc-400">Filters keyboard clicks, rumbles & background hums</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={noiseSuppression}
                  onChange={(e) => setNoiseSuppression(e.target.checked)}
                  className="rounded bg-zinc-700 border-zinc-600 text-red-600 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800">
              <Button
                variant="ghost"
                onClick={() => setShowPreJoinModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEnterCall}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-5 rounded-xl font-medium shadow-lg shadow-red-600/20"
              >
                Join Meeting Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer info */}
      <footer className="max-w-6xl w-full mx-auto text-center text-xs text-zinc-500 pt-8 border-t border-zinc-800/50">
        YourTube Real-time Video Engine &bull; WebRTC Mesh Architecture &bull; Low Bandwidth Adaptive Streaming
      </footer>
    </div>
  );
}
