import React, { useState } from "react";
import Videocard from "@/components/videocard";
import { MOCK_VIDEOS } from "@/lib/mockVideos";
import { Flame, Music, Gamepad2, Film, Newspaper, Trophy, Sparkles } from "lucide-react";

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState("Trending");

  const categories = [
    { name: "Trending", icon: Flame, color: "bg-red-500 text-white" },
    { name: "Music", icon: Music, color: "bg-emerald-500 text-white" },
    { name: "Gaming", icon: Gamepad2, color: "bg-purple-500 text-white" },
    { name: "Movies", icon: Film, color: "bg-blue-500 text-white" },
    { name: "News", icon: Newspaper, color: "bg-amber-500 text-white" },
    { name: "Sports", icon: Trophy, color: "bg-indigo-500 text-white" },
  ];

  const filteredVideos = MOCK_VIDEOS.filter((video) => {
    if (activeTab === "Trending") return true;
    const cat = activeTab.toLowerCase();
    const title = video.videotitle.toLowerCase();
    const channel = video.videochanel.toLowerCase();
    return title.includes(cat) || channel.includes(cat) || video.category?.toLowerCase() === cat;
  });

  const videosToDisplay = filteredVideos.length > 0 ? filteredVideos : MOCK_VIDEOS;

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">Explore</h1>
        </div>
        <p className="text-sm text-gray-600">Discover trending videos, music, gaming, and top channels around the world.</p>
      </div>

      {/* Explore Category Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeTab === cat.name;
          return (
            <button
              key={cat.name}
              onClick={() => setActiveTab(cat.name)}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                isActive
                  ? "border-red-600 bg-red-50 shadow-sm"
                  : "border-gray-200 bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <div className={`p-3 rounded-full mb-2 ${cat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className={`text-sm font-semibold ${isActive ? "text-red-600" : "text-gray-800"}`}>
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Video Feed */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{activeTab} Videos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videosToDisplay.map((video) => (
            <Videocard key={video._id} video={video} />
          ))}
        </div>
      </div>
    </div>
  );
}
