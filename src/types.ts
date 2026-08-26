export type GameState = 'menu' | 'levelSelect' | 'playing' | 'paused' | 'cleared' | 'failed';

export type WordLengthProfile = 'letters' | 'short' | 'medium' | 'mixed';

export interface FallingItem {
  id: string;
  text: string;
  x: number;         // center X on canvas
  y: number;         // top Y on canvas
  speed: number;     // px per second
  color: string;     // CSS color, e.g. '#ff6b6b'
  matchedIndex: number; // chars successfully matched so far
}

export interface LevelConfig {
  level: number;
  baseSpeed: number;          // px/s for newly spawned items
  spawnInterval: number;      // ms between spawn attempts
  maxOnScreen: number;        // max simultaneous falling items
  wordLengthProfile: WordLengthProfile;
  speedBoostInterval: number; // seconds between in-level speed boosts
}

export interface GameStats {
  score: number;
  hits: number;
  misses: number;
  level: number;
}
