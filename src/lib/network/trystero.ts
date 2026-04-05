import { joinRoom } from 'trystero';
import { writable } from 'svelte/store';
import type { GameMessage } from './protocol';

// ─────────────────────────────────────────────
//  配置
// ─────────────────────────────────────────────

// Nostr 信令（trystero 新版默认）：零基础设施，无需服务器
const APP_ID = 'kcd2-farkle-2026';

// ─────────────────────────────────────────────
//  类型
// ─────────────────────────────────────────────

export type ConnectionStatus = 'idle' | 'waiting' | 'connected' | 'disconnected';

export interface NetworkState {
  status: ConnectionStatus;
  roomCode: string | null;
  peerId: string | null;
}

type MessageHandler = (msg: GameMessage, peerId: string) => void;

// ─────────────────────────────────────────────
//  响应式状态（Svelte store）
// ─────────────────────────────────────────────

export const networkState = writable<NetworkState>({
  status: 'idle',
  roomCode: null,
  peerId: null,
});

// ─────────────────────────────────────────────
//  内部变量（模块级单例）
// ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let room: ReturnType<typeof joinRoom> | null = null;
let sendFn: ((msg: GameMessage) => void) | null = null;
let messageHandlers: MessageHandler[] = [];

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
  // 清理旧连接
  room?.leave();

  room = joinRoom({ appId: APP_ID }, roomCode);

  // GameMessage 是纯 JSON 可序列化数据，断言绕过 trystero 的 DataPayload 约束
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [send, receive] = room.makeAction<any>('game');
  sendFn = (msg: GameMessage) => send(msg);

  networkState.set({ status: 'waiting', roomCode, peerId: null });

  room.onPeerJoin((peerId: string) => {
    networkState.update(s => ({ ...s, status: 'connected', peerId }));
  });

  room.onPeerLeave((_peerId: string) => {
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
  room?.leave();
  room = null;
  sendFn = null;
  messageHandlers = [];
  networkState.set({ status: 'idle', roomCode: null, peerId: null });
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
