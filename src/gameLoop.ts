import { WordManager } from './wordManager';
import { ScoreManager } from './scoreManager';
import { Renderer } from './renderer';
import { AudioManager } from './audio';
import { InputHandler } from './inputHandler';
import { wordBank } from './wordBank';
import type { LevelConfig, GameStats } from './types';


let customLevelDuration = 60; // global, persists across levels
export function getLevelDuration(): number { return customLevelDuration; }
export function setLevelDuration(s: number): void {
  customLevelDuration = Math.max(10, Math.min(600, Math.round(s)));
}

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
  private timeLeft = getLevelDuration();
  private timeSinceSpawnMs = 0;
  private timeSinceBoostS = 0;
  private boostCount = 0;
  private shakeFrames = 0;
  private rafId = 0;
  private onCleared: (stats: GameStats) => void;
  private onFailed: (stats: GameStats) => void;
  private onRequestSetTime: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    config: LevelConfig,
    audio: AudioManager,
    onCleared: (stats: GameStats) => void,
    onFailed: (stats: GameStats) => void,
    onRequestSetTime: () => void,
  ) {
    this.canvas = canvas;
    this.config = config;
    this.currentSpeed = config.baseSpeed;
    this.onCleared = onCleared;
    this.onFailed = onFailed;
    this.onRequestSetTime = onRequestSetTime;
    this.wm = new WordManager();
    this.sm = new ScoreManager();
    this.renderer = new Renderer(canvas);
    this.audio = audio;
    this.input = new InputHandler(
      (char) => this.handleChar(char),
      () => this.pause(),
      () => this.resume(),
      () => this.handleSetTime(),
    );
  }

  // Called by main.ts after the time-setting dialog confirms a new value
  applyNewDuration(seconds: number): void {
    setLevelDuration(seconds);
    this.timeLeft = seconds;
    this.resume();
  }

  private handleSetTime(): void {
    this.pause();
    this.onRequestSetTime();
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
      const translations = wordBank.getTranslation(completed.text);
      this.renderer.spawnTranslation(completed.x, completed.y + 20, translations, completed.color);
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
    const shaking = this.shakeFrames > 0;
    this.renderer.clear();
    if (shaking) this.renderer.beginShake();

    this.renderer.drawBackground();
    this.renderer.drawItems(this.wm.items);
    this.renderer.updateParticles(deltaMs);
    this.renderer.updateFloatingLabels(deltaMs);

    // Keyboard hint for beginner levels (1-3)
    if (this.config.level <= 3) {
      this.renderer.drawKeyboardHint(this.wm.nextChar, performance.now());
    }

    this.renderer.drawHUD(
      this.sm.score,
      this.config.level,
      this.timeLeft,
      this.wm.currentInputDisplay,
    );

    if (shaking) this.renderer.endShake();
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
