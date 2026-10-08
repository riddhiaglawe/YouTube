import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/Videopplayer";
import axiosInstance from "@/lib/axiosinstance";
import { MOCK_VIDEOS } from "@/lib/mockVideos";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const index = () => {
  const router = useRouter();
  const { id } = router.query;
  const [videos, setvideo] = useState<any>(null);
  const [video, setvide] = useState<any>([]);
  const [loading, setloading] = useState(true);

  useEffect(() => {
    const fetchvideo = async () => {
      if (!id || typeof id !== "string") return;
      try {
        const res = await axiosInstance.get("/video/getall");
        const allVids = Array.isArray(res.data) ? res.data : res.data?.videos || [];
        const found = allVids.find((vid: any) => vid._id === id) || MOCK_VIDEOS.find((vid: any) => vid._id === id);
        setvideo(found || MOCK_VIDEOS[0]);
        setvide(allVids.length > 0 ? allVids : MOCK_VIDEOS);
      } catch (error) {
        const found = MOCK_VIDEOS.find((vid: any) => vid._id === id) || MOCK_VIDEOS[0];
        setvideo(found);
        setvide(MOCK_VIDEOS);
      } finally {
        setloading(false);
      }
    };
    fetchvideo();
  }, [id]);
  // const relatedVideos = [
  //   {
  //     _id: "1",
  //     videotitle: "Amazing Nature Documentary",
  //     filename: "nature-doc.mp4",
  //     filetype: "video/mp4",
  //     filepath: "/videos/nature-doc.mp4",
  //     filesize: "500MB",
  //     videochanel: "Nature Channel",
  //     Like: 1250,
  //     Dislike: 50,
  //     views: 45000,
  //     uploader: "nature_lover",
  //     createdAt: new Date().toISOString(),
  //   },
  //   {
  //     _id: "2",
  //     videotitle: "Cooking Tutorial: Perfect Pasta",
  //     filename: "pasta-tutorial.mp4",
  //     filetype: "video/mp4",
  //     filepath: "/videos/pasta-tutorial.mp4",
  //     filesize: "300MB",
  //     videochanel: "Chef's Kitchen",
  //     Like: 890,
  //     Dislike: 20,
  //     views: 23000,
  //     uploader: "chef_master",
  //     createdAt: new Date(Date.now() - 86400000).toISOString(),
  //   },
  // ];
  const [isTheater, setIsTheater] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white font-medium">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading Video...</span>
        </div>
      </div>
    );
  }
  
  if (!videos) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-300 font-medium">
        Video not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors">
      <div className={`${isTheater ? "max-w-full px-0" : "max-w-7xl mx-auto p-4"} transition-all duration-300`}>
        {isTheater ? (
          <div className="space-y-6">
            <div className="w-full bg-black">
              <div className="max-w-7xl mx-auto">
                <Videopplayer
                  video={videos}
                  allVideos={video}
                  isTheaterMode={isTheater}
                  onTheaterModeToggle={() => setIsTheater(!isTheater)}
                />
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <VideoInfo video={videos} />
                <Comments videoId={id as string} />
              </div>
              <div className="space-y-4">
                <RelatedVideos videos={video} />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Videopplayer
                video={videos}
                allVideos={video}
                isTheaterMode={isTheater}
                onTheaterModeToggle={() => setIsTheater(!isTheater)}
              />
              <VideoInfo video={videos} />
              <Comments videoId={id as string} />
            </div>
            <div className="space-y-4">
              <RelatedVideos videos={video} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default index;
