import express from "express";
import {
  deletecomment,
  getallcomment,
  postcomment,
  editcomment,
  toggleLikeComment,
  toggleDislikeComment,
  reportComment,
  translateComment,
} from "../controllers/comment.js";

const routes = express.Router();
routes.get("/:videoid", getallcomment);
routes.post("/postcomment", postcomment);
routes.delete("/deletecomment/:id", deletecomment);
routes.post("/editcomment/:id", editcomment);
routes.post("/like/:id", toggleLikeComment);
routes.post("/dislike/:id", toggleDislikeComment);
routes.post("/report/:id", reportComment);
routes.post("/translate", translateComment);

export default routes;

