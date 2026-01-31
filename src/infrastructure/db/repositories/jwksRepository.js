import { JWKModel } from "./models/jwk.model.js";

class JWKSRepository {
  /**
   * Create or overwrite a JWK for a kid
   * Public keys are immutable by intent, but overwrite is safe on rebuild
   */
  async create(jwk) {
    const { kid } = jwk;

    return JWKModel.findOneAndUpdate(
      { kid },
      { $set: jwk },
      {
        upsert: true,
        new: true
      }
    );
  }

  /**
   * Find a single JWK by kid
   */
  async find(kid) {
    return JWKModel.findOne({ kid }).lean();
  }

  /**
   * Delete a JWK by kid (used by janitor for data consistency)
   */
  async delete(kid) {
    return JWKModel.deleteOne({ kid });
  }
}

export const jwksRepository = new JWKSRepository();
