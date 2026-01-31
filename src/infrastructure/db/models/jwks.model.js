import mongoose from "mongoose";

const jwkSchema = new mongoose.Schema(
  {
    // -------- Identity --------
    domain: {
      type: String,
      required: true,
      index: true
    },

    kid: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    // -------- JWK Core --------
    kty: {
      type: String,
      required: true // "RSA"
    },

    n: {
      type: String,
      required: true
    },

    e: {
      type: String,
      required: true
    },

    // -------- JWK Metadata --------
    use: {
      type: String,
      enum: ["sig"],
      required: true
    },

    alg: {
      type: String,
      required: true // "RS256"
    },

    key_ops: {
      type: [String],
      default: ["verify"]
    },

    // -------- Lifecycle --------
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true
    },

    // Optional: helps GC / rebuild logic
    source: {
      type: String,
      enum: ["CRYPTO_REBUILD", "FS_LOAD"],
      default: "CRYPTO_REBUILD"
    }
  },
  {
    versionKey: false
  }
);

// Prevent duplicate keys per domain
jwkSchema.index({ domain: 1, kid: 1 });

export const JWKModel = mongoose.model("JWK", jwkSchema);
