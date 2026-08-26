export class ScoreManager {
  private _score = 0;
  private _hits = 0;
  private _misses = 0;
  private _gameOver = false;

  get score(): number { return this._score; }
  get hits(): number { return this._hits; }
  get misses(): number { return this._misses; }

  addScore(wordLength: number): void {
    this._score += wordLength * 10;
    this._hits++;
  }

  deductScore(wordLength: number): void {
    this._misses++;
    this._score = Math.max(0, this._score - wordLength * 10);
    if (this._score === 0) this._gameOver = true;
  }

  isGameOver(): boolean {
    return this._gameOver;
  }

  getAccuracy(): number {
    const total = this._hits + this._misses;
    if (total === 0) return 0;
    return Math.round((this._hits / total) * 100);
  }

  reset(): void {
    this._score = 0;
    this._hits = 0;
    this._misses = 0;
    this._gameOver = false;
  }
}
