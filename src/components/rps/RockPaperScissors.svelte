<script lang="ts">
  import { untrack } from 'svelte';
  import { rpsState, submitRpsChoice } from '$lib/stores/gameStore';
  import type { RpsChoice } from '$lib/network/protocol';
  import type { RpsState } from '$lib/stores/gameStore';

  const CHOICES: { id: RpsChoice; emoji: string; label: string }[] = [
    { id: 'rock',     emoji: '✊', label: '石头' },
    { id: 'scissors', emoji: '✌️', label: '剪刀' },
    { id: 'paper',    emoji: '✋', label: '布' },
  ];

  const RESULT_TEXT: Record<string, string> = {
    me:   '你赢了！你先掷骰子！',
    them: '对手赢了！对手先掷骰子。',
    draw: '平局！再来一次…',
  };

  let currentState = $state<RpsState>({ step: 'choosing' });
  rpsState.subscribe(v => { currentState = v; });

  // 辅助：在模板分支中安全访问带类型的字段
  const waitMyChoice = $derived(
    currentState.step === 'waiting' ? currentState.myChoice : null
  );
  const resultData = $derived(
    currentState.step === 'result' ? currentState : null
  );
</script>

<div class="rps">
  <h2>猜拳决定先手</h2>

  {#if currentState?.step === 'choosing'}
    <p class="instruction">请选择：</p>
    <div class="choices">
      {#each CHOICES as choice}
        <button class="rps-btn" onclick={() => submitRpsChoice(choice.id)}>
          <span class="emoji">{choice.emoji}</span>
          <span class="label">{choice.label}</span>
        </button>
      {/each}
    </div>

  {:else if currentState?.step === 'waiting'}
    <div class="waiting-state">
      <p class="your-choice">
        你选了：<span class="emoji-large">{CHOICES.find(c => c.id === waitMyChoice)?.emoji}</span>
      </p>
      <div class="waiting">
        <span class="dot-anim"></span>
        等待对手出招…
      </div>
    </div>

  {:else if currentState?.step === 'result'}
    <div class="result-state">
      <div class="versus">
        <div class="side">
          <span class="side-label">你</span>
          <span class="emoji-xl">{CHOICES.find(c => c.id === resultData?.myChoice)?.emoji}</span>
        </div>
        <span class="vs">VS</span>
        <div class="side">
          <span class="side-label">对手</span>
          <span class="emoji-xl">{CHOICES.find(c => c.id === resultData?.theirChoice)?.emoji}</span>
        </div>
      </div>
      <p class="result-text" class:win={resultData?.winner === 'me'} class:lose={resultData?.winner === 'them'}>
        {resultData?.winner ? RESULT_TEXT[resultData.winner] : ''}
      </p>
    </div>
  {/if}
</div>

<style>
  .rps {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 2rem 1rem;
  }

  h2 {
    color: #d4a843;
    font-size: 1.5rem;
  }

  .instruction {
    color: #c8b888;
    font-size: 1rem;
  }

  .choices {
    display: flex;
    gap: 1rem;
  }

  .rps-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    background: #2a1e0e;
    border: 2px solid #5a4a2a;
    border-radius: 12px;
    padding: 1.2rem 1.5rem;
    cursor: pointer;
    transition: border-color 0.15s, transform 0.1s;
    font-family: inherit;
  }

  .rps-btn:hover {
    border-color: #d4a843;
    transform: scale(1.05);
  }

  .rps-btn:active {
    transform: scale(0.95);
  }

  .emoji {
    font-size: 2.5rem;
  }

  .label {
    color: #c8b888;
    font-size: 0.9rem;
  }

  .waiting-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .your-choice {
    color: #c8b888;
    font-size: 1rem;
  }

  .emoji-large {
    font-size: 2rem;
  }

  .waiting {
    color: #8a7a5a;
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

  .result-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  .versus {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .side {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
  }

  .side-label {
    color: #8a7a5a;
    font-size: 0.85rem;
  }

  .emoji-xl {
    font-size: 4rem;
  }

  .vs {
    color: #5a4a2a;
    font-size: 1.5rem;
    font-weight: bold;
  }

  .result-text {
    font-size: 1.2rem;
    color: #c8b888;
    font-weight: bold;
  }

  .result-text.win {
    color: #7dcea0;
  }

  .result-text.lose {
    color: #e74c3c;
  }
</style>
