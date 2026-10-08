import DownloadRecord from "../Modals/DownloadRecord.js";
import User from "../Modals/Auth.js";
import videoFiles from "../Modals/video.js";

const PLAN_LIMITS = {
  free: 1,
  bronze: 5,
  silver: 15,
  gold: 50,
};

// Helper: Determine user's active plan based on expiry date
function getEffectivePlan(user) {
  if (!user) return { plan: "free", maxQuota: 1, isExpired: false };

  const plan = user.subscriptionPlan || "free";
  if (plan !== "free" && user.subscriptionExpiresAt) {
    const isExpired = new Date(user.subscriptionExpiresAt) < new Date();
    if (isExpired) {
      return { plan: "free", maxQuota: 1, isExpired: true };
    }
  }

  const maxQuota = PLAN_LIMITS[plan] || 1;
  return { plan, maxQuota, isExpired: false };
}

// Check Download Eligibility
export const checkEligibility = async (req, res) => {
  const { userId, videoId } = req.body;

  try {
    if (!userId || !videoId) {
      return res.status(400).json({ message: "userId and videoId are required" });
    }

    const user = await User.findById(userId);
    const { plan, maxQuota, isExpired } = getEffectivePlan(user);

    // Calculate start of current day (00:00:00 local/UTC)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Find all successful downloads today
    const todaysDownloads = await DownloadRecord.find({
      userId,
      status: "completed",
      downloadTimestamp: { $gte: startOfDay },
    });

    // Check if duplicate download within 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSameVideoDownload = await DownloadRecord.findOne({
      userId,
      videoId,
      status: "completed",
      downloadTimestamp: { $gte: twentyFourHoursAgo },
    });

    const isDuplicate = !!recentSameVideoDownload;

    // Count unique video downloads today
    const uniqueDownloadedVideoIds = new Set(todaysDownloads.map((d) => d.videoId));
    let usedQuota = uniqueDownloadedVideoIds.size;

    // If current video is new (not downloaded today), check if quota allows it
    if (!isDuplicate && uniqueDownloadedVideoIds.has(videoId)) {
      // Already counted today
    }

    const remainingQuota = Math.max(0, maxQuota - usedQuota);
    const eligible = isDuplicate || remainingQuota > 0;

    let reason = "";
    if (!eligible) {
      if (isExpired) {
        reason = "Your subscription has expired. Free plan limit (1 video/day) reached. Please renew your subscription.";
      } else {
        reason = `Daily download limit reached for your ${plan.toUpperCase()} plan (${maxQuota} video/day). Upgrade your plan to download more videos.`;
      }
    }

    return res.status(200).json({
      eligible,
      plan,
      maxQuota,
      usedQuota,
      remainingQuota,
      isDuplicate,
      isExpired,
      reason,
    });
  } catch (error) {
    console.error("checkEligibility error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Request & Authorize Video Download
export const requestDownload = async (req, res) => {
  const { userId, videoId } = req.body;

  try {
    if (!userId || !videoId) {
      return res.status(400).json({ message: "userId and videoId are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const video = await videoFiles.findById(videoId);

    const { plan, maxQuota, isExpired } = getEffectivePlan(user);

    // Calculate start of current day
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todaysDownloads = await DownloadRecord.find({
      userId,
      status: "completed",
      downloadTimestamp: { $gte: startOfDay },
    });

    // Duplicate check within 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSameVideoDownload = await DownloadRecord.findOne({
      userId,
      videoId,
      status: "completed",
      downloadTimestamp: { $gte: twentyFourHoursAgo },
    });

    const isDuplicate = !!recentSameVideoDownload;
    const uniqueDownloadedVideoIds = new Set(todaysDownloads.map((d) => d.videoId));
    const usedQuota = uniqueDownloadedVideoIds.size;
    const remainingQuota = Math.max(0, maxQuota - usedQuota);

    if (!isDuplicate && remainingQuota <= 0) {
      return res.status(403).json({
        message: `Daily download limit reached for ${plan.toUpperCase()} plan (${maxQuota} downloads/day). Upgrade plan for more downloads.`,
        plan,
        maxQuota,
        usedQuota,
        remainingQuota: 0,
      });
    }

    // Extract device, IP, and browser metadata for audit record
    const userAgent = req.headers["user-agent"] || "Unknown User Agent";
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

    let browser = "Web Browser";
    if (userAgent.includes("Chrome")) browser = "Google Chrome";
    else if (userAgent.includes("Firefox")) browser = "Mozilla Firefox";
    else if (userAgent.includes("Safari")) browser = "Apple Safari";
    else if (userAgent.includes("Edge")) browser = "Microsoft Edge";

    let deviceInfo = "Desktop PC";
    if (/mobile/i.test(userAgent)) deviceInfo = "Mobile Device";
    else if (/tablet/i.test(userAgent)) deviceInfo = "Tablet Device";

    // Create Download Audit Record
    const record = new DownloadRecord({
      userId,
      videoId,
      videoTitle: video ? video.videotitle : "YouTube Video " + videoId,
      videoThumbnail: video ? video.filepath : "",
      filePath: video ? video.filepath : "",
      fileSize: video ? video.filesize : "15.4 MB",
      downloadTimestamp: new Date(),
      ipAddress,
      deviceInfo,
      browser,
      subscriptionPlan: plan,
      status: "completed",
    });

    await record.save();

    // Recalculate remaining quota after saving
    const newUsedQuota = isDuplicate ? usedQuota : usedQuota + 1;
    const newRemainingQuota = Math.max(0, maxQuota - newUsedQuota);

    return res.status(200).json({
      message: isDuplicate ? "Re-download successful (duplicate within 24h, no quota deducted)" : "Download authorized successfully",
      downloadUrl: video ? `/uploads/${video.filename}` : `/uploads/sample.mp4`,
      record,
      plan,
      maxQuota,
      usedQuota: newUsedQuota,
      remainingQuota: newRemainingQuota,
      isDuplicate,
    });
  } catch (error) {
    console.error("requestDownload error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Get User Download History & Current Quota Status
export const getDownloadHistory = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    const { plan, maxQuota, isExpired } = getEffectivePlan(user);

    const records = await DownloadRecord.find({ userId }).sort({ createdAt: -1 });

    // Calculate today's quota
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todaysDownloads = await DownloadRecord.find({
      userId,
      status: "completed",
      downloadTimestamp: { $gte: startOfDay },
    });

    const uniqueDownloadedVideoIds = new Set(todaysDownloads.map((d) => d.videoId));
    const usedQuota = uniqueDownloadedVideoIds.size;
    const remainingQuota = Math.max(0, maxQuota - usedQuota);

    return res.status(200).json({
      records,
      plan,
      maxQuota,
      usedQuota,
      remainingQuota,
      isExpired,
      subscriptionExpiresAt: user ? user.subscriptionExpiresAt : null,
    });
  } catch (error) {
    console.error("getDownloadHistory error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Update Subscription Plan
export const updateSubscription = async (req, res) => {
  const { userId, plan, durationDays = 30 } = req.body;

  try {
    if (!["free", "bronze", "silver", "gold"].includes(plan)) {
      return res.status(400).json({ message: "Invalid plan. Choose free, bronze, silver, or gold." });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const user = await User.findByIdAndUpdate(
      userId,
      {
        subscriptionPlan: plan,
        subscriptionExpiresAt: plan === "free" ? null : expiresAt,
      },
      { new: true }
    );

    return res.status(200).json({
      message: `Successfully upgraded to ${plan.toUpperCase()} plan!`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
      },
      maxQuota: PLAN_LIMITS[plan],
    });
  } catch (error) {
    console.error("updateSubscription error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Delete Download Record
export const deleteDownloadRecord = async (req, res) => {
  const { recordId } = req.params;

  try {
    await DownloadRecord.findByIdAndDelete(recordId);
    return res.status(200).json({ message: "Download record deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete record", error: error.message });
  }
};
