import React, { useState, useEffect } from "react";
import { Download, Sparkles, AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { Button } from "./ui/button";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import SubscriptionModal from "./SubscriptionModal";

interface DownloadButtonProps {
  video: {
    _id: string;
    videotitle?: string;
    filepath?: string;
    filesize?: string;
  };
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
}

export default function DownloadButton({ video, variant = "ghost", className = "" }: DownloadButtonProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<{
    eligible: boolean;
    plan: string;
    maxQuota: number;
    usedQuota: number;
    remainingQuota: number;
    isDuplicate: boolean;
    reason?: string;
  } | null>(null);

  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  const userId = user?._id || user?.id || "demo_user_1";
  const videoId = video._id || "sample_video_1";

  // Check initial quota on mount
  const checkQuota = async () => {
    try {
      const res = await axiosInstance.post("/download/check-eligibility", {
        userId,
        videoId,
      });
      setQuotaInfo(res.data);
    } catch (err) {
      console.warn("Could not check download eligibility:", err);
    }
  };

  useEffect(() => {
    checkQuota();
  }, [userId, videoId]);

  const handleDownload = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await axiosInstance.post("/download/request", {
        userId,
        videoId,
      });

      const { downloadUrl, isDuplicate, remainingQuota, maxQuota } = res.data;

      // Update remaining quota state
      setQuotaInfo((prev) =>
        prev
          ? { ...prev, remainingQuota, usedQuota: maxQuota - remainingQuota }
          : null
      );

      // Trigger file download in browser
      const link = document.createElement("a");
      link.href = downloadUrl.startsWith("http") ? downloadUrl : `http://localhost:5000${downloadUrl}`;
      link.download = `${video.videotitle || "video"}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (isDuplicate) {
        toast.info("Re-downloading video free (within 24-hour window, no quota deducted).");
      } else {
        toast.success(`Download started! Remaining daily quota: ${remainingQuota}/${maxQuota}`);
      }
    } catch (error: any) {
      const errorData = error.response?.data;
      if (error.response?.status === 403) {
        toast.error(errorData?.message || "Daily download quota exceeded!");
        // Open subscription upgrade modal automatically
        setIsSubscriptionModalOpen(true);
      } else {
        toast.error("Download failed: " + (errorData?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const planBadgeColor: Record<string, string> = {
    free: "bg-gray-200 text-gray-800",
    bronze: "bg-amber-200 text-amber-900 font-bold",
    silver: "bg-slate-300 text-slate-900 font-bold",
    gold: "bg-yellow-300 text-yellow-950 font-bold",
  };

  return (
    <>
      <Button
        variant={variant}
        size="sm"
        onClick={handleDownload}
        disabled={loading}
        className={`bg-gray-100 hover:bg-gray-200 rounded-full flex items-center gap-2 ${className}`}
        title={
          quotaInfo
            ? `Plan: ${quotaInfo.plan.toUpperCase()} (${quotaInfo.remainingQuota}/${quotaInfo.maxQuota} remaining today)`
            : "Download Video"
        }
      >
        <Download className={`w-4 h-4 ${loading ? "animate-bounce text-red-600" : ""}`} />
        <span>{loading ? "Downloading..." : "Download"}</span>

        {quotaInfo && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              planBadgeColor[quotaInfo.plan] || "bg-gray-200"
            }`}
          >
            {quotaInfo.remainingQuota}/{quotaInfo.maxQuota}
          </span>
        )}
      </Button>

      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        currentPlan={quotaInfo?.plan || "free"}
        onSuccess={() => checkQuota()}
      />
    </>
  );
}
