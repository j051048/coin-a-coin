export type IconType = 
  | 'BTC' | 'ETH' | 'USDT' | 'BNB' | 'SOL' 
  | 'XRP' | 'DOGE' | 'ADA' | 'AVAX' | 'SHIB' 
  | 'DOT' | 'TRX' | 'LINK' | 'MATIC' | 'UNI';

export interface TileData {
  id: string;
  type: IconType;
  x: number; // Grid X position (0-7 typically)
  y: number; // Grid Y position
  z: number; // Layer index (higher is on top)
  isClickable: boolean; // Computed property
}

export type GameState = 'menu' | 'playing' | 'won' | 'lost';

export interface LevelConfig {
  layerCount: number;
  totalTiles: number; // Must be divisible by 3
}

export interface SoundConfig {
  bgm: boolean;
  sfx: boolean;
}