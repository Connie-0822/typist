# 打字练习游戏设计文档

**日期：** 2026-07-03  
**技术栈：** Vite + TypeScript + HTML5 Canvas

---

## 一、游戏概述

一款卡通活泼风格的打字练习游戏。英文字母或单词从屏幕顶部随机掉落，玩家需在其落地前通过键盘打出对应内容将其消灭并得分。落地则扣分，得分降至 0 时关卡失败。无限关卡，难度随关卡递增，直至玩家失败。

---

## 二、文件结构

```
game1/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.ts             # 入口，初始化游戏
    ├── gameLoop.ts         # 主循环（requestAnimationFrame）
    ├── wordManager.ts      # 单词/字母生成、掉落逻辑
    ├── renderer.ts         # Canvas 绘制（背景、字母、特效、动画）
    ├── inputHandler.ts     # 键盘输入捕获与匹配
    ├── scoreManager.ts     # 计分、扣分、UI 显示
    ├── levelConfig.ts      # 关卡配置（速度、内容类型、递增策略）
    ├── wordBank.ts         # 内置词库 + loadCustomBank() 扩展接口
    └── types.ts            # 共享类型定义
```

---

## 三、核心类型（types.ts）

```typescript
type GameState = 'menu' | 'levelSelect' | 'playing' | 'paused' | 'cleared' | 'failed';

interface FallingItem {
  id: string;
  text: string;
  x: number;
  y: number;
  speed: number;
  color: string;
  matchedIndex: number;  // 已匹配到第几个字符
}

interface LevelConfig {
  level: number;
  baseSpeed: number;         // 掉落基础速度（px/s）
  spawnInterval: number;     // 生成间隔（毫秒）
  maxOnScreen: number;       // 同屏最大掉落物数量
  wordLengthProfile: 'letters' | 'short' | 'medium' | 'long' | 'mixed';
}
```

---

## 四、游戏机制

### 4.1 掉落物生成

- 每隔 `spawnInterval` 毫秒在屏幕顶部随机 X 位置生成一个掉落物
- 同屏超过 `maxOnScreen` 时暂停生成，等待数量减少后继续
- 掉落物内容按 `wordLengthProfile` 从词库中随机选取：
  - 低关卡（1-2）：`letters`（单个字母）
  - 中关卡（3-4）：`letters` + `short`
  - 高关卡（5+）：`short` + `medium` + `long`

### 4.2 输入匹配逻辑

- 监听 `keydown`，过滤非字母键
- 实时对所有掉落物做前缀匹配，优先匹配 Y 坐标最大（最危险）的项
- 匹配中的单词高亮已输入部分（不同颜色）
- **打错字符：忽略该次输入，保持当前匹配状态不变**（不清零）
- 完整输入后立即消除，触发爆炸特效 + 爆炸音效

### 4.3 计分规则

| 事件 | 分值 |
|------|------|
| 消灭掉落物 | `+单词长度 × 10` 分 |
| 掉落物落地 | `-单词长度 × 10` 分 |

- 得分降至 **≤ 0** 时，**关卡立即失败**，游戏结束
- 2 分钟倒计时结束且得分 > 0 则通关，自动进入下一关

### 4.4 无限关卡与难度递增

每通过一关，难度参数按如下规则增加：

| 参数 | 初始值 | 每关增量 |
|------|--------|----------|
| 掉落基础速度 | 60 px/s | +10% |
| 生成间隔 | 3000 ms | -100ms（最低 800ms） |
| 同屏最大数量 | 3 个 | +1（上限 10 个） |
| 关卡内速度递增间隔 | 20 秒 | -1秒（最低 10 秒） |

**关卡内速度递增：** 每隔 N 秒，当前掉落速度提升 10%，最多提升 3 次。

### 4.5 暂停功能

- `Ctrl+P`：暂停游戏，倒计时停止，掉落物冻结，Canvas 显示半透明遮罩 + "PAUSED" 提示
- `Ctrl+S`：恢复游戏，遮罩消失，继续倒计时和掉落
- 两个快捷键均调用 `event.preventDefault()` 拦截浏览器默认行为
- 暂停状态下所有字母输入无效

---

## 五、视觉与音效

### 5.1 视觉风格（卡通活泼）

- 彩色渐变背景
- 每个掉落物随机分配鲜艳颜色，圆角气泡包裹文字
- 已匹配字符用不同颜色高亮
- **爆炸动画：** 消灭时播放向外扩散的粒子（10-15 个色块小圆点），持续约 0.3 秒
- **落地动画：** 屏幕轻微震动效果

### 5.2 音效（AudioContext 合成，无外部文件）

- 消灭音：短促上扬音调（"叮"）
- 落地音：低沉下滑音调（"砰"）

---

## 六、UI 界面与页面流转

```
主菜单 → 关卡选择 → 游戏中 → 通关结算 → 下一关（自动）
                          ↓ 失败
                       失败界面 → 主菜单 / 从头再来
```

### 主菜单
- 游戏标题（卡通字体）
- "开始游戏" 按钮
- 历史最高关卡 / 历史最高得分显示

### 关卡选择界面
- 选择起始关卡（1 至历史最高关卡，默认第 1 关）
- 每关显示难度预览（速度、同屏数量）

### 游戏中 HUD（Canvas 上方叠加）
- 左上：当前关卡数
- 中上：倒计时（红色警示 ≤ 30 秒）
- 右上：当前得分（变化时数字跳动动画）
- 底部：玩家当前输入内容实时显示

### 通关结算界面
- 本关得分、击中数、漏掉数、准确率
- "进入第 N+1 关" 按钮

### 失败界面
- 最终关卡数、总得分
- "返回主菜单" / "从头再来" 按钮

---

## 七、词库结构（wordBank.ts）

```typescript
export interface WordBank {
  letters: string[];       // 单个字母 a-z
  short: string[];         // 2-4 字母单词
  medium: string[];        // 5-7 字母单词
  long: string[];          // 8+ 字母单词
  loadCustomBank: (bank: Partial<WordBank>) => void;  // 扩展接口
}
```

---

## 八、数据持久化

使用 `localStorage` 存储：
- `typingGame_highestLevel`：历史最高关卡
- `typingGame_highestScore`：历史最高得分
