// ─────────────────────────────────────────────
//  Commit-Reveal 方案
//  用于猜拳先手和骰子掷点的公平性保证
//  流程：
//    1. 发起方: createCommitment(value) → 发送 { commitment }
//    2. 接收方确认后: 发起方发送 { value, nonce }
//    3. 接收方: verifyCommitment(commitment, value, nonce) 验证
// ─────────────────────────────────────────────

/** SHA-256 哈希，返回 hex 字符串 */
async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** 生成 16 字节的随机 nonce（hex 字符串） */
export function generateNonce(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 创建承诺：对 (value + nonce) 做 SHA-256
 * @param value 要承诺的值（猜拳选择 or 种子字符串）
 * @returns { commitment, nonce } — commitment 发出去，nonce 自己保存
 */
export async function createCommitment(
  value: string
): Promise<{ commitment: string; nonce: string }> {
  const nonce = generateNonce();
  const commitment = await sha256(value + nonce);
  return { commitment, nonce };
}

/**
 * 验证承诺：确认对方揭示的 (value, nonce) 与之前的 commitment 一致
 * @returns true = 诚实，false = 作弊/篡改
 */
export async function verifyCommitment(
  commitment: string,
  value: string,
  nonce: string
): Promise<boolean> {
  const expected = await sha256(value + nonce);
  // 使用 timingSafeEqual 替代字符串比较防止时序攻击
  // 在 Web Crypto 环境下，直接字符串比较即可（非服务端关键路径）
  return expected === commitment;
}

/**
 * 生成用于骰子掷点的随机 32 位无符号整数种子
 * 配合 commitReveal 使用：createCommitment(seed.toString())
 */
export function generateSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] >>> 0;
}

/**
 * 从 URL 查询参数读取房间码
 * 开发模式 (localhost) 和生产模式 (GitHub Pages) 均适用
 */
export function getRoomCodeFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('room');
}
