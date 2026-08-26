import type { LevelConfig, WordLengthProfile } from './types';

function profileForLevel(level: number): WordLengthProfile {
  if (level <= 1) return 'letters';
  if (level <= 3) return 'short';
  if (level <= 5) return 'medium';
  return 'mixed';
}

export function getLevelConfig(level: number): LevelConfig {
  return {
    level,
    baseSpeed:          60 * Math.pow(1.18, level - 1),
    spawnInterval:      Math.max(400, 3000 - (level - 1) * 200),
    maxOnScreen:        Math.min(15, 3 + Math.floor((level - 1) * 0.8)),
    wordLengthProfile:  profileForLevel(level),
    speedBoostInterval: Math.max(6, 18 - (level - 1)),
  };
}

export function computeNextConfig(current: LevelConfig): LevelConfig {
  return getLevelConfig(current.level + 1);
}
