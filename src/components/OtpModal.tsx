import React, { useState, useEffect } from "react";
import { ShieldCheck, Lock, AlertTriangle, KeyRound, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/lib/axiosinstance";

interface OtpModalProps {
  isOpen: boolean;
  userId: string;
  email: string;
  otpPreview?: string;
  onSuccess: (userData: any, theme: string) => void;
  onClose: () => void;
}

export default function OtpModal({
  isOpen,
  userId,
  email,
  otpPreview,
  onSuccess,
  onClose,
}: OtpModalProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [trustDeviceDays, setTrustDeviceDays] = useState(30);

  useEffect(() => {
    if (otpPreview) {
      toast.info(`[Security OTP] Your verification code is: ${otpPreview}`, {
        duration: 10000,
      });
    }
  }, [otpPreview]);

  if (!isOpen) return null;

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP code");
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post("/user/verify-otp", {
        userId,
        otpCode: code,
        trustDeviceDays,
      });

      toast.success(response.data.message || "Device verified successfully!");
      onSuccess(response.data.result, response.data.theme || "dark");
    } catch (error: any) {
      console.error("OTP verification failed:", error);
      toast.error(error.response?.data?.message || "Invalid OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoOtp = () => {
    if (otpPreview) {
      setOtp(otpPreview.split(""));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-gray-900 border border-red-500/30 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Decorative Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

        <div className="flex flex-col items-center text-center mt-2 mb-4">
          <div className="w-14 h-14 bg-red-600/10 border border-red-500/40 text-red-500 rounded-full flex items-center justify-center mb-3 shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>New Login Detected</span>
          </h3>

          <p className="text-xs text-gray-300 mt-1.5 leading-relaxed max-w-xs">
            We noticed a login attempt from a new browser, device, or location. An OTP has been sent to{" "}
            <span className="font-semibold text-red-400">{email}</span>.
          </p>

          {otpPreview && (
            <div className="mt-3 px-3 py-1.5 bg-amber-950/60 border border-amber-500/40 rounded-lg text-amber-300 text-xs font-mono flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Demo OTP: <strong className="text-white text-sm">{otpPreview}</strong></span>
              <button
                type="button"
                onClick={handleFillDemoOtp}
                className="ml-auto underline text-[10px] text-amber-200 hover:text-white"
              >
                Auto-fill
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* OTP Digit Inputs */}
          <div className="flex justify-center gap-2.5 my-4">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-input-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-12 text-center text-xl font-bold bg-gray-800 border border-white/20 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-500/30 text-white outline-none transition"
              />
            ))}
          </div>

          {/* Trusted Device Checkbox / Period Option */}
          <div className="bg-gray-800/60 border border-white/10 p-3 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-300">
              <Lock className="w-4 h-4 text-green-400" />
              <span>Trust this device for</span>
            </div>
            <select
              value={trustDeviceDays}
              onChange={(e) => setTrustDeviceDays(Number(e.target.value))}
              className="bg-gray-900 border border-white/20 text-white px-2 py-1 rounded font-medium focus:outline-none"
            >
              <option value={7}>7 Days</option>
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
              <option value={365}>1 Year</option>
            </select>
          </div>

          {/* Submit Action */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl transition border border-white/10"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <span>Verify OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
