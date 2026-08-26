# 打字练习游戏 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based typing game where colorful letters/words fall from the top and players type them before landing, with infinite difficulty-escalating levels.

**Architecture:** Single HTML page with HTML/CSS overlay divs for menus and a full-screen Canvas for gameplay. All game state lives in `GameLoop`, which coordinates `WordManager`, `ScoreManager`, `Renderer`, `AudioManager`, and `InputHandler`. Pure-logic modules are unit-tested with Vitest; Canvas/DOM modules are tested manually in the browser.

**Tech Stack:** Vite 5, TypeScript 5 (strict), Vitest 1, HTML5 Canvas API, Web Audio API

## Global Constraints

- Node.js 18+ required
- All source files under `src/` with `.ts` extension
- Canvas is resized to `window.innerWidth × window.innerHeight` on init and resize
- Level duration: 120 seconds per level
- Scoring: hit = `word.length × 10` pts; miss = `word.length × 10` pts deducted
- Score floor is 0; hitting 0 via deduction triggers immediate level failure
- Wrong character typed: ignore input, keep current match state (do NOT reset)
- Pause: `Ctrl+P` pauses, `Ctrl+S` resumes; both must call `event.preventDefault()`
- localStorage keys: `typingGame_highestLevel`, `typingGame_highestScore`
- Speed boosts within a level: every `speedBoostInterval` seconds, ×1.1 speed, max 3 times

---

## File Map

| File | Responsibility |
|------|----------------|
| `index.html` | Entry point; HTML overlay screens (menu, levelSelect, cleared, failed) |
| `style.css` | Screen layouts, button styles, overlay typography |
| `src/types.ts` | All shared TypeScript interfaces and type aliases |
| `src/wordBank.ts` | Built-in word lists, `getWord(profile)`, `loadCustomBank()`, `resetBank()` |
| `src/levelConfig.ts` | `getLevelConfig(n)` and `computeNextConfig(current)` |
| `src/scoreManager.ts` | Score, hits, misses, game-over flag |
| `src/wordManager.ts` | Spawn, fall physics, prefix-match input logic, `currentInputDisplay` |
| `src/audio.ts` | AudioContext sound synthesis (hit + miss) |
| `src/renderer.ts` | Canvas: background, word bubbles, particles, HUD, pause overlay |
| `src/inputHandler.ts` | `keydown` listener; delegates chars, Ctrl+P, Ctrl+S |
| `src/gameLoop.ts` | Master RAF loop; timer; spawning; speed boosts; level-end callbacks |
| `src/persistence.ts` | `localStorage` read/write helpers |
| `src/main.ts` | Screen routing; wires all modules; handles menu/level-select/result UI |
| `src/wordBank.test.ts` | Vitest unit tests for WordBank |
| `src/levelConfig.test.ts` | Vitest unit tests for getLevelConfig / computeNextConfig |
| `src/scoreManager.test.ts` | Vitest unit tests for ScoreManager |
| `src/wordManager.test.ts` | Vitest unit tests for WordManager pure logic |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `style.css`
- Create: `src/main.ts`

**Interfaces:**
- Produces: `npm run dev` (Vite dev server), `npm test` (Vitest runner)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "typing-game",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.5.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "lib": ["ES2020", "DOM"],
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 4: Create index.html**

```html
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>打字练习游戏</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <!-- Menu Screen -->
  <div id="screen-menu" class="screen active">
    <h1 class="game-title">⌨️ 打字闯关</h1>
    <div id="high-score-display" class="high-score"></div>
    <button id="btn-start">开始游戏</button>
  </div>

  <!-- Level Select Screen -->
  <div id="screen-level-select" class="screen">
    <h2>选择起始关卡</h2>
    <div id="level-grid" class="level-grid"></div>
    <button id="btn-back-menu">← 返回</button>
  </div>

  <!-- Game Screen -->
  <div id="screen-game" class="screen">
    <canvas id="game-canvas"></canvas>
  </div>

  <!-- Cleared Screen -->
  <div id="screen-cleared" class="screen">
    <h2 class="cleared-title">🎉 通关！</h2>
    <div id="cleared-stats" class="stats"></div>
    <button id="btn-next-level">下一关 →</button>
  </div>

  <!-- Failed Screen -->
  <div id="screen-failed" class="screen">
    <h2 class="failed-title">💀 关卡失败</h2>
    <div id="failed-stats" class="stats"></div>
    <button id="btn-retry">从头再来</button>
    <button id="btn-back-menu-2">返回主菜单</button>
  </div>

  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 5: Create style.css**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #1a0533;
  color: #fff;
  font-family: 'Segoe UI', sans-serif;
  overflow: hidden;
  width: 100vw;
  height: 100vh;
}

.screen {
  display: none;
  position: absolute;
  inset: 0;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 20px;
}

.screen.active { display: flex; }

.game-title {
  font-size: 3rem;
  color: #ffd700;
  text-shadow: 0 0 20px #ff6b6b;
  margin-bottom: 20px;
}

button {
  padding: 12px 32px;
  font-size: 1.2rem;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff6b6b, #ffd700);
  color: #1a0533;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.1s;
}

button:hover { transform: scale(1.05); }

.high-score { font-size: 1rem; color: #aaa; }

.level-grid {
  display: grid;
  grid-template-columns: repeat(5, 64px);
  gap: 10px;
  max-height: 60vh;
  overflow-y: auto;
}

.level-btn {
  width: 64px;
  height: 64px;
  padding: 0;
  font-size: 1rem;
  border-radius: 8px;
}

.stats { font-size: 1.1rem; line-height: 2; text-align: center; }
.cleared-title { color: #ffd700; font-size: 2.5rem; }
.failed-title { color: #ff4444; font-size: 2.5rem; }

#game-canvas { width: 100vw; height: 100vh; display: block; }
```

- [ ] **Step 6: Create src/main.ts (stub)**

```typescript
// Wired in Task 12
export {};
```

- [ ] **Step 7: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, no errors.

- [ ] **Step 8: Verify dev server starts**

Run: `npm run dev`
Expected: `Local: http://localhost:5173/` — browser shows purple page with "⌨️ 打字闯关" title and "开始游戏" button.

- [ ] **Step 9: Commit**

```bash
git init
git add .
git commit -m "feat: project scaffolding — Vite + TypeScript + Vitest"
```

---

### Task 2: Core Types

**Files:**
- Create: `src/types.ts`

**Interfaces:**
- Produces: all shared types used by every other module

- [ ] **Step 1: Create src/types.ts**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

### Task 3: WordBank

**Files:**
- Create: `src/wordBank.ts`
- Create: `src/wordBank.test.ts`

**Interfaces:**
- Consumes: `WordLengthProfile` from `./types`
- Produces:
  - `wordBank.getWord(profile: WordLengthProfile): string`
  - `wordBank.loadCustomBank(bank: Partial<WordBankData>): void`
  - `wordBank.resetBank(): void`

- [ ] **Step 1: Write failing tests**

Create `src/wordBank.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — "Cannot find module './wordBank'"

- [ ] **Step 3: Implement src/wordBank.ts**

```typescript
import type { WordLengthProfile } from './types';

export interface WordBankData {
  letters: string[];
  short: string[];
  medium: string[];
  long: string[];
}

const DEFAULT_BANK: WordBankData = {
  letters: 'abcdefghijklmnopqrstuvwxyz'.split(''),
  short: [
    'cat', 'dog', 'run', 'big', 'fox', 'cup', 'hat', 'map', 'sun', 'top',
    'box', 'jam', 'pen', 'red', 'zip', 'ace', 'bag', 'cab', 'dip', 'elk',
    'fun', 'gem', 'hit', 'ice', 'jab', 'key', 'lip', 'mix', 'nap', 'oak',
  ],
  medium: [
    'apple', 'brave', 'cloud', 'dance', 'eagle', 'flame', 'globe', 'happy',
    'index', 'jolly', 'knock', 'lemon', 'magic', 'night', 'ocean', 'piano',
    'queen', 'river', 'storm', 'tiger', 'ultra', 'vivid', 'witch', 'xenon',
    'yield', 'zebra', 'blaze', 'crisp', 'drown', 'erupt',
  ],
  long: [
    'abandon', 'cabinet', 'diamond', 'example', 'factory', 'gravity',
    'habitat', 'imagine', 'justice', 'kitchen', 'language', 'machine',
    'network', 'obvious', 'package', 'quality', 'rainbow', 'science',
    'thunder', 'umbrella', 'vampire', 'whisper', 'xylophone', 'youthful',
    'absolute', 'bacteria', 'calendar', 'daughter', 'electric', 'frontier',
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let _bank: WordBankData = { ...DEFAULT_BANK };

function getWord(profile: WordLengthProfile): string {
  switch (profile) {
    case 'letters':
      return pick(_bank.letters);
    case 'short': {
      const pool = [..._bank.letters, ..._bank.letters, ..._bank.short, ..._bank.short, ..._bank.short];
      return pick(pool);
    }
    case 'medium': {
      const pool = [..._bank.short, ..._bank.medium, ..._bank.medium];
      return pick(pool);
    }
    case 'mixed': {
      const pool = [..._bank.short, ..._bank.medium, ..._bank.long];
      return pick(pool);
    }
  }
}

function loadCustomBank(override: Partial<WordBankData>): void {
  _bank = {
    letters: override.letters ?? DEFAULT_BANK.letters,
    short:   override.short   ?? DEFAULT_BANK.short,
    medium:  override.medium  ?? DEFAULT_BANK.medium,
    long:    override.long    ?? DEFAULT_BANK.long,
  };
}

function resetBank(): void {
  _bank = { ...DEFAULT_BANK };
}

export const wordBank = { getWord, loadCustomBank, resetBank };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all 6 wordBank tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/wordBank.ts src/wordBank.test.ts
git commit -m "feat: add word bank with built-in lists and custom bank support"
```

---

### Task 4: LevelConfig

**Files:**
- Create: `src/levelConfig.ts`
- Create: `src/levelConfig.test.ts`

**Interfaces:**
- Consumes: `LevelConfig`, `WordLengthProfile` from `./types`
- Produces:
  - `getLevelConfig(level: number): LevelConfig`
  - `computeNextConfig(current: LevelConfig): LevelConfig`

- [ ] **Step 1: Write failing tests**

Create `src/levelConfig.test.ts`:

```typescript
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
    expect(cfg.speedBoostInterval).toBe(20);
  });

  it('level 2 still uses letters profile', () => {
    expect(getLevelConfig(2).wordLengthProfile).toBe('letters');
  });

  it('level 3 uses short profile', () => {
    expect(getLevelConfig(3).wordLengthProfile).toBe('short');
  });

  it('level 5 uses medium profile', () => {
    expect(getLevelConfig(5).wordLengthProfile).toBe('medium');
  });

  it('level 7 uses mixed profile', () => {
    expect(getLevelConfig(7).wordLengthProfile).toBe('mixed');
  });
});

describe('computeNextConfig', () => {
  it('increments level by 1', () => {
    expect(computeNextConfig(getLevelConfig(1)).level).toBe(2);
  });

  it('increases baseSpeed by 10% each level', () => {
    const next = computeNextConfig(getLevelConfig(1));
    expect(next.baseSpeed).toBeCloseTo(60 * 1.1, 5);
  });

  it('decreases spawnInterval by 100ms, floor at 800', () => {
    expect(computeNextConfig(getLevelConfig(1)).spawnInterval).toBe(2900);
    let cfg = getLevelConfig(1);
    for (let i = 0; i < 50; i++) cfg = computeNextConfig(cfg);
    expect(cfg.spawnInterval).toBeGreaterThanOrEqual(800);
  });

  it('increases maxOnScreen by 1, cap at 10', () => {
    expect(computeNextConfig(getLevelConfig(1)).maxOnScreen).toBe(4);
    let cfg = getLevelConfig(1);
    for (let i = 0; i < 20; i++) cfg = computeNextConfig(cfg);
    expect(cfg.maxOnScreen).toBeLessThanOrEqual(10);
  });

  it('decreases speedBoostInterval by 1, floor at 10', () => {
    expect(computeNextConfig(getLevelConfig(1)).speedBoostInterval).toBe(19);
    let cfg = getLevelConfig(1);
    for (let i = 0; i < 20; i++) cfg = computeNextConfig(cfg);
    expect(cfg.speedBoostInterval).toBeGreaterThanOrEqual(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — "Cannot find module './levelConfig'"

- [ ] **Step 3: Implement src/levelConfig.ts**

```typescript
import type { LevelConfig, WordLengthProfile } from './types';

function profileForLevel(level: number): WordLengthProfile {
  if (level <= 2) return 'letters';
  if (level <= 4) return 'short';
  if (level <= 6) return 'medium';
  return 'mixed';
}

export function getLevelConfig(level: number): LevelConfig {
  return {
    level,
    baseSpeed:          60 * Math.pow(1.1, level - 1),
    spawnInterval:      Math.max(800, 3000 - (level - 1) * 100),
    maxOnScreen:        Math.min(10, 3 + (level - 1)),
    wordLengthProfile:  profileForLevel(level),
    speedBoostInterval: Math.max(10, 20 - (level - 1)),
  };
}

export function computeNextConfig(current: LevelConfig): LevelConfig {
  return getLevelConfig(current.level + 1);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all levelConfig tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/levelConfig.ts src/levelConfig.test.ts
git commit -m "feat: add infinite level config with per-level difficulty progression"
```

---

### Task 5: ScoreManager

**Files:**
- Create: `src/scoreManager.ts`
- Create: `src/scoreManager.test.ts`

**Interfaces:**
- Produces:
  - `new ScoreManager()`
  - `.addScore(wordLength: number): void`
  - `.deductScore(wordLength: number): void`
  - `.isGameOver(): boolean`
  - `.getAccuracy(): number` — 0-100 integer percentage
  - `.reset(): void`
  - `.score: number` (readonly)
  - `.hits: number` (readonly)
  - `.misses: number` (readonly)

- [ ] **Step 1: Write failing tests**

Create `src/scoreManager.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — "Cannot find module './scoreManager'"

- [ ] **Step 3: Implement src/scoreManager.ts**

```typescript
export class ScoreManager {
  score = 0;
  hits = 0;
  misses = 0;
  private _gameOver = false;

  addScore(wordLength: number): void {
    this.score += wordLength * 10;
    this.hits++;
  }

  deductScore(wordLength: number): void {
    this.misses++;
    this.score = Math.max(0, this.score - wordLength * 10);
    if (this.score === 0) this._gameOver = true;
  }

  isGameOver(): boolean {
    return this._gameOver;
  }

  getAccuracy(): number {
    const total = this.hits + this.misses;
    if (total === 0) return 0;
    return Math.round((this.hits / total) * 100);
  }

  reset(): void {
    this.score = 0;
    this.hits = 0;
    this.misses = 0;
    this._gameOver = false;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all 11 scoreManager tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/scoreManager.ts src/scoreManager.test.ts
git commit -m "feat: add score manager with hit/miss tracking and game-over detection"
```

---

### Task 6: WordManager

**Files:**
- Create: `src/wordManager.ts`
- Create: `src/wordManager.test.ts`

**Interfaces:**
- Consumes: `FallingItem` from `./types`
- Produces:
  - `new WordManager()`
  - `.spawn(text: string, x: number, speed: number): void`
  - `.update(deltaMs: number, canvasHeight: number): FallingItem[]` — returns items that landed
  - `.tryMatch(char: string): FallingItem | null` — returns completed item or null
  - `.items: FallingItem[]` (readonly)
  - `.currentInputDisplay: string` — the matched prefix of the active item
  - `.reset(): void`

- [ ] **Step 1: Write failing tests**

Create `src/wordManager.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — "Cannot find module './wordManager'"

- [ ] **Step 3: Implement src/wordManager.ts**

```typescript
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

    // Find most dangerous item whose first char matches
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all wordManager tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/wordManager.ts src/wordManager.test.ts
git commit -m "feat: add word manager with fall physics, prefix matching, and input display"
```

---

### Task 7: AudioManager

**Files:**
- Create: `src/audio.ts`

**Interfaces:**
- Produces:
  - `new AudioManager()`
  - `.playHit(): void`
  - `.playMiss(): void`

AudioContext requires a browser — tests are manual.

- [ ] **Step 1: Implement src/audio.ts**

```typescript
export class AudioManager {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  playHit(): void {
    // Short rising "ding"
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  playMiss(): void {
    // Low falling "thud"
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }
}
```

- [ ] **Step 2: Manual browser test**

Run `npm run dev`. Open the browser console and paste:
```javascript
const { AudioManager } = await import('/src/audio.ts');
const a = new AudioManager();
a.playHit();
setTimeout(() => a.playMiss(), 600);
```
Expected: hear a bright rising "ding", then a low falling thud.

- [ ] **Step 3: Commit**

```bash
git add src/audio.ts
git commit -m "feat: add AudioContext sound synthesis for hit and miss events"
```

---

### Task 8: Renderer

**Files:**
- Create: `src/renderer.ts`

**Interfaces:**
- Consumes: `FallingItem` from `./types`
- Produces:
  - `new Renderer(canvas: HTMLCanvasElement)`
  - `.clear(): void`
  - `.drawBackground(): void`
  - `.drawItems(items: FallingItem[]): void`
  - `.spawnExplosion(x: number, y: number, color: string): void`
  - `.updateParticles(deltaMs: number): void`
  - `.drawHUD(score: number, level: number, timeLeft: number, currentInput: string): void`
  - `.drawPauseOverlay(): void`
  - `.width: number` (getter)
  - `.height: number` (getter)

Renderer uses Canvas API — tested manually in browser.

- [ ] **Step 1: Implement src/renderer.ts**

```typescript
import type { FallingItem } from './types';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  color: string;
  life: number;   // 1 → 0
  decay: number;  // life lost per second
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private particles: Particle[] = [];

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.canvas = canvas;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  get width(): number { return this.canvas.width; }
  get height(): number { return this.canvas.height; }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  drawBackground(): void {
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#1a0533');
    grad.addColorStop(1, '#0a1a3a');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawItems(items: FallingItem[]): void {
    const ctx = this.ctx;
    const fontSize = 22;
    ctx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;

    for (const item of items) {
      const padX = 16;
      const padY = 10;
      const fullW = ctx.measureText(item.text).width;
      const bw = fullW + padX * 2;
      const bh = fontSize + padY * 2;
      const bx = item.x - bw / 2;
      const by = item.y;

      // Bubble
      ctx.fillStyle = item.color + '33';
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 10);
      ctx.fill();
      ctx.stroke();

      // Text: matched part in white, rest in item color
      const matched = item.text.slice(0, item.matchedIndex);
      const rest = item.text.slice(item.matchedIndex);
      const matchedW = ctx.measureText(matched).width;
      const tx = bx + padX;
      const ty = by + padY + fontSize - 4;

      ctx.fillStyle = '#ffffff';
      ctx.fillText(matched, tx, ty);
      ctx.fillStyle = item.color;
      ctx.fillText(rest, tx + matchedW, ty);
    }
  }

  spawnExplosion(x: number, y: number, color: string): void {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
      const speed = 80 + Math.random() * 120;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 4 + Math.random() * 4,
        color,
        life: 1,
        decay: 2.5 + Math.random(),
      });
    }
  }

  updateParticles(deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.life -= p.decay * dt;
      return p.life > 0;
    });
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawHUD(score: number, level: number, timeLeft: number, currentInput: string): void {
    const ctx = this.ctx;
    const mins = Math.floor(timeLeft / 60);
    const secs = Math.floor(timeLeft % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    ctx.font = 'bold 20px "Segoe UI", sans-serif';

    // Level — top-left
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ccaaff';
    ctx.fillText(`第 ${level} 关`, 20, 36);

    // Timer — top-center
    ctx.textAlign = 'center';
    ctx.fillStyle = timeLeft <= 30 ? '#ff4444' : '#ffffff';
    ctx.fillText(timeStr, this.width / 2, 36);

    // Score — top-right
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`${score} 分`, this.width - 20, 36);

    // Current input — bottom-center
    if (currentInput) {
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(currentInput, this.width / 2, this.height - 30);
    }

    ctx.textAlign = 'left';
  }

  drawPauseOverlay(): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.textAlign = 'center';
    ctx.font = 'bold 52px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('⏸ 已暂停', this.width / 2, this.height / 2);
    ctx.font = '22px "Segoe UI", sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('按 Ctrl+S 继续', this.width / 2, this.height / 2 + 54);
    ctx.textAlign = 'left';
  }
}
```

- [ ] **Step 2: Manual browser test**

Run `npm run dev`. Temporarily replace `src/main.ts` contents with:

```typescript
import { Renderer } from './renderer';
import type { FallingItem } from './types';

document.getElementById('screen-menu')!.classList.remove('active');
document.getElementById('screen-game')!.classList.add('active');
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const r = new Renderer(canvas);

const items: FallingItem[] = [
  { id: '1', text: 'hello', x: 250, y: 120, speed: 0, color: '#ff6b6b', matchedIndex: 2 },
  { id: '2', text: 'world', x: 500, y: 220, speed: 0, color: '#ffd700', matchedIndex: 0 },
];

function frame() {
  r.clear();
  r.drawBackground();
  r.drawItems(items);
  r.spawnExplosion(350, 300, '#6bffb8');
  r.updateParticles(16);
  r.drawHUD(120, 3, 28, 'hel');
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

Expected: purple gradient background, two colored word bubbles ("he" highlighted white in 'hello'), green particle explosion, red timer (≤30s), HUD text, "hel" at bottom.

Restore `src/main.ts` to the stub (`export {};`) after verifying.

- [ ] **Step 3: Commit**

```bash
git add src/renderer.ts
git commit -m "feat: add Canvas renderer with bubbles, HUD, particles, and pause overlay"
```

---

### Task 9: InputHandler

**Files:**
- Create: `src/inputHandler.ts`

**Interfaces:**
- Produces:
  - `new InputHandler(onChar: (char: string) => void, onPause: () => void, onResume: () => void)`
  - `.destroy(): void`

Tested manually in browser.

- [ ] **Step 1: Implement src/inputHandler.ts**

```typescript
export class InputHandler {
  private _handler: (e: KeyboardEvent) => void;

  constructor(
    onChar: (char: string) => void,
    onPause: () => void,
    onResume: () => void,
  ) {
    this._handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        onPause();
        return;
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        onResume();
        return;
      }
      if (!e.ctrlKey && !e.altKey && !e.metaKey && /^[a-zA-Z]$/.test(e.key)) {
        onChar(e.key.toLowerCase());
      }
    };
    window.addEventListener('keydown', this._handler);
  }

  destroy(): void {
    window.removeEventListener('keydown', this._handler);
  }
}
```

- [ ] **Step 2: Manual browser test**

Temporarily replace `src/main.ts` with:
```typescript
import { InputHandler } from './inputHandler';
new InputHandler(
  (char) => console.log('char:', char),
  ()     => console.log('PAUSED'),
  ()     => console.log('RESUMED'),
);
```
Open browser console. Type letters, press Ctrl+P, press Ctrl+S.  
Expected: letters logged, PAUSED/RESUMED logged, browser "Save Page" dialog does NOT appear.

Restore `src/main.ts` to stub after testing.

- [ ] **Step 3: Commit**

```bash
git add src/inputHandler.ts
git commit -m "feat: add keyboard input handler with Ctrl+P/S pause and preventDefault"
```

---

### Task 10: Persistence

**Files:**
- Create: `src/persistence.ts`

**Interfaces:**
- Produces:
  - `getHighestLevel(): number`
  - `setHighestLevel(level: number): void`
  - `getHighestScore(): number`
  - `setHighestScore(score: number): void`

- [ ] **Step 1: Implement src/persistence.ts**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/persistence.ts
git commit -m "feat: add localStorage persistence for high score and highest level"
```

---

### Task 11: GameLoop

**Files:**
- Create: `src/gameLoop.ts`

**Interfaces:**
- Consumes: `WordManager`, `ScoreManager`, `Renderer`, `AudioManager`, `InputHandler`, `wordBank`, `LevelConfig`, `GameStats`
- Produces:
  - `new GameLoop(canvas: HTMLCanvasElement, config: LevelConfig, onCleared: (stats: GameStats) => void, onFailed: (stats: GameStats) => void)`
  - `.start(): void`
  - `.stop(): void`

- [ ] **Step 1: Implement src/gameLoop.ts**

```typescript
import { WordManager } from './wordManager';
import { ScoreManager } from './scoreManager';
import { Renderer } from './renderer';
import { AudioManager } from './audio';
import { InputHandler } from './inputHandler';
import { wordBank } from './wordBank';
import type { LevelConfig, GameStats } from './types';

const LEVEL_DURATION = 120; // seconds
const MAX_SPEED_BOOSTS = 3;

export class GameLoop {
  private wm: WordManager;
  private sm: ScoreManager;
  private renderer: Renderer;
  private audio: AudioManager;
  private input: InputHandler;
  private canvas: HTMLCanvasElement;
  private config: LevelConfig;
  private currentSpeed: number;
  private paused = false;
  private running = false;
  private lastTimestamp = 0;
  private timeLeft = LEVEL_DURATION;
  private timeSinceSpawnMs = 0;
  private timeSinceBoostS = 0;
  private boostCount = 0;
  private shakeFrames = 0;
  private rafId = 0;
  private onCleared: (stats: GameStats) => void;
  private onFailed: (stats: GameStats) => void;

  constructor(
    canvas: HTMLCanvasElement,
    config: LevelConfig,
    onCleared: (stats: GameStats) => void,
    onFailed: (stats: GameStats) => void,
  ) {
    this.canvas = canvas;
    this.config = config;
    this.currentSpeed = config.baseSpeed;
    this.onCleared = onCleared;
    this.onFailed = onFailed;
    this.wm = new WordManager();
    this.sm = new ScoreManager();
    this.renderer = new Renderer(canvas);
    this.audio = new AudioManager();
    this.input = new InputHandler(
      (char) => this.handleChar(char),
      () => this.pause(),
      () => this.resume(),
    );
  }

  start(): void {
    this.running = true;
    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame((t) => this.tick(t));
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.input.destroy();
  }

  private pause(): void {
    if (!this.running || this.paused) return;
    this.paused = true;
  }

  private resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.lastTimestamp = performance.now(); // prevent time-jump
  }

  private handleChar(char: string): void {
    if (this.paused) return;
    const completed = this.wm.tryMatch(char);
    if (completed) {
      this.sm.addScore(completed.text.length);
      this.audio.playHit();
      this.renderer.spawnExplosion(completed.x, completed.y + 20, completed.color);
    }
  }

  private tick(timestamp: number): void {
    if (!this.running) return;
    const deltaMs = this.lastTimestamp > 0 ? timestamp - this.lastTimestamp : 0;
    this.lastTimestamp = timestamp;

    if (!this.paused) this.update(deltaMs);
    this.draw(deltaMs);

    this.rafId = requestAnimationFrame((t) => this.tick(t));
  }

  private update(deltaMs: number): void {
    const dt = deltaMs / 1000;

    // Countdown
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.finish('cleared');
      return;
    }

    // In-level speed boost
    this.timeSinceBoostS += dt;
    if (this.boostCount < MAX_SPEED_BOOSTS && this.timeSinceBoostS >= this.config.speedBoostInterval) {
      this.currentSpeed *= 1.1;
      this.boostCount++;
      this.timeSinceBoostS = 0;
    }

    // Spawn
    this.timeSinceSpawnMs += deltaMs;
    if (
      this.wm.items.length < this.config.maxOnScreen &&
      this.timeSinceSpawnMs >= this.config.spawnInterval
    ) {
      this.timeSinceSpawnMs = 0;
      const text = wordBank.getWord(this.config.wordLengthProfile);
      const margin = 80;
      const x = margin + Math.random() * (this.canvas.width - margin * 2);
      this.wm.spawn(text, x, this.currentSpeed);
    }

    // Move items; handle landings
    const landed = this.wm.update(deltaMs, this.canvas.height);
    for (const item of landed) {
      this.sm.deductScore(item.text.length);
      this.audio.playMiss();
      this.shakeFrames = 8;
      if (this.sm.isGameOver()) {
        this.finish('failed');
        return;
      }
    }

    if (this.shakeFrames > 0) this.shakeFrames--;
  }

  private draw(deltaMs: number): void {
    const ctx = this.canvas.getContext('2d')!;
    const shaking = this.shakeFrames > 0;

    if (shaking) {
      ctx.save();
      ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    }

    this.renderer.clear();
    this.renderer.drawBackground();
    this.renderer.drawItems(this.wm.items);
    this.renderer.updateParticles(deltaMs);
    this.renderer.drawHUD(
      this.sm.score,
      this.config.level,
      this.timeLeft,
      this.wm.currentInputDisplay,
    );

    if (shaking) ctx.restore();
    if (this.paused) this.renderer.drawPauseOverlay();
  }

  private finish(result: 'cleared' | 'failed'): void {
    this.stop();
    const stats: GameStats = {
      score: this.sm.score,
      hits: this.sm.hits,
      misses: this.sm.misses,
      level: this.config.level,
    };
    if (result === 'cleared') this.onCleared(stats);
    else this.onFailed(stats);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/gameLoop.ts
git commit -m "feat: add game loop with timer, spawning, speed boosts, and level-end callbacks"
```

---

### Task 12: Main — UI Wiring

**Files:**
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `GameLoop`, `getLevelConfig`, `computeNextConfig`, `getHighestLevel`, `setHighestLevel`, `getHighestScore`, `setHighestScore`, `GameStats`, `LevelConfig`
- Produces: fully playable game in the browser

- [ ] **Step 1: Implement src/main.ts**

```typescript
import { GameLoop } from './gameLoop';
import { getLevelConfig, computeNextConfig } from './levelConfig';
import { getHighestLevel, setHighestLevel, getHighestScore, setHighestScore } from './persistence';
import type { GameStats, LevelConfig } from './types';

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
};

const screenMenu        = $('screen-menu');
const screenLevelSelect = $('screen-level-select');
const screenGame        = $('screen-game');
const screenCleared     = $('screen-cleared');
const screenFailed      = $('screen-failed');
const canvas            = $('game-canvas') as HTMLCanvasElement;

let currentConfig: LevelConfig = getLevelConfig(1);
let activeLoop: GameLoop | null = null;
let accumulatedScore = 0; // total score across levels in one run

function showOnly(screen: HTMLElement): void {
  [screenMenu, screenLevelSelect, screenGame, screenCleared, screenFailed]
    .forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}

// ── Menu ─────────────────────────────────────────────────────────────────────

function renderMenu(): void {
  const hl = getHighestLevel();
  const hs = getHighestScore();
  $('high-score-display').textContent =
    `最高关卡：第 ${hl} 关 ｜ 历史最高：${hs} 分`;
  showOnly(screenMenu);
}

$('btn-start').addEventListener('click', renderLevelSelect);

// ── Level Select ──────────────────────────────────────────────────────────────

function renderLevelSelect(): void {
  const grid = $('level-grid');
  grid.innerHTML = '';
  const maxLevel = getHighestLevel();
  for (let lvl = 1; lvl <= maxLevel; lvl++) {
    const cfg = getLevelConfig(lvl);
    const btn = document.createElement('button');
    btn.className = 'level-btn';
    btn.textContent = String(lvl);
    btn.title = `速度 ${Math.round(cfg.baseSpeed)} px/s | 同屏 ${cfg.maxOnScreen} 个`;
    btn.addEventListener('click', () => beginRun(cfg));
    grid.appendChild(btn);
  }
  showOnly(screenLevelSelect);
}

$('btn-back-menu').addEventListener('click', renderMenu);

// ── Game ──────────────────────────────────────────────────────────────────────

function beginRun(config: LevelConfig): void {
  currentConfig = config;
  accumulatedScore = 0;
  launchLevel(config);
}

function launchLevel(config: LevelConfig): void {
  activeLoop?.stop();
  showOnly(screenGame);
  activeLoop = new GameLoop(canvas, config, onCleared, onFailed);
  activeLoop.start();
}

// ── Cleared ───────────────────────────────────────────────────────────────────

function onCleared(stats: GameStats): void {
  accumulatedScore += stats.score;
  setHighestLevel(stats.level);
  setHighestScore(accumulatedScore);

  const total = stats.hits + stats.misses;
  const accuracy = total > 0 ? Math.round((stats.hits / total) * 100) : 0;

  $('cleared-stats').innerHTML = `
    第 <strong>${stats.level}</strong> 关通关！<br>
    本关得分：<strong>${stats.score}</strong> 分<br>
    击中 ${stats.hits} 个 ｜ 漏掉 ${stats.misses} 个<br>
    准确率：${accuracy}%
  `;
  $('btn-next-level').textContent = `进入第 ${stats.level + 1} 关 →`;
  currentConfig = stats as unknown as LevelConfig; // store level for next
  // Store the cleared level config so next-level button knows what to advance
  const clearedConfig = getLevelConfig(stats.level);
  $('btn-next-level').dataset['nextLevel'] = String(clearedConfig.level);
  showOnly(screenCleared);
}

$('btn-next-level').addEventListener('click', () => {
  const next = computeNextConfig(getLevelConfig(
    parseInt($('btn-next-level').dataset['nextLevel'] ?? '1', 10)
  ));
  launchLevel(next);
});

// ── Failed ────────────────────────────────────────────────────────────────────

function onFailed(stats: GameStats): void {
  setHighestScore(accumulatedScore + stats.score);

  $('failed-stats').innerHTML = `
    在第 <strong>${stats.level}</strong> 关失败<br>
    本关得分：<strong>${stats.score}</strong> 分<br>
    击中 ${stats.hits} 个 ｜ 漏掉 ${stats.misses} 个
  `;
  showOnly(screenFailed);
}

$('btn-retry').addEventListener('click', () => beginRun(getLevelConfig(1)));
$('btn-back-menu-2').addEventListener('click', renderMenu);

// ── Init ──────────────────────────────────────────────────────────────────────

renderMenu();
```

- [ ] **Step 2: Run all unit tests first**

Run: `npm test`
Expected: All tests pass (wordBank, levelConfig, scoreManager, wordManager).

- [ ] **Step 3: Manual end-to-end browser test**

Run: `npm run dev` and verify each flow:

1. **Menu:** "最高关卡：第 1 关" displayed on first load.
2. **Level select:** clicking "开始游戏" shows a grid with level 1 button.
3. **Gameplay:** clicking level 1 starts the game — colorful word bubbles fall from the top.
4. **Hit:** type a falling word correctly → explosion particles + rising ding sound, score increases.
5. **Miss:** let a word land → score decreases, screen shakes briefly, thud sound.
6. **Wrong char:** type a wrong char mid-word → nothing happens, matched portion stays highlighted.
7. **Pause:** press `Ctrl+P` → overlay appears, items freeze, timer stops.
8. **Resume:** press `Ctrl+S` → overlay disappears, game continues.
9. **Fail:** let score reach 0 → "💀 关卡失败" screen appears.
10. **Clear:** survive 2 minutes with score > 0 → "🎉 通关！" screen with stats and "进入第 2 关" button.
11. **Next level:** clicking next level button starts level 2 (faster, more items).
12. **Persistence:** refresh page → highest level/score still shown in menu.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire all screens and game loop into fully playable typing game"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|-------------|------|
| Letters/words fall from screen top | Task 6 (WordManager.spawn + update) |
| Type to destroy before landing | Task 6 (tryMatch), Task 11 (GameLoop) |
| Hit score: word.length × 10 | Task 5 (ScoreManager.addScore) |
| Miss deduct: word.length × 10 | Task 5 (ScoreManager.deductScore) |
| Score ≤ 0 → level fail immediately | Task 5 (isGameOver), Task 11 |
| 2-minute countdown | Task 11 (LEVEL_DURATION = 120) |
| Longer words = more score/penalty | Both use word.length × 10 ✓ |
| Explosion animation on hit | Task 8 (spawnExplosion + updateParticles) |
| Explosion sound on hit | Task 7 (AudioManager.playHit) |
| Miss sound + screen shake | Task 7 (playMiss), Task 11 (shakeFrames) |
| Wrong char: ignore, keep match state | Task 6 (tryMatch ignores wrong char), tested |
| Infinite levels | Task 4 (getLevelConfig for any n), Task 12 |
| Low levels = letters, high = words | Task 4 (profileForLevel) |
| Player selects start level | Task 12 (renderLevelSelect) |
| In-level speed boosts (×3, interval) | Task 11 (timeSinceBoostS, boostCount) |
| Ctrl+P pause / Ctrl+S resume | Task 9 (InputHandler), Task 11 |
| preventDefault on Ctrl+P and Ctrl+S | Task 9 |
| Paused input ignored | Task 11 (handleChar checks paused) |
| Cartoon colorful style | Task 8 (Renderer bubbles), Task 1 (style.css) |
| Colorful word bubbles | Task 8 (random COLORS, roundRect) |
| Matched chars highlighted | Task 8 (white for matched, color for rest) |
| Current input shown at bottom | Task 8 (drawHUD), Task 6 (currentInputDisplay) |
| HUD: level, timer, score | Task 8 (drawHUD) |
| Timer red at ≤ 30 seconds | Task 8 (drawHUD timeLeft ≤ 30 check) |
| Cleared screen with stats | Task 12 (onCleared) |
| Failed screen with stats | Task 12 (onFailed) |
| localStorage high score + level | Task 10 (persistence.ts), Task 12 |
| Extensible word bank | Task 3 (loadCustomBank + WordBankData interface) |

### Placeholder Scan

No TBD, TODO, or vague steps. All code is complete.

### Type Consistency

- `FallingItem` defined in `types.ts` → used in `wordManager.ts`, `renderer.ts`, `gameLoop.ts` ✓
- `LevelConfig` defined in `types.ts` → used in `levelConfig.ts`, `gameLoop.ts`, `main.ts` ✓
- `GameStats` defined in `types.ts` → used in `gameLoop.ts`, `main.ts` ✓
- `WordLengthProfile` defined in `types.ts` → used in `wordBank.ts`, `levelConfig.ts` ✓
- `spawnExplosion(x, y, color)` — consistent between `renderer.ts` and `gameLoop.ts` ✓
- `currentInputDisplay` getter — defined in `wordManager.ts`, consumed in `gameLoop.ts` ✓
- `getLevelConfig` / `computeNextConfig` — named consistently across tasks ✓
