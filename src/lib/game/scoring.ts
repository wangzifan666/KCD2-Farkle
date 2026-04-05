import type { DieFace } from './types';

// ─────────────────────────────────────────────
//  内部工具
// ─────────────────────────────────────────────

/** 统计各面值出现次数，face=0（恶魔头）单独处理 */
function countFaces(values: DieFace[]): Map<DieFace, number> {
  const map = new Map<DieFace, number>();
  for (const v of values) {
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  return map;
}

// ─────────────────────────────────────────────
//  顺子检测
// ─────────────────────────────────────────────

/**
 * 检测是否构成顺子（不含恶魔头，顺子必须由明确点数构成）。
 * 返回顺子分数，或 0（不构成顺子）。
 *
 * 规则：
 *   1-2-3-4-5       = 500
 *   2-3-4-5-6       = 750
 *   1-2-3-4-5-6     = 1500
 */
export function detectStraight(values: DieFace[]): number {
  // 顺子不能含恶魔头
  if (values.includes(0)) return 0;

  const sorted = [...new Set(values)].sort((a, b) => a - b);
  // 所有骰子必须参与顺子（不能有重复值）
  if (sorted.length !== values.length) return 0;
  const key = sorted.join('-');

  if (key === '1-2-3-4-5-6') return 1500;
  if (key === '1-2-3-4-5') return 500;
  if (key === '2-3-4-5-6') return 750;
  return 0;
}

// ─────────────────────────────────────────────
//  核心计分函数
// ─────────────────────────────────────────────

/**
 * 计算一组骰子（已选中）的得分。
 *
 * 恶魔头（face=0）作为百搭，会被贪心地分配给得分最高的组合。
 * 返回 { score, valid }：
 *   - score: 该组合得分
 *   - valid: 是否为有效得分组合（至少得 1 分）
 */
export function scoreSelection(values: DieFace[]): { score: number; valid: boolean } {
  if (values.length === 0) return { score: 0, valid: false };

  // 先尝试顺子（6枚）
  if (values.length === 6) {
    const straightScore = detectStraight(values);
    if (straightScore > 0) return { score: straightScore, valid: true };
  }

  // 将恶魔头分开
  const jokers = values.filter(v => v === 0).length;
  const normals = values.filter(v => v !== 0) as Exclude<DieFace, 0>[];

  const score = computeScore(normals, jokers);
  return { score, valid: score > 0 };
}

/**
 * 在已知普通骰值和恶魔头数量的情况下，计算最优得分。
 * 恶魔头贪心策略：优先凑三连/多连，其次凑单枚 1 或 5。
 */
function computeScore(normals: Exclude<DieFace, 0>[], jokers: number): number {
  // 递归尝试：将 joker 当作每种可能的面值，取最大分
  if (jokers === 0) return computeScoreNoJokers(normals);

  let best = 0;
  for (const face of [1, 2, 3, 4, 5, 6] as Exclude<DieFace, 0>[]) {
    const score = computeScore([...normals, face], jokers - 1);
    if (score > best) best = score;
  }
  return best;
}

/** 无恶魔头时的纯计分逻辑 */
function computeScoreNoJokers(values: Exclude<DieFace, 0>[]): number {
  if (values.length === 0) return 0;

  // 5枚及以下：尝试顺子
  if (values.length >= 5) {
    const straight = detectStraight(values as DieFace[]);
    if (straight > 0) return straight;
  }

  const counts = countFaces(values as DieFace[]);
  let score = 0;

  for (const [face, count] of counts.entries()) {
    if (face === 0) continue; // 不应出现
    const faceScore = scoreForFaceCount(face as Exclude<DieFace, 0>, count);
    // 所有选中的骰子都必须参与得分，不能包含不得分的骰子
    if (faceScore === 0) return 0;
    score += faceScore;
  }
  return score;
}

/**
 * 单种面值在给定数量下的得分：
 *   < 3：单枚规则（只有 1 和 5 得分）
 *   = 3：三连基础分
 *   > 3：三连基础分 × 2^(count-3)
 */
export function scoreForFaceCount(face: Exclude<DieFace, 0>, count: number): number {
  if (count <= 0) return 0;

  if (count < 3) {
    // 单枚只有 1(100分) 和 5(50分) 得分
    if (face === 1) return 100 * count;
    if (face === 5) return 50 * count;
    return 0;
  }

  // 三连基础分
  const base = face === 1 ? 1000 : face * 100;
  // 每多一枚翻倍：三连=base, 四连=base*2, 五连=base*4, 六连=base*8
  return base * Math.pow(2, count - 3);
}

// ─────────────────────────────────────────────
//  整组骰子的全部有效得分子集（用于验证选择合法性）
// ─────────────────────────────────────────────

/**
 * 判断一组骰子中是否存在至少一个有效得分组合。
 * 用于爆点检测（掷出的骰子完全无法得分）。
 */
export function hasAnyScore(values: DieFace[]): boolean {
  if (values.length === 0) return false;

  // 有恶魔头必然可得分（单枚面值 1）
  if (values.includes(0)) return true;

  // 有 1 或 5 直接得分
  if (values.includes(1) || values.includes(5)) return true;

  // 检查是否有三连以上
  const counts = countFaces(values);
  for (const count of counts.values()) {
    if (count >= 3) return true;
  }

  // 检查顺子
  if (detectStraight(values) > 0) return true;

  return false;
}

/**
 * 验证玩家的选择是否合法（选中的骰子必须构成有效得分组合）。
 */
export function isValidSelection(selectedValues: DieFace[]): boolean {
  return scoreSelection(selectedValues).valid;
}
