export type TcgGameSlug =
  | "pokemon"
  | "yugioh"
  | "mtg"
  | "lorcana"
  | "swu"
  | "riftbound"
  | "digimon"
  | "onepiece";

export const TCG_GAMES: { slug: TcgGameSlug; name: string }[] = [
  { slug: "pokemon", name: "Pokemon" },
  { slug: "yugioh", name: "Yu-Gi-Oh" },
  { slug: "mtg", name: "Magic: The Gathering" },
  { slug: "lorcana", name: "Disney Lorcana" },
  { slug: "swu", name: "Star Wars Unlimited" },
  { slug: "riftbound", name: "Riftbound" },
  { slug: "digimon", name: "Digimon" },
  { slug: "onepiece", name: "One Piece" },
];

export function tcgGameName(slug: string): string {
  return TCG_GAMES.find((g) => g.slug === slug)?.name ?? slug;
}

export type ItemType = "single" | "set";

export function tcgCategory(game: TcgGameSlug, type: ItemType): string {
  return `tcg:${game}:${type}`;
}

export function legoCategory(type: ItemType): string {
  return `lego:${type}`;
}

export function isTcgGameCategory(cat: string, game: TcgGameSlug): boolean {
  return cat.startsWith(`tcg:${game}:`);
}

export function isLegoCategory(cat: string): boolean {
  return cat.startsWith("lego:");
}

export function isTcgCategory(cat: string): boolean {
  return cat.startsWith("tcg:");
}

export function categoryItemType(cat: string): ItemType | null {
  if (cat.endsWith(":set")) return "set";
  if (cat.endsWith(":single")) return "single";
  return null;
}

export type ItemNotes = {
  text?: string;
  cardNumber?: string;
  gradingService?: "Raw" | "PSA" | "BGS" | "CGC";
  grade?: string;
  quantity?: number;
  releaseYear?: number;
  sealed?: boolean;
  setNumber?: string;
  theme?: string;
  year?: number;
  status?: "Sealed" | "Built" | "Incomplete";
  minifigCount?: number;
  pieceCount?: number;
};

export function encodeNotes(n: ItemNotes): string {
  return JSON.stringify(n);
}

export function decodeNotes(raw: string | null | undefined): ItemNotes {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as ItemNotes;
    return { text: raw };
  } catch {
    return { text: raw };
  }
}

export const PAGE_SIZE = 24;

export type SortKey = "name" | "recent" | "value" | "condition" | "setNumber" | "theme";

const CONDITION_RANK: Record<string, number> = {
  mint: 0,
  near_mint: 1,
  excellent: 2,
  good: 3,
  fair: 4,
  poor: 5,
};

export function sortItems<
  T extends {
    name: string;
    createdAt?: string;
    currentValue?: number | null;
    condition?: string;
    notes?: string | null;
    brand?: string | null;
  },
>(items: T[], sort: SortKey): T[] {
  const arr = [...items];
  switch (sort) {
    case "name":
      arr.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "value":
      arr.sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0));
      break;
    case "condition":
      arr.sort(
        (a, b) =>
          (CONDITION_RANK[a.condition ?? ""] ?? 99) -
          (CONDITION_RANK[b.condition ?? ""] ?? 99),
      );
      break;
    case "setNumber":
      arr.sort((a, b) => {
        const an = decodeNotes(a.notes).setNumber ?? "";
        const bn = decodeNotes(b.notes).setNumber ?? "";
        return an.localeCompare(bn, undefined, { numeric: true });
      });
      break;
    case "theme":
      arr.sort((a, b) => {
        const at = decodeNotes(a.notes).theme ?? "";
        const bt = decodeNotes(b.notes).theme ?? "";
        return at.localeCompare(bt);
      });
      break;
    case "recent":
    default:
      arr.sort((a, b) => {
        const ad = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bd = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bd - ad;
      });
  }
  return arr;
}
