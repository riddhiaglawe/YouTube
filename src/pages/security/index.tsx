import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Laptop,
  Globe,
  MapPin,
  Clock,
  Trash2,
  Moon,
  Sun,
  Key,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UserCheck,
} from "lucide-react";

interface TrustedDevice {
  deviceId: string;
  deviceName: string;
  browser: string;
  os: string;
  deviceType: string;
  ip: string;
  city: string;
  state: string;
  country: string;
  trustedAt: string;
  expiresAt: string;
}

interface LoginLog {
  timestamp: string;
  ip: string;
  browser: string;
  os: string;
  deviceType: string;
  deviceModel: string;
  city: string;
  state: string;
  country: string;
  location: string;
  status: "SUCCESS" | "OTP_REQUIRED" | "VERIFIED" | "FAILED_OTP";
  isAnomaly: boolean;
}

export default function SecurityPage() {
  const { user, themePreference, toggleTheme } = useUser();
  const router = useRouter();

  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSecurityData = async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/user/security/${user._id}`);
      setTrustedDevices(res.data.trustedDevices || []);
      setLoginHistory(res.data.loginHistory || []);
    } catch (err) {
      console.error("Failed to load security logs:", err);
      toast.error("Could not load security records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchSecurityData();
    } else {
      setLoading(false);
    }
  }, [user?._id]);

  const handleRevokeDevice = async (deviceId: string) => {
    if (!user?._id) return;
    try {
      const res = await axiosInstance.delete(`/user/trusted-device/${user._id}/${deviceId}`);
      setTrustedDevices(res.data.trustedDevices || []);
      toast.success("Trusted device access revoked successfully");
    } catch (err) {
      console.error("Revoke error:", err);
      toast.error("Failed to revoke device");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>Success</span>
          </span>
        );
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <ShieldCheck className="w-3 h-3" />
            <span>OTP Verified</span>
          </span>
        );
      case "OTP_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Key className="w-3 h-3" />
            <span>OTP Triggered</span>
          </span>
        );
      case "FAILED_OTP":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <AlertTriangle className="w-3 h-3" />
            <span>Failed OTP</span>
          </span>
        );
      default:
        return <span className="text-xs text-gray-500">{status}</span>;
    }
  };

  if (!user) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-3" />
        <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
        <p className="text-sm text-gray-500 mb-4">Please sign in to view your Account Security & Login Logs.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-8 font-sans">
      {/* Header Overview Card */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white p-6 rounded-2xl shadow-xl border border-white/10 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 z-10 relative">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Enhanced Security Active</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Account Security & Login Audit</h1>
            <p className="text-xs md:text-sm text-gray-300 max-w-xl">
              Automatic time-based theme adaptation, public IP tracking, location detection, and multi-factor OTP verification for unrecognised logins.
            </p>
          </div>

          {/* Theme Adaptation Card Widget */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-xl flex items-center gap-4 min-w-[240px]">
            <div className="p-3 bg-red-600 rounded-xl text-white shadow-lg">
              {themePreference === "dark" ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-gray-300 font-semibold uppercase tracking-wider">
                Current Theme
              </span>
              <span className="text-base font-bold capitalize text-white">
                {themePreference} Mode
              </span>
              <button
                onClick={toggleTheme}
                className="mt-1 text-xs text-red-400 hover:text-red-300 underline font-medium text-left"
              >
                Switch to {themePreference === "dark" ? "Light" : "Dark"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security Features Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm flex items-start gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Auto IST Theme Rule</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Logins between <strong>5:00 AM & 12:00 PM IST</strong> auto-set Light theme; all other times default to Dark mode.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm flex items-start gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Public IP & Geolocation</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Records public IP address, browser version, device type, OS, city, state, and country per attempt.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm flex items-start gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-xl">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">OTP Anomaly Protection</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Triggers mandatory OTP verification whenever logging in from a new browser, new device, IP, or city.
            </p>
          </div>
        </div>
      </div>

      {/* Trusted Devices Section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Trusted Devices</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Browsers and devices verified via OTP that bypass multi-factor prompts.
              </p>
            </div>
          </div>
          <button
            onClick={fetchSecurityData}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-400 animate-pulse">
              Loading trusted devices...
            </div>
          ) : trustedDevices.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No trusted devices registered yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trustedDevices.map((dev, idx) => (
                <div
                  key={dev.deviceId || idx}
                  className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 p-4 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-gray-200 dark:bg-gray-700 rounded-xl text-gray-700 dark:text-gray-300">
                      {dev.deviceType === "Mobile" ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        {dev.deviceName || `${dev.browser} on ${dev.os}`}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <span className="font-mono text-[11px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                          {dev.ip}
                        </span>
                        <span>•</span>
                        <span>{dev.city || "Mumbai"}, {dev.country || "India"}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 block mt-1">
                        Trusted since: {new Date(dev.trustedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevokeDevice(dev.deviceId)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                    title="Revoke Trust"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Login History Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Detailed Login Audit Logs</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Complete chronological record of all login events, public IPs, browsers, and OTP verifications.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Date & Time (IST)</th>
                <th className="py-3 px-4">Browser & OS</th>
                <th className="py-3 px-4">Public IP</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Device Model</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Loading login records...
                  </td>
                </tr>
              ) : loginHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No login history recorded yet.
                  </td>
                </tr>
              ) : (
                loginHistory.map((log, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition">
                    <td className="py-3 px-4 font-mono text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white font-semibold">
                      {log.browser} on {log.os}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-400">
                      {log.ip}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-500" />
                        <span>{log.location || `${log.city || "Mumbai"}, ${log.country || "India"}`}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                      {log.deviceModel || log.deviceType}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(log.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
