const SAVE_KEY = "mooncraft_save";

export interface SaveData {
  scene: string;
  playerX: number;
  playerY: number;
  level: number;
  xp: number;
  health: number;
  maxHealth: number;
  deadMonsters: string[];
}

const DEFAULT_SAVE: SaveData = {
  scene: "moon-scene",
  playerX: 49,
  playerY: 51,
  level: 1,
  xp: 0,
  health: 100,
  maxHealth: 100,
  deadMonsters: [],
};

export function loadGame(): SaveData | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}

export function saveGame(data: SaveData): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function getDefaultSave(): SaveData {
  return { ...DEFAULT_SAVE };
}
