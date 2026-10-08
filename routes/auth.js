import express from "express";
import {
  login,
  verifyOtp,
  updateprofile,
  getSecurityLogs,
  revokeTrustedDevice,
} from "../controllers/auth.js";

const routes = express.Router();

routes.post("/login", login);
routes.post("/verify-otp", verifyOtp);
routes.get("/security/:userId", getSecurityLogs);
routes.delete("/trusted-device/:userId/:deviceId", revokeTrustedDevice);
routes.patch("/update/:id", updateprofile);

export default routes;

