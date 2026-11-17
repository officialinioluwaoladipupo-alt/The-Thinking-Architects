/**
 * Dirty Dozen Security Payload Verification Matrix
 * Maps each attack vector from security_spec.md to the Firestore security rule gate
 * that enforces PERMISSION_DENIED.
 */

export type SecurityTestCase = {
  id: number;
  name: string;
  collection:
    | "sessions"
    | "media"
    | "admins"
    | "subscribers"
    | "pitches"
    | "siteSettings"
    | "wrappedConfig";
  operation: "get" | "list" | "create" | "update" | "delete";
  actor: "unauthenticated" | "non-admin-verified" | "spoofed-unverified-admin" | "verified-admin";
  payload: Record<string, unknown>;
  expectedResult: "PERMISSION_DENIED";
  enforcedByGate: string;
};

export const dirtyDozenSecurityCases: SecurityTestCase[] = [
  {
    id: 1,
    name: "Unauthenticated Create Session",
    collection: "sessions",
    operation: "create",
    actor: "unauthenticated",
    payload: { title: "Unauthorized Session", published: true },
    expectedResult: "PERMISSION_DENIED",
    enforcedByGate: "isAdmin() requires request.auth != null",
  },
  {
    id: 2,
    name: "Non-Admin Signed-In Create Session",
    collection: "sessions",
    operation: "create",
    actor: "non-admin-verified",
    payload: { title: "Member Session", published: true },
    expectedResult: "PERMISSION_DENIED",
    enforcedByGate: "isAdmin() checks admins/{uid} or bootstrapped email",
  },
  {
    id: 3,
    name: "Unverified Admin Email Spoof",
    collection: "admins",
    operation: "get",
    actor: "spoofed-unverified-admin",
    payload: {},
    expectedResult: "PERMISSION_DENIED",
    enforcedByGate: "request.auth.token.email_verified == true",
  },
  {
    id: 4,
    name: "Draft Data Scraping via Unfiltered List",
    collection: "sessions",
    operation: "list",
    actor: "unauthenticated",
    payload: { query: "all" },
    expectedResult: "PERMISSION_DENIED",
    enforcedByGate: "allow list: if resource.data.published == true || isAdmin()",
  },
  {
    id: 5,
    name: "Direct Read of Unpublished Draft",
    collection: "media",
    operation: "get",
    actor: "non-admin-verified",
    payload: { published: false },
    expectedResult: "PERMISSION_DENIED",
    enforcedByGate: "allow get: if isValidId(mediaId) && (existing().published == true || isAdmin())",
  },
  {
    id: 6,
    name: "Shadow Ghost Field Injection",
    collection: "sessions",
    operation: "create",
    actor: "verified-admin",
    payload: { title: "Valid Title", ghostOverride: true },
    expectedResult: "PERMISSION_DENIED",
    enforcedByGate: "data.keys().hasOnly([...allowedKeys])",
  },
  {
    id: 7,
    name: "Ownership Spoofing on Create",
    collection: "media",
    operation: "create",
    actor: "verified-admin",
    payload: { createdBy: "different-uid-999" },
    expectedResult: "PERMISSION_DENIED",
    enforcedByGate: "incoming().createdBy == request.auth.uid",
  },
  {
    id: 8,
    name: "Immutable Audit Field Tampering on Update",
    collection: "sessions",
    operation: "update",
    actor: "verified-admin",
    payload: { createdBy: "tampered-uid", createdAt: "2020-01-01T00:00:00Z" },
    expectedResult: "PERMISSION_DENIED",
    enforcedByGate: "incoming().createdBy == existing().createdBy && incoming().createdAt == existing().createdAt",
  },
  {
    id: 9,
    name: "Client Timestamp Forgery",
    collection: "sessions",
    operation: "create",
    actor: "verified-admin",
    payload: { createdAt: "2020-01-01T00:00:00Z", updatedAt: "2020-01-01T00:00:00Z" },
    expectedResult: "PERMISSION_DENIED",
    enforcedByGate: "incoming().createdAt == request.time && incoming().updatedAt == request.time",
  },
  {
    id: 10,
    name: "Oversized Title / Array Exhaustion",
    collection: "sessions",
    operation: "create",
    actor: "verified-admin",
    payload: { title: "x".repeat(5000), topics: Array.from({ length: 20 }, (_, i) => `t${i}`) },
    expectedResult: "PERMISSION_DENIED",
    enforcedByGate: "data.title.size() <= 140 && data.topics.size() <= 6",
  },
  {
    id: 11,
    name: "Javascript URI Injection in mediaUrl or siteSettings",
    collection: "siteSettings",
    operation: "update",
    actor: "verified-admin",
    payload: { instagramUrl: "javascript:alert(1)" },
    expectedResult: "PERMISSION_DENIED",
    enforcedByGate: "data.instagramUrl.matches('^(https://.*)?$')",
  },
  {
    id: 12,
    name: "Subscriber PII Scraping by Non-Admin",
    collection: "subscribers",
    operation: "list",
    actor: "non-admin-verified",
    payload: { query: "all" },
    expectedResult: "PERMISSION_DENIED",
    enforcedByGate: "allow get, list: if isAdmin()",
  },
  {
    id: 13,
    name: "Non-Admin Overwrite of Wrapped Configuration",
    collection: "wrappedConfig",
    operation: "update",
    actor: "non-admin-verified",
    payload: { enabled: false },
    expectedResult: "PERMISSION_DENIED",
    enforcedByGate: "isAdmin() && (configId == 'public' || configId.matches('^year-[0-9]{4}$'))",
  },
  {
    id: 14,
    name: "Wrapped Arbitrary Document ID Poisoning",
    collection: "wrappedConfig",
    operation: "create",
    actor: "verified-admin",
    payload: { configId: "private-draft", enabled: true },
    expectedResult: "PERMISSION_DENIED",
    enforcedByGate: "configId == 'public' || configId.matches('^year-[0-9]{4}$')",
  },
  {
    id: 15,
    name: "Pitch PII Scraping by Non-Admin",
    collection: "pitches",
    operation: "list",
    actor: "unauthenticated",
    payload: { query: "all" },
    expectedResult: "PERMISSION_DENIED",
    enforcedByGate: "allow get, list: if isAdmin()",
  },
  {
    id: 16,
    name: "Public Pitch Status Escalation",
    collection: "pitches",
    operation: "create",
    actor: "unauthenticated",
    payload: { topicTitle: "Hack Status", status: "scheduled" },
    expectedResult: "PERMISSION_DENIED",
    enforcedByGate: "incoming().status == 'new'",
  },
  {
    id: 17,
    name: "Session Resource Link Javascript URI Injection",
    collection: "sessions",
    operation: "update",
    actor: "verified-admin",
    payload: { resources: [{ label: "Template", url: "javascript:alert(1)" }] },
    expectedResult: "PERMISSION_DENIED",
    enforcedByGate: "isValidResourceItem enforces item.url.matches('^https://.*')",
  },
];
