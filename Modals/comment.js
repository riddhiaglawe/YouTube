import mongoose from "mongoose";

const commentschema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    commentbody: { type: String, required: true },
    usercommented: { type: String, required: true },
    userimage: { type: String, default: "https://github.com/shadcn.png" },
    userlocation: { type: String, default: "Mumbai, India" },
    language: { type: String, default: "en" },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comment",
      default: null,
    },
    mentions: [{ type: String }],
    likes: [{ type: String }], // Array of user IDs who liked
    dislikes: [{ type: String }], // Array of user IDs who disliked
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    isFlagged: { type: Boolean, default: false },
    reports: [
      {
        reportedBy: { type: String },
        reason: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    commentedon: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("comment", commentschema);

