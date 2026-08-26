import type { FallingItem } from './types';

const COLORS = ['#ff6b6b', '#ffd700', '#6bffb8', '#6bb5ff', '#ff6bde', '#ffb86b'];
let _idCounter = 0;

export class WordManager {
  private _items: FallingItem[] = [];
  private _activeId: string | null = null;

  get items(): FallingItem[] {
    return this._items;
  }

  get currentInputDisplay(): string {
    if (this._activeId === null) return '';
    const active = this._items.find(i => i.id === this._activeId);
    return active ? active.text.slice(0, active.matchedIndex) : '';
  }

  // The next character the player needs to press
  get nextChar(): string | null {
    if (this._activeId !== null) {
      const active = this._items.find(i => i.id === this._activeId);
      if (active) return active.text[active.matchedIndex] ?? null;
    }
    // Highlight first char of the lowest (most dangerous) unstarted word
    const candidates = this._items.filter(i => i.matchedIndex === 0);
    if (candidates.length === 0) return null;
    const lowest = candidates.reduce((a, b) => (a.y > b.y ? a : b));
    return lowest.text[0] ?? null;
  }

  spawn(text: string, x: number, speed: number): void {
    this._items.push({
      id: String(_idCounter++),
      text,
      x,
      y: 0,
      speed,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      matchedIndex: 0,
    });
  }

  update(deltaMs: number, canvasHeight: number): FallingItem[] {
    const dt = deltaMs / 1000;
    const landed: FallingItem[] = [];
    this._items = this._items.filter(item => {
      item.y += item.speed * dt;
      if (item.y >= canvasHeight) {
        if (this._activeId === item.id) this._activeId = null;
        landed.push(item);
        return false;
      }
      return true;
    });
    return landed;
  }

  tryMatch(char: string): FallingItem | null {
    // Continue active item if one is in progress
    if (this._activeId !== null) {
      const active = this._items.find(i => i.id === this._activeId);
      if (active) {
        if (active.text[active.matchedIndex] === char) {
          active.matchedIndex++;
          if (active.matchedIndex === active.text.length) {
            this._items = this._items.filter(i => i.id !== active.id);
            this._activeId = null;
            return active;
          }
        }
        // wrong char: ignore
        return null;
      }
      this._activeId = null;
    }

    // Find most dangerous item whose first char matches (highest Y = most dangerous)
    const candidates = this._items
      .filter(i => i.text[0] === char)
      .sort((a, b) => b.y - a.y);

    if (candidates.length === 0) return null;

    const target = candidates[0];
    target.matchedIndex = 1;

    if (target.text.length === 1) {
      this._items = this._items.filter(i => i.id !== target.id);
      return target;
    }

    this._activeId = target.id;
    return null;
  }

  reset(): void {
    this._items = [];
    this._activeId = null;
  }
}
