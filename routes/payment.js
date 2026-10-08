import express from "express";
import {
  createOrder,
  verifyPayment,
  getBillingHistory,
  cancelSubscription,
} from "../controllers/payment.js";

const router = express.Router();

router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);
router.get("/billing-history/:userId", getBillingHistory);
router.post("/cancel-subscription", cancelSubscription);

export default router;
