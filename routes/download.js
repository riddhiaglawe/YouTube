import express from "express";
import {
  checkEligibility,
  requestDownload,
  getDownloadHistory,
  updateSubscription,
  deleteDownloadRecord,
} from "../controllers/download.js";

const router = express.Router();

router.post("/check-eligibility", checkEligibility);
router.post("/request", requestDownload);
router.get("/history/:userId", getDownloadHistory);
router.post("/update-subscription", updateSubscription);
router.delete("/record/:recordId", deleteDownloadRecord);

export default router;
