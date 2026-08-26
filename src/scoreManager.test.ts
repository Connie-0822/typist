import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreManager } from './scoreManager';

let sm: ScoreManager;
beforeEach(() => { sm = new ScoreManager(); });

describe('ScoreManager', () => {
  it('starts at score 0, hits 0, misses 0', () => {
    expect(sm.score).toBe(0);
    expect(sm.hits).toBe(0);
    expect(sm.misses).toBe(0);
  });

  it('addScore adds word.length × 10 and increments hits', () => {
    sm.addScore(4);
    expect(sm.score).toBe(40);
    expect(sm.hits).toBe(1);
  });

  it('deductScore subtracts word.length × 10 and increments misses', () => {
    sm.addScore(5);    // +50
    sm.deductScore(3); // -30
    expect(sm.score).toBe(20);
    expect(sm.misses).toBe(1);
  });

  it('score is floored at 0 when deduction exceeds current score', () => {
    sm.deductScore(10); // 0 - 100 → floor at 0
    expect(sm.score).toBe(0);
  });

  it('isGameOver returns false initially', () => {
    expect(sm.isGameOver()).toBe(false);
  });

  it('isGameOver returns true after score reaches 0 via deduction', () => {
    sm.deductScore(5);
    expect(sm.isGameOver()).toBe(true);
  });

  it('isGameOver stays false when score stays above 0', () => {
    sm.addScore(10);
    sm.deductScore(3);
    expect(sm.isGameOver()).toBe(false);
  });

  it('getAccuracy returns 0 when no hits or misses', () => {
    expect(sm.getAccuracy()).toBe(0);
  });

  it('getAccuracy returns 100 when only hits', () => {
    sm.addScore(3);
    expect(sm.getAccuracy()).toBe(100);
  });

  it('getAccuracy returns 50 for 1 hit and 1 miss', () => {
    sm.addScore(3);
    sm.deductScore(3);
    expect(sm.getAccuracy()).toBe(50);
  });

  it('reset clears score, hits, misses, and game-over flag', () => {
    sm.addScore(5);
    sm.deductScore(10);
    sm.reset();
    expect(sm.score).toBe(0);
    expect(sm.hits).toBe(0);
    expect(sm.misses).toBe(0);
    expect(sm.isGameOver()).toBe(false);
  });
});
