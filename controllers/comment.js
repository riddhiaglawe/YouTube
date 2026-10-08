import comment from "../Modals/comment.js";
import mongoose from "mongoose";

// List of profane / abusive keywords for automated moderation
const PROFANITY_LIST = [
  "abuse", "badword", "idiot", "stupid", "scam", "fraud", "hateful",
  "bitch", "bastard", "fuck", "shit", "asshole", "dick", "pussy"
];

// Moderation Helper
const checkModeration = (text) => {
  const lower = text.toLowerCase();

  // 1. Check profanity
  const hasProfanity = PROFANITY_LIST.some((word) => lower.includes(word));
  if (hasProfanity) {
    return { flagged: true, reason: "Comment contains prohibited abusive language." };
  }

  // 2. Check emoji or special char spam (e.g., 5+ repeated characters/emojis)
  const emojiSpamRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]){6,}/;
  const symbolSpamRegex = /([!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])\1{5,}/;

  if (emojiSpamRegex.test(text) || symbolSpamRegex.test(text)) {
    return { flagged: true, reason: "Comment contains excessive repeated symbols or emojis." };
  }

  // 3. Check malicious links
  const linkRegex = /(https?:\/\/[^\s]+)/gi;
  if (linkRegex.test(text)) {
    return { flagged: true, reason: "Links are not allowed in comments to prevent spam/phishing." };
  }

  return { flagged: false };
};

// Simple Language Detector Helper
const detectLanguage = (text) => {
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text)) return "ja"; // Japanese/Chinese
  if (/[\u0600-\u06FF]/.test(text)) return "ar"; // Arabic
  if (/[\u0900-\u097F]/.test(text)) return "hi"; // Hindi
  if (/[¿¡áéíóúñ]/i.test(text)) return "es"; // Spanish
  if (/[éèêëàâùûç]/i.test(text)) return "fr"; // French
  if (/[äöüß]/i.test(text)) return "de"; // German
  return "en";
};

// Mock Translation Engine
const translateText = (text, targetLang = "en") => {
  const translationsMap = {
    es: {
      "great video!": "¡Gran video!",
      "thanks for sharing": "¡Gracias por compartir!",
      "hello": "Hola",
    },
    fr: {
      "great video!": "Super vidéo !",
      "thanks for sharing": "Merci pour le partage !",
      "hello": "Bonjour",
    },
    hi: {
      "great video!": "शानदार वीडियो!",
      "thanks for sharing": "साझा करने के लिए धन्यवाद!",
      "hello": "नमस्ते",
    },
    en: {
      "¡gran video!": "Great video!",
      "super vidéo !": "Great video!",
      "शानदार वीडियो!": "Great video!",
      "hola": "Hello",
      "bonjour": "Hello",
      "नमस्ते": "Hello",
    },
  };

  const lower = text.toLowerCase().trim();
  if (translationsMap[targetLang]?.[lower]) {
    return translationsMap[targetLang][lower];
  }

  return `[Translated to ${targetLang.toUpperCase()}]: ${text}`;
};

export const postcomment = async (req, res) => {
  const {
    videoid,
    userid,
    commentbody,
    usercommented,
    userimage,
    userlocation,
    parentCommentId,
    mentions,
  } = req.body;

  try {
    if (!commentbody || !commentbody.trim()) {
      return res.status(400).json({ message: "Comment body cannot be empty" });
    }

    // Anti-spam moderation checks
    const modResult = checkModeration(commentbody);
    if (modResult.flagged) {
      return res.status(400).json({ message: modResult.reason });
    }

    // Duplicate check within last 5 minutes
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingDuplicate = await comment.findOne({
      userid,
      videoid,
      commentbody: commentbody.trim(),
      commentedon: { $gte: fiveMinsAgo },
    });

    if (existingDuplicate) {
      return res.status(400).json({ message: "Duplicate comment detected. Please wait before posting again." });
    }

    // Detect language & extract @mentions if any
    const lang = detectLanguage(commentbody);
    const extractedMentions = (commentbody.match(/@\w+/g) || []).map((m) => m.substring(1));

    const newComment = new comment({
      videoid,
      userid,
      commentbody: commentbody.trim(),
      usercommented,
      userimage: userimage || "https://github.com/shadcn.png",
      userlocation: userlocation || "Mumbai, India",
      language: lang,
      parentCommentId: parentCommentId || null,
      mentions: mentions || extractedMentions,
      commentedon: new Date(),
    });

    await newComment.save();
    return res.status(201).json({ comment: newComment });
  } catch (error) {
    console.error("Post comment error:", error);
    return res.status(500).json({ message: "Something went wrong posting comment" });
  }
};

export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  const { sort = "newest" } = req.query;

  try {
    let query = comment.find({ videoid: videoid });

    let commentsList = await query.sort({ createdAt: -1 }).lean();

    // Custom sorting logic
    if (sort === "oldest") {
      commentsList.sort((a, b) => new Date(a.commentedon) - new Date(b.commentedon));
    } else if (sort === "most_liked") {
      commentsList.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    } else if (sort === "most_relevant") {
      commentsList.sort((a, b) => {
        const scoreA = (a.likes?.length || 0) * 2 - (a.reports?.length || 0);
        const scoreB = (b.likes?.length || 0) * 2 - (b.reports?.length || 0);
        return scoreB - scoreA;
      });
    }

    return res.status(200).json(commentsList);
  } catch (error) {
    console.error("Get comments error:", error);
    return res.status(500).json({ message: "Something went wrong fetching comments" });
  }
};

export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({ message: "Comment unavailable" });
  }
  try {
    const existing = await comment.findById(_id);
    if (!existing) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if parent comment has replies
    const hasReplies = await comment.exists({ parentCommentId: _id });

    if (hasReplies) {
      // Soft delete to preserve reply hierarchy
      existing.isDeleted = true;
      existing.commentbody = "[This comment has been deleted by the user]";
      await existing.save();
      return res.status(200).json({ message: "Comment soft deleted", comment: existing });
    } else {
      await comment.findByIdAndDelete(_id);
      return res.status(200).json({ message: "Comment deleted successfully", commentId: _id });
    }
  } catch (error) {
    console.error("Delete comment error:", error);
    return res.status(500).json({ message: "Something went wrong deleting comment" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({ message: "Comment unavailable" });
  }

  try {
    const existing = await comment.findById(_id);
    if (!existing) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check 15-minute edit time limit
    const fifteenMinsInMs = 15 * 60 * 1000;
    const timeElapsed = Date.now() - new Date(existing.commentedon).getTime();

    if (timeElapsed > fifteenMinsInMs) {
      return res.status(400).json({ message: "Comments can only be edited within 15 minutes of posting." });
    }

    // Moderation check on edit
    const modResult = checkModeration(commentbody);
    if (modResult.flagged) {
      return res.status(400).json({ message: modResult.reason });
    }

    existing.commentbody = commentbody.trim();
    existing.isEdited = true;
    existing.editedAt = new Date();
    existing.language = detectLanguage(commentbody);

    await existing.save();
    return res.status(200).json(existing);
  } catch (error) {
    console.error("Edit comment error:", error);
    return res.status(500).json({ message: "Something went wrong updating comment" });
  }
};

export const toggleLikeComment = async (req, res) => {
  const { id: _id } = req.params;
  const { userId } = req.body;

  try {
    const targetComment = await comment.findById(_id);
    if (!targetComment) return res.status(404).json({ message: "Comment not found" });

    const likes = targetComment.likes || [];
    const dislikes = targetComment.dislikes || [];

    const hasLiked = likes.includes(userId);
    let updatedLikes = likes;
    let updatedDislikes = dislikes.filter((id) => id !== userId);

    if (hasLiked) {
      updatedLikes = likes.filter((id) => id !== userId);
    } else {
      updatedLikes.push(userId);
    }

    targetComment.likes = updatedLikes;
    targetComment.dislikes = updatedDislikes;
    await targetComment.save();

    return res.status(200).json(targetComment);
  } catch (error) {
    console.error("Like comment error:", error);
    return res.status(500).json({ message: "Error toggling like" });
  }
};

export const toggleDislikeComment = async (req, res) => {
  const { id: _id } = req.params;
  const { userId } = req.body;

  try {
    const targetComment = await comment.findById(_id);
    if (!targetComment) return res.status(404).json({ message: "Comment not found" });

    const likes = targetComment.likes || [];
    const dislikes = targetComment.dislikes || [];

    const hasDisliked = dislikes.includes(userId);
    let updatedDislikes = dislikes;
    let updatedLikes = likes.filter((id) => id !== userId);

    if (hasDisliked) {
      updatedDislikes = dislikes.filter((id) => id !== userId);
    } else {
      updatedDislikes.push(userId);
    }

    targetComment.likes = updatedLikes;
    targetComment.dislikes = updatedDislikes;
    await targetComment.save();

    return res.status(200).json(targetComment);
  } catch (error) {
    console.error("Dislike comment error:", error);
    return res.status(500).json({ message: "Error toggling dislike" });
  }
};

export const reportComment = async (req, res) => {
  const { id: _id } = req.params;
  const { userId, reason } = req.body;

  try {
    const targetComment = await comment.findById(_id);
    if (!targetComment) return res.status(404).json({ message: "Comment not found" });

    const existingReport = (targetComment.reports || []).find((r) => r.reportedBy === userId);
    if (existingReport) {
      return res.status(400).json({ message: "You have already reported this comment." });
    }

    targetComment.reports.push({ reportedBy: userId, reason, createdAt: new Date() });
    targetComment.isFlagged = true;
    await targetComment.save();

    return res.status(200).json({ message: "Comment reported for administrator review.", comment: targetComment });
  } catch (error) {
    console.error("Report comment error:", error);
    return res.status(500).json({ message: "Error reporting comment" });
  }
};

export const translateComment = async (req, res) => {
  const { text, targetLang = "en" } = req.body;
  try {
    const translated = translateText(text, targetLang);
    return res.status(200).json({ translatedText: translated, targetLang });
  } catch (error) {
    console.error("Translation error:", error);
    return res.status(500).json({ message: "Translation failed" });
  }
};

