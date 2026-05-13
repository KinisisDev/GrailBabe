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
  { slug: "mtg", name: "Magic" },
  { slug: "lorcana", name: "Lorcana" },
  { slug: "swu", name: "Star Wars" },
  { slug: "riftbound", name: "Riftbound" },
  { slug: "digimon", name: "Digimon" },
  { slug: "onepiece", name: "One Piece" },
];

export type ItemType = "single" | "set";

export function tcgCategory(game: TcgGameSlug, type: ItemType): string {
  return `tcg:${game}:${type}`;
}

export function legoCategory(type: ItemType): string {
  return `lego:${type}`;
}

export function sportsCategory(): string {
  return "sports";
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
