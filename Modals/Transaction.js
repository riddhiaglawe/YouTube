import mongoose from "mongoose";

const transactionSchema = mongoose.Schema(
  {
    userId: { type: String, required: true },
    paymentId: { type: String, required: true },
    orderId: { type: String, required: true },
    invoiceNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    plan: {
      type: String,
      enum: ["free", "bronze", "silver", "gold"],
      required: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "quarterly", "yearly"],
      default: "monthly",
    },
    status: {
      type: String,
      enum: ["success", "failed", "cancelled", "pending"],
      default: "success",
    },
    paymentMethod: { type: String, default: "Razorpay Test Gateway" },
    startDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    receiptEmail: { type: String, default: "" },
    rawDetails: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);
