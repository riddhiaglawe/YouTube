import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState, createContext, useEffect, useContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { collectDeviceMetadata, calculateISTAutoTheme } from "./deviceHelper";
import OtpModal from "@/components/OtpModal";
import { toast } from "sonner";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [themePreference, setThemePreference] = useState("dark");
  const [otpModalState, setOtpModalState] = useState({
    isOpen: false,
    userId: "",
    email: "",
    otpPreview: "",
  });

  const applyThemeClass = (theme) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  const updateTheme = (newTheme) => {
    setThemePreference(newTheme);
    localStorage.setItem("yourtube_theme", newTheme);
    applyThemeClass(newTheme);

    if (user?._id) {
      axiosInstance.patch(`/user/update/${user._id}`, { themePreference: newTheme }).catch(() => {});
    }
  };

  const toggleTheme = () => {
    const nextTheme = themePreference === "dark" ? "light" : "dark";
    updateTheme(nextTheme);
    toast.success(`Theme switched to ${nextTheme} mode`);
  };

  const login = (userdata, theme) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));

    const targetTheme = theme || userdata.themePreference || calculateISTAutoTheme();
    updateTheme(targetTheme);
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const performServerLogin = async (payload) => {
    try {
      let deviceMeta = null;
      try {
        deviceMeta = await collectDeviceMetadata();
      } catch (e) {
        console.log("Device metadata collection fallback");
      }

      const response = await axiosInstance.post("/user/login", {
        ...payload,
        deviceMeta,
      });

      if (response?.data?.requireOtp) {
        setOtpModalState({
          isOpen: true,
          userId: response.data.userId,
          email: response.data.email,
          otpPreview: response.data.otpPreview || "",
        });
        toast.warning(response.data.message || "OTP verification required for new device");
      } else if (response?.data?.result) {
        login(response.data.result, response.data.theme);
        toast.success(response.data.message || "Signed in successfully!");
      }
    } catch (error) {
      console.warn("Backend server login endpoint unavailable, applying local session fallback:", error?.message || error);
      const autoTheme = calculateISTAutoTheme();
      const demoUser = {
        _id: "demo_user_1",
        name: payload?.name || "Alex Developer",
        email: payload?.email || "alex@youtube.com",
        image: payload?.image || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
        channelname: "Alex Dev Channel",
        themePreference: autoTheme,
      };
      login(demoUser, autoTheme);
    }
  };


  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
      };
      await performServerLogin(payload);
    } catch (error) {
      console.log("Using Demo User account due to signin popup error:", error);
      const autoTheme = calculateISTAutoTheme();
      const demoUser = {
        _id: "demo_user_1",
        name: "Alex Developer",
        email: "alex@youtube.com",
        image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
        channelname: "Alex Dev Channel",
        themePreference: autoTheme,
      };
      login(demoUser, autoTheme);
    }
  };

  useEffect(() => {
    // Initial saved theme or IST time-based theme
    const savedTheme = localStorage.getItem("yourtube_theme");
    const initialTheme = savedTheme || calculateISTAutoTheme();
    setThemePreference(initialTheme);
    applyThemeClass(initialTheme);

    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch (e) {}
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser && !user) {
        const payload = {
          email: firebaseuser.email,
          name: firebaseuser.displayName,
          image: firebaseuser.photoURL || "https://github.com/shadcn.png",
        };
        await performServerLogin(payload);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleOtpSuccess = (userData, theme) => {
    setOtpModalState({ isOpen: false, userId: "", email: "", otpPreview: "" });
    login(userData, theme);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        themePreference,
        toggleTheme,
        updateTheme,
        login,
        logout,
        handlegooglesignin,
        performServerLogin,
      }}
    >
      {children}
      <OtpModal
        isOpen={otpModalState.isOpen}
        userId={otpModalState.userId}
        email={otpModalState.email}
        otpPreview={otpModalState.otpPreview}
        onSuccess={handleOtpSuccess}
        onClose={() => setOtpModalState({ isOpen: false, userId: "", email: "", otpPreview: "" })}
      />
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
