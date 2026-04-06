<script lang="ts">
  import RulesConfig from '../lobby/RulesConfig.svelte';
  import {
    gameState, myRole, myName, opponentName,
    startGame, rematchLobby,
  } from '$lib/stores/gameStore';
  import type { GameConfig } from '$lib/game/types';
  import type { PlayerId } from '$lib/game/types';

  // ── 响应式状态 ──────────────────────────────────
  let phase      = $state('selecting');
  let winner     = $state<PlayerId | null>(null);
  let players    = $state<{ id: PlayerId; name: string; totalScore: number }[]>([]);
  let config     = $state<GameConfig | null>(null);
  let role       = $state<PlayerId>('host');
  let myNameVal  = $state('玩家');
  let oppName    = $state('对手');

  gameState.subscribe(s => {
    phase   = s.phase;
    winner  = s.winner;
    players = s.players;
    config  = s.config;
  });
  myRole.subscribe(v       => { role      = v; });
  myName.subscribe(v       => { myNameVal = v; });
  opponentName.subscribe(v => { oppName   = v; });

  // ── 派生 ────────────────────────────────────────
  const isHost = $derived(role === 'host');
  const iWon   = $derived(winner !== null && winner === role);

  /** 使用存储的昵称替换 gameState 里的默认名 */
  const hostDisplayName  = $derived(role === 'host' ? myNameVal : oppName);
  const guestDisplayName = $derived(role === 'guest' ? myNameVal : oppName);

  // ── 弹窗内部阶段（仅房主可见） ───────────────────
  let dialogPhase = $state<'result' | 'configuring'>('result');

  // 每次游戏结束都把弹窗重置回结果页
  $effect(() => {
    if (phase === 'game_over') {
      dialogPhase = 'result';
    }
  });

  // ── 按钮处理 ────────────────────────────────────

  /** 选项1：沿用当前骰子设定，重新开始 */
  function handleSame() {
    if (!config) return;
    startGame(config);
  }

  /** 选项2：房主重新配置规则 */
  function handleReconfigure() {
    dialogPhase = 'configuring';
  }

  /** 选项2 确认：用新配置开始 */
  function handleNewConfig(newConfig: GameConfig) {
    startGame(newConfig);
  }

  /** 选项3：所有人返回主界面 */
  function handleLobby() {
    rematchLobby();
  }

  // ── 胜负台词 ────────────────────────────────────
  const WIN_LINES  = ['骰子永与你同在！', '今晚，命运站在你这边。', '酒馆第一掷手，非你莫属！'];
  const LOSE_LINES = ['下次再来，江湖路远。', '好汉不吃眼前亏，下回再较量！', '骰子无情，人有情……'];
  function pickLine(arr: string[]) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  const resultLine = $derived(iWon ? pickLine(WIN_LINES) : pickLine(LOSE_LINES));
</script>

{#if phase === 'game_over'}
  <div class="overlay" role="dialog" aria-modal="true" aria-label="对局结果">
    <div class="dialog">

      <!-- 胜负标题 -->
      <div class="result-header" class:win={iWon} class:lose={!iWon}>
        <span class="result-icon">{iWon ? '👑' : '🎲'}</span>
        <h2 class="result-title">{iWon ? '胜利！' : '落败…'}</h2>
        <p class="result-line">{resultLine}</p>
      </div>

      <!-- 双方比分 -->
      <div class="score-board">
        {#each players as p}
          {@const displayName = p.id === 'host' ? hostDisplayName : guestDisplayName}
          {@const isWinner = p.id === winner}
          <div class="score-row" class:winner={isWinner}>
            <span class="score-name">
              {#if isWinner}<span class="crown" aria-hidden="true">👑</span>{/if}
              {displayName}
            </span>
            <span class="score-value">{p.totalScore}</span>
          </div>
        {/each}
      </div>

      <div class="divider" aria-hidden="true"></div>

      <!-- 操作区 -->
      {#if isHost}
        {#if dialogPhase === 'result'}
          <p class="action-hint">房主，选择下一步：</p>
          <div class="action-buttons">
            <button class="btn-same" onclick={handleSame}>
              🎲 沿用骰子设定，再来一局
            </button>
            <button class="btn-reconfig" onclick={handleReconfigure}>
              ⚙️ 调整骰子数量，再来一局
            </button>
            <button class="btn-lobby" onclick={handleLobby}>
              🚪 结束游戏，返回主界面
            </button>
          </div>
        {:else}
          <p class="action-hint">重新配置规则：</p>
          <RulesConfig onConfirm={handleNewConfig} />
          <button class="btn-back" onclick={() => dialogPhase = 'result'}>
            ← 返回
          </button>
        {/if}
      {:else}
        <p class="waiting-hint">⌛ 等待房主决定下一步…</p>
      {/if}

    </div>
  </div>
{/if}

<style>
  /* ── 遮罩层 ─────────────────────────────────── */
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.72);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1rem;
  }

  /* ── 对话框卡片 ──────────────────────────────── */
  .dialog {
    background:
      radial-gradient(ellipse 70% 50% at 50% 10%, rgba(200, 130, 30, 0.10) 0%, transparent 60%),
      linear-gradient(175deg, #2e2210 0%, #1c1509 60%, #161008 100%);
    border: 1.5px solid #d4a843;
    border-radius: 16px;
    padding: 2rem 1.75rem;
    max-width: 420px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    box-shadow:
      0 0 40px rgba(0, 0, 0, 0.7),
      inset 0 1px 0 rgba(212, 168, 67, 0.18);
    /* 弹窗延迟 1.2s 出现，让烟花先播完 */
    animation: dialog-enter 0.4s ease-out 1.2s both;
  }

  @keyframes dialog-enter {
    from { opacity: 0; transform: scale(0.88) translateY(10px); }
    to   { opacity: 1; transform: scale(1)   translateY(0);     }
  }

  /* ── 胜负标题区 ──────────────────────────────── */
  .result-header {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
  }

  .result-icon {
    font-size: 2.5rem;
    line-height: 1;
  }

  .result-title {
    font-size: 1.8rem;
    font-weight: bold;
    margin: 0;
  }
  .result-header.win  .result-title { color: #d4a843; }
  .result-header.lose .result-title { color: #a0b898; }

  .result-line {
    color: #9a8870;
    font-size: 0.88rem;
    font-style: italic;
    margin: 0;
  }

  /* ── 比分栏 ──────────────────────────────────── */
  .score-board {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .score-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(122, 82, 32, 0.4);
    color: #c8b888;
    font-size: 1rem;
  }

  .score-row.winner {
    border-color: #d4a843;
    background: rgba(212, 168, 67, 0.08);
    color: #f0e6c8;
  }

  .score-name {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .crown {
    font-size: 0.9rem;
  }

  .score-value {
    font-size: 1.25rem;
    font-weight: bold;
    font-variant-numeric: tabular-nums;
  }
  .score-row.winner .score-value { color: #d4a843; }

  /* ── 分割线 ──────────────────────────────────── */
  .divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, #7a5220 30%, #7a5220 70%, transparent);
    opacity: 0.6;
  }

  /* ── 操作区文字提示 ──────────────────────────── */
  .action-hint {
    color: #9a8870;
    font-size: 0.88rem;
    text-align: center;
    margin: 0;
  }

  .waiting-hint {
    color: #9a8870;
    font-size: 0.95rem;
    text-align: center;
    padding: 0.5rem 0;
    margin: 0;
  }

  /* ── 操作按钮组 ──────────────────────────────── */
  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  /* 共用按钮底样 */
  .btn-same,
  .btn-reconfig,
  .btn-lobby,
  .btn-back {
    width: 100%;
    border: none;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 0.95rem;
    font-weight: bold;
    font-family: inherit;
    cursor: pointer;
    transition: filter 0.15s, transform 0.1s;
  }
  .btn-same:hover,
  .btn-reconfig:hover,
  .btn-lobby:hover,
  .btn-back:hover {
    filter: brightness(1.12);
  }
  .btn-same:active,
  .btn-reconfig:active,
  .btn-lobby:active,
  .btn-back:active {
    transform: scale(0.97);
  }

  /* 金色：主要行动（再来一局） */
  .btn-same {
    background: #d4a843;
    color: #1a1008;
  }

  /* 次要：调整设定 */
  .btn-reconfig {
    background: #2e2210;
    color: #d4a843;
    border: 1.5px solid #d4a843;
  }

  /* 暗红：离开 */
  .btn-lobby {
    background: #3a1a0e;
    color: #c8a090;
    border: 1.5px solid #6a3020;
  }

  /* 返回（配置页） */
  .btn-back {
    background: transparent;
    color: #9a8870;
    border: 1px solid #5a4a2a;
    margin-top: 0.5rem;
  }
</style>
