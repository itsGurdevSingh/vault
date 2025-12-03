# ***Rotation System Redesign — Notes & Thought Process***

We need to implement a rollback system in our key-rotation flow.
This requires refactoring our initial rotation mechanism.

We now have **two phases**:

---

## **1. Initial Phase**

In this phase we perform all the changes required to rotate keys **in a rollback-friendly way**.

### Steps:

1. **Generate new key pair (public + private)**

   * This also creates metadata in the metadata origin folder.
   * Route: `keyManager → generator`.

2. **(Earlier idea) Set new key as active KID**

   * This would also set the current key as `prevActiveKid`.
   * Route: `keyManager → loader`.

3. **Generate archived metadata for the old KID**

   * This adds an `expiration` timestamp so the old public key can be deleted after TTL.
   * We keep public keys until all tokens signed by them expire.

At the end of this phase we have:

* new private key
* new public key
* new metadata
* archived + origin metadata for the old key

---

## **2. Success & Failure Phase**

### **Success flow:**

On success we must:

1. Delete **old private key** and its **origin metadata**, because we will not use them anymore.
2. Update the “use previous key” flag in Redis:
3. Start using the new private key for signing.
4. Switch Redis flag **before** deletion.
5. Then delete.

### **Failure flow:**

On failure we must roll back:

1. Store active KID in a variable (needed for rollback).
2. Set both `prevActive` and `active` keys to the **old KID** (restore previous state).
3. Turn **use-prev** flag ON in Redis so signing uses the old key.
4. Use the stored KID (the one for the failed rotation) and:

   * Delete its public key
   * Delete its private key
   * Delete its origin metadata
5. Delete the old key’s archived metadata to remove expiry (we revert it to normal).

---

## **Observation / Conclusion**

Setting the active key **during the initial phase** introduces complexity.
If we instead set the active key **only on success**, the process becomes simpler:

* It avoids the need for `prevActiveKey`.
* It avoids rollback issues caused by changing the active key too early.
* It reduces the window where inconsistent signing might happen.

Changing the active key is just a variable update, so doing it later is safer.

My conclusion:

### **Do NOT set active KID in the initial phase.

# Updated Key Rotation Flow (Final Plan)

## Core Decision
**Set active KID only in the success phase.**  
This reduces complexity and avoids unnecessary rollback logic.

---

## Initial Phase

1. **Create a new key pair**  
   - Generate the new public/private key pair.  
   - Save the new KID somewhere in the key manager as `upcomingKID` for rollback or for future activation.

2. **Create archive metadata for the current active KID**  
   - This adds TTL to the current key’s public metadata so the system can delete it later.

3. **Initial phase completed**  
   - At this stage, new key pair exists and old key has an archive meta with TTL.  
   - Active key has **not** changed yet.

4. **(Between these steps)**  
   - DB operations may run to set rotation policies.

---

## Success Phase

1. **Store the current active KID in `prevKID`**  
   - This lets us clean up later.

2. **Set `upcomingKID` as the new active KID**  
   - Key rotation officially switches to the new key here.

3. **Delete the previous key’s private key and origin metadata**  
   - These are no longer needed since we are now using the new key.

4. **Success phase completed**

---

## Failure Phase (Rollback)

If anything goes wrong in the success phase:

1. **Take the `upcomingKID` and delete its origin metadata**  
   - Remove public/private key and metadata for the new key that failed.

2. **Delete the archive metadata for the current active key**  
   - Prevents it from expiring prematurely since we did not rotate.

3. **Rollback completed**

---

## Handling Failures During Success Phase

- If we encounter a failure inside the success phase, we should attempt a retry.  
- If the failure still persists after retries, it indicates a critical issue.  
- We must notify the system (alerts + notifications).  
- This alerting system will be implemented later.

- On any conflict, we must run rollback and abort the Mongo transaction.

---
