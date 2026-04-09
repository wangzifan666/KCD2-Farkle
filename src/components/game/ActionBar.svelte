<script lang="ts">
  import {
    gameState, isMyTurn, selectionScore, selectedDieIds, awaitingRoll,
    performRoll, confirmSelection, bankScore, handleHotDice,
    isOpponentDisconnected,
  } from '$lib/stores/gameStore';

  let myTurn = $state(false);
  let phase = $state('selecting');
  let rollCount = $state(0);
  let selection = $state({ valid: false, score: 0 });
  let hasSelection = $state(false);
  let turnScoreVal = $state(0);
  let needsRoll = $state(true);
  let opponentOffline = $state(false);

  isMyTurn.subscribe(v => { myTurn = v; });
  gameState.subscribe($s => {
    phase = $s.phase;
    rollCount = $s.rollCount;
    turnScoreVal = $s.turnScore;
  });
  selectionScore.subscribe(v => { selection = v; });
  selectedDieIds.subscribe(ids => { hasSelection = ids.length > 0; });
  awaitingRoll.subscribe(v => { needsRoll = v; });
  isOpponentDisconnected.subscribe(v => { opponentOffline = v; });

  // 可以掷骰：回合开始时 / 锁定骰子后
  const canRoll = $derived(
    myTurn && phase === 'selecting' && needsRoll && !hasSelection && !opponentOffline
  );
  // 可以锁定：刚掷完骰且选择了有效骰子
  const canConfirm = $derived(
    myTurn && phase === 'selecting' && !needsRoll && hasSelection && selection.valid && !opponentOffline
  );
  // 可以结算：锁定后（已有累积分）
  const canBank = $derived(
    myTurn && phase === 'selecting' && needsRoll && turnScoreVal > 0 && !opponentOffline
  );
  const isHotDice = $derived(phase === 'hot_dice');
</script>

<div class="action-bar">
  {#if phase === 'bust'}
    <div class="bust-message">
      <span class="bust-icon">💥</span>
      爆点！分数清零！
    </div>

  {:else if phase === 'game_over'}
    <div class="game-over">
      游戏结束！
    </div>

  {:else if !myTurn}
    <div class="waiting-turn">
      等待对手操作…
    </div>

  {:else if isHotDice}
    <button class="btn-action btn-hot" onclick={handleHotDice} disabled={opponentOffline}>
      🔥 满盘！重新掷全部骰子
    </button>

  {:else}
    <div class="buttons">
      <button
        class="btn-action btn-roll"
        onclick={performRoll}
        disabled={!canRoll}
      >
        🎲 掷骰子
        {#if rollCount === 0}
          <span class="sub">（首掷）</span>
        {/if}
      </button>

      {#if hasSelection}
        <button
          class="btn-action btn-confirm"
          onclick={confirmSelection}
          disabled={!canConfirm}
        >
          ✅ 锁定
          {#if selection.valid}
            <span class="score-preview">+{selection.score}</span>
          {/if}
        </button>
      {/if}

      {#if canBank}
        <button
          class="btn-action btn-bank"
          onclick={bankScore}
        >
          💰 结算 (+{turnScoreVal})
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .action-bar {
    display: flex;
    justify-content: center;
    padding: 1rem;
    width: 100%;
    max-width: 600px;
  }

  .buttons {
    display: flex;
    gap: 0.8rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .btn-action {
    border: none;
    border-radius: 10px;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    font-weight: bold;
    font-family: inherit;
    cursor: pointer;
    transition: transform 0.1s, background 0.15s;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .btn-action:hover:not(:disabled) {
    transform: scale(1.03);
  }

  .btn-action:active:not(:disabled) {
    transform: scale(0.97);
  }

  .btn-action:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .btn-roll {
    background: #d4a843;
    color: #1a1008;
  }

  .btn-roll:hover:not(:disabled) {
    background: #e8bf5a;
  }

  .btn-confirm {
    background: #27ae60;
    color: #fff;
  }

  .btn-confirm:hover:not(:disabled) {
    background: #2ecc71;
  }

  .btn-bank {
    background: #2980b9;
    color: #fff;
  }

  .btn-bank:hover:not(:disabled) {
    background: #3498db;
  }

  .btn-hot {
    background: #e67e22;
    color: #fff;
    font-size: 1.1rem;
    animation: glow 1s ease-in-out infinite alternate;
  }

  @keyframes glow {
    from { box-shadow: 0 0 8px rgba(230, 126, 34, 0.4); }
    to   { box-shadow: 0 0 20px rgba(230, 126, 34, 0.8); }
  }

  .sub {
    font-size: 0.75rem;
    opacity: 0.7;
    font-weight: normal;
  }

  .score-preview {
    font-size: 0.85rem;
    background: rgba(255,255,255,0.2);
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
  }

  .bust-message {
    color: #e74c3c;
    font-size: 1.3rem;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    animation: shake 0.4s ease-in-out;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25%      { transform: translateX(-8px); }
    75%      { transform: translateX(8px); }
  }

  .bust-icon {
    font-size: 2rem;
  }

  .game-over {
    color: #d4a843;
    font-size: 1.5rem;
    font-weight: bold;
  }

  .waiting-turn {
    color: #8a7a5a;
    font-size: 1rem;
  }
</style>
