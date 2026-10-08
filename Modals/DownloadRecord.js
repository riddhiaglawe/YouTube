import mongoose from "mongoose";

const downloadRecordSchema = mongoose.Schema(
  {
    userId: { type: String, required: true },
    videoId: { type: String, required: true },
    videoTitle: { type: String, default: "Untitled Video" },
    videoThumbnail: { type: String, default: "" },
    filePath: { type: String, default: "" },
    fileSize: { type: String, default: "0 MB" },
    downloadTimestamp: { type: Date, default: Date.now },
    ipAddress: { type: String, default: "127.0.0.1" },
    deviceInfo: { type: String, default: "Desktop" },
    browser: { type: String, default: "Unknown Browser" },
    subscriptionPlan: { type: String, default: "free" },
    status: {
      type: String,
      enum: ["completed", "failed", "interrupted"],
      default: "completed",
    },
  },
  { timestamps: true }
);

export default mongoose.model("DownloadRecord", downloadRecordSchema);
