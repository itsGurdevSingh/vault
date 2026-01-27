import mongoose from "mongoose";

const garbageSetSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    garbageSet: {
      privateKeys: { type: [String], default: [] },
      publicKeys: { type: [String], default: [] },
      originMeta: { type: [String], default: [] },
      archivedMeta: { type: [String], default: [] }
    },

    status: {
      type: String,
      enum: ["PENDING", "CLEANING", "CLEANED", "CRITICAL"],
      default: "PENDING",
      index: true
    },

    retries: {
      type: Number,
      default: 0
    },

    lastError: {
      type: String,
      default: null
    },

    // optional but very useful
    snapshotHash: {
      type: String,
      index: true
    }
  },
  { timestamps: true }
);

export const GarbageRecordModel = mongoose.model("GarbageRecord", garbageSetSchema);
