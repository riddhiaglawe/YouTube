import mongoose from "mongoose";

const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  subscriptionPlan: {
    type: String,
    enum: ["free", "bronze", "silver", "gold"],
    default: "free",
  },
  subscriptionExpiresAt: { type: Date, default: null },
  registeredDevices: [
    {
      deviceId: { type: String },
      deviceName: { type: String },
      registeredAt: { type: Date, default: Date.now },
    },
  ],
  themePreference: { type: String, enum: ["light", "dark"], default: "dark" },
  trustedDevices: [
    {
      deviceId: { type: String, required: true },
      deviceName: { type: String },
      browser: { type: String },
      os: { type: String },
      deviceType: { type: String },
      ip: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      trustedAt: { type: Date, default: Date.now },
      expiresAt: { type: Date },
    },
  ],
  loginHistory: [
    {
      timestamp: { type: Date, default: Date.now },
      ip: { type: String },
      browser: { type: String },
      os: { type: String },
      deviceType: { type: String },
      deviceModel: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      location: { type: String },
      status: {
        type: String,
        enum: ["SUCCESS", "OTP_REQUIRED", "VERIFIED", "FAILED_OTP"],
        default: "SUCCESS",
      },
      isAnomaly: { type: Boolean, default: false },
    },
  ],
  pendingOtp: {
    code: { type: String },
    expiresAt: { type: Date },
    deviceMeta: { type: Object },
  },
  joinedon: { type: Date, default: Date.now },
});

export default mongoose.model("user", userschema);

