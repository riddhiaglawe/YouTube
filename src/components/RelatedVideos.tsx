import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

interface RelatedVideosProps {
  videos: Array<{
    _id: string;
    videotitle: string;
    videochanel: string;
    views: number;
    createdAt: string;
  }>;
}
const vid = "/video/vdo.mp4";
export default function RelatedVideos({ videos }: RelatedVideosProps) {
  if (!videos || !Array.isArray(videos) || videos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-base text-gray-900 mb-2">Related Videos</h3>
      {videos.map((video) => (
        <Link
          key={video._id}
          href={`/watch/${video._id}`}
          className="flex gap-2 group"
        >
          <div className="relative w-40 aspect-video bg-gray-900 rounded-lg overflow-hidden flex-shrink-0">
            {(video as any)?.thumbnail ? (
              <img
                src={(video as any).thumbnail}
                alt={video.videotitle}
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <video
                src={vid}
                muted
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2 text-gray-900 group-hover:text-blue-600">
              {video.videotitle}
            </h3>
            <p className="text-xs text-gray-600 mt-1">{video.videochanel}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {(video.views || 0).toLocaleString()} views •{" "}
              {video.createdAt
                ? formatDistanceToNow(new Date(video.createdAt)) + " ago"
                : "Recently"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
