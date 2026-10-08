import React from "react";
import Videocard from "@/components/videocard";
import { MOCK_VIDEOS } from "@/lib/mockVideos";
import { PlaySquare, CheckCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function SubscriptionsPage() {
  const channels = [
    { name: "National Geographic", count: "12M subscribers", initial: "N" },
    { name: "Code with Antonio", count: "850K subscribers", initial: "C" },
    { name: "JavaScript Mastery", count: "1.5M subscribers", initial: "J" },
    { name: "NASA Official", count: "10M subscribers", initial: "N" },
    { name: "Chef Ramsay", count: "6.2M subscribers", initial: "C" },
  ];

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <PlaySquare className="w-6 h-6 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
        </div>
        <p className="text-sm text-gray-600">Latest uploads from your subscribed YouTube channels.</p>
      </div>

      {/* Subscribed Channels Bar */}
      <div className="flex gap-6 overflow-x-auto pb-4 border-b scrollbar-none">
        {channels.map((chan) => (
          <div key={chan.name} className="flex flex-col items-center min-w-[80px] group cursor-pointer">
            <Avatar className="w-14 h-14 ring-2 ring-red-600 ring-offset-2 mb-2 group-hover:scale-105 transition-transform">
              <AvatarFallback className="bg-red-600 text-white font-bold text-lg">
                {chan.initial}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-semibold text-gray-800 text-center line-clamp-1 w-20">
              {chan.name}
            </span>
          </div>
        ))}
      </div>

      {/* Latest Uploads Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Latest Videos</h2>
          <span className="text-xs text-gray-500 font-medium">Sorted by upload date</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {MOCK_VIDEOS.map((video) => (
            <Videocard key={video._id} video={video} />
          ))}
        </div>
      </div>
    </div>
  );
}
