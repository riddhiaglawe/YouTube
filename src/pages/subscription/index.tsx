import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import {
  Crown,
  Check,
  ShieldCheck,
  Sparkles,
  Zap,
  CreditCard,
  Calendar,
  Clock,
  ArrowRight,
  Download,
  Tv,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { loadRazorpayScript } from "@/lib/razorpay";
import InvoiceModal from "@/components/InvoiceModal";

interface TransactionItem {
  _id: string;
  invoiceNumber: string;
  paymentId: string;
  amount: number;
  currency: string;
  plan: string;
  billingCycle: string;
  status: "success" | "failed" | "cancelled" | "pending";
  paymentMethod: string;
  startDate: string;
  expiryDate: string;
}

const PLAN_DETAILS = [
  {
    id: "free",
    name: "Free Tier",
    prices: { monthly: 0, quarterly: 0, yearly: 0 },
    limit: "1 download / day",
    resolution: "480p Standard",
    badgeColor: "bg-gray-100 text-gray-800 border-gray-300",
    features: [
      "1 video download per 24 hours",
      "Standard quality streaming (480p)",
      "Ad-supported viewing",
      "Standard customer support",
    ],
  },
  {
    id: "bronze",
    name: "Bronze Plan",
    prices: { monthly: 399, quarterly: 1079, yearly: 3590 },
    limit: "5 downloads / day",
    resolution: "720p HD",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-400 font-bold",
    buttonStyle: "bg-amber-600 hover:bg-amber-700 text-white shadow-md",
    features: [
      "5 video downloads per day",
      "HD resolution streaming (720p)",
      "Priority download speed line",
      "24h duplicate free re-downloads",
      "Standard watch history & playlists",
    ],
  },
  {
    id: "silver",
    name: "Silver VIP",
    prices: { monthly: 799, quarterly: 2159, yearly: 7190 },
    limit: "15 downloads / day",
    resolution: "1080p Full HD",
    popular: true,
    badgeColor: "bg-slate-200 text-slate-900 border-slate-400 font-extrabold",
    buttonStyle: "bg-slate-900 hover:bg-black text-white shadow-lg",
    features: [
      "15 video downloads per day",
      "Full HD resolution (1080p)",
      "100% Ad-Free Video Viewing",
      "Access to Exclusive Courses",
      "Multi-device registration (2 devices)",
      "Priority email customer support",
    ],
  },
  {
    id: "gold",
    name: "Gold Ultimate",
    prices: { monthly: 1499, quarterly: 4047, yearly: 13490 },
    limit: "50 downloads / day",
    resolution: "4K Ultra HD",
    badgeColor: "bg-yellow-200 text-yellow-950 border-yellow-400 font-extrabold shadow-sm",
    buttonStyle: "bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white shadow-xl",
    features: [
      "50 video downloads per day",
      "4K Ultra HD & HDR Streaming",
      "100% Ad-Free across all devices",
      "All Exclusive Premium Courses",
      "Unlimited Multi-device Sync (5 devices)",
      "VIP Priority 24/7 Support",
    ],
  },
];

export default function SubscriptionPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [userPlan, setUserPlan] = useState<string>("free");
  const [userExpiry, setUserExpiry] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  // Invoice Modal
  const [selectedInvoiceHtml, setSelectedInvoiceHtml] = useState<string | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Test Payment Modal Fallback
  const [testOrderData, setTestOrderData] = useState<any>(null);

  const userId = user?._id || user?.id || "demo_user_1";

  const fetchUserData = async () => {
    try {
      const res = await axiosInstance.get(`/download/history/${userId}`);
      setUserPlan(res.data.plan || "free");
      setUserExpiry(res.data.subscriptionExpiresAt || null);

      const txRes = await axiosInstance.get(`/payment/billing-history/${userId}`);
      setTransactions(txRes.data.transactions || []);
    } catch (err) {
      console.warn("Could not fetch subscription details:", err);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  // Handle Subscription Purchase via Razorpay
  const handlePurchasePlan = async (planId: string) => {
    if (planId === "free") return;

    setLoading(true);

    try {
      // 1. Create Razorpay Order on server
      const orderRes = await axiosInstance.post("/payment/create-order", {
        userId,
        plan: planId,
        billingCycle,
      });

      const { orderId, amount, currency, keyId, invoiceNumber, priceRupees } = orderRes.data;

      // 2. Load Razorpay SDK
      const sdkLoaded = await loadRazorpayScript();

      if (sdkLoaded && (window as any).Razorpay) {
        const options = {
          key: keyId,
          amount,
          currency,
          name: "YourTube VIP Membership",
          description: `Upgrade to ${planId.toUpperCase()} (${billingCycle})`,
          order_id: orderId,
          prefill: {
            name: user?.name || "Subscriber",
            email: user?.email || "subscriber@yourtube.com",
          },
          theme: { color: "#dc2626" },
          handler: async (response: any) => {
            await verifyAndActivatePayment({
              razorpay_order_id: response.razorpay_order_id || orderId,
              razorpay_payment_id: response.razorpay_payment_id || `pay_test_${Date.now()}`,
              razorpay_signature: response.razorpay_signature || "test_sig",
              userId,
              plan: planId,
              billingCycle,
              invoiceNumber,
              amount,
            });
          },
          modal: {
            ondismiss: () => {
              toast.info("Payment process cancelled.");
              setLoading(false);
            },
          },
        };

        const razorpayObject = new (window as any).Razorpay(options);
        razorpayObject.on("payment.failed", (response: any) => {
          toast.error("Payment failed: " + (response.error?.description || "Transaction declined"));
          setLoading(false);
        });

        razorpayObject.open();
      } else {
        // Fallback test payment modal if Razorpay script is blocked
        setTestOrderData({
          orderId,
          amount,
          priceRupees,
          invoiceNumber,
          plan: planId,
          billingCycle,
        });
      }
    } catch (error: any) {
      toast.error("Failed to initiate payment order: " + (error.response?.data?.message || error.message));
      setLoading(false);
    }
  };

  // Verify Payment Signature & Activate Plan
  const verifyAndActivatePayment = async (payload: any) => {
    try {
      const res = await axiosInstance.post("/payment/verify-payment", payload);

      toast.success(res.data.message || "Payment Verified! Subscription Activated.");
      setUserPlan(res.data.user.subscriptionPlan);
      setUserExpiry(res.data.user.subscriptionExpiresAt);

      if (res.data.invoiceHTML) {
        setSelectedInvoiceHtml(res.data.invoiceHTML);
        setIsInvoiceModalOpen(true);
      }

      await fetchUserData();
    } catch (err: any) {
      toast.error("Payment verification failed: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
      setTestOrderData(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your VIP subscription? You will revert to the Free tier.")) return;

    try {
      await axiosInstance.post("/payment/cancel-subscription", { userId });
      toast.success("Subscription cancelled. Reverted to Free plan.");
      setUserPlan("free");
      setUserExpiry(null);
    } catch (err) {
      toast.error("Could not cancel subscription.");
    }
  };

  const remainingDays = userExpiry ? Math.max(0, differenceInDays(new Date(userExpiry), new Date())) : 0;

  return (
    <div className="min-h-[calc(100vh-56px)] flex-1 bg-gray-50 text-gray-900 p-4 sm:p-8">
      <Head>
        <title>VIP Subscription & Plans - YourTube</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header Hero Banner */}
        <div className="text-center space-y-3 max-w-3xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 bg-red-100 border border-red-300 text-red-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
            <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
            YourTube VIP Membership Platform
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Unlock High-Speed Downloads & HD Streaming
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Compare membership plans, manage billing cycles, download invoice receipts, and experience ad-free video streaming with Razorpay Secure Test Checkout.
          </p>
        </div>

        {/* Current Active Subscription Status Card */}
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-black text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl -z-0" />
          
          <div className="space-y-3 relative z-10">
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Your Active Subscription</span>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-extrabold text-white capitalize flex items-center gap-2">
                {userPlan} Plan
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs px-3 py-1 rounded-full font-bold uppercase">
                Active Status
              </span>
            </div>

            {userExpiry ? (
              <p className="text-xs text-zinc-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-500" />
                <span>Expires on: <strong className="text-white font-mono">{format(new Date(userExpiry), "MMMM dd, yyyy")}</strong></span>
                <span className="bg-zinc-800 text-amber-400 px-2 py-0.5 rounded font-mono text-[11px] font-bold">
                  ({remainingDays} days remaining)
                </span>
              </p>
            ) : (
              <p className="text-xs text-zinc-400">
                You are on the default Free Plan. Upgrade below to unlock higher daily video download limits!
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 relative z-10 self-end md:self-center">
            {userPlan !== "free" && (
              <Button
                variant="outline"
                onClick={handleCancelSubscription}
                className="border-red-500/40 text-red-400 hover:bg-red-950/60 rounded-xl text-xs"
              >
                Cancel Subscription
              </Button>
            )}
            <Link href="/downloads">
              <Button className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold px-5 py-5 flex items-center gap-2 shadow-lg shadow-red-600/30">
                <Download className="w-4 h-4" /> Go to Downloads
              </Button>
            </Link>
          </div>
        </div>

        {/* Billing Cycle Selector */}
        <div className="flex items-center justify-center gap-2 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm max-w-md mx-auto">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              billingCycle === "monthly" ? "bg-red-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("quarterly")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
              billingCycle === "quarterly" ? "bg-red-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Quarterly
            <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.2 rounded font-extrabold">10% OFF</span>
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
              billingCycle === "yearly" ? "bg-red-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Yearly
            <span className="bg-amber-500 text-black text-[9px] px-1.5 py-0.2 rounded font-extrabold">25% OFF</span>
          </button>
        </div>

        {/* Membership Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLAN_DETAILS.map((plan) => {
            const isCurrent = userPlan.toLowerCase() === plan.id;
            const price = plan.prices[billingCycle];

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-3xl border p-6 flex flex-col justify-between transition-all duration-300 relative shadow-sm hover:shadow-xl ${
                  plan.popular
                    ? "border-red-500 ring-2 ring-red-500/20 shadow-lg scale-102"
                    : isCurrent
                    ? "border-emerald-500 bg-emerald-50/20"
                    : "border-gray-200"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-xl border ${plan.badgeColor}`}>
                      {plan.name}
                    </span>
                    {isCurrent && (
                      <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-gray-900">₹{price}</span>
                      <span className="text-xs text-gray-500">/{billingCycle === "monthly" ? "mo" : billingCycle === "quarterly" ? "3mo" : "yr"}</span>
                    </div>
                    <p className="text-xs font-bold text-red-600 mt-1">{plan.limit}</p>
                    <p className="text-[11px] text-gray-500 font-medium">{plan.resolution}</p>
                  </div>

                  <ul className="space-y-2.5 mb-8 text-xs text-gray-600">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() => handlePurchasePlan(plan.id)}
                  disabled={isCurrent || loading || plan.id === "free"}
                  className={`w-full rounded-2xl py-6 text-xs font-bold ${
                    isCurrent
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 cursor-default"
                      : plan.id === "free"
                      ? "bg-gray-100 text-gray-500 cursor-default"
                      : plan.buttonStyle || "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {loading
                    ? "Processing Payment..."
                    : isCurrent
                    ? "Current Active Plan"
                    : plan.id === "free"
                    ? "Included Free"
                    : `Subscribe via Razorpay ₹${price}`}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Matrix */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-md space-y-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> Plan Feature Comparison Matrix
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 uppercase">
                  <th className="py-3 px-4">Platform Feature</th>
                  <th className="py-3 px-4 text-center">Free</th>
                  <th className="py-3 px-4 text-center">Bronze</th>
                  <th className="py-3 px-4 text-center">Silver</th>
                  <th className="py-3 px-4 text-center">Gold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                <tr>
                  <td className="py-3.5 px-4 font-semibold">Daily Offline Video Downloads</td>
                  <td className="text-center font-bold text-gray-500">1 / day</td>
                  <td className="text-center font-bold text-amber-600">5 / day</td>
                  <td className="text-center font-bold text-slate-700">15 / day</td>
                  <td className="text-center font-bold text-yellow-600">50 / day</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold">Max Streaming Resolution</td>
                  <td className="text-center">480p SD</td>
                  <td className="text-center">720p HD</td>
                  <td className="text-center font-semibold">1080p Full HD</td>
                  <td className="text-center font-bold text-amber-600">4K Ultra HD</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold">Ad-Free Video Viewing</td>
                  <td className="text-center"><XCircle className="w-4 h-4 mx-auto text-gray-300" /></td>
                  <td className="text-center"><XCircle className="w-4 h-4 mx-auto text-gray-300" /></td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold">Exclusive Premium Courses</td>
                  <td className="text-center"><XCircle className="w-4 h-4 mx-auto text-gray-300" /></td>
                  <td className="text-center"><XCircle className="w-4 h-4 mx-auto text-gray-300" /></td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold">Multi-device Concurrent Sync</td>
                  <td className="text-center">1 Device</td>
                  <td className="text-center">1 Device</td>
                  <td className="text-center">2 Devices</td>
                  <td className="text-center font-bold text-amber-600">5 Devices</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold">Razorpay Test Gateway Security</td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                  <td className="text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Billing & Invoice History */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-md space-y-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-red-600" /> Billing History & Razorpay Invoices
          </h2>

          {transactions.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-500">
              No payment transactions recorded yet. Subscribe above to create your first Razorpay test invoice!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Payment ID</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Plan & Cycle</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {transactions.map((tx) => (
                    <tr key={tx._id} className="hover:bg-gray-50">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{tx.invoiceNumber}</td>
                      <td className="py-3.5 px-4 font-mono text-gray-600">{tx.paymentId}</td>
                      <td className="py-3.5 px-4">{format(new Date(tx.startDate), "MMM dd, yyyy")}</td>
                      <td className="py-3.5 px-4 font-semibold uppercase">{tx.plan} ({tx.billingCycle})</td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">₹{(tx.amount / 100).toFixed(2)}</td>
                      <td className="py-3.5 px-4">
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            // Re-generate HTML invoice
                            const html = `
                              <html><body style="font-family:sans-serif;padding:20px;">
                                <h2>Invoice ${tx.invoiceNumber}</h2>
                                <p>Payment ID: ${tx.paymentId}</p>
                                <p>Plan: ${tx.plan.toUpperCase()} (${tx.billingCycle})</p>
                                <p>Amount: ₹${(tx.amount / 100).toFixed(2)}</p>
                                <p>Date: ${new Date(tx.startDate).toLocaleDateString()}</p>
                              </body></html>
                            `;
                            setSelectedInvoiceHtml(html);
                            setIsInvoiceModalOpen(true);
                          }}
                          className="text-red-600 hover:text-red-700 text-xs font-semibold"
                        >
                          View Receipt
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Test Order Instant Checkout Modal Fallback */}
      {testOrderData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 relative border border-gray-200">
            <button
              onClick={() => {
                setTestOrderData(null);
                setLoading(false);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Razorpay Test Gateway Sandbox</h3>
              <p className="text-xs text-gray-500">
                Simulate successful test payment for order: <span className="font-mono font-bold text-red-600">{testOrderData.orderId}</span>
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Plan Selected:</span>
                <span className="font-bold text-gray-900 uppercase">{testOrderData.plan} ({testOrderData.billingCycle})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice Number:</span>
                <span className="font-mono font-bold text-gray-900">{testOrderData.invoiceNumber}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-sm">
                <span className="font-bold text-gray-900">Total Payable:</span>
                <span className="font-extrabold text-red-600">₹{testOrderData.priceRupees} INR</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() =>
                  verifyAndActivatePayment({
                    razorpay_order_id: testOrderData.orderId,
                    razorpay_payment_id: `pay_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    razorpay_signature: "test_verified_signature",
                    userId,
                    plan: testOrderData.plan,
                    billingCycle: testOrderData.billingCycle,
                    invoiceNumber: testOrderData.invoiceNumber,
                    amount: testOrderData.amount,
                  })
                }
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 rounded-2xl shadow-lg shadow-emerald-600/20 text-sm"
              >
                Simulate Successful Test Payment ₹{testOrderData.priceRupees}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  toast.error("Test payment declined by user.");
                  setTestOrderData(null);
                  setLoading(false);
                }}
                className="w-full border-gray-300 text-gray-600 rounded-2xl py-4 text-xs"
              >
                Simulate Payment Failure / Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Receipt Modal */}
      {selectedInvoiceHtml && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          invoiceHtml={selectedInvoiceHtml}
        />
      )}
    </div>
  );
}
