# Security Specification: Hype Creator Studio 2.0

## 1. Data Invariants
- Each document in `projects`, `characters`, `stories`, `scenes`, `imageAssets`, `promptVersions`, and `generationJobs` must strictly belong to the authenticated owner (`ownerId == request.auth.uid`).
- The `users` collection contains private profile documents indexed by `{userId}`, accessible solely by that user (`request.auth.uid == userId`). Blanket list queries on `users` are strictly forbidden.
- Immutable Fields: `ownerId` and `createdAt` cannot be altered after creation.
- Strict Keys: Extra arbitrary ghost fields are rejected by validation helpers.
- Scalability & Guarding: All string fields have strict `.size()` constraints to prevent Denial of Wallet attacks.

## 2. Dirty Dozen Security Attack Payloads & Test Scenarios
1. **Ghost Field Poisoning**: Adding `__isAdmin: true` or `role: 'superadmin'` to a project payload. -> Must be rejected.
2. **Identity Spoofing**: Creating a project with `ownerId: "attacker_uid"` when authenticated as `victim_uid`. -> Must be rejected.
3. **Cross-Tenant List Scraping**: Querying `projects` without filtering by `ownerId == auth.uid`. -> Must be rejected by `resource.data.ownerId == request.auth.uid`.
4. **ID Buffer Overflow Attack**: Supplying an entity ID exceeding 128 characters or containing illegal path characters. -> Must be rejected by `isValidId()`.
5. **Timestamp Tampering**: Altering `createdAt` on update or injecting retroactive timestamps. -> Rejected by immutability guard.
6. **Orphan Scene Insertion**: Creating a scene with non-string or 2MB payload. -> Rejected by `isValidScene()`.
7. **PII Harvesting**: Reading another user's `/users/{otherUserId}` profile document. -> Rejected by `request.auth.uid == userId`.
8. **Unauthenticated Access**: Attempting read/write without valid Firebase authentication. -> Rejected by `isSignedIn()`.
9. **Status Short-Circuiting**: Setting invalid enum values outside the allowed set on projects or stories. -> Rejected by enum validation.
10. **Title Payload Flooding**: Sending a 50KB title in a project or character create request. -> Rejected by `data.title.size() <= 128`.
11. **Negative Scene Count Injection**: Providing negative number or malicious payload in `sceneCount`. -> Rejected by schema constraints.
12. **Owner Modification Attack**: Attempting to transfer ownership of a project or character via update. -> Rejected by `incoming().ownerId == existing().ownerId`.
