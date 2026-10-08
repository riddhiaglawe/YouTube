import React, { useState } from "react";
import { Check, Crown, Shield, Zap, Sparkles, X } from "lucide-react";
import { Button } from "./ui/button";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: string;
  onSuccess?: (newPlan: string) => void;
}

const PLANS = [
  {
    id: "free",
    name: "Free Tier",
    price: "$0",
    period: "forever",
    limit: "1 download per day",
    downloadsPerDay: 1,
    badgeColor: "bg-gray-100 text-gray-700 border-gray-300",
    buttonVariant: "outline" as const,
    features: ["1 video download / 24 hrs", "Standard resolution (480p)", "Web & mobile access"],
  },
  {
    id: "bronze",
    name: "Bronze Subscriber",
    price: "$4.99",
    period: "/ month",
    limit: "5 downloads per day",
    downloadsPerDay: 5,
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
    buttonVariant: "default" as const,
    buttonStyle: "bg-amber-600 hover:bg-amber-700 text-white",
    features: ["5 video downloads / day", "HD resolution (720p)", "Fast download speeds", "24h duplicate free re-downloads"],
  },
  {
    id: "silver",
    name: "Silver VIP",
    price: "$9.99",
    period: "/ month",
    limit: "15 downloads per day",
    downloadsPerDay: 15,
    popular: true,
    badgeColor: "bg-slate-200 text-slate-800 border-slate-400",
    buttonVariant: "default" as const,
    buttonStyle: "bg-slate-800 hover:bg-slate-900 text-white",
    features: ["15 video downloads / day", "Full HD resolution (1080p)", "Priority download queue", "Multi-device registration", "Ad-free offline viewing"],
  },
  {
    id: "gold",
    name: "Gold Ultimate",
    price: "$19.99",
    period: "/ month",
    limit: "50 downloads per day",
    downloadsPerDay: 50,
    badgeColor: "bg-yellow-100 text-yellow-900 border-yellow-400",
    buttonVariant: "default" as const,
    buttonStyle: "bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white shadow-lg",
    features: ["50 video downloads / day", "4K Ultra HD resolution", "Maximum speed line", "Unlimited multi-device sync", "VIP customer support"],
  },
];

export default function SubscriptionModal({
  isOpen,
  onClose,
  currentPlan = "free",
  onSuccess,
}: SubscriptionModalProps) {
  const { user } = useUser();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async (planId: string) => {
    const userId = user?._id || user?.id || "demo_user_1";
    setLoadingPlan(planId);

    try {
      const res = await axiosInstance.post("/download/update-subscription", {
        userId,
        plan: planId,
        durationDays: 30,
      });

      toast.success(res.data.message || `Upgraded to ${planId.toUpperCase()} plan!`);
      if (onSuccess) onSuccess(planId);
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update subscription");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative border border-gray-100 my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> Subscription Plans & Download Quotas
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Choose the Perfect Plan for Unlimited Learning
          </h2>
          <p className="text-sm text-gray-600 max-w-xl mx-auto">
            Upgrade your account to unlock higher daily video download quotas, HD resolution quality, and priority download speeds.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {PLANS.map((plan) => {
            const isCurrent = (currentPlan || "free").toLowerCase() === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 ${
                  plan.popular
                    ? "border-red-500 shadow-xl ring-2 ring-red-500/20"
                    : isCurrent
                    ? "border-emerald-500 bg-emerald-50/30 shadow-md"
                    : "border-gray-200 hover:border-gray-300 shadow-sm"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${plan.badgeColor}`}
                    >
                      {plan.name}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-extrabold text-gray-900">{plan.price}</span>
                    <span className="text-xs text-gray-500 ml-1">{plan.period}</span>
                    <p className="text-xs font-semibold text-red-600 mt-1">{plan.limit}</p>
                  </div>

                  <ul className="space-y-2 mb-6 text-xs text-gray-600">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrent || loadingPlan === plan.id}
                  variant={plan.buttonVariant}
                  className={`w-full rounded-xl text-xs font-bold py-5 ${
                    isCurrent ? "bg-emerald-100 text-emerald-800 cursor-default" : plan.buttonStyle || ""
                  }`}
                >
                  {loadingPlan === plan.id
                    ? "Updating..."
                    : isCurrent
                    ? "Current Active Plan"
                    : `Upgrade to ${plan.name.split(" ")[0]}`}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200/80 text-xs text-gray-500">
          Daily quotas reset every night at 00:00 UTC. Re-downloading the same video within 24 hours does not deduct from your quota.
        </div>
      </div>
    </div>
  );
}
