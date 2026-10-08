import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import {
  Download,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Trash2,
  Play,
  Calendar,
  HardDrive,
  Monitor,
  Globe,
  Crown,
  Search,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { format } from "date-fns";
import SubscriptionModal from "@/components/SubscriptionModal";
import DownloadButton from "@/components/DownloadButton";

interface DownloadRecordItem {
  _id: string;
  userId: string;
  videoId: string;
  videoTitle: string;
  videoThumbnail: string;
  fileSize: string;
  downloadTimestamp: string;
  ipAddress: string;
  deviceInfo: string;
  browser: string;
  subscriptionPlan: string;
  status: "completed" | "failed" | "interrupted";
}

export default function DownloadsPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<DownloadRecordItem[]>([]);
  const [plan, setPlan] = useState<string>("free");
  const [maxQuota, setMaxQuota] = useState<number>(1);
  const [usedQuota, setUsedQuota] = useState<number>(0);
  const [remainingQuota, setRemainingQuota] = useState<number>(1);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  const userId = user?._id || user?.id || "demo_user_1";

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/download/history/${userId}`);
      setRecords(res.data.records || []);
      setPlan(res.data.plan || "free");
      setMaxQuota(res.data.maxQuota || 1);
      setUsedQuota(res.data.usedQuota || 0);
      setRemainingQuota(res.data.remainingQuota || 1);
      setIsExpired(res.data.isExpired || false);
    } catch (err) {
      console.warn("Could not fetch download history:", err);
      // Fallback demo data if backend is offline
      setRecords([
        {
          _id: "demo_rec_1",
          userId,
          videoId: "v1",
          videoTitle: "Full Web Development Course 2026",
          videoThumbnail: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=400",
          fileSize: "245.5 MB",
          downloadTimestamp: new Date().toISOString(),
          ipAddress: "192.168.1.102",
          deviceInfo: "Desktop Windows PC",
          browser: "Google Chrome",
          subscriptionPlan: "silver",
          status: "completed",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const handleDeleteRecord = async (recordId: string) => {
    try {
      await axiosInstance.delete(`/download/record/${recordId}`);
      setRecords((prev) => prev.filter((r) => r._id !== recordId));
      toast.success("Download history record removed");
    } catch (err) {
      toast.error("Could not delete record");
    }
  };

  const filteredRecords = records.filter(
    (r) =>
      r.videoTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.subscriptionPlan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const planBadgeStyle: Record<string, string> = {
    free: "bg-gray-100 text-gray-800 border-gray-300",
    bronze: "bg-amber-100 text-amber-900 border-amber-300",
    silver: "bg-slate-200 text-slate-900 border-slate-400 font-semibold",
    gold: "bg-yellow-200 text-yellow-950 border-yellow-400 font-extrabold shadow-sm",
  };

  const progressPercent = Math.min(100, Math.round((usedQuota / maxQuota) * 100));

  return (
    <div className="min-h-[calc(100vh-56px)] flex-1 bg-gray-50 text-gray-900 p-4 sm:p-8">
      <Head>
        <title>Downloads & Subscription - YourTube</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header & Quota Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
            <div className="flex items-center gap-3">
              <div className="bg-red-600 p-3 rounded-2xl shadow-lg shadow-red-600/20 text-white">
                <Download className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  Video Downloads
                  <span className="text-xs bg-red-100 text-red-700 font-semibold px-2.5 py-0.5 rounded-full border border-red-200">
                    Offline Library
                  </span>
                </h1>
                <p className="text-xs text-gray-500">
                  Manage your downloaded videos, track daily download limits, and review audit history.
                </p>
              </div>
            </div>

            <Button
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-2xl px-5 py-6 text-sm shadow-lg shadow-red-600/20 flex items-center gap-2"
            >
              <Crown className="w-4 h-4 text-yellow-300" />
              <span>Upgrade Plan</span>
            </Button>
          </div>

          {/* Quota Progress Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gradient-to-br from-gray-900 to-zinc-900 text-white rounded-2xl p-6 shadow-md">
            <div>
              <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Active Plan</span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-sm px-3 py-1 rounded-lg border font-bold uppercase ${planBadgeStyle[plan]}`}>
                  {plan} Subscriber
                </span>
                {isExpired && (
                  <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded">
                    Expired
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-2">
                Daily download limit: <span className="text-white font-mono font-bold">{maxQuota} videos/day</span>
              </p>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400 font-medium">Daily Quota Usage</span>
                <span className="font-mono text-white font-bold">
                  {usedQuota} / {maxQuota} used
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden border border-zinc-700/50">
                <div
                  className={`h-full transition-all duration-500 ${
                    progressPercent >= 100
                      ? "bg-red-500"
                      : progressPercent >= 80
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-400 mt-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{remainingQuota} downloads remaining today</span>
              </p>
            </div>

            <div className="flex flex-col justify-between border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0 md:pl-6 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Encrypted secure download verification</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-2">
                Quota resets daily at 00:00 UTC. Re-downloading the same video within 24h is free.
              </p>
            </div>
          </div>
        </div>

        {/* Search & History Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-red-600" /> Download History & Records ({filteredRecords.length})
          </h2>

          <div className="w-full sm:w-72">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search downloaded videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-gray-300 rounded-xl text-xs"
              />
            </div>
          </div>
        </div>

        {/* Downloads History Grid */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-500 font-medium">
            Loading your download history...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/80 shadow-sm space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <Download className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No Downloads Found</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              You haven't downloaded any videos yet. Browse videos on YouTube and click the Download button to save them for offline viewing!
            </p>
            <Link href="/">
              <Button className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 font-medium text-xs">
                Explore Trending Videos
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((record) => (
              <div
                key={record._id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Thumbnail / Icon */}
                  <Link href={`/watch/${record.videoId}`}>
                    <div className="w-24 h-16 bg-gray-900 rounded-xl overflow-hidden flex-shrink-0 relative group">
                      {record.videoThumbnail ? (
                        <img
                          src={
                            record.videoThumbnail.startsWith("http")
                              ? record.videoThumbnail
                              : `http://localhost:5000/${record.videoThumbnail}`
                          }
                          alt={record.videoTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-red-500 bg-red-950">
                          <Play className="w-6 h-6 fill-red-500" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Play className="w-5 h-5 fill-white" />
                      </div>
                    </div>
                  </Link>

                  {/* Details */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <Link href={`/watch/${record.videoId}`} className="hover:underline">
                      <h3 className="font-semibold text-sm text-gray-900 truncate">
                        {record.videoTitle}
                      </h3>
                    </Link>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {format(new Date(record.downloadTimestamp), "MMM dd, yyyy • hh:mm a")}
                      </span>
                      <span>&bull;</span>
                      <span className="font-mono text-gray-700 font-medium">{record.fileSize}</span>
                      <span>&bull;</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${planBadgeStyle[record.subscriptionPlan]}`}
                      >
                        {record.subscriptionPlan} Plan
                      </span>
                    </div>

                    {/* Metadata / Audit info */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-gray-400" /> {record.ipAddress}
                      </span>
                      <span className="flex items-center gap-1">
                        <Monitor className="w-3 h-3 text-gray-400" /> {record.browser} ({record.deviceInfo})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                      record.status === "completed"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {record.status === "completed" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-600" />
                    )}
                    <span className="capitalize">{record.status}</span>
                  </span>

                  <DownloadButton
                    video={{
                      _id: record.videoId,
                      videotitle: record.videoTitle,
                      filepath: record.videoThumbnail,
                      filesize: record.fileSize,
                    }}
                    variant="outline"
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteRecord(record._id)}
                    className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        currentPlan={plan}
        onSuccess={() => fetchHistory()}
      />
    </div>
  );
}
