import type { FirestoreMediaRecord, FirestoreSessionRecord } from "./firebaseContent";

export const DISCOVERY_TOPICS = [
  "All",
  "Registration",
  "Studio Practice",
  "Portfolio",
  "Working Abroad",
  "Early Career",
] as const;

export type DiscoveryTopic = (typeof DISCOVERY_TOPICS)[number];

const TOPIC_KEYWORDS: Record<Exclude<DiscoveryTopic, "All">, string[]> = {
  Registration: [
    "arcon",
    "nia",
    "licens",
    "regist",
    "logbook",
    "charter",
    "professional practice",
    "pathway to practice",
    "accredit",
  ],
  "Studio Practice": [
    "studio",
    "firm",
    "practice",
    "client",
    "business",
    "project",
    "principal",
    "broke me",
    "management",
    "resilient",
  ],
  Portfolio: [
    "portfolio",
    "cv",
    "interview",
    "application",
    "building your name",
    "personal brand",
    "before you build",
    "presentation",
    "critique",
  ],
  "Working Abroad": [
    "abroad",
    "diaspora",
    "international",
    "uk",
    "riba",
    "canada",
    "united states",
    "global",
    "remote",
    "transitioning",
  ],
  "Early Career": [
    "graduate",
    "student",
    "school",
    "early career",
    "early-career",
    "first job",
    "nysc",
    "siwes",
    "young architect",
    "career-proofing",
  ],
};

export function matchesDiscoveryTopic(textParts: string[], topic: DiscoveryTopic): boolean {
  if (topic === "All") return true;
  const corpus = textParts.join(" ").toLowerCase();
  const keywords = TOPIC_KEYWORDS[topic];
  return keywords.some((kw) => corpus.includes(kw));
}

export function matchesSearchQuery(textParts: string[], rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const terms = q.split(/\s+/).filter(Boolean);
  const corpus = textParts.join(" ").toLowerCase();
  return terms.every((term) => corpus.includes(term));
}

export type SpeakerDirectoryEntry = {
  key: string;
  name: string;
  role: string;
  count: number;
};

const GENERIC_SPEAKERS = new Set([
  "the thinking architects",
  "tta",
  "guest speaker",
  "panel",
  "",
]);

export function splitSpeakerNames(rawSpeaker: string): string[] {
  const cleaned = rawSpeaker.trim();
  if (!cleaned) return [];
  // Keep comma/and separated multi-panelists distinct only when clearly paired by " & " or " and "
  return cleaned
    .split(/\s+(?:and|&)\s+/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && !GENERIC_SPEAKERS.has(part.toLowerCase()));
}

export function buildSpeakerDirectory(
  sessions: FirestoreSessionRecord[],
  media: FirestoreMediaRecord[] = [],
): SpeakerDirectoryEntry[] {
  const byKey = new Map<string, SpeakerDirectoryEntry>();

  const register = (speakerRaw: string, roleRaw: string) => {
    const names = splitSpeakerNames(speakerRaw);
    for (const name of names) {
      const key = name.toLowerCase();
      const existing = byKey.get(key);
      if (existing) {
        existing.count += 1;
        if (!existing.role && roleRaw.trim()) {
          existing.role = roleRaw.trim();
        }
      } else {
        byKey.set(key, {
          key,
          name,
          role: roleRaw.trim(),
          count: 1,
        });
      }
    }
  };

  for (const s of sessions) {
    register(s.speaker, s.speakerRole);
  }
  for (const m of media) {
    register(m.speaker, m.sessionRef);
  }

  return Array.from(byKey.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });
}

export function speakerMatchesFilter(rawSpeaker: string, speakerKey: string): boolean {
  if (!speakerKey) return true;
  const names = splitSpeakerNames(rawSpeaker);
  return names.some((n) => n.toLowerCase() === speakerKey);
}
