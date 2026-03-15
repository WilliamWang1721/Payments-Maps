import type { CardAlbumCard } from "@/types/card-album";

const NETWORK_ALIAS_MAP: Array<{ aliases: string[]; network: string }> = [
  { aliases: ["visa"], network: "Visa" },
  { aliases: ["mastercard", "master card", "mc", "万事达"], network: "MasterCard" },
  { aliases: ["unionpay", "union pay", "银联"], network: "UnionPay" },
  { aliases: ["american express", "amex", "运通"], network: "American Express" },
  { aliases: ["discover"], network: "Discover" },
  { aliases: ["jcb"], network: "JCB" }
];

export interface SmartAddCardCandidate {
  id: string;
  issuer: string;
  title: string;
  bin: string;
  organization: string;
  groupName: string;
  description: string;
  scope: "public" | "personal";
}

export function normalizeCardOrganizationToNetwork(organization: string): string {
  const normalized = organization.trim().toLowerCase();
  const match = NETWORK_ALIAS_MAP.find((entry) => entry.aliases.some((alias) => normalized.includes(alias)));
  return match?.network || organization.trim();
}

export function buildSmartAddCardCandidate(card: CardAlbumCard): SmartAddCardCandidate {
  return {
    id: card.id,
    issuer: card.issuer,
    title: card.title,
    bin: card.bin,
    organization: card.organization,
    groupName: card.groupName,
    description: card.description,
    scope: card.scope
  };
}

function tokenizeQuery(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[\s,.;:()[\]{}'"`~!@#$%^&*+=<>/?|\\-]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function buildCardSearchText(card: SmartAddCardCandidate): string {
  return [card.issuer, card.title, card.bin, card.organization, card.groupName, card.description].join(" ").toLowerCase();
}

function scoreCardCandidate(query: string, tokens: string[], card: SmartAddCardCandidate): number {
  const combined = buildCardSearchText(card);
  let score = 0;

  if (combined.includes(query)) {
    score += 10;
  }

  if (query.includes(card.bin.toLowerCase())) {
    score += 10;
  }

  if (query.includes(card.issuer.toLowerCase())) {
    score += 6;
  }

  if (query.includes(card.title.toLowerCase())) {
    score += 8;
  }

  if (query.includes(card.groupName.toLowerCase())) {
    score += 5;
  }

  if (query.includes(card.organization.toLowerCase())) {
    score += 5;
  }

  tokens.forEach((token) => {
    if (combined.includes(token)) {
      score += token.length >= 4 ? 3 : 2;
    }
  });

  const network = normalizeCardOrganizationToNetwork(card.organization).toLowerCase();
  if (NETWORK_ALIAS_MAP.some((entry) => entry.network.toLowerCase() === network && entry.aliases.some((alias) => query.includes(alias)))) {
    score += 4;
  }

  if (card.scope === "personal") {
    score += 1;
  }

  return score;
}

export function searchSmartAddCardCandidates(query: string, cards: CardAlbumCard[], limit = 5): SmartAddCardCandidate[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const tokens = tokenizeQuery(normalizedQuery);

  return cards
    .map((card) => {
      const candidate = buildSmartAddCardCandidate(card);
      return {
        candidate,
        score: scoreCardCandidate(normalizedQuery, tokens, candidate)
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.candidate);
}
