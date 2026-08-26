import { describe, it, expect, beforeEach } from 'vitest';
import { WordManager } from './wordManager';

let wm: WordManager;
beforeEach(() => { wm = new WordManager(); });

describe('WordManager.spawn', () => {
  it('adds an item with correct text, x, speed, matchedIndex=0', () => {
    wm.spawn('cat', 100, 60);
    expect(wm.items).toHaveLength(1);
    expect(wm.items[0].text).toBe('cat');
    expect(wm.items[0].x).toBe(100);
    expect(wm.items[0].speed).toBe(60);
    expect(wm.items[0].matchedIndex).toBe(0);
  });

  it('assigns a non-empty color string', () => {
    wm.spawn('hi', 50, 60);
    expect(wm.items[0].color).toMatch(/^#/);
  });
});

describe('WordManager.update', () => {
  it('moves items downward by speed × deltaMs/1000', () => {
    wm.spawn('cat', 100, 60);
    wm.update(1000, 800); // 1s × 60 px/s = 60 px
    expect(wm.items[0].y).toBeCloseTo(60, 1);
  });

  it('removes and returns items that reach canvasHeight', () => {
    wm.spawn('cat', 100, 600);
    const landed = wm.update(2000, 800); // 2s × 600 = 1200 > 800
    expect(landed).toHaveLength(1);
    expect(landed[0].text).toBe('cat');
    expect(wm.items).toHaveLength(0);
  });

  it('returns empty array when nothing lands', () => {
    wm.spawn('cat', 100, 60);
    expect(wm.update(100, 800)).toHaveLength(0);
  });
});

describe('WordManager.tryMatch', () => {
  it('returns null when no item starts with the typed char', () => {
    wm.spawn('cat', 100, 60);
    expect(wm.tryMatch('z')).toBeNull();
    expect(wm.items[0].matchedIndex).toBe(0);
  });

  it('increments matchedIndex on correct first char', () => {
    wm.spawn('cat', 100, 60);
    expect(wm.tryMatch('c')).toBeNull();
    expect(wm.items[0].matchedIndex).toBe(1);
  });

  it('returns and removes item on full match', () => {
    wm.spawn('cat', 100, 60);
    wm.tryMatch('c');
    wm.tryMatch('a');
    const result = wm.tryMatch('t');
    expect(result).not.toBeNull();
    expect(result!.text).toBe('cat');
    expect(wm.items).toHaveLength(0);
  });

  it('ignores wrong char mid-match, keeps matchedIndex unchanged', () => {
    wm.spawn('cat', 100, 60);
    wm.tryMatch('c'); // matchedIndex → 1
    wm.tryMatch('z'); // wrong — must be ignored
    expect(wm.items[0].matchedIndex).toBe(1);
  });

  it('single-letter item is immediately removed on match', () => {
    wm.spawn('a', 100, 60);
    const result = wm.tryMatch('a');
    expect(result).not.toBeNull();
    expect(wm.items).toHaveLength(0);
  });

  it('prioritizes the item with the highest Y (most dangerous)', () => {
    wm.spawn('arc', 100, 60);  // items[0]
    wm.spawn('ant', 200, 60);  // items[1]
    wm.items[0].y = 100;
    wm.items[1].y = 500; // 'ant' is lower (more dangerous)
    wm.tryMatch('a');
    expect(wm.items[1].matchedIndex).toBe(1); // 'ant' matched
    expect(wm.items[0].matchedIndex).toBe(0);
  });

  it('continues matching active item even when another shares the first char', () => {
    wm.spawn('cat', 100, 60);
    wm.spawn('car', 200, 60);
    wm.items[0].y = 500; // 'cat' is lower
    wm.tryMatch('c'); // starts 'cat'
    wm.tryMatch('a');
    wm.tryMatch('t'); // completes 'cat'
    expect(wm.items).toHaveLength(1);
    expect(wm.items[0].text).toBe('car');
  });
});

describe('WordManager.currentInputDisplay', () => {
  it('returns empty string when no item is being matched', () => {
    wm.spawn('cat', 100, 60);
    expect(wm.currentInputDisplay).toBe('');
  });

  it('returns matched prefix of active item', () => {
    wm.spawn('cat', 100, 60);
    wm.tryMatch('c');
    wm.tryMatch('a');
    expect(wm.currentInputDisplay).toBe('ca');
  });
});

describe('WordManager.reset', () => {
  it('clears all items and active state', () => {
    wm.spawn('cat', 100, 60);
    wm.tryMatch('c');
    wm.reset();
    expect(wm.items).toHaveLength(0);
    expect(wm.currentInputDisplay).toBe('');
  });
});
