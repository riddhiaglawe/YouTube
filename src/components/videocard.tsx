"use client";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "./ui/avatar";

export default function VideoCard({ video }: any) {
  const getVideoSrc = () => {
    if (!video?.filepath) return "/video/vdo.mp4";
    if (video.filepath.startsWith("http") || video.filepath.startsWith("/")) {
      return video.filepath;
    }
    return process.env.BACKEND_URL
      ? `${process.env.BACKEND_URL}/${video.filepath}`
      : `/${video.filepath}`;
  };

  const formattedDate = video?.createdAt
    ? (() => {
        try {
          return `${formatDistanceToNow(new Date(video.createdAt))} ago`;
        } catch (e) {
          return "Recently";
        }
      })()
    : "Recently";

  return (
    <Link href={`/watch/${video?._id}`} className="group block">
      <div className="space-y-3">
        <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 group-hover:shadow-md transition-all">
          {video?.thumbnail ? (
            <img
              src={video.thumbnail}
              alt={video?.videotitle || "Video thumbnail"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <video
              src={getVideoSrc()}
              muted
              preload="metadata"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
            {video?.duration || "10:24"}
          </div>
        </div>
        <div className="flex gap-3">
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarFallback className="bg-red-600 text-white font-bold">
              {video?.videochanel?.[0]?.toUpperCase() || "Y"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-2 text-gray-900 group-hover:text-blue-600 leading-snug">
              {video?.videotitle || "Untitled Video"}
            </h3>
            <p className="text-xs text-gray-600 mt-1 font-medium">
              {video?.videochanel || "YouTube Channel"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {(video?.views || 0).toLocaleString()} views • {formattedDate}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
