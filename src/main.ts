import { GameLoop, getLevelDuration } from './gameLoop';
import { AudioManager } from './audio';
import { getLevelConfig, computeNextConfig } from './levelConfig';
import { getHighestLevel, setHighestLevel, getHighestScore, setHighestScore } from './persistence';
import type { GameStats, LevelConfig } from './types';

const sharedAudio = new AudioManager();

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
const dialogSetTime     = $('dialog-set-time');
const inputDuration     = $('input-duration') as HTMLInputElement;

let activeLoop: GameLoop | null = null;
let accumulatedScore = 0; // total score across levels in one run

// ── Time Setting Dialog ───────────────────────────────────────────────────────

function openTimeDialog(): void {
  inputDuration.value = String(getLevelDuration());
  dialogSetTime.classList.remove('hidden');
  setTimeout(() => inputDuration.focus(), 30);
}

function closeTimeDialog(apply: boolean): void {
  dialogSetTime.classList.add('hidden');
  if (apply && activeLoop) {
    const v = parseInt(inputDuration.value, 10);
    if (!isNaN(v) && v >= 10) {
      activeLoop.applyNewDuration(v);
    } else {
      activeLoop.applyNewDuration(getLevelDuration()); // resume without change
    }
  } else if (activeLoop) {
    // cancelled — just resume
    activeLoop.applyNewDuration(getLevelDuration());
  }
}

$('btn-time-confirm').addEventListener('click', () => closeTimeDialog(true));
$('btn-time-cancel').addEventListener('click',  () => closeTimeDialog(false));

// Confirm with Enter, cancel with Escape inside the dialog
inputDuration.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); closeTimeDialog(true); }
  if (e.key === 'Escape') { e.preventDefault(); closeTimeDialog(false); }
});

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
  const unlockedLevel = getHighestLevel();
  for (let lvl = 1; lvl <= 20; lvl++) {
    const cfg = getLevelConfig(lvl);
    const btn = document.createElement('button');
    btn.className = 'level-btn' + (lvl > unlockedLevel ? ' level-locked' : '');
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
  accumulatedScore = 0;
  launchLevel(config);
}

function launchLevel(config: LevelConfig): void {
  activeLoop?.stop();
  showOnly(screenGame);
  activeLoop = new GameLoop(
    canvas, config, sharedAudio,
    onCleared, onFailed,
    () => openTimeDialog(),
  );
  activeLoop.start();
}

// ── Cleared ───────────────────────────────────────────────────────────────────

function onCleared(stats: GameStats): void {
  accumulatedScore += stats.score;
  setHighestLevel(stats.level + 1);
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
$('btn-menu-ingame').addEventListener('click', () => {
  activeLoop?.stop();
  activeLoop = null;
  renderMenu();
});

// ── Init ──────────────────────────────────────────────────────────────────────

renderMenu();
