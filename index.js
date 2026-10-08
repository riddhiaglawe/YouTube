import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import downloadroutes from "./routes/download.js";
import paymentroutes from "./routes/payment.js";
dotenv.config();
const app = express();
import path from "path";
app.use(cors());
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use("/uploads", express.static(path.join("uploads")));
app.get("/", (req, res) => {
  res.send("You tube backend is working");
});
app.use(bodyParser.json());
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/download", downloadroutes);
app.use("/payment", paymentroutes);
import http from "http";
import { Server } from "socket.io";
import { setupMeetingSocket } from "./socket/meetingHandler.js";

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

setupMeetingSocket(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});

const DBURL = process.env.DB_URL || "mongodb://127.0.0.1:27017/youtube";
if (process.env.DB_URL || DBURL) {
  mongoose
    .connect(DBURL)
    .then(() => {
      console.log("Mongodb connected successfully");
    })
    .catch((error) => {
      console.warn("Mongodb connection warning:", error.message);
    });
} else {
  console.warn("DB_URL is not set. Running server without database connection.");
}

