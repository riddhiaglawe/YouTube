import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  ThumbsUp,
  History,
  User,
  Video,
  Download,
  Crown,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/lib/AuthContext";

const Sidebar = () => {
  const { user } = useUser();
  const router = useRouter();
  const [isdialogeopen, setisdialogeopen] = useState(false);

  const channelId = user?._id || user?.id || "demo_user_1";

  const isActive = (path: string) => router.pathname === path;

  return (
    <aside className="w-64 bg-white border-r min-h-screen p-2 flex-shrink-0">
      <nav className="space-y-1">
        <Link href="/">
          <Button
            variant={isActive("/") ? "secondary" : "ghost"}
            className={`w-full justify-start font-medium ${
              isActive("/") ? "bg-gray-100 font-semibold" : ""
            }`}
          >
            <Home className="w-5 h-5 mr-3 text-red-600" />
            Home
          </Button>
        </Link>
        <Link href="/explore">
          <Button
            variant={isActive("/explore") ? "secondary" : "ghost"}
            className={`w-full justify-start font-medium ${
              isActive("/explore") ? "bg-gray-100 font-semibold" : ""
            }`}
          >
            <Compass className="w-5 h-5 mr-3 text-blue-500" />
            Explore
          </Button>
        </Link>
        <Link href="/subscriptions">
          <Button
            variant={isActive("/subscriptions") ? "secondary" : "ghost"}
            className={`w-full justify-start font-medium ${
              isActive("/subscriptions") ? "bg-gray-100 font-semibold" : ""
            }`}
          >
            <PlaySquare className="w-5 h-5 mr-3 text-emerald-500" />
            Subscriptions
          </Button>
        </Link>
        <Link href="/subscription">
          <Button
            variant={isActive("/subscription") ? "secondary" : "ghost"}
            className={`w-full justify-between font-medium ${
              isActive("/subscription") ? "bg-amber-50 font-semibold text-amber-600" : ""
            }`}
          >
            <div className="flex items-center">
              <Crown className="w-5 h-5 mr-3 text-amber-500 fill-amber-500" />
              VIP Membership
            </div>
            <span className="bg-amber-500 text-black text-[9px] px-1.5 py-0.5 rounded font-extrabold">
              VIP
            </span>
          </Button>
        </Link>
        <Link href="/meet">
          <Button
            variant={isActive("/meet") ? "secondary" : "ghost"}
            className={`w-full justify-between font-medium ${
              isActive("/meet") ? "bg-red-50 font-semibold text-red-600" : ""
            }`}
          >
            <div className="flex items-center">
              <Video className="w-5 h-5 mr-3 text-red-600" />
              Video Calls
            </div>
            <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              LIVE
            </span>
          </Button>
        </Link>

        {user && (
          <>
            <div className="border-t pt-2 mt-2">
              <Link href="/history">
                <Button
                  variant={isActive("/history") ? "secondary" : "ghost"}
                  className={`w-full justify-start font-medium ${
                    isActive("/history") ? "bg-gray-100 font-semibold" : ""
                  }`}
                >
                  <History className="w-5 h-5 mr-3 text-purple-500" />
                  History
                </Button>
              </Link>
              <Link href="/liked">
                <Button
                  variant={isActive("/liked") ? "secondary" : "ghost"}
                  className={`w-full justify-start font-medium ${
                    isActive("/liked") ? "bg-gray-100 font-semibold" : ""
                  }`}
                >
                  <ThumbsUp className="w-5 h-5 mr-3 text-amber-500" />
                  Liked videos
                </Button>
              </Link>
              <Link href="/watch-later">
                <Button
                  variant={isActive("/watch-later") ? "secondary" : "ghost"}
                  className={`w-full justify-start font-medium ${
                    isActive("/watch-later") ? "bg-gray-100 font-semibold" : ""
                  }`}
                >
                  <Clock className="w-5 h-5 mr-3 text-cyan-500" />
                  Watch later
                </Button>
              </Link>
              <Link href="/downloads">
                <Button
                  variant={isActive("/downloads") ? "secondary" : "ghost"}
                  className={`w-full justify-start font-medium ${
                    isActive("/downloads") ? "bg-gray-100 font-semibold text-red-600" : ""
                  }`}
                >
                  <Download className="w-5 h-5 mr-3 text-red-600" />
                  Downloads
                </Button>
              </Link>
              {user?.channelname ? (
                <Link href={`/channel/${channelId}`}>
                  <Button
                    variant={router.pathname.startsWith("/channel") ? "secondary" : "ghost"}
                    className="w-full justify-start font-medium"
                  >
                    <User className="w-5 h-5 mr-3 text-indigo-500" />
                    Your channel
                  </Button>
                </Link>
              ) : (
                <div className="px-2 py-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full font-medium"
                    onClick={() => setisdialogeopen(true)}
                  >
                    Create Channel
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </nav>
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </aside>
  );
};

export default Sidebar;
