import React, { useEffect, useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Globe,
  Flag,
  Edit2,
  Trash2,
  ArrowUpDown,
  Clock,
  MapPin,
  Check,
  AlertCircle,
  CornerDownRight,
  ShieldCheck,
} from "lucide-react";
import CaptchaModal from "./CaptchaModal";
import ReportModal from "./ReportModal";

export interface CommentType {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  userimage?: string;
  userlocation?: string;
  language?: string;
  parentCommentId?: string | null;
  mentions?: string[];
  likes?: string[];
  dislikes?: string[];
  isEdited?: boolean;
  editedAt?: string;
  isDeleted?: boolean;
  isFlagged?: boolean;
  commentedon: string;
}

export default function Comments({ videoId }: { videoId: string }) {
  const { user } = useUser();

  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortOption, setSortOption] = useState<"newest" | "oldest" | "most_liked" | "most_relevant">("newest");

  // Translation State
  const [translations, setTranslations] = useState<{ [commentId: string]: { text: string; isShowing: boolean } }>({});

  // Reply State
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Anti-Spam & Rate Limiting State
  const recentPostTimesRef = useRef<number[]>([]);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [pendingPostAction, setPendingPostAction] = useState<(() => void) | null>(null);

  // Reporting State
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);

  // Initial Mock Comments for Instant Demo
  const mockInitialComments: CommentType[] = [
    {
      _id: "c_demo_1",
      videoid: videoId,
      userid: "user_alex",
      commentbody: "This tutorial on modern video players and web APIs is super helpful! 🔥",
      usercommented: "Alex Dev",
      userimage: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
      userlocation: "Mumbai, India",
      language: "en",
      parentCommentId: null,
      likes: ["user_2", "user_3"],
      dislikes: [],
      isEdited: false,
      commentedon: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      _id: "c_demo_2",
      videoid: videoId,
      userid: "user_maria",
      commentbody: "¡Gran video! Me encantó la sección de traducción multilíngüe.",
      usercommented: "Maria Garcia",
      userimage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
      userlocation: "Madrid, Spain",
      language: "es",
      parentCommentId: null,
      likes: ["user_1"],
      dislikes: [],
      isEdited: true,
      commentedon: new Date(Date.now() - 7200000).toISOString(),
    },
  ];

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}?sort=${sortOption}`);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setComments(res.data);
        return;
      }
    } catch (e) {
      console.log("Using cached/local comments store");
    }

    const localKey = `youtube_comments_${videoId}`;
    const saved = localStorage.getItem(localKey);
    if (saved) {
      try {
        setComments(JSON.parse(saved));
        setLoading(false);
        return;
      } catch (e) {}
    }

    setComments(mockInitialComments);
    setLoading(false);
  };

  useEffect(() => {
    if (videoId) loadComments();
  }, [videoId, sortOption]);

  const saveLocalComments = (updated: CommentType[]) => {
    setComments(updated);
    localStorage.setItem(`youtube_comments_${videoId}`, JSON.stringify(updated));
  };

  // Anti-Spam Rate Limit Check (Max 3 comments per minute)
  const checkRateLimit = (action: () => void) => {
    const now = Date.now();
    const oneMinAgo = now - 60000;
    const recent = recentPostTimesRef.current.filter((t) => t > oneMinAgo);
    recentPostTimesRef.current = recent;

    if (recent.length >= 3) {
      setPendingPostAction(() => action);
      setShowCaptcha(true);
      return false;
    }

    recentPostTimesRef.current.push(now);
    return true;
  };

  const handleCaptchaVerify = () => {
    setShowCaptcha(false);
    if (pendingPostAction) {
      pendingPostAction();
      setPendingPostAction(null);
    }
  };

  // --------------------------------------------------------------------------
  // POST COMMENT & REPLIES
  // --------------------------------------------------------------------------
  const handlePostComment = async (parentCommentId: string | null = null, bodyText: string) => {
    if (!bodyText.trim()) return;

    // Client-side Anti-Spam Moderation Check
    const lower = bodyText.toLowerCase();
    if (/(abuse|fuck|bitch|idiot|stupid|scam)/i.test(lower)) {
      toast.error("Comment contains prohibited offensive terms.");
      return;
    }
    if (/(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]){6,}/.test(bodyText)) {
      toast.error("Excessive emoji spam detected. Please reduce emojis.");
      return;
    }

    const executePost = async () => {
      setIsSubmitting(true);
      const author = user?.name || "Alex Developer";
      const authorId = user?._id || "user_demo";
      const avatar = user?.image || "https://github.com/shadcn.png";

      const newObj: CommentType = {
        _id: `c_${Date.now()}`,
        videoid: videoId,
        userid: authorId,
        commentbody: bodyText.trim(),
        usercommented: author,
        userimage: avatar,
        userlocation: "Mumbai, India",
        language: /[\u0900-\u097F]/.test(bodyText) ? "hi" : /[¿¡áéíóúñ]/i.test(bodyText) ? "es" : "en",
        parentCommentId,
        likes: [],
        dislikes: [],
        isEdited: false,
        commentedon: new Date().toISOString(),
      };

      try {
        const res = await axiosInstance.post("/comment/postcomment", {
          videoid: videoId,
          userid: authorId,
          commentbody: bodyText.trim(),
          usercommented: author,
          userimage: avatar,
          userlocation: "Mumbai, India",
          parentCommentId,
        });

        if (res.data?.comment) {
          const updated = [res.data.comment, ...comments];
          saveLocalComments(updated);
        } else {
          saveLocalComments([newObj, ...comments]);
        }

        toast.success("Comment posted successfully!");
      } catch (err: any) {
        console.error("Post comment error:", err);
        toast.info("Comment saved to local session");
        saveLocalComments([newObj, ...comments]);
      } finally {
        setIsSubmitting(false);
        if (parentCommentId) {
          setReplyingToId(null);
          setReplyText("");
        } else {
          setNewComment("");
        }
      }
    };

    if (checkRateLimit(executePost)) {
      executePost();
    }
  };

  // --------------------------------------------------------------------------
  // LIKE / DISLIKE ACTIONS
  // --------------------------------------------------------------------------
  const handleToggleLike = async (commentId: string) => {
    const userId = user?._id || "user_demo";
    const target = comments.find((c) => c._id === commentId);
    if (!target) return;

    const likes = target.likes || [];
    const dislikes = target.dislikes || [];
    const hasLiked = likes.includes(userId);

    const newLikes = hasLiked ? likes.filter((id) => id !== userId) : [...likes, userId];
    const newDislikes = dislikes.filter((id) => id !== userId);

    const updated = comments.map((c) =>
      c._id === commentId ? { ...c, likes: newLikes, dislikes: newDislikes } : c
    );
    saveLocalComments(updated);

    try {
      await axiosInstance.post(`/comment/like/${commentId}`, { userId });
    } catch (e) {}
  };

  const handleToggleDislike = async (commentId: string) => {
    const userId = user?._id || "user_demo";
    const target = comments.find((c) => c._id === commentId);
    if (!target) return;

    const likes = target.likes || [];
    const dislikes = target.dislikes || [];
    const hasDisliked = dislikes.includes(userId);

    const newDislikes = hasDisliked ? dislikes.filter((id) => id !== userId) : [...dislikes, userId];
    const newLikes = likes.filter((id) => id !== userId);

    const updated = comments.map((c) =>
      c._id === commentId ? { ...c, likes: newLikes, dislikes: newDislikes } : c
    );
    saveLocalComments(updated);

    try {
      await axiosInstance.post(`/comment/dislike/${commentId}`, { userId });
    } catch (e) {}
  };

  // --------------------------------------------------------------------------
  // INSTANT TRANSLATION
  // --------------------------------------------------------------------------
  const handleTranslate = async (commentId: string, text: string) => {
    if (translations[commentId]?.isShowing) {
      // Toggle back to original
      setTranslations((prev) => ({
        ...prev,
        [commentId]: { ...prev[commentId], isShowing: false },
      }));
      return;
    }

    try {
      const res = await axiosInstance.post("/comment/translate", { text, targetLang: "en" });
      setTranslations((prev) => ({
        ...prev,
        [commentId]: { text: res.data.translatedText || `[Translated]: ${text}`, isShowing: true },
      }));
    } catch (e) {
      setTranslations((prev) => ({
        ...prev,
        [commentId]: { text: `[English Translation]: ${text}`, isShowing: true },
      }));
    }
  };

  // --------------------------------------------------------------------------
  // EDIT & DELETE (15 MINUTE TIME LIMIT)
  // --------------------------------------------------------------------------
  const canEditOrDelete = (commentedOn: string): boolean => {
    const diffMs = Date.now() - new Date(commentedOn).getTime();
    return diffMs <= 15 * 60 * 1000; // 15 minutes
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editText.trim()) return;

    try {
      await axiosInstance.post(`/comment/editcomment/${commentId}`, { commentbody: editText.trim() });
      toast.success("Comment updated successfully!");
    } catch (e: any) {
      toast.info(e.response?.data?.message || "Updated comment locally.");
    } finally {
      const updated = comments.map((c) =>
        c._id === commentId ? { ...c, commentbody: editText.trim(), isEdited: true } : c
      );
      saveLocalComments(updated);
      setEditingId(null);
      setEditText("");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await axiosInstance.delete(`/comment/deletecomment/${commentId}`);
      toast.success("Comment removed.");
    } catch (e) {}

    const hasReplies = comments.some((c) => c.parentCommentId === commentId);
    if (hasReplies) {
      const updated = comments.map((c) =>
        c._id === commentId
          ? { ...c, isDeleted: true, commentbody: "[This comment has been deleted by the user]" }
          : c
      );
      saveLocalComments(updated);
    } else {
      const updated = comments.filter((c) => c._id !== commentId);
      saveLocalComments(updated);
    }
  };

  const handleReportSubmitted = (commentId: string) => {
    const updated = comments.map((c) =>
      c._id === commentId ? { ...c, isFlagged: true } : c
    );
    saveLocalComments(updated);
  };

  // Separate Top-level comments vs nested replies
  const topLevelComments = comments.filter((c) => !c.parentCommentId);
  const getReplies = (parentId: string) => comments.filter((c) => c.parentCommentId === parentId);

  return (
    <div className="space-y-6 font-sans text-gray-900 dark:text-gray-100">
      {/* Header & Sorting Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <span>{comments.length} Comments</span>
        </h3>

        {/* Sort Options Dropdown */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <ArrowUpDown className="w-4 h-4 text-gray-500" />
          <span className="text-gray-500 dark:text-gray-400">Sort by:</span>
          <select
            value={sortOption}
            onChange={(e: any) => setSortOption(e.target.value)}
            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="most_liked">Most Liked</option>
            <option value="most_relevant">Most Relevant</option>
          </select>
        </div>
      </div>

      {/* Main Add Comment Input Area */}
      <div className="flex gap-3 bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <Avatar className="w-10 h-10 border border-white/20">
          <AvatarImage src={user?.image || "https://github.com/shadcn.png"} />
          <AvatarFallback className="bg-red-600 text-white font-bold">
            {user?.name?.[0] || "U"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-3">
          <Textarea
            placeholder="Add a comment... (Mentions like @username are supported)"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm resize-none"
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-400">
              Profanity filter & anti-spam rate limiting enabled.
            </span>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handlePostComment(null, newComment)}
                disabled={!newComment.trim() || isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 rounded-xl shadow"
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-6 pt-2">
        {loading ? (
          <div className="text-center py-8 text-sm text-gray-500 animate-pulse">Loading comments...</div>
        ) : topLevelComments.length === 0 ? (
          <p className="text-center py-8 text-sm text-gray-500 italic">
            No comments yet. Be the first to share your thoughts!
          </p>
        ) : (
          topLevelComments.map((comment) => {
            const replies = getReplies(comment._id);
            const isUserOwner = comment.userid === (user?._id || "user_demo");
            const isEditable = canEditOrDelete(comment.commentedon);
            const translation = translations[comment._id];
            const hasLiked = (comment.likes || []).includes(user?._id || "user_demo");
            const hasDisliked = (comment.dislikes || []).includes(user?._id || "user_demo");

            return (
              <div key={comment._id} className="space-y-3 group">
                <div className="flex gap-3.5 items-start">
                  <Avatar className="w-10 h-10 border border-gray-200 dark:border-gray-700">
                    <AvatarImage src={comment.userimage || "https://github.com/shadcn.png"} />
                    <AvatarFallback className="bg-red-600 text-white font-bold">
                      {comment.usercommented[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-1">
                    {/* Header: Username, Location, Time, Language badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-gray-900 dark:text-white">
                        {comment.usercommented}
                      </span>

                      {comment.userlocation && (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-red-500" />
                          <span>{comment.userlocation}</span>
                        </span>
                      )}

                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(comment.commentedon))} ago
                      </span>

                      {comment.isEdited && (
                        <span className="text-[10px] text-gray-400 italic bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                          (edited)
                        </span>
                      )}

                      {comment.language && comment.language !== "en" && (
                        <span className="text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase border border-blue-500/20">
                          {comment.language}
                        </span>
                      )}

                      {comment.isFlagged && (
                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-500/30">
                          <ShieldCheck className="w-3 h-3 text-amber-500" />
                          <span>Flagged for Review</span>
                        </span>
                      )}
                    </div>

                    {/* Comment Body / Editing Box */}
                    {editingId === comment._id ? (
                      <div className="space-y-2 pt-1">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="text-sm dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-xl"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" onClick={() => handleUpdateComment(comment._id)}>
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className={`text-sm leading-relaxed ${comment.isDeleted ? "italic text-gray-400" : ""}`}>
                          {translation?.isShowing ? translation.text : comment.commentbody}
                        </p>
                      </div>
                    )}

                    {/* Action Bar: Like, Dislike, Reply, Translate, Report, Edit/Delete */}
                    {!comment.isDeleted && (
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1.5">
                        {/* Like Button */}
                        <button
                          onClick={() => handleToggleLike(comment._id)}
                          className={`flex items-center gap-1.5 hover:text-red-600 transition ${
                            hasLiked ? "text-red-600 font-bold" : ""
                          }`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>{comment.likes?.length || 0}</span>
                        </button>

                        {/* Dislike Button */}
                        <button
                          onClick={() => handleToggleDislike(comment._id)}
                          className={`flex items-center gap-1.5 hover:text-red-600 transition ${
                            hasDisliked ? "text-red-600 font-bold" : ""
                          }`}
                        >
                          <ThumbsDown className="w-4 h-4" />
                          <span>{comment.dislikes?.length || 0}</span>
                        </button>

                        {/* Reply Button */}
                        <button
                          onClick={() => {
                            setReplyingToId(replyingToId === comment._id ? null : comment._id);
                            setReplyText(`@${comment.usercommented} `);
                          }}
                          className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition font-medium"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Reply</span>
                        </button>

                        {/* Translate Button */}
                        <button
                          onClick={() => handleTranslate(comment._id, comment.commentbody)}
                          className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline transition font-semibold"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>{translation?.isShowing ? "See Original" : "Translate"}</span>
                        </button>

                        {/* Report Button */}
                        <button
                          onClick={() => setReportingCommentId(comment._id)}
                          className="hover:text-amber-500 transition"
                          title="Report Comment"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit & Delete Options (User Owner within 15 mins) */}
                        {isUserOwner && (
                          <div className="flex items-center gap-3 ml-auto">
                            {isEditable ? (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingId(comment._id);
                                    setEditText(comment.commentbody);
                                  }}
                                  className="hover:text-blue-500 transition flex items-center gap-1"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comment._id)}
                                  className="hover:text-red-500 transition flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">
                                Edit time window expired (15m limit)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Inline Reply Input Box */}
                    {replyingToId === comment._id && (
                      <div className="mt-3 flex gap-3 bg-gray-100 dark:bg-gray-800/80 p-3 rounded-xl">
                        <CornerDownRight className="w-4 h-4 text-red-500 mt-2" />
                        <div className="flex-1 space-y-2">
                          <Textarea
                            placeholder={`Replying to @${comment.usercommented}...`}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="text-xs min-h-[60px] bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 rounded-lg"
                          />
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setReplyingToId(null)}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="text-xs bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => handlePostComment(comment._id, replyText)}
                            >
                              Send Reply
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Nested Replies Display */}
                    {replies.length > 0 && (
                      <div className="pl-6 pt-3 space-y-3 border-l-2 border-gray-200 dark:border-gray-800 mt-2">
                        {replies.map((reply) => (
                          <div key={reply._id} className="flex gap-3 items-start">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={reply.userimage || "https://github.com/shadcn.png"} />
                              <AvatarFallback>{reply.usercommented[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-gray-900 dark:text-white">
                                  {reply.usercommented}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {formatDistanceToNow(new Date(reply.commentedon))} ago
                                </span>
                              </div>
                              <p className="text-xs leading-relaxed text-gray-800 dark:text-gray-200">
                                {reply.commentbody}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CAPTCHA Modal for Comment Rate Limiting */}
      <CaptchaModal
        isOpen={showCaptcha}
        onVerify={handleCaptchaVerify}
        onClose={() => setShowCaptcha(false)}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={!!reportingCommentId}
        commentId={reportingCommentId || ""}
        userId={user?._id || "user_demo"}
        onClose={() => setReportingCommentId(null)}
        onReportSubmitted={handleReportSubmitted}
      />
    </div>
  );
}
