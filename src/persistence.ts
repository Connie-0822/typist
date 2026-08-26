const KEY_LEVEL = 'typingGame_highestLevel';
const KEY_SCORE = 'typingGame_highestScore';

export function getHighestLevel(): number {
  return parseInt(localStorage.getItem(KEY_LEVEL) ?? '1', 10);
}

export function setHighestLevel(level: number): void {
  if (level > getHighestLevel()) localStorage.setItem(KEY_LEVEL, String(level));
}

export function getHighestScore(): number {
  return parseInt(localStorage.getItem(KEY_SCORE) ?? '0', 10);
}

export function setHighestScore(score: number): void {
  if (score > getHighestScore()) localStorage.setItem(KEY_SCORE, String(score));
}
