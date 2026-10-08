"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Settings,
  Captions,
  PictureInPicture,
  SkipForward,
  HelpCircle,
  Check,
  X,
  Tv,
  CheckCircle2
} from "lucide-react";

export interface VideoData {
  _id: string;
  videotitle: string;
  filepath?: string;
  thumbnail?: string;
  videochanel?: string;
  uploader?: string;
  duration?: string;
  [key: string]: any;
}

export interface VideoPlayerProps {
  video: VideoData;
  allVideos?: VideoData[];
  onNextVideo?: () => void;
  isTheaterMode?: boolean;
  onTheaterModeToggle?: () => void;
  configurableCompletionPercent?: number; // e.g., 90
}

export default function VideoPlayer({
  video,
  allVideos = [],
  onNextVideo,
  isTheaterMode = false,
  onTheaterModeToggle,
  configurableCompletionPercent = 90
}: VideoPlayerProps) {
  const router = Router();
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const instanceId = useRef<string>(`player_${Math.random().toString(36).substring(2, 9)}`);

  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [buffered, setBuffered] = useState<number>(0); // percentage
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [prevVolume, setPrevVolume] = useState<number>(1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [videoQuality, setVideoQuality] = useState<string>("1080p");
  const [showCaptions, setShowCaptions] = useState<boolean>(false);
  const [captionText, setCaptionText] = useState<string>("");

  // Display Modes
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPiP, setIsPiP] = useState<boolean>(false);
  const [showTimeRemaining, setShowTimeRemaining] = useState<boolean>(false);

  // UI & Overlay State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);

  // Resume & Progress Tracking State
  const [resumeToast, setResumeToast] = useState<{ show: boolean; time: number } | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Autoplay Countdown State
  const [autoplayCountdown, setAutoplayCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Timeline Hover State
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const [hoverPercent, setHoverPercent] = useState<number>(0);

  // Animated Visual Feedback Ring (Center overlay)
  const [feedback, setFeedback] = useState<{ type: string; id: number } | null>(null);

  const speedOptions = [0.5, 1, 1.25, 1.5, 2];
  const qualityOptions = ["Auto", "1080p", "720p", "480p", "360p"];

  // Helper for Router (safe Next.js router)
  function Router() {
    try {
      return useRouter();
    } catch {
      return null;
    }
  }

  // Get Video Source URL
  const getVideoSrc = useCallback(() => {
    if (!video?.filepath) return "/video/vdo.mp4";
    if (video.filepath.startsWith("http") || video.filepath.startsWith("/")) {
      return video.filepath;
    }
    return process.env.BACKEND_URL
      ? `${process.env.BACKEND_URL}/${video.filepath}`
      : `/${video.filepath}`;
  }, [video]);

  // Compute Next Video
  const getNextVideo = useCallback((): VideoData | null => {
    if (!allVideos || allVideos.length === 0) return null;
    const currentIndex = allVideos.findIndex((v) => v._id === video?._id);
    if (currentIndex !== -1 && currentIndex < allVideos.length - 1) {
      return allVideos[currentIndex + 1];
    }
    return allVideos[0]._id !== video?._id ? allVideos[0] : null;
  }, [allVideos, video]);

  // Trigger Center Feedback Icon
  const triggerFeedback = useCallback((type: string) => {
    setFeedback({ type, id: Date.now() });
    setTimeout(() => {
      setFeedback(null);
    }, 800);
  }, []);

  // Format Time (seconds -> mm:ss or hh:mm:ss)
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const formattedMins = mins.toString().padStart(2, "0");
    const formattedSecs = secs.toString().padStart(2, "0");

    if (hrs > 0) {
      return `${hrs}:${formattedMins}:${formattedSecs}`;
    }
    return `${formattedMins}:${formattedSecs}`;
  };

  // -------------------------------------------------------------
  // PLAYBACK & AUDIO CONTROLS
  // -------------------------------------------------------------
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      triggerFeedback("pause");
    } else {
      videoRef.current.play().catch(() => {});
      triggerFeedback("play");
    }
  }, [isPlaying, triggerFeedback]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
    }
    if (newVol === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    if (isMuted) {
      const restoreVol = prevVolume || 0.5;
      videoRef.current.volume = restoreVol;
      setVolume(restoreVol);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      videoRef.current.volume = 0;
      setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, prevVolume, volume]);

  const changeSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
    setShowSettingsMenu(false);
  }, []);

  const seekRelative = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    if (seconds > 0) triggerFeedback(`+${seconds}s`);
    else triggerFeedback(`${seconds}s`);
  }, [triggerFeedback]);

  const seekToPercent = useCallback((percent: number) => {
    if (!videoRef.current || !duration) return;
    const targetTime = (percent / 100) * duration;
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  }, [duration]);

  // -------------------------------------------------------------
  // DISPLAY & PIP CONTROLS
  // -------------------------------------------------------------
  const toggleFullscreen = useCallback(() => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch((err) => {
        console.error("Fullscreen error:", err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error("Exit Fullscreen error:", err);
      });
    }
  }, []);

  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
        setIsPiP(true);
      }
    } catch (err) {
      console.error("PiP error:", err);
    }
  }, []);

  const handleTheaterToggle = useCallback(() => {
    if (onTheaterModeToggle) {
      onTheaterModeToggle();
    }
  }, [onTheaterModeToggle]);

  // -------------------------------------------------------------
  // AUTOPLAY & NEXT VIDEO
  // -------------------------------------------------------------
  const triggerNextVideo = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setAutoplayCountdown(null);
    if (onNextVideo) {
      onNextVideo();
    } else {
      const next = getNextVideo();
      if (next && router) {
        router.push(`/watch/${next._id}`);
      }
    }
  }, [getNextVideo, onNextVideo, router]);

  const cancelAutoplay = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setAutoplayCountdown(null);
  }, []);

  const startAutoplayCountdown = useCallback(() => {
    setAutoplayCountdown(5);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      setAutoplayCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          triggerNextVideo();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [triggerNextVideo]);

  // -------------------------------------------------------------
  // INACTIVITY CONTROLS AUTO-HIDE
  // -------------------------------------------------------------
  const resetInactivityTimer = useCallback(() => {
    setShowControls(true);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

    if (isPlaying && !showSettingsMenu && !showShortcutsModal) {
      inactivityTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  }, [isPlaying, showSettingsMenu, showShortcutsModal]);

  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [isPlaying, resetInactivityTimer]);

  // -------------------------------------------------------------
  // WATCH PROGRESS & RESUME SAVING
  // -------------------------------------------------------------
  useEffect(() => {
    if (!video?._id) return;

    // Load saved watch position
    const storageKey = `video_progress_${video._id}`;
    const savedTime = localStorage.getItem(storageKey);

    if (savedTime) {
      const parsed = parseFloat(savedTime);
      if (!isNaN(parsed) && parsed > 3) {
        setResumeToast({ show: true, time: parsed });
        setTimeout(() => setResumeToast(null), 7000);
      }
    }

    // Check completion status
    const completedKey = `video_completed_${video._id}`;
    if (localStorage.getItem(completedKey) === "true") {
      setIsCompleted(true);
    } else {
      setIsCompleted(false);
    }
  }, [video?._id]);

  // Resume playback handler
  const handleResumePlayback = () => {
    if (videoRef.current && resumeToast) {
      videoRef.current.currentTime = resumeToast.time;
      setCurrentTime(resumeToast.time);
      videoRef.current.play().catch(() => {});
    }
    setResumeToast(null);
  };

  const handleStartFromBeginning = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      videoRef.current.play().catch(() => {});
    }
    setResumeToast(null);
  };

  // -------------------------------------------------------------
  // PREVENT MULTIPLE VIDEOS PLAYING SIMULTANEOUSLY
  // -------------------------------------------------------------
  useEffect(() => {
    const handleGlobalPlay = (e: CustomEvent<{ playerId: string }>) => {
      if (e.detail?.playerId !== instanceId.current && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    };

    window.addEventListener("custom-video-play" as any, handleGlobalPlay as any);
    return () => {
      window.removeEventListener("custom-video-play" as any, handleGlobalPlay as any);
    };
  }, []);

  // -------------------------------------------------------------
  // VIDEO ELEMENT EVENT HANDLERS
  // -------------------------------------------------------------
  const handlePlay = () => {
    setIsPlaying(true);
    // Dispatch global event so other video players stop
    window.dispatchEvent(
      new CustomEvent("custom-video-play", {
        detail: { playerId: instanceId.current }
      })
    );
  };

  const handlePause = () => {
    setIsPlaying(false);
    setShowControls(true);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    setCurrentTime(curr);

    // Save watch progress periodically to localStorage
    if (video?._id && curr > 0) {
      localStorage.setItem(`video_progress_${video._id}`, curr.toString());
    }

    // Mark completed if threshold reached
    if (dur > 0 && (curr / dur) * 100 >= configurableCompletionPercent) {
      if (!isCompleted && video?._id) {
        setIsCompleted(true);
        localStorage.setItem(`video_completed_${video._id}`, "true");
      }
    }

    // Dynamic Sample Subtitle text generation for demo
    if (showCaptions && dur > 0) {
      const sampleCaptions = [
        { start: 0, end: 5, text: `Welcome to "${video?.videotitle || "this video"}"` },
        { start: 5, end: 12, text: `Channel: ${video?.videochanel || "Official Creator"}` },
        { start: 12, end: 20, text: "Playing with full custom HTML5 player controls." },
        { start: 20, end: 35, text: "High quality streaming playback with automated position saving." },
        { start: 35, end: 60, text: "Use keyboard shortcuts: [Space] Play/Pause, [F] Fullscreen, [T] Theater, [M] Mute." }
      ];

      const match = sampleCaptions.find((c) => curr >= c.start && curr <= c.end);
      setCaptionText(match ? match.text : `[Caption at ${formatTime(curr)}]`);
    }
  };

  const handleProgress = () => {
    if (!videoRef.current || !videoRef.current.duration) return;
    const videoEl = videoRef.current;
    if (videoEl.buffered.length > 0) {
      const bufferedEnd = videoEl.buffered.end(videoEl.buffered.length - 1);
      const percent = (bufferedEnd / videoEl.duration) * 100;
      setBuffered(percent);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      videoRef.current.volume = volume;
      videoRef.current.playbackRate = playbackSpeed;
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setShowControls(true);
    if (video?._id) {
      localStorage.setItem(`video_completed_${video._id}`, "true");
      setIsCompleted(true);
    }
    // Start autoplay countdown for next video
    startAutoplayCountdown();
  };

  // -------------------------------------------------------------
  // TIMELINE HOVER PREVIEW & SEEKING
  // -------------------------------------------------------------
  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = x / rect.width;
    const targetTime = percent * duration;

    setHoverX(x);
    setHoverPercent(percent * 100);
    setHoverTime(targetTime);
  };

  const handleTimelineMouseLeave = () => {
    setHoverTime(null);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration || !videoRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const targetTime = (x / rect.width) * duration;

    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  // -------------------------------------------------------------
  // DESKTOP KEYBOARD SHORTCUTS
  // -------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekRelative(e.shiftKey ? -30 : -10);
          break;
        case "ArrowRight":
          e.preventDefault();
          seekRelative(e.shiftKey ? 30 : 10);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume((prev) => {
            const nv = Math.min(1, prev + 0.1);
            if (videoRef.current) videoRef.current.volume = nv;
            setIsMuted(nv === 0);
            return nv;
          });
          triggerFeedback("Vol +10%");
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume((prev) => {
            const nv = Math.max(0, prev - 0.1);
            if (videoRef.current) videoRef.current.volume = nv;
            setIsMuted(nv === 0);
            return nv;
          });
          triggerFeedback("Vol -10%");
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "t":
        case "T":
          e.preventDefault();
          handleTheaterToggle();
          break;
        case "p":
        case "P":
          e.preventDefault();
          togglePiP();
          break;
        case "c":
        case "C":
          e.preventDefault();
          setShowCaptions((prev) => !prev);
          break;
        case "n":
        case "N":
          e.preventDefault();
          triggerNextVideo();
          break;
        case "<":
        case ",":
          e.preventDefault();
          {
            const idx = speedOptions.indexOf(playbackSpeed);
            if (idx > 0) changeSpeed(speedOptions[idx - 1]);
          }
          break;
        case ">":
        case ".":
          e.preventDefault();
          {
            const idx = speedOptions.indexOf(playbackSpeed);
            if (idx !== -1 && idx < speedOptions.length - 1)
              changeSpeed(speedOptions[idx + 1]);
          }
          break;
        case "?":
        case "/":
          if (e.shiftKey) {
            e.preventDefault();
            setShowShortcutsModal((prev) => !prev);
          }
          break;
        default:
          // Check for 0..9 number keys for seeking
          if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            const percent = parseInt(e.key, 10) * 10;
            seekToPercent(percent);
            triggerFeedback(`Seek ${percent}%`);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    togglePlay,
    seekRelative,
    toggleMute,
    toggleFullscreen,
    handleTheaterToggle,
    togglePiP,
    triggerNextVideo,
    playbackSpeed,
    changeSpeed,
    speedOptions,
    seekToPercent,
    triggerFeedback
  ]);

  // Fullscreen Listener
  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFSChange);
    };
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const nextVid = getNextVideo();

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={resetInactivityTimer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className={`relative group bg-black rounded-xl overflow-hidden shadow-2xl select-none font-sans transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none w-screen h-screen"
          : "w-full aspect-video"
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* MAIN HTML5 VIDEO ELEMENT (Native controls disabled) */}
      {/* ------------------------------------------------------------- */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        controls={false}
        poster={video?.thumbnail}
        src={getVideoSrc()}
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onProgress={handleProgress}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onSeeking={() => setIsLoading(true)}
        onSeeked={() => setIsLoading(false)}
        onEnded={handleEnded}
        onClick={togglePlay}
        onDoubleClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          if (clickX < rect.width / 2) {
            seekRelative(-10);
          } else {
            seekRelative(10);
          }
        }}
      >
        <source src={getVideoSrc()} type="video/mp4" />
        Your browser does not support HTML5 video.
      </video>

      {/* ------------------------------------------------------------- */}
      {/* SUBTITLES / CAPTIONS OVERLAY */}
      {/* ------------------------------------------------------------- */}
      {showCaptions && captionText && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-4 py-1.5 bg-black/80 text-white font-medium text-sm md:text-base rounded-md tracking-wide border border-white/10 shadow-lg text-center backdrop-blur-sm max-w-[85%]">
          {captionText}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LOADING SPINNER INDICATOR */}
      {/* ------------------------------------------------------------- */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30 pointer-events-none backdrop-blur-[2px]">
          <div className="w-14 h-14 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CENTER ACTION FEEDBACK RING (Play/Pause/Seek) */}
      {/* ------------------------------------------------------------- */}
      {feedback && (
        <div
          key={feedback.id}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-ping"
        >
          <div className="w-20 h-20 bg-black/75 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-2xl backdrop-blur-md border border-white/20">
            {feedback.type === "play" && <Play className="w-10 h-10 fill-white" />}
            {feedback.type === "pause" && <Pause className="w-10 h-10 fill-white" />}
            {feedback.type.includes("s") && (
              <span className="text-sm font-semibold">{feedback.type}</span>
            )}
            {feedback.type.includes("Vol") && (
              <span className="text-xs font-bold">{feedback.type}</span>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* RESUME PLAYBACK TOAST BANNER */}
      {/* ------------------------------------------------------------- */}
      {resumeToast?.show && (
        <div className="absolute top-4 left-4 z-40 bg-gray-900/90 border border-red-500/40 text-white px-4 py-2.5 rounded-lg shadow-xl backdrop-blur-md flex items-center gap-3 animate-fade-in">
          <div className="flex flex-col">
            <span className="text-xs text-red-400 font-semibold uppercase tracking-wider">
              Resume Playback
            </span>
            <span className="text-sm text-gray-200">
              Last watched at {formatTime(resumeToast.time)}
            </span>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={handleResumePlayback}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md transition shadow"
            >
              Resume
            </button>
            <button
              onClick={handleStartFromBeginning}
              className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-md transition"
            >
              Start Over
            </button>
            <button
              onClick={() => setResumeToast(null)}
              className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* WATCH COMPLETION BADGE (Top Right) */}
      {/* ------------------------------------------------------------- */}
      {isCompleted && (
        <div className="absolute top-4 right-4 z-20 bg-green-950/80 border border-green-500/40 text-green-300 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          <span>Watched</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* AUTOPLAY COUNTDOWN OVERLAY (Video Ended) */}
      {/* ------------------------------------------------------------- */}
      {autoplayCountdown !== null && nextVid && (
        <div className="absolute inset-0 z-40 bg-black/90 flex flex-col items-center justify-center p-6 text-white backdrop-blur-md animate-fade-in">
          <div className="text-xs font-semibold uppercase tracking-widest text-red-500 mb-2">
            Up Next in {autoplayCountdown}s
          </div>
          <h4 className="text-xl font-bold max-w-md text-center line-clamp-2 mb-1">
            {nextVid.videotitle}
          </h4>
          <p className="text-xs text-gray-400 mb-6">{nextVid.videochanel || "YouTube Creator"}</p>

          <div className="relative w-48 aspect-video rounded-lg overflow-hidden border border-white/20 mb-6 shadow-2xl">
            <img
              src={nextVid.thumbnail || "/video/vdo.mp4"}
              alt={nextVid.videotitle}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center font-bold text-lg bg-black/50">
                {autoplayCountdown}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={cancelAutoplay}
              className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-semibold rounded-full border border-white/10 transition"
            >
              Cancel
            </button>
            <button
              onClick={triggerNextVideo}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-full transition shadow-lg flex items-center gap-2"
            >
              <SkipForward className="w-4 h-4 fill-white" />
              <span>Play Now</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CONTROLS OVERLAY CONTAINER (Auto-Hides on Inactivity) */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`absolute inset-0 z-20 flex flex-col justify-between bg-gradient-to-t from-black/90 via-transparent to-black/40 transition-opacity duration-300 ${
          showControls || !isPlaying
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Top Header Controls Bar */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-white text-sm md:text-base font-semibold truncate max-w-lg shadow-sm">
              {video?.videotitle || "Video Player"}
            </h3>
            {videoQuality && (
              <span className="text-[10px] bg-red-600/80 text-white font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                {videoQuality}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShortcutsModal(true)}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
              title="Keyboard Shortcuts (?)"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Clickable Area (Space between header and bottom controls) */}
        <div className="flex-1" onClick={togglePlay} />

        {/* Bottom Control Bar */}
        <div className="px-4 pb-3 pt-6 flex flex-col gap-2">
          {/* --------------------------------------------------------- */}
          {/* TIMELINE PROGRESS BAR & HOVER PREVIEW */}
          {/* --------------------------------------------------------- */}
          <div className="relative group/timeline w-full">
            {/* Timeline Hover Frame Preview Card */}
            {hoverTime !== null && (
              <div
                className="absolute bottom-6 z-30 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-75"
                style={{ left: `${hoverX}px` }}
              >
                <div className="bg-gray-900 border border-white/20 p-1.5 rounded-lg shadow-2xl backdrop-blur-md flex flex-col items-center">
                  <div className="w-32 aspect-video bg-black rounded overflow-hidden mb-1 relative border border-white/10">
                    <img
                      src={video?.thumbnail || "/video/vdo.mp4"}
                      alt="Preview"
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-[10px] text-white font-mono font-bold">
                      {formatTime(hoverTime)}
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-white bg-black/60 px-2 py-0.5 rounded">
                    {formatTime(hoverTime)}
                  </span>
                </div>
              </div>
            )}

            {/* Interactive Progress Bar */}
            <div
              ref={progressBarRef}
              onMouseMove={handleTimelineMouseMove}
              onMouseLeave={handleTimelineMouseLeave}
              onClick={handleTimelineClick}
              className="relative w-full h-2 group-hover/timeline:h-3 bg-white/20 rounded-full cursor-pointer transition-all duration-150 overflow-visible flex items-center"
            >
              {/* Buffering Progress Track */}
              <div
                className="absolute top-0 left-0 h-full bg-white/40 rounded-full transition-all duration-200"
                style={{ width: `${buffered}%` }}
              />

              {/* Hover Position Track */}
              {hoverPercent > 0 && (
                <div
                  className="absolute top-0 left-0 h-full bg-white/20 rounded-full"
                  style={{ width: `${hoverPercent}%` }}
                />
              )}

              {/* Playback Progress Track */}
              <div
                className="absolute top-0 left-0 h-full bg-red-600 rounded-full transition-all duration-75"
                style={{ width: `${progressPercent}%` }}
              />

              {/* Scrubber Knob Handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-red-600 border-2 border-white rounded-full shadow scale-0 group-hover/timeline:scale-100 transition-transform duration-150"
                style={{ left: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* --------------------------------------------------------- */}
          {/* MAIN CONTROL BUTTONS & SETTINGS */}
          {/* --------------------------------------------------------- */}
          <div className="flex items-center justify-between text-white mt-1">
            {/* Left Controls (Play, Seek, Volume, Time) */}
            <div className="flex items-center gap-3">
              {/* Play / Pause Button */}
              <button
                onClick={togglePlay}
                className="p-1.5 hover:bg-white/15 rounded-full transition focus:outline-none"
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-white" />
                ) : (
                  <Play className="w-6 h-6 fill-white ml-0.5" />
                )}
              </button>

              {/* Seek 10s Backward */}
              <button
                onClick={() => seekRelative(-10)}
                className="p-1.5 hover:bg-white/15 rounded-full transition text-gray-200 hover:text-white"
                title="Rewind 10s (Left Arrow)"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              {/* Seek 10s Forward */}
              <button
                onClick={() => seekRelative(10)}
                className="p-1.5 hover:bg-white/15 rounded-full transition text-gray-200 hover:text-white"
                title="Forward 10s (Right Arrow)"
              >
                <RotateCw className="w-5 h-5" />
              </button>

              {/* Next Video Button */}
              {nextVid && (
                <button
                  onClick={triggerNextVideo}
                  className="p-1.5 hover:bg-white/15 rounded-full transition text-gray-200 hover:text-white"
                  title="Next Video (N)"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              )}

              {/* Volume Controls & Slider */}
              <div className="flex items-center group/volume gap-2 ml-1">
                <button
                  onClick={toggleMute}
                  className="p-1.5 hover:bg-white/15 rounded-full transition text-gray-200 hover:text-white"
                  title={isMuted ? "Unmute (M)" : "Mute (M)"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>

                {/* Draggable Volume Slider */}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-0 group-hover/volume:w-20 transition-all duration-200 accent-red-600 h-1.5 bg-white/30 rounded-lg cursor-pointer"
                  title="Volume (Up/Down Arrow)"
                />
              </div>

              {/* Time Display (Current / Duration / Remaining) */}
              <button
                onClick={() => setShowTimeRemaining((prev) => !prev)}
                className="text-xs font-mono font-medium text-gray-200 hover:text-white px-2 py-1 hover:bg-white/10 rounded transition"
                title="Click to toggle remaining time"
              >
                {formatTime(currentTime)} /{" "}
                {showTimeRemaining
                  ? `-${formatTime(Math.max(0, duration - currentTime))}`
                  : formatTime(duration)}
              </button>
            </div>

            {/* Right Controls (Captions, Speed, Quality, Theater, Fullscreen, PiP) */}
            <div className="flex items-center gap-2 relative">
              {/* Captions / Subtitles Toggle */}
              <button
                onClick={() => setShowCaptions((prev) => !prev)}
                className={`p-1.5 rounded-full transition ${
                  showCaptions
                    ? "bg-red-600 text-white"
                    : "text-gray-200 hover:text-white hover:bg-white/15"
                }`}
                title="Subtitles / CC (C)"
              >
                <Captions className="w-5 h-5" />
              </button>

              {/* Settings / Speed Dropdown Menu Trigger */}
              <div className="relative">
                <button
                  onClick={() => setShowSettingsMenu((prev) => !prev)}
                  className="p-1.5 hover:bg-white/15 rounded-full transition text-gray-200 hover:text-white"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>

                {/* Settings Popup Menu */}
                {showSettingsMenu && (
                  <div className="absolute right-0 bottom-10 z-50 w-52 bg-gray-900/95 border border-white/15 text-white rounded-xl shadow-2xl p-2 backdrop-blur-md text-xs space-y-1 animate-fade-in">
                    {/* Playback Speed Menu Option */}
                    <button
                      onClick={() => setShowSpeedMenu((prev) => !prev)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/10 rounded-lg transition"
                    >
                      <span className="font-medium">Playback Speed</span>
                      <span className="text-gray-400 font-mono">
                        {playbackSpeed === 1 ? "Normal" : `${playbackSpeed}x`}
                      </span>
                    </button>

                    {/* Submenu for Speed Selection */}
                    {showSpeedMenu && (
                      <div className="pl-2 border-l border-white/10 space-y-0.5 my-1">
                        {speedOptions.map((speed) => (
                          <button
                            key={speed}
                            onClick={() => changeSpeed(speed)}
                            className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-white/15 rounded text-left font-mono"
                          >
                            <span>{speed === 1 ? "Normal (1x)" : `${speed}x`}</span>
                            {playbackSpeed === speed && (
                              <Check className="w-3.5 h-3.5 text-red-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Quality Menu Option */}
                    <button
                      onClick={() => setShowQualityMenu((prev) => !prev)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/10 rounded-lg transition"
                    >
                      <span className="font-medium">Quality</span>
                      <span className="text-gray-400">{videoQuality}</span>
                    </button>

                    {/* Submenu for Quality Selection */}
                    {showQualityMenu && (
                      <div className="pl-2 border-l border-white/10 space-y-0.5 my-1">
                        {qualityOptions.map((q) => (
                          <button
                            key={q}
                            onClick={() => {
                              setVideoQuality(q);
                              setShowQualityMenu(false);
                              setShowSettingsMenu(false);
                            }}
                            className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-white/15 rounded text-left"
                          >
                            <span>{q}</span>
                            {videoQuality === q && (
                              <Check className="w-3.5 h-3.5 text-red-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Picture-in-Picture Button */}
              <button
                onClick={togglePiP}
                className={`p-1.5 rounded-full transition ${
                  isPiP
                    ? "bg-red-600 text-white"
                    : "text-gray-200 hover:text-white hover:bg-white/15"
                }`}
                title="Picture-in-Picture (P)"
              >
                <PictureInPicture className="w-5 h-5" />
              </button>

              {/* Theater Mode Toggle Button */}
              <button
                onClick={handleTheaterToggle}
                className={`p-1.5 rounded-full transition ${
                  isTheaterMode
                    ? "text-red-500 font-bold"
                    : "text-gray-200 hover:text-white hover:bg-white/15"
                }`}
                title="Theater Mode (T)"
              >
                <Tv className="w-5 h-5" />
              </button>

              {/* Fullscreen Toggle Button */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 hover:bg-white/15 rounded-full transition text-gray-200 hover:text-white"
                title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* KEYBOARD SHORTCUTS HELP MODAL */}
      {/* ------------------------------------------------------------- */}
      {showShortcutsModal && (
        <div className="absolute inset-0 z-50 bg-black/85 flex items-center justify-center p-6 backdrop-blur-md animate-fade-in">
          <div className="bg-gray-900 border border-white/20 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setShowShortcutsModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
              <HelpCircle className="w-5 h-5 text-red-500" />
              <span>Keyboard Shortcuts</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-300">Play / Pause</span>
                <kbd className="px-2 py-0.5 bg-gray-800 border border-white/20 rounded font-mono text-gray-200">
                  Space or K
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-300">Seek Backward / Forward 10s</span>
                <kbd className="px-2 py-0.5 bg-gray-800 border border-white/20 rounded font-mono text-gray-200">
                  ← / →
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-300">Skip Larger Interval (30s)</span>
                <kbd className="px-2 py-0.5 bg-gray-800 border border-white/20 rounded font-mono text-gray-200">
                  Shift + ← / →
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-300">Volume Up / Down</span>
                <kbd className="px-2 py-0.5 bg-gray-800 border border-white/20 rounded font-mono text-gray-200">
                  ↑ / ↓
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-300">Mute / Unmute</span>
                <kbd className="px-2 py-0.5 bg-gray-800 border border-white/20 rounded font-mono text-gray-200">
                  M
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-300">Fullscreen Mode</span>
                <kbd className="px-2 py-0.5 bg-gray-800 border border-white/20 rounded font-mono text-gray-200">
                  F
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-300">Theater Mode</span>
                <kbd className="px-2 py-0.5 bg-gray-800 border border-white/20 rounded font-mono text-gray-200">
                  T
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-300">Picture-in-Picture (PiP)</span>
                <kbd className="px-2 py-0.5 bg-gray-800 border border-white/20 rounded font-mono text-gray-200">
                  P
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-300">Subtitles / Captions</span>
                <kbd className="px-2 py-0.5 bg-gray-800 border border-white/20 rounded font-mono text-gray-200">
                  C
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-300">Next Video</span>
                <kbd className="px-2 py-0.5 bg-gray-800 border border-white/20 rounded font-mono text-gray-200">
                  N
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-300">Decrease / Increase Speed</span>
                <kbd className="px-2 py-0.5 bg-gray-800 border border-white/20 rounded font-mono text-gray-200">
                  &lt; / &gt;
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-300">Jump to 0% - 90%</span>
                <kbd className="px-2 py-0.5 bg-gray-800 border border-white/20 rounded font-mono text-gray-200">
                  0 - 9
                </kbd>
              </div>
            </div>

            <div className="mt-5 text-center">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-full transition shadow"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
