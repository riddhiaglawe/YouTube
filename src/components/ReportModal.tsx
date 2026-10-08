import React, { useState } from "react";
import { Flag, X, AlertTriangle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/lib/axiosinstance";

interface ReportModalProps {
  isOpen: boolean;
  commentId: string;
  userId: string;
  onClose: () => void;
  onReportSubmitted: (commentId: string) => void;
}

const REPORT_REASONS = [
  { id: "spam", label: "Spam or misleading content", desc: "Repeated text, commercial ads, or deceptive links." },
  { id: "harassment", label: "Harassment or cyberbullying", desc: "Targeted insults, threats, or personal attacks." },
  { id: "offensive", label: "Offensive or abusive language", desc: "Profanity, vulgar terms, or hate speech." },
  { id: "hate_speech", label: "Hate speech or discrimination", desc: "Attacks based on race, religion, gender, or orientation." },
  { id: "misinformation", label: "Misinformation / Malicious content", desc: "Harmful false information or unsafe links." },
];

export default function ReportModal({
  isOpen,
  commentId,
  userId,
  onClose,
  onReportSubmitted,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0].id);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await axiosInstance.post(`/comment/report/${commentId}`, {
        userId,
        reason: selectedReason,
      });

      toast.success("Report submitted for administrator review.");
      onReportSubmitted(commentId);
      onClose();
    } catch (error: any) {
      console.error("Report error:", error);
      toast.error(error.response?.data?.message || "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in font-sans">
      <div className="bg-gray-900 border border-white/20 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4 text-red-500 font-bold border-b border-white/10 pb-3">
          <Flag className="w-5 h-5" />
          <h3 className="text-lg text-white">Report Comment</h3>
        </div>

        <p className="text-xs text-gray-300 mb-4">
          Reported comments will be flagged for review by our moderation team instead of being automatically removed.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {REPORT_REASONS.map((r) => (
            <label
              key={r.id}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                selectedReason === r.id
                  ? "bg-red-950/40 border-red-500/60 text-white"
                  : "bg-gray-800/60 border-white/10 text-gray-300 hover:bg-gray-800"
              }`}
            >
              <input
                type="radio"
                name="reportReason"
                value={r.id}
                checked={selectedReason === r.id}
                onChange={() => setSelectedReason(r.id)}
                className="mt-0.5 accent-red-600"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold">{r.label}</span>
                <span className="text-[10px] text-gray-400 mt-0.5">{r.desc}</span>
              </div>
            </label>
          ))}

          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl border border-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
