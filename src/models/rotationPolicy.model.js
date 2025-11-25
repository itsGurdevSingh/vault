import mongoose from "mongoose";

const rotationPolicySchema = new mongoose.Schema({
    domain: { type: String, required: true, unique: true },

    // rotation frequency in days
    rotationInterval: { 
        type: Number, 
        required: true,
        enum: [1, 7, 30, 90, 180, 365] 
    },

    // last rotation moment
    rotatedAt: { type: Date, default: Date.now },

    // next scheduled rotation
    nextRotationAt: { type: Date, required: true },

    // allow disabling rotation per domain
    enabled: { type: Boolean, default: true },

    // admin-defined comment (optional)
    note: { type: String, default: "" }

}, { timestamps: true });

export const RotationPolicy = mongoose.model("RotationPolicy", rotationPolicySchema);
