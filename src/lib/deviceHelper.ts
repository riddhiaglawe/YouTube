export interface DeviceMeta {
  deviceId: string;
  deviceName: string;
  browser: string;
  browserVersion: string;
  os: string;
  deviceType: "Desktop" | "Mobile" | "Tablet";
  deviceModel: string;
  ip: string;
  city: string;
  state: string;
  country: string;
  location: string;
}

export const getOrCreateDeviceId = (): string => {
  if (typeof window === "undefined") return "server_device";
  let deviceId = localStorage.getItem("yourtube_device_id");
  if (!deviceId) {
    deviceId = `dev_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    localStorage.setItem("yourtube_device_id", deviceId);
  }
  return deviceId;
};

export const parseUserAgent = () => {
  if (typeof window === "undefined") {
    return {
      browser: "Chrome",
      browserVersion: "120.0",
      os: "Windows",
      deviceType: "Desktop" as const,
      deviceModel: "Desktop PC",
    };
  }

  const ua = navigator.userAgent;

  // OS detection
  let os = "Windows";
  if (ua.includes("Win")) os = "Windows 11";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  // Device Type detection
  let deviceType: "Desktop" | "Mobile" | "Tablet" = "Desktop";
  if (/Tablet|iPad/i.test(ua)) deviceType = "Tablet";
  else if (/Mobi|Android/i.test(ua)) deviceType = "Mobile";

  // Browser detection
  let browser = "Chrome";
  let browserVersion = "120.0";

  if (ua.includes("Edg/")) {
    browser = "Edge";
    const match = ua.match(/Edg\/([\d.]+)/);
    if (match) browserVersion = match[1];
  } else if (ua.includes("Firefox/")) {
    browser = "Firefox";
    const match = ua.match(/Firefox\/([\d.]+)/);
    if (match) browserVersion = match[1];
  } else if (ua.includes("Chrome/")) {
    browser = "Chrome";
    const match = ua.match(/Chrome\/([\d.]+)/);
    if (match) browserVersion = match[1];
  } else if (ua.includes("Safari/")) {
    browser = "Safari";
    const match = ua.match(/Version\/([\d.]+)/);
    if (match) browserVersion = match[1];
  }

  // Device Model
  let deviceModel = `${os} ${deviceType}`;
  if (os === "iOS") deviceModel = ua.includes("iPad") ? "Apple iPad" : "Apple iPhone";
  else if (os === "Android") deviceModel = "Android Mobile Device";
  else if (os === "macOS") deviceModel = "Apple Mac";
  else if (os.includes("Windows")) deviceModel = "Windows PC";

  return { browser, browserVersion, os, deviceType, deviceModel };
};

export const collectDeviceMetadata = async (): Promise<DeviceMeta> => {
  const deviceId = getOrCreateDeviceId();
  const { browser, browserVersion, os, deviceType, deviceModel } = parseUserAgent();

  let ip = "103.21.124.5"; // Sample public IP fallback
  let city = "Mumbai";
  let state = "Maharashtra";
  let country = "India";

  try {
    const res = await fetch("https://ipapi.co/json/", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.ip) ip = data.ip;
      if (data.city) city = data.city;
      if (data.region) state = data.region;
      if (data.country_name) country = data.country_name;
    }
  } catch (e) {
    // Fallback if IP API is blocked or offline
    try {
      const res2 = await fetch("https://api.ipify.org?format=json");
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2.ip) ip = data2.ip;
      }
    } catch (e2) {}
  }

  const deviceName = `${browser} on ${os}`;
  const location = `${city}, ${state}, ${country}`;

  return {
    deviceId,
    deviceName,
    browser,
    browserVersion,
    os,
    deviceType,
    deviceModel,
    ip,
    city,
    state,
    country,
    location,
  };
};

export const calculateISTAutoTheme = (): "light" | "dark" => {
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
    const hour = new Date().getHours();
    return hour >= 5 && hour < 12 ? "light" : "dark";
  }
};
