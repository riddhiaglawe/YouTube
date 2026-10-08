import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import DownloadButton from "./DownloadButton";

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);

  // const user: any = {
  //   id: "1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   image: "https://github.com/shadcn.png?height=32&width=32",
  // };
  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }, [video]);

  useEffect(() => {
    const handleviews = async () => {
      if (!video?._id) return;
      try {
        if (user) {
          await axiosInstance.post(`/history/${video._id}`, {
            userId: user?._id,
          });
        } else {
          await axiosInstance.post(`/history/views/${video._id}`);
        }
      } catch (error) {
        console.log("Views update request ignored:", error);
      } finally {
        try {
          const raw = localStorage.getItem("youtube_history") || "[]";
          const list = JSON.parse(raw);
          const filtered = list.filter(
            (item: any) => item.videoid?._id !== video._id && item._id !== video._id
          );
          const historyEntry = {
            _id: Date.now().toString(),
            videoid: video,
            createdAt: new Date().toISOString(),
          };
          localStorage.setItem("youtube_history", JSON.stringify([historyEntry, ...filtered]));
        } catch (e) {}
      }
    };
    handleviews();
  }, [user, video?._id]);

  const handleLike = async () => {
    try {
      if (user) {
        await axiosInstance.post(`/like/${video._id}`, {
          userId: user?._id,
        });
      }
    } catch (error) {
      console.log(error);
    } finally {
      if (isLiked) {
        setlikes((prev: any) => Math.max(0, prev - 1));
        setIsLiked(false);
        try {
          const raw = localStorage.getItem("youtube_liked") || "[]";
          const list = JSON.parse(raw);
          const filtered = list.filter((item: any) => item.videoid?._id !== video._id);
          localStorage.setItem("youtube_liked", JSON.stringify(filtered));
        } catch (e) {}
      } else {
        setlikes((prev: any) => prev + 1);
        setIsLiked(true);
        if (isDisliked) {
          setDislikes((prev: any) => Math.max(0, prev - 1));
          setIsDisliked(false);
        }
        try {
          const raw = localStorage.getItem("youtube_liked") || "[]";
          const list = JSON.parse(raw);
          const filtered = list.filter((item: any) => item.videoid?._id !== video._id);
          const entry = {
            _id: Date.now().toString(),
            videoid: video,
            createdAt: new Date().toISOString(),
          };
          localStorage.setItem("youtube_liked", JSON.stringify([entry, ...filtered]));
        } catch (e) {}
      }
    }
  };

  const handleWatchLater = async () => {
    try {
      if (user) {
        await axiosInstance.post(`/watch/${video._id}`, {
          userId: user?._id,
        });
      }
    } catch (error) {
      console.log(error);
    } finally {
      if (isWatchLater) {
        setIsWatchLater(false);
        try {
          const raw = localStorage.getItem("youtube_watch_later") || "[]";
          const list = JSON.parse(raw);
          const filtered = list.filter((item: any) => item.videoid?._id !== video._id);
          localStorage.setItem("youtube_watch_later", JSON.stringify(filtered));
        } catch (e) {}
      } else {
        setIsWatchLater(true);
        try {
          const raw = localStorage.getItem("youtube_watch_later") || "[]";
          const list = JSON.parse(raw);
          const filtered = list.filter((item: any) => item.videoid?._id !== video._id);
          const entry = {
            _id: Date.now().toString(),
            videoid: video,
            createdAt: new Date().toISOString(),
          };
          localStorage.setItem("youtube_watch_later", JSON.stringify([entry, ...filtered]));
        } catch (e) {}
      }
    }
  };

  const handleDislike = async () => {
    try {
      if (user) {
        await axiosInstance.post(`/like/${video._id}`, {
          userId: user?._id,
        });
      }
    } catch (error) {
      console.log(error);
    } finally {
      if (isDisliked) {
        setDislikes((prev: any) => Math.max(0, prev - 1));
        setIsDisliked(false);
      } else {
        setDislikes((prev: any) => prev + 1);
        setIsDisliked(true);
        if (isLiked) {
          setlikes((prev: any) => Math.max(0, prev - 1));
          setIsLiked(false);
        }
      }
    }
  };
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-red-600 text-white font-bold">
              {video?.videochanel?.[0]?.toUpperCase() || "Y"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{video?.videochanel || "YouTube Channel"}</h3>
            <p className="text-sm text-gray-600">1.2M subscribers</p>
          </div>
          <Button className="ml-4">Subscribe</Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-full">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-5 h-5 mr-2 ${
                  isLiked ? "fill-black text-black" : ""
                }`}
              />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-6 bg-gray-300" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-5 h-5 mr-2 ${
                  isDisliked ? "fill-black text-black" : ""
                }`}
              />
              {dislikes.toLocaleString()}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-gray-100 rounded-full ${
              isWatchLater ? "text-primary" : ""
            }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 rounded-full"
          >
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>
          <DownloadButton video={video} />
          <Button
            variant="ghost"
            size="icon"
            className="bg-gray-100 rounded-full"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>
            Sample video description. This would contain the actual video
            description from the database.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>
    </div>
  );
};

export default VideoInfo;
