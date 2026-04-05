<script lang="ts">
  import { generateRoomCode, getRoomUrl, initRoom } from '$lib/network/trystero';
  import { networkState } from '$lib/network/trystero';
  import { myRole, myName, opponentName, initMessageHandler, startGame } from '$lib/stores/gameStore';
  import { sendMessage } from '$lib/network/trystero';
  import type { GameConfig } from '$lib/game/types';
  import RulesConfig from './RulesConfig.svelte';

  let roomCode = $state('');
  let shareUrl = $state('');
  let copied   = $state(false);
  let showRules = $state(false);
  let playerName = $state('房主');

  function handleCreate() {
    roomCode = generateRoomCode();
    shareUrl = getRoomUrl(roomCode);
    myRole.set('host');
    myName.set(playerName);
    initRoom(roomCode);
    initMessageHandler();
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    copied = true;
    setTimeout(() => copied = false, 2000);
  }

  function handleStartGame(config: GameConfig) {
    // 发送自身名字
    sendMessage({ type: 'player_ack', hostName: playerName });
    startGame(config);
  }

  // 监听连接状态
  let status = $state('idle');
  networkState.subscribe(ns => {
    status = ns.status;
  });
</script>

<div class="create-room">
  {#if !roomCode}
    <!-- 尚未创建房间 -->
    <label class="field">
      <span class="label">你的名字</span>
      <input type="text" bind:value={playerName} maxlength="12" placeholder="输入昵称" />
    </label>
    <button class="btn-primary" onclick={handleCreate}>创建房间</button>

  {:else if status === 'waiting'}
    <!-- 房间已创建，等待对手 -->
    <div class="room-info">
      <p class="room-label">房间码</p>
      <p class="room-code">{roomCode}</p>
      <p class="hint">将以下链接发送给好友：</p>
      <div class="share-row">
        <input type="text" class="share-input" value={shareUrl} readonly />
        <button class="btn-copy" onclick={handleCopy}>
          {copied ? '已复制 ✓' : '复制'}
        </button>
      </div>
      <div class="waiting">
        <span class="dot-anim"></span>
        等待对手加入…
      </div>
    </div>

  {:else if status === 'connected'}
    <!-- 对手已连接 -->
    {#if !showRules}
      <div class="connected-info">
        <p class="success">对手已连接！</p>
        <button class="btn-primary" onclick={() => showRules = true}>
          设置规则
        </button>
      </div>
    {:else}
      <RulesConfig onConfirm={handleStartGame} />
    {/if}

  {:else if status === 'disconnected'}
    <p class="error">对手已断开连接</p>
    <button class="btn-primary" onclick={handleCreate}>重建房间</button>
  {/if}
</div>

<style>
  .create-room {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
    max-width: 420px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    width: 100%;
  }

  .label {
    color: #c8b888;
    font-size: 0.9rem;
  }

  input[type="text"] {
    background: #1a1008;
    border: 1px solid #5a4a2a;
    border-radius: 6px;
    color: #f0e6c8;
    padding: 0.5rem 0.75rem;
    font-size: 1rem;
    font-family: inherit;
    width: 100%;
  }

  input[type="text"]:focus {
    outline: none;
    border-color: #d4a843;
  }

  .room-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.8rem;
    width: 100%;
  }

  .room-label {
    color: #8a7a5a;
    font-size: 0.85rem;
  }

  .room-code {
    font-size: 2.5rem;
    font-weight: bold;
    color: #d4a843;
    letter-spacing: 0.3em;
    font-family: 'Courier New', monospace;
  }

  .hint {
    color: #8a7a5a;
    font-size: 0.85rem;
  }

  .share-row {
    display: flex;
    gap: 0.5rem;
    width: 100%;
  }

  .share-input {
    flex: 1;
    background: #1a1008;
    border: 1px solid #5a4a2a;
    border-radius: 6px;
    color: #8a7a5a;
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
    font-family: monospace;
  }

  .btn-copy {
    background: #3a2e1a;
    color: #d4a843;
    border: 1px solid #5a4a2a;
    border-radius: 6px;
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
    cursor: pointer;
    white-space: nowrap;
    font-family: inherit;
  }

  .btn-copy:hover {
    background: #4a3e2a;
  }

  .waiting {
    color: #8a7a5a;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .dot-anim {
    width: 8px;
    height: 8px;
    background: #d4a843;
    border-radius: 50%;
    animation: pulse 1.2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50%      { opacity: 1; }
  }

  .connected-info {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }

  .success {
    color: #7dcea0;
    font-size: 1.1rem;
  }

  .error {
    color: #e74c3c;
  }

  .btn-primary {
    background: #d4a843;
    color: #1a1008;
    border: none;
    border-radius: 8px;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    font-weight: bold;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-primary:hover {
    background: #e8bf5a;
  }
</style>
