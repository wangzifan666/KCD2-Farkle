import { joinRoom } from '@trystero-p2p/mqtt';
import { writable } from 'svelte/store';
import type { GameMessage } from './protocol';

// ─────────────────────────────────────────────
//  配置
// ─────────────────────────────────────────────

// MQTT 信令：使用公共 MQTT broker，国内网络可达性远优于 Nostr
const APP_ID = 'kcd2-farkle-2026';

/**
 * 中国优先的 MQTT broker 列表（均为免费公共服务，走 WSS 443/8084 端口）。
 * - broker-cn.emqx.io：EMQ X 中国区专用节点，国内延迟最低
 * - broker.emqx.io：EMQ X 全球节点（中国公司，国内线路稳定）
 * - broker.hivemq.com：HiveMQ 全球 CDN，欧美网络备用
 * - test.mosquitto.org：Eclipse 官方测试服务器（最后兜底）
 */
const CN_FRIENDLY_RELAY_URLS = [
  'wss://broker-cn.emqx.io:8084/mqtt',
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
];

// ─────────────────────────────────────────────
//  类型
// ─────────────────────────────────────────────

export type ConnectionStatus =
  | 'idle'
  | 'signaling'      // 已发起请求，正在连接 Nostr 信令服务器
  | 'waiting_peer'   // 信令已就绪，等待对手加入房间
  | 'connected'      // P2P 通道已建立
  | 'disconnected'   // 对手断开
  | 'timeout';       // 等待超时（30s 内无对手加入）

export interface NetworkState {
  status: ConnectionStatus;
  roomCode: string | null;
  peerId: string | null;
  /** 进入 waiting_peer 状态的时间戳（ms），用于 UI 计算已等待秒数 */
  waitingSince: number | null;
}

type MessageHandler = (msg: GameMessage, peerId: string) => void;

// ─────────────────────────────────────────────
//  响应式状态（Svelte store）
// ─────────────────────────────────────────────

export const networkState = writable<NetworkState>({
  status: 'idle',
  roomCode: null,
  peerId: null,
  waitingSince: null,
});

// ─────────────────────────────────────────────
//  内部变量（模块级单例）
// ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let room: ReturnType<typeof joinRoom> | null = null;
let sendFn: ((msg: GameMessage) => void) | null = null;
let messageHandlers: MessageHandler[] = [];

/** 阶段切换：3s 后从 signaling → waiting_peer（MQTT broker 握手约需 1-3s） */
let signalingTimer: ReturnType<typeof setTimeout> | null = null;
/** 连接超时：60s 内无对手加入 → timeout（国内网络预留更多时间） */
let connectionTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

const SIGNALING_PHASE_MS = 3000;
const CONNECTION_TIMEOUT_MS = 60_000;

function clearConnectionTimers() {
  if (signalingTimer !== null) { clearTimeout(signalingTimer); signalingTimer = null; }
  if (connectionTimeoutTimer !== null) { clearTimeout(connectionTimeoutTimer); connectionTimeoutTimer = null; }
}

// ─────────────────────────────────────────────
//  房间操作
// ─────────────────────────────────────────────

/**
 * 加入（或创建）房间。
 * 房主和加入方调用相同函数——Trystero 通过相同 roomCode 自动撮合。
 * 第一个进入的人等待，第二个进入后双方 onPeerJoin 都触发，连接建立。
 *
 * @param roomCode  6位房间码（大写字母+数字）
 */
export function initRoom(roomCode: string): void {
  // 清理旧连接和计时器
  clearConnectionTimers();
  room?.leave();

  room = joinRoom({ appId: APP_ID, relayUrls: CN_FRIENDLY_RELAY_URLS }, roomCode);

  // GameMessage 是纯 JSON 可序列化数据，断言绕过 trystero 的 DataPayload 约束
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [send, receive] = room.makeAction<any>('game');
  sendFn = (msg: GameMessage) => send(msg);

  // 阶段 1：信令连接中（正在连接 MQTT broker）
  networkState.set({ status: 'signaling', roomCode, peerId: null, waitingSince: null });
  console.log(`[Network] initRoom: 进入 signaling 阶段 (MQTT), roomCode=${roomCode}`);

  // 2.5s 后切换到「等待对手」阶段（Nostr 信令通常在此之前已就绪）
  signalingTimer = setTimeout(() => {
    signalingTimer = null;
    networkState.update(s => {
      if (s.status === 'signaling') {
        console.log('[Network] 信令阶段完成，进入 waiting_peer 阶段');
        return { ...s, status: 'waiting_peer', waitingSince: Date.now() };
      }
      return s;
    });
  }, SIGNALING_PHASE_MS);

  // 30s 内未收到对手 → 超时
  connectionTimeoutTimer = setTimeout(() => {
    connectionTimeoutTimer = null;
    networkState.update(s => {
      if (s.status === 'signaling' || s.status === 'waiting_peer') {
        console.warn('[Network] 连接超时（30s）');
        return { ...s, status: 'timeout', waitingSince: null };
      }
      return s;
    });
    // 超时后清理 room，节省资源
    room?.leave();
    room = null;
    sendFn = null;
  }, CONNECTION_TIMEOUT_MS);

  room.onPeerJoin((peerId: string) => {
    clearConnectionTimers();
    console.log(`[Network] 对手加入，P2P 通道建立 peerId=${peerId}`);
    networkState.update(s => ({ ...s, status: 'connected', peerId, waitingSince: null }));
  });

  room.onPeerLeave((_peerId: string) => {
    console.log('[Network] 对手离开，连接断开');
    networkState.update(s => ({ ...s, status: 'disconnected', peerId: null }));
  });

  receive((msg: unknown, peerId: string) => {
    messageHandlers.forEach(h => h(msg as GameMessage, peerId));
  });
}

/** 发送消息给对手 */
export function sendMessage(msg: GameMessage): void {
  sendFn?.(msg);
}

/** 离开当前房间，清理所有状态 */
export function leaveRoom(): void {
  clearConnectionTimers();
  room?.leave();
  room = null;
  sendFn = null;
  messageHandlers = [];
  networkState.set({ status: 'idle', roomCode: null, peerId: null, waitingSince: null });
}

// ─────────────────────────────────────────────
//  消息订阅
// ─────────────────────────────────────────────

/**
 * 订阅来自对手的消息。
 * @returns 取消订阅函数
 */
export function onMessage(handler: MessageHandler): () => void {
  messageHandlers.push(handler);
  return () => {
    messageHandlers = messageHandlers.filter(h => h !== handler);
  };
}

// ─────────────────────────────────────────────
//  手动连接模式支持接口
// ─────────────────────────────────────────────

/**
 * 允许手动 SDP 连接模式接管发送通道。
 * 调用后 sendMessage() 将通过外部提供的函数发送，而非 MQTT DataChannel。
 */
export function overrideSendFn(fn: (msg: GameMessage) => void): void {
  sendFn = fn;
}

/**
 * 将收到的消息派发给所有已注册的 handler。
 * 供手动连接模式在 DataChannel.onmessage 中调用，接入统一消息路由。
 */
export function dispatchMessage(msg: GameMessage, peerId: string): void {
  messageHandlers.forEach(h => h(msg, peerId));
}

// ─────────────────────────────────────────────
//  URL 工具
// ─────────────────────────────────────────────

/**
 * 生成可分享的房间链接。
 * 自动适配：
 *   开发模式 → http://localhost:5173/?room=XXXXXX
 *   生产模式 → https://user.github.io/KCD2-Farkle/?room=XXXXXX
 */
export function getRoomUrl(roomCode: string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('room', roomCode);
  return url.toString();
}

/** 生成随机 6 位房间码（大写字母 + 数字，排除易混淆字符） */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除 0/O/1/I
  return Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map(b => chars[b % chars.length])
    .join('');
}

/** 从当前页面 URL 读取房间码 */
export function getRoomCodeFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('room');
}
