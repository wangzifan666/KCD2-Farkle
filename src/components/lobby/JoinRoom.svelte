<script lang="ts">
  import { untrack } from 'svelte';
  import { initRoom, networkState } from '$lib/network/trystero';
  import { sendMessage } from '$lib/network/trystero';
  import { myRole, myName, initMessageHandler, appView } from '$lib/stores/gameStore';

  let {
    initialCode = '',
  }: {
    initialCode?: string;
  } = $props();

  let roomCode = $state(untrack(() => initialCode));
  let playerName = $state('客人');
  let status = $state('idle');
  let joined = $state(false);

  networkState.subscribe(ns => {
    status = ns.status;
  });

  function handleJoin() {
    if (!roomCode.trim()) return;
    myRole.set('guest');
    myName.set(playerName);
    initRoom(roomCode.trim().toUpperCase());
    initMessageHandler();
    joined = true;
  }

  // 连接成功后自动发送 hello
  $effect(() => {
    if (status === 'connected' && joined) {
      sendMessage({ type: 'player_hello', name: playerName });
    }
  });
</script>

<div class="join-room">
  {#if !joined}
    <label class="field">
      <span class="label">你的名字</span>
      <input type="text" bind:value={playerName} maxlength="12" placeholder="输入昵称" />
    </label>

    <label class="field">
      <span class="label">房间码</span>
      <input
        type="text"
        class="code-input"
        bind:value={roomCode}
        maxlength="6"
        placeholder="输入6位房间码"
      />
    </label>

    <button class="btn-primary" onclick={handleJoin} disabled={!roomCode.trim()}>
      加入房间
    </button>

  {:else if status === 'waiting'}
    <div class="waiting">
      <span class="dot-anim"></span>
      正在连接房间 <strong>{roomCode}</strong>…
    </div>

  {:else if status === 'connected'}
    <div class="connected">
      <p class="success">已连接！等待房主开始游戏…</p>
    </div>

  {:else if status === 'disconnected'}
    <p class="error">连接已断开</p>
    <button class="btn-primary" onclick={() => { joined = false; }}>重新加入</button>
  {/if}
</div>

<style>
  .join-room {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
    max-width: 380px;
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

  .code-input {
    font-size: 1.5rem;
    text-align: center;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    font-family: 'Courier New', monospace;
  }

  .waiting {
    color: #8a7a5a;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.95rem;
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

  .connected {
    text-align: center;
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

  .btn-primary:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
