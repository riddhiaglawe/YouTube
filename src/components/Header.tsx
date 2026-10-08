import { Bell, Menu, Mic, Search, User, VideoIcon, Moon, Sun, ShieldCheck } from "lucide-react";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Channeldialogue from "./channeldialogue";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";

const Header = () => {
  const { user, logout, handlegooglesignin, themePreference, toggleTheme } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [isdialogeopen, setisdialogeopen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const router = useRouter();

  const handleVoiceSearch = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsListening(false);
        if (transcript.trim()) {
          router.push(`/search?q=${encodeURIComponent(transcript.trim())}`);
        }
      };

      recognition.onerror = (e: any) => {
        console.log("Voice error:", e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleKeypress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(e as any);
    }
  };

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="text-gray-700 dark:text-gray-200">
          <Menu className="w-6 h-6" />
        </Button>
        <Link href="/" className="flex items-center gap-1 group">
          <div className="bg-red-600 p-1.5 rounded-lg group-hover:scale-105 transition-transform">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tighter text-gray-900 dark:text-white">YourTube</span>
          <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-1 py-0.5 rounded">IN</span>
        </Link>
      </div>

      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 flex-1 max-w-2xl mx-4"
      >
        <div className="flex flex-1">
          <Input
            type="search"
            placeholder="Search"
            value={searchQuery}
            onKeyPress={handleKeypress}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-l-full border-r-0 focus-visible:ring-0 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
          <Button
            type="submit"
            className="rounded-r-full px-6 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-l-0 dark:border-gray-700"
          >
            <Search className="w-5 h-5" />
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleVoiceSearch}
          className={`rounded-full transition-all ${
            isListening ? "bg-red-100 text-red-600 animate-pulse" : "hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
          title={isListening ? "Listening..." : "Search with your voice"}
        >
          <Mic className={`w-5 h-5 ${isListening ? "text-red-600" : "text-gray-700 dark:text-gray-300"}`} />
        </Button>
      </form>

      <div className="flex items-center gap-2">
        {/* Manual Theme Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={`Switch to ${themePreference === "dark" ? "Light" : "Dark"} mode`}
          className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
        >
          {themePreference === "dark" ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-gray-700" />
          )}
        </Button>

        {user ? (
          <>
            <Link href="/meet">
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 rounded-full px-3 py-1"
                title="Start or Join Video Call"
              >
                <VideoIcon className="w-4 h-4 text-red-600" />
                <span>Meet</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setisdialogeopen(true)}
              title="Create video/channel"
              className="text-gray-700 dark:text-gray-200"
            >
              <VideoIcon className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-700 dark:text-gray-200">
              <Bell className="w-5 h-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image} />
                    <AvatarFallback className="bg-red-600 text-white font-bold">
                      {user.name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60 dark:bg-gray-900 dark:border-gray-800" align="end" forceMount>
                {user?.channelname ? (
                  <DropdownMenuItem asChild>
                    <Link href={`/channel/${user?._id || user?.id || "demo_user_1"}`}>
                      Your channel
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <div className="px-2 py-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => setisdialogeopen(true)}
                    >
                      Create Channel
                    </Button>
                  </div>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/security" className="flex items-center gap-2 font-medium text-red-600 dark:text-red-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Account Security</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/history">History</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/liked">Liked videos</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/watch-later">Watch later</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/downloads">Downloads</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/subscription" className="text-amber-600 font-bold flex items-center justify-between">
                    <span>VIP Membership</span>
                    <span className="bg-amber-500 text-black text-[9px] px-1.5 py-0.2 rounded">VIP</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <Button
              className="flex items-center gap-2 rounded-full border border-gray-300 dark:border-gray-700 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-gray-800"
              variant="outline"
              onClick={handlegooglesignin}
            >
              <User className="w-4 h-4" />
              Sign in
            </Button>
          </>
        )}
      </div>
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </header>
  );
};

export default Header;

