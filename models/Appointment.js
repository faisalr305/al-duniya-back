const mongoose = require("mongoose");

const AppointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    date: { type: Date, required: true },
    time: { type: String, required: true }, // e.g. "09:30"
    doctor: { type: String, required: true, trim: true },
    service: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Completed", "Cancelled", "No Show"],
      default: "Pending",
    },
    totalBill: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    amountDue: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Partial", "Paid"],
      default: "Unpaid",
    },
    notes: { type: String },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Auto-calculate amountDue before save
AppointmentSchema.pre("save", async function () {
  this.amountDue = Math.max(0, (this.totalBill || 0) - (this.amountPaid || 0));
  if (this.amountDue === 0 && this.amountPaid > 0) this.paymentStatus = "Paid";
  else if (this.amountPaid > 0) this.paymentStatus = "Partial";
  else this.paymentStatus = "Unpaid";
});

module.exports = mongoose.model("Appointment", AppointmentSchema);
