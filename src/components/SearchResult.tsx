import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import axiosInstance from "@/lib/axiosinstance";
import { MOCK_VIDEOS } from "@/lib/mockVideos";

const SearchResult = ({ query }: any) => {
  const [video, setvideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query?.trim()) {
        setvideos([]);
        setLoading(false);
        return;
      }

      try {
        const res = await axiosInstance.get("/video/getall");
        const allVids = Array.isArray(res.data) && res.data.length > 0 ? res.data : MOCK_VIDEOS;
        const results = allVids.filter(
          (vid: any) =>
            vid.videotitle?.toLowerCase().includes(query.toLowerCase()) ||
            vid.videochanel?.toLowerCase().includes(query.toLowerCase())
        );
        setvideos(results);
      } catch (error) {
        const results = MOCK_VIDEOS.filter(
          (vid) =>
            vid.videotitle.toLowerCase().includes(query.toLowerCase()) ||
            vid.videochanel.toLowerCase().includes(query.toLowerCase())
        );
        setvideos(results);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query]);

  if (!query?.trim()) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          Enter a search term to find videos and channels.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Searching videos...</div>;
  }

  if (video.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No results found for "{query}"</h2>
        <p className="text-gray-600">
          Try different keywords or search for categories like "Nature", "Next.js", or "Cooking"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {video.map((item: any) => (
          <div key={item._id} className="flex flex-col sm:flex-row gap-4 group">
            <Link href={`/watch/${item._id}`} className="flex-shrink-0">
              <div className="relative w-full sm:w-80 aspect-video bg-gray-900 rounded-xl overflow-hidden shadow">
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.videotitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <video
                    src="/video/vdo.mp4"
                    muted
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                  {item.duration || "10:24"}
                </div>
              </div>
            </Link>

            <div className="flex-1 min-w-0 py-1">
              <Link href={`/watch/${item._id}`}>
                <h3 className="font-semibold text-lg line-clamp-2 text-gray-900 group-hover:text-blue-600 mb-1 leading-snug">
                  {item.videotitle}
                </h3>
              </Link>

              <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                <span>{(item.views || 0).toLocaleString()} views</span>
                <span>•</span>
                <span>
                  {item.createdAt
                    ? formatDistanceToNow(new Date(item.createdAt)) + " ago"
                    : "Recently"}
                </span>
              </div>

              <Link
                href={`/channel/${item.uploader || "1"}`}
                className="flex items-center gap-2 mb-3 hover:text-blue-600"
              >
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="bg-red-600 text-white text-xs font-bold">
                    {item.videochanel?.[0]?.toUpperCase() || "Y"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-700">
                  {item.videochanel}
                </span>
              </Link>

              <p className="text-xs text-gray-600 line-clamp-2">
                Watch {item.videotitle} on {item.videochanel}. High quality YouTube content.
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center py-6 border-t">
        <p className="text-sm text-gray-500">
          Showing {video.length} results for "{query}"
        </p>
      </div>
    </div>
  );
};

export default SearchResult;
