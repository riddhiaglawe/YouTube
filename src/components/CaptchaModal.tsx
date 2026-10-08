import React, { useState, useEffect } from "react";
import { ShieldCheck, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface CaptchaModalProps {
  isOpen: boolean;
  onVerify: () => void;
  onClose: () => void;
}

export default function CaptchaModal({ isOpen, onVerify, onClose }: CaptchaModalProps) {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [error, setError] = useState(false);

  const generateCaptcha = () => {
    setNum1(Math.floor(Math.random() * 9) + 1);
    setNum2(Math.floor(Math.random() * 9) + 1);
    setUserAnswer("");
    setError(false);
  };

  useEffect(() => {
    if (isOpen) {
      generateCaptcha();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(userAnswer.trim(), 10) === num1 + num2) {
      toast.success("Security CAPTCHA verified!");
      onVerify();
    } else {
      setError(true);
      toast.error("Incorrect CAPTCHA answer. Please try again.");
      generateCaptcha();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in font-sans">
      <div className="bg-gray-900 border border-amber-500/40 text-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/40 text-amber-500 rounded-full flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <h3 className="text-lg font-bold">Security Verification</h3>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            Multiple comments posted in a short duration. Please solve the math CAPTCHA to verify you are human.
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="bg-gray-800 border border-white/10 p-4 rounded-xl flex items-center justify-between">
              <span className="text-xl font-bold font-mono text-amber-400 tracking-wider">
                {num1} + {num2} = ?
              </span>

              <button
                type="button"
                onClick={generateCaptcha}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition"
                title="Refresh problem"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter answer"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              className="w-full py-2.5 px-3 text-center text-lg font-bold bg-gray-800 border border-white/20 rounded-xl text-white outline-none focus:border-amber-500 transition"
              autoFocus
            />

            {error && (
              <div className="text-xs text-red-400 flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Incorrect sum. New question generated.</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl border border-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow"
              >
                Verify & Post
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
