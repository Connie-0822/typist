import { describe, it, expect, afterEach } from 'vitest';
import { wordBank } from './wordBank';

afterEach(() => wordBank.resetBank());

describe('wordBank.getWord', () => {
  it('returns a single lowercase letter for profile "letters"', () => {
    for (let i = 0; i < 30; i++) {
      const w = wordBank.getWord('letters');
      expect(w).toHaveLength(1);
      expect(w).toMatch(/^[a-z]$/);
    }
  });

  it('returns words up to 4 chars for profile "short"', () => {
    for (let i = 0; i < 30; i++) {
      const w = wordBank.getWord('short');
      expect(w.length).toBeGreaterThanOrEqual(1);
      expect(w.length).toBeLessThanOrEqual(4);
    }
  });

  it('returns words up to 7 chars for profile "medium"', () => {
    for (let i = 0; i < 30; i++) {
      const w = wordBank.getWord('medium');
      expect(w.length).toBeGreaterThanOrEqual(2);
      expect(w.length).toBeLessThanOrEqual(7);
    }
  });

  it('returns variety of lengths for profile "mixed"', () => {
    const lengths = new Set<number>();
    for (let i = 0; i < 100; i++) lengths.add(wordBank.getWord('mixed').length);
    expect(lengths.size).toBeGreaterThan(3);
  });
});

describe('wordBank.loadCustomBank', () => {
  it('injects a custom short list that appears in results', () => {
    wordBank.loadCustomBank({ short: ['zap'] });
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) results.add(wordBank.getWord('short'));
    expect(results.has('zap')).toBe(true);
  });

  it('resetBank restores default word lists', () => {
    wordBank.loadCustomBank({ short: ['zap'] });
    wordBank.resetBank();
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) results.add(wordBank.getWord('short'));
    expect(results.has('zap')).toBe(false);
  });
});
