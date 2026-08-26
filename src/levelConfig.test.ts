import { describe, it, expect } from 'vitest';
import { getLevelConfig, computeNextConfig } from './levelConfig';

describe('getLevelConfig', () => {
  it('level 1 returns correct base values', () => {
    const cfg = getLevelConfig(1);
    expect(cfg.level).toBe(1);
    expect(cfg.baseSpeed).toBe(60);
    expect(cfg.spawnInterval).toBe(3000);
    expect(cfg.maxOnScreen).toBe(3);
    expect(cfg.wordLengthProfile).toBe('letters');
    expect(cfg.speedBoostInterval).toBe(18);
  });

  it('level 1 uses letters profile', () => {
    expect(getLevelConfig(1).wordLengthProfile).toBe('letters');
  });

  it('level 2 uses short profile', () => {
    expect(getLevelConfig(2).wordLengthProfile).toBe('short');
  });

  it('level 4 uses medium profile', () => {
    expect(getLevelConfig(4).wordLengthProfile).toBe('medium');
  });

  it('level 6 uses mixed profile', () => {
    expect(getLevelConfig(6).wordLengthProfile).toBe('mixed');
  });
});

describe('computeNextConfig', () => {
  it('increments level by 1', () => {
    expect(computeNextConfig(getLevelConfig(1)).level).toBe(2);
  });

  it('increases baseSpeed by 18% each level', () => {
    const next = computeNextConfig(getLevelConfig(1));
    expect(next.baseSpeed).toBeCloseTo(60 * 1.18, 5);
  });

  it('decreases spawnInterval by 200ms, floor at 400', () => {
    expect(computeNextConfig(getLevelConfig(1)).spawnInterval).toBe(2800);
    let cfg = getLevelConfig(1);
    for (let i = 0; i < 50; i++) cfg = computeNextConfig(cfg);
    expect(cfg.spawnInterval).toBeGreaterThanOrEqual(400);
  });

  it('increases maxOnScreen gradually, cap at 15', () => {
    expect(computeNextConfig(getLevelConfig(1)).maxOnScreen).toBe(3);
    let cfg = getLevelConfig(1);
    for (let i = 0; i < 30; i++) cfg = computeNextConfig(cfg);
    expect(cfg.maxOnScreen).toBeLessThanOrEqual(15);
  });

  it('decreases speedBoostInterval by 1, floor at 6', () => {
    expect(computeNextConfig(getLevelConfig(1)).speedBoostInterval).toBe(17);
    let cfg = getLevelConfig(1);
    for (let i = 0; i < 30; i++) cfg = computeNextConfig(cfg);
    expect(cfg.speedBoostInterval).toBeGreaterThanOrEqual(6);
  });
});
