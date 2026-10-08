import React, { useEffect, useState } from "react";
import Videocard from "./videocard";
import axiosInstance from "@/lib/axiosinstance";
import { MOCK_VIDEOS } from "@/lib/mockVideos";

interface VideogridProps {
  selectedCategory?: string;
}

const Videogrid = ({ selectedCategory = "All" }: VideogridProps) => {
  const [videos, setvideo] = useState<any[]>([]);
  const [loading, setloading] = useState(true);

  useEffect(() => {
    const fetchvideo = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        const fetchedVideos = Array.isArray(res.data)
          ? res.data
          : res.data?.videos || [];

        if (fetchedVideos.length > 0) {
          setvideo(fetchedVideos);
        } else {
          setvideo(MOCK_VIDEOS);
        }
      } catch (error) {
        console.log("Backend offline, using fallback YouTube videos", error);
        setvideo(MOCK_VIDEOS);
      } finally {
        setloading(false);
      }
    };
    fetchvideo();
  }, []);

  const displayedVideos = videos.filter((video: any) => {
    if (!selectedCategory || selectedCategory === "All") return true;
    const query = selectedCategory.toLowerCase();
    const title = (video.videotitle || "").toLowerCase();
    const channel = (video.videochanel || "").toLowerCase();
    const videoCategory = (video.category || "").toLowerCase();
    return videoCategory === query || title.includes(query) || channel.includes(query);
  });

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="col-span-full text-center py-12 text-gray-500 font-medium">
          Loading videos...
        </div>
      ) : displayedVideos.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-600 font-medium text-lg mb-1">
            No videos found for "{selectedCategory}"
          </p>
          <p className="text-gray-400 text-sm">
            Try selecting "All" or exploring other categories.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayedVideos.map((video: any) => (
            <Videocard key={video._id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Videogrid;
