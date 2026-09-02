const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ["Cash", "Card", "Insurance", "Transfer", "Other"],
      default: "Cash",
    },
    notes: { type: String },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payment", PaymentSchema);
