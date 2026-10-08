import mongoose from "mongoose";
import users from "../Modals/Auth.js";

// Helper function to calculate theme based on IST time (5:00 AM to 12:00 PM IST -> light, else dark)
const getAutoThemeForIST = () => {
  try {
    const istString = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate = new Date(istString);
    const hour = istDate.getHours();
    // 5:00 AM (5) to 12:00 PM (11:59) IST
    if (hour >= 5 && hour < 12) {
      return "light";
    }
    return "dark";
  } catch (e) {
    const currentHour = new Date().getHours();
    return currentHour >= 5 && currentHour < 12 ? "light" : "dark";
  }
};

export const login = async (req, res) => {
  const { email, name, image, deviceMeta } = req.body;

  try {
    let existingUser = await users.findOne({ email });
    const autoTheme = getAutoThemeForIST();

    const currentMeta = {
      deviceId: deviceMeta?.deviceId || "dev_default_device",
      deviceName: deviceMeta?.deviceName || `${deviceMeta?.browser || "Browser"} on ${deviceMeta?.os || "Desktop"}`,
      browser: deviceMeta?.browser || "Chrome",
      browserVersion: deviceMeta?.browserVersion || "120.0",
      os: deviceMeta?.os || "Windows",
      deviceType: deviceMeta?.deviceType || "Desktop",
      deviceModel: deviceMeta?.deviceModel || "PC/Desktop",
      ip: deviceMeta?.ip || req.headers["x-forwarded-for"] || req.ip || "127.0.0.1",
      city: deviceMeta?.city || "Mumbai",
      state: deviceMeta?.state || "Maharashtra",
      country: deviceMeta?.country || "India",
      location: deviceMeta?.location || `${deviceMeta?.city || "Mumbai"}, ${deviceMeta?.state || "Maharashtra"}, ${deviceMeta?.country || "India"}`,
    };

    if (!existingUser) {
      // Create new user & mark initial device as trusted
      const initialTrustedDevice = {
        deviceId: currentMeta.deviceId,
        deviceName: currentMeta.deviceName,
        browser: currentMeta.browser,
        os: currentMeta.os,
        deviceType: currentMeta.deviceType,
        ip: currentMeta.ip,
        city: currentMeta.city,
        state: currentMeta.state,
        country: currentMeta.country,
        trustedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      };

      existingUser = await users.create({
        email,
        name,
        image,
        themePreference: autoTheme,
        trustedDevices: [initialTrustedDevice],
        loginHistory: [
          {
            timestamp: new Date(),
            ip: currentMeta.ip,
            browser: currentMeta.browser,
            os: currentMeta.os,
            deviceType: currentMeta.deviceType,
            deviceModel: currentMeta.deviceModel,
            city: currentMeta.city,
            state: currentMeta.state,
            country: currentMeta.country,
            location: currentMeta.location,
            status: "SUCCESS",
            isAnomaly: false,
          },
        ],
      });

      return res.status(201).json({
        result: existingUser,
        requireOtp: false,
        theme: autoTheme,
        message: "Login successful (New account registered)",
      });
    }

    // Existing user: check anomaly against trusted devices
    const now = new Date();

    // Check if device matches trusted devices (by deviceId or by browser + IP / Location)
    const isTrustedDevice = (existingUser.trustedDevices || []).some((td) => {
      const isNotExpired = !td.expiresAt || new Date(td.expiresAt) > now;
      if (!isNotExpired) return false;

      const sameDeviceId = td.deviceId === currentMeta.deviceId;
      const sameBrowserAndIp = td.browser === currentMeta.browser && td.ip === currentMeta.ip;
      const sameBrowserAndLocation = td.browser === currentMeta.browser && td.city === currentMeta.city && td.state === currentMeta.state;

      return sameDeviceId || sameBrowserAndIp || sameBrowserAndLocation;
    });

    if (isTrustedDevice) {
      // Recognized device: update theme based on login time if not custom set
      existingUser.themePreference = autoTheme;
      existingUser.loginHistory.unshift({
        timestamp: new Date(),
        ip: currentMeta.ip,
        browser: currentMeta.browser,
        os: currentMeta.os,
        deviceType: currentMeta.deviceType,
        deviceModel: currentMeta.deviceModel,
        city: currentMeta.city,
        state: currentMeta.state,
        country: currentMeta.country,
        location: currentMeta.location,
        status: "SUCCESS",
        isAnomaly: false,
      });

      // Cap history at 50 records
      if (existingUser.loginHistory.length > 50) {
        existingUser.loginHistory = existingUser.loginHistory.slice(0, 50);
      }

      await existingUser.save();

      return res.status(200).json({
        result: existingUser,
        requireOtp: false,
        theme: existingUser.themePreference,
        message: "Login successful from trusted device",
      });
    } else {
      // New Browser/Device/IP/Location -> Generate OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      existingUser.pendingOtp = {
        code: otpCode,
        expiresAt: otpExpires,
        deviceMeta: currentMeta,
      };

      existingUser.loginHistory.unshift({
        timestamp: new Date(),
        ip: currentMeta.ip,
        browser: currentMeta.browser,
        os: currentMeta.os,
        deviceType: currentMeta.deviceType,
        deviceModel: currentMeta.deviceModel,
        city: currentMeta.city,
        state: currentMeta.state,
        country: currentMeta.country,
        location: currentMeta.location,
        status: "OTP_REQUIRED",
        isAnomaly: true,
      });

      await existingUser.save();

      console.log(`[SECURITY OTP GENERATED] For User ${email}: OTP is ${otpCode}`);

      return res.status(200).json({
        requireOtp: true,
        userId: existingUser._id,
        email: existingUser.email,
        otpPreview: otpCode,
        message: "New device or location detected. OTP verification required.",
      });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong during login" });
  }
};

export const verifyOtp = async (req, res) => {
  const { userId, otpCode, trustDeviceDays = 30 } = req.body;

  try {
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.pendingOtp || !user.pendingOtp.code) {
      return res.status(400).json({ message: "No active OTP verification session found" });
    }

    if (new Date() > new Date(user.pendingOtp.expiresAt)) {
      user.pendingOtp = undefined;
      await user.save();
      return res.status(400).json({ message: "OTP code has expired. Please try logging in again." });
    }

    if (user.pendingOtp.code !== otpCode.trim()) {
      // Record failed attempt
      user.loginHistory.unshift({
        timestamp: new Date(),
        ip: user.pendingOtp.deviceMeta?.ip || "127.0.0.1",
        browser: user.pendingOtp.deviceMeta?.browser || "Unknown",
        os: user.pendingOtp.deviceMeta?.os || "Unknown",
        deviceType: user.pendingOtp.deviceMeta?.deviceType || "Desktop",
        deviceModel: user.pendingOtp.deviceMeta?.deviceModel || "Desktop",
        city: user.pendingOtp.deviceMeta?.city || "Unknown",
        state: user.pendingOtp.deviceMeta?.state || "Unknown",
        country: user.pendingOtp.deviceMeta?.country || "Unknown",
        location: user.pendingOtp.deviceMeta?.location || "Unknown Location",
        status: "FAILED_OTP",
        isAnomaly: true,
      });

      await user.save();
      return res.status(400).json({ message: "Invalid OTP code. Please check and try again." });
    }

    // Successful OTP verification
    const deviceMeta = user.pendingOtp.deviceMeta || {};
    const autoTheme = getAutoThemeForIST();

    // Mark as trusted device
    const newTrustedDevice = {
      deviceId: deviceMeta.deviceId || `device_${Date.now()}`,
      deviceName: deviceMeta.deviceName || `${deviceMeta.browser} on ${deviceMeta.os}`,
      browser: deviceMeta.browser,
      os: deviceMeta.os,
      deviceType: deviceMeta.deviceType,
      ip: deviceMeta.ip,
      city: deviceMeta.city,
      state: deviceMeta.state,
      country: deviceMeta.country,
      trustedAt: new Date(),
      expiresAt: new Date(Date.now() + trustDeviceDays * 24 * 60 * 60 * 1000),
    };

    user.trustedDevices.push(newTrustedDevice);
    user.themePreference = autoTheme;

    user.loginHistory.unshift({
      timestamp: new Date(),
      ip: deviceMeta.ip,
      browser: deviceMeta.browser,
      os: deviceMeta.os,
      deviceType: deviceMeta.deviceType,
      deviceModel: deviceMeta.deviceModel,
      city: deviceMeta.city,
      state: deviceMeta.state,
      country: deviceMeta.country,
      location: deviceMeta.location,
      status: "VERIFIED",
      isAnomaly: true,
    });

    user.pendingOtp = undefined;
    await user.save();

    return res.status(200).json({
      result: user,
      theme: user.themePreference,
      message: "OTP verification successful! Device added to trusted devices.",
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({ message: "Error verifying OTP code" });
  }
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description, themePreference } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updateObj = {};
    if (channelname !== undefined) updateObj.channelname = channelname;
    if (description !== undefined) updateObj.description = description;
    if (themePreference !== undefined) updateObj.themePreference = themePreference;

    const updatedata = await users.findByIdAndUpdate(
      _id,
      { $set: updateObj },
      { new: true }
    );
    return res.status(200).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getSecurityLogs = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      trustedDevices: user.trustedDevices || [],
      loginHistory: user.loginHistory || [],
      themePreference: user.themePreference || "dark",
    });
  } catch (error) {
    console.error("Get security logs error:", error);
    return res.status(500).json({ message: "Error fetching security logs" });
  }
};

export const revokeTrustedDevice = async (req, res) => {
  const { userId, deviceId } = req.params;
  try {
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.trustedDevices = (user.trustedDevices || []).filter((d) => d.deviceId !== deviceId);
    await user.save();
    return res.status(200).json({
      trustedDevices: user.trustedDevices,
      message: "Trusted device revoked successfully",
    });
  } catch (error) {
    console.error("Revoke device error:", error);
    return res.status(500).json({ message: "Error revoking device" });
  }
};

