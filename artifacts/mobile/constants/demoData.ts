export type Category = "LEGO" | "TCG";
export type Condition = "Sealed" | "Mint" | "NM" | "LP" | "Played" | "Damaged" | "PSA 10" | "BGS 9.5";

export interface VaultItem {
  id: string;
  name: string;
  category: Category;
  gameOrTheme?: string;
  setNumber?: string;
  condition: Condition;
  purchasePrice: number;
  currentValue: number;
  changeAmount: number;
  changePct: number;
  dateAdded: string;
  imageUri?: string;
  notes?: string;
}

export const DUMMY_VAULT_ITEMS: VaultItem[] = [
  {
    id: "1",
    name: "Millennium Falcon",
    category: "LEGO",
    gameOrTheme: "Star Wars",
    setNumber: "75192",
    condition: "Sealed",
    purchasePrice: 799.99,
    currentValue: 850.0,
    changeAmount: 50.01,
    changePct: 6.25,
    dateAdded: "2023-10-15T08:00:00Z",
    notes: "Perfect box, stored away from sunlight.",
  },
  {
    id: "2",
    name: "Charizard",
    category: "TCG",
    gameOrTheme: "Pokemon Base Set",
    setNumber: "4/102",
    condition: "PSA 10",
    purchasePrice: 15000.0,
    currentValue: 18500.0,
    changeAmount: 3500.0,
    changePct: 23.33,
    dateAdded: "2022-04-20T14:30:00Z",
    notes: "Grail achieved.",
  },
  {
    id: "3",
    name: "Black Lotus",
    category: "TCG",
    gameOrTheme: "Magic: The Gathering",
    setNumber: "Alpha",
    condition: "NM",
    purchasePrice: 45000.0,
    currentValue: 50000.0,
    changeAmount: 5000.0,
    changePct: 11.11,
    dateAdded: "2021-11-10T10:15:00Z",
  },
  {
    id: "4",
    name: "Hogwarts Castle",
    category: "LEGO",
    gameOrTheme: "Harry Potter",
    setNumber: "71043",
    condition: "Sealed",
    purchasePrice: 399.99,
    currentValue: 450.0,
    changeAmount: 50.01,
    changePct: 12.5,
    dateAdded: "2023-01-05T09:45:00Z",
  },
  {
    id: "5",
    name: "Blue-Eyes White Dragon",
    category: "TCG",
    gameOrTheme: "Yu-Gi-Oh!",
    setNumber: "LOB-001",
    condition: "PSA 10",
    purchasePrice: 2000.0,
    currentValue: 2400.0,
    changeAmount: 400.0,
    changePct: 20.0,
    dateAdded: "2023-08-12T16:20:00Z",
  },
  {
    id: "6",
    name: "Rivendell",
    category: "LEGO",
    gameOrTheme: "Lord of the Rings",
    setNumber: "10316",
    condition: "Mint",
    purchasePrice: 499.99,
    currentValue: 499.99,
    changeAmount: 0.0,
    changePct: 0.0,
    dateAdded: "2023-12-25T11:00:00Z",
    notes: "Currently building.",
  },
  {
    id: "7",
    name: "Umbreon VMAX (Alternate Art)",
    category: "TCG",
    gameOrTheme: "Pokemon Evolving Skies",
    setNumber: "215/203",
    condition: "BGS 9.5",
    purchasePrice: 600.0,
    currentValue: 950.0,
    changeAmount: 350.0,
    changePct: 58.33,
    dateAdded: "2023-06-18T13:10:00Z",
  },
  {
    id: "8",
    name: "Titanic",
    category: "LEGO",
    gameOrTheme: "Icons",
    setNumber: "10294",
    condition: "Sealed",
    purchasePrice: 679.99,
    currentValue: 700.0,
    changeAmount: 20.01,
    changePct: 2.94,
    dateAdded: "2024-01-10T15:00:00Z",
  },
];

export interface ActivityEvent {
  id: string;
  type: "addition" | "price_update" | "grading";
  title: string;
  subtitle: string;
  date: string;
  valueChange?: number;
}

export const DUMMY_ACTIVITY: ActivityEvent[] = [
  {
    id: "a1",
    type: "price_update",
    title: "Portfolio Value Up",
    subtitle: "Charizard (4/102) increased by $500",
    date: "2024-05-15T10:00:00Z",
    valueChange: 500,
  },
  {
    id: "a2",
    type: "addition",
    title: "New Item Vaulted",
    subtitle: "Titanic (10294) was added to your vault.",
    date: "2024-01-10T15:00:00Z",
  },
  {
    id: "a3",
    type: "grading",
    title: "Grading Return",
    subtitle: "Umbreon VMAX returned as BGS 9.5",
    date: "2023-06-18T13:10:00Z",
  },
];

export interface CommunityPost {
  id: string;
  authorName: string;
  authorHandle: string;
  content: string;
  date: string;
  likes: number;
  comments: number;
  tags: string[];
}

export const DUMMY_POSTS: CommunityPost[] = [
  {
    id: "p1",
    authorName: "Seto Kaiba",
    authorHandle: "@kaibacorp",
    content: "Just picked up another PSA 10 Blue-Eyes. You can never have too many.",
    date: "2024-05-16T09:30:00Z",
    likes: 142,
    comments: 23,
    tags: ["TCG", "YuGiOh", "MailDay"],
  },
  {
    id: "p2",
    authorName: "BrickMaster",
    authorHandle: "@brickmaster99",
    content: "Finally completed the UCS Millennium Falcon build. It took 3 weeks but the display value is incredible.",
    date: "2024-05-15T18:45:00Z",
    likes: 89,
    comments: 12,
    tags: ["LEGO", "StarWars", "UCS"],
  },
  {
    id: "p3",
    authorName: "Ash K.",
    authorHandle: "@pallet_town",
    content: "Is Evolving Skies the best modern set? The alt arts are just built different.",
    date: "2024-05-14T11:20:00Z",
    likes: 256,
    comments: 84,
    tags: ["Pokemon", "EvolvingSkies", "Discussion"],
  },
];