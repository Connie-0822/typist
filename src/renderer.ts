import type { FallingItem } from './types';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  color: string;
  life: number;   // 1 → 0
  decay: number;  // life lost per second
}

interface FloatingLabel {
  x: number; y: number;
  lines: string[];  // multiple meaning lines
  color: string;
  life: number;     // 1 → 0, total duration = 1s
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private particles: Particle[] = [];
  private floatingLabels: FloatingLabel[] = [];
  private _logicalW = 0;
  private _logicalH = 0;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.canvas = canvas;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const dpr = Math.round(window.devicePixelRatio || 1);
    this._logicalW = window.innerWidth;
    this._logicalH = window.innerHeight;
    // CSS size stays at logical pixels; physical buffer matches screen resolution
    this.canvas.style.width  = this._logicalW + 'px';
    this.canvas.style.height = this._logicalH + 'px';
    this.canvas.width  = this._logicalW * dpr;
    this.canvas.height = this._logicalH * dpr;
    // Re-apply scale after each dimension change (resets context transform)
    this.ctx.scale(dpr, dpr);
  }

  get width(): number  { return this._logicalW; }
  get height(): number { return this._logicalH; }

  clear(): void {
    // With alpha:false context, fillRect is faster than clearRect
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this._logicalW, this._logicalH);
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
      const bw = Math.ceil(fullW + padX * 2);
      const bh = fontSize + padY * 2;
      // Snap to whole pixels to prevent sub-pixel blurring
      const bx = Math.round(item.x - bw / 2);
      const by = Math.round(item.y);

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

  spawnTranslation(x: number, y: number, lines: string[], color: string): void {
    this.floatingLabels.push({ x, y, lines, color, life: 1 });
  }

  updateFloatingLabels(deltaMs: number): void {
    const dt = deltaMs / 1000;
    const ctx = this.ctx;
    this.floatingLabels = this.floatingLabels.filter(label => {
      label.life -= dt;
      label.y -= 28 * dt; // drift upward slowly
      return label.life > 0;
    });

    const lineHeight = 22;
    const fontSize = 18;

    for (const label of this.floatingLabels) {
      // fade in first 0.1s, hold, fade out last 0.3s
      let alpha: number;
      if (label.life > 0.9) alpha = (1 - label.life) / 0.1;
      else if (label.life > 0.3) alpha = 1;
      else alpha = label.life / 0.3;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 8;

      const totalH = label.lines.length * lineHeight;
      let startY = label.y - totalH / 2;

      for (const line of label.lines) {
        ctx.fillStyle = label.color;
        ctx.fillText(line, label.x, startY);
        startY += lineHeight;
      }
      ctx.restore();
    }
    ctx.textAlign = 'left';
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

  // ── Shared typing-hint data (used by drawKeyboardHint + _drawHand) ──
  private static readonly HINT_FINGER: Record<string, number> = {
    q:0, a:0, z:0,
    w:1, s:1, x:1,
    e:2, d:2, c:2,
    r:3, f:3, v:3, t:3, g:3, b:3,
    y:4, h:4, n:4, u:4, j:4, m:4,
    i:5, k:5,
    o:6, l:6,
    p:7,
  };
  private static readonly HINT_COLORS = [
    '#ff6b9d', '#ffa07a', '#ffd700', '#90ee90',   // L: pinky ring mid idx
    '#87cefa', '#da70d6', '#ffa07a', '#ff6b9d',   // R: idx mid ring pinky
  ];
  private static readonly HINT_NAMES = [
    '左小指', '左无名指', '左中指', '左食指',
    '右食指', '右中指', '右无名指', '右小指',
  ];

  drawKeyboardHint(nextChar: string | null, time: number): void {
    const ctx  = this.ctx;
    const KEY  = 36;
    const GAP  = 4;
    const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    const ROW_OFFSETS = [0, 20, 57];
    const { HINT_FINGER: FINGER, HINT_COLORS: COLORS, HINT_NAMES: NAMES }
      = Renderer;

    const totalKW  = 10 * (KEY + GAP) - GAP;           // 396
    const originX  = Math.round((this._logicalW - totalKW) / 2);
    const PANEL_H  = 262;
    const HAND_H   = 95;   // hands area height inside panel
    const panelY   = this._logicalH - PANEL_H - 42;    // 42px for input bar
    const handsTop = panelY + 30;                       // below top label
    const keysTop  = handsTop + HAND_H + 6;

    const target    = nextChar?.toLowerCase() ?? null;
    const fingerIdx = target !== null ? (FINGER[target] ?? -1) : -1;

    ctx.save();

    // ── Panel background ──
    ctx.globalAlpha = 0.90;
    ctx.fillStyle = 'rgba(6,6,20,0.94)';
    ctx.beginPath();
    ctx.roundRect(originX - 14, panelY, totalKW + 28, PANEL_H, 12);
    ctx.fill();
    ctx.globalAlpha = 1;

    // ── Top label ──
    ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    if (fingerIdx >= 0) {
      const col    = COLORS[fingerIdx];
      const isLeft = fingerIdx < 4;
      ctx.fillStyle  = col;
      ctx.shadowColor = col;
      ctx.shadowBlur  = 8;
      ctx.fillText(
        `${isLeft ? '← 左手' : '右手 →'}   ${NAMES[fingerIdx]}`,
        this._logicalW / 2, panelY + 20,
      );
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = 'rgba(160,160,180,0.65)';
      ctx.fillText('键盘指法提示  —  前3关', this._logicalW / 2, panelY + 20);
    }

    // ── Both hands ──
    // Left hand center at ~28% of keyboard width; right at ~72%
    const palmBottom = handsTop + HAND_H;
    this._drawHand(originX + totalKW * 0.28, palmBottom, false, fingerIdx, time, COLORS);
    this._drawHand(originX + totalKW * 0.72, palmBottom, true,  fingerIdx, time, COLORS);

    // ── Keyboard keys ──
    for (let r = 0; r < ROWS.length; r++) {
      const row  = ROWS[r];
      const rowX = originX + ROW_OFFSETS[r];
      const rowY = keysTop + r * (KEY + GAP);

      for (let i = 0; i < row.length; i++) {
        const key    = row[i];
        const kx     = rowX + i * (KEY + GAP);
        const ky     = rowY;
        const fi     = FINGER[key] ?? 0;
        const col    = COLORS[fi];
        const active = key === target;

        ctx.shadowBlur  = active ? 14 : 0;
        ctx.shadowColor = col;
        ctx.fillStyle   = active ? col : col + '2a';
        ctx.beginPath();
        ctx.roundRect(kx, ky, KEY, KEY, 6);
        ctx.fill();
        ctx.strokeStyle = active ? col : col + '60';
        ctx.lineWidth   = active ? 2 : 1;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.font       = `bold ${active ? 16 : 12}px 'Segoe UI', monospace`;
        ctx.textAlign  = 'center';
        ctx.fillStyle  = active ? '#0a0a14' : 'rgba(255,255,255,0.80)';
        ctx.fillText(key.toUpperCase(), kx + KEY / 2, ky + KEY / 2 + 5);
      }
    }

    ctx.shadowBlur = 0;
    ctx.textAlign  = 'left';
    ctx.restore();
  }

  /**
   * Draw a single hand (top-down view, fingers pointing upward toward keyboard).
   * Left hand: finger positions L→R = pinky(0), ring(1), middle(2), index(3)
   * Right hand: finger positions L→R = index(4), middle(5), ring(6), pinky(7)
   */
  private _drawHand(
    palmCX: number,
    palmBottom: number,
    isRight: boolean,
    activeGameIdx: number,   // -1 = none
    time: number,
    colors: readonly string[],
  ): void {
    const ctx = this.ctx;

    // Which game-finger index lives at each left→right hand position?
    const posToGame = isRight ? [4, 5, 6, 7] : [0, 1, 2, 3];

    // Finger sizes (L→R within each hand)
    // Left:  pinky  ring   mid    index
    // Right: index  mid    ring   pinky
    const FH_L = [26, 36, 42, 33] as const;   // finger heights
    const FH_R = [33, 42, 36, 26] as const;
    const fingerHeights = isRight ? FH_R : FH_L;

    const FW   = 13;   // finger width
    const FG   = 4;    // finger gap
    const PR   = 8;    // palm corner radius
    const PW   = 4 * FW + 3 * FG + 12;  // palm width (wider than fingers)
    const PH   = 24;   // palm height
    const fTot = 4 * FW + 3 * FG;
    const fX0  = palmCX - fTot / 2;
    const palmTop = palmBottom - PH;

    // Active-finger bounce: smooth sine wave, 10px amplitude
    const bounce = Math.abs(Math.sin(time * 0.005)) * 10;

    // ── Fingers (drawn behind palm) ──
    for (let i = 0; i < 4; i++) {
      const gIdx     = posToGame[i];
      const isActive = gIdx === activeGameIdx;
      const col      = colors[gIdx];
      const fh       = fingerHeights[i];
      const fx       = Math.round(fX0 + i * (FW + FG));
      // Active finger lifts toward keyboard; others stay put
      const fy       = Math.round(palmTop - fh - (isActive ? bounce : 0));

      if (isActive) {
        ctx.shadowColor = col;
        ctx.shadowBlur  = 16;
      } else {
        ctx.shadowBlur = 0;
      }

      // Finger body — rounded top, flat base blending into palm
      ctx.fillStyle = isActive ? col : col + '3a';
      ctx.beginPath();
      ctx.roundRect(fx, fy, FW, fh + 5, [FW / 2, FW / 2, 2, 2]);
      ctx.fill();

      if (isActive) {
        ctx.strokeStyle = col;
        ctx.lineWidth   = 1.5;
        ctx.stroke();
        // Fingernail highlight
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.roundRect(fx + 2, fy + 3, FW - 4, 8, 3);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
    }

    // ── Palm ──
    const palmX = Math.round(palmCX - PW / 2);
    ctx.fillStyle   = 'rgba(45, 40, 70, 0.92)';
    ctx.strokeStyle = 'rgba(130, 120, 170, 0.55)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.roundRect(palmX, palmTop, PW, PH, PR);
    ctx.fill();
    ctx.stroke();

    // ── Thumb ──
    const TW = 11, TH = 20;
    // Left thumb: right side of palm; Right thumb: left side
    const tx = isRight
      ? Math.round(palmX - TW + 3)
      : Math.round(palmX + PW - 3);
    const ty = Math.round(palmTop + 2);
    ctx.fillStyle   = 'rgba(45, 40, 70, 0.75)';
    ctx.strokeStyle = 'rgba(130, 120, 170, 0.35)';
    ctx.beginPath();
    ctx.roundRect(tx, ty, TW, TH,
      isRight ? [TW / 2, 3, 3, TW / 2] : [3, TW / 2, TW / 2, 3]);
    ctx.fill();
    ctx.stroke();

    // ── Hand label ──
    ctx.font      = '11px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(160,150,200,0.55)';
    ctx.fillText(isRight ? '右手' : '左手', palmCX, palmBottom + 13);
  }

  beginShake(): void {
    this.ctx.save();
    this.ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
  }

  endShake(): void {
    this.ctx.restore();
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
    ctx.fillText('Ctrl+S 继续  ·  Ctrl+, 设置时间', this.width / 2, this.height / 2 + 54);
    ctx.textAlign = 'left';
  }
}
