<script lang="ts">
  import type { Die } from '$lib/game/types';
  import { getDieDefinition } from '$lib/game/diceRegistry';
  import DiceReel from './DiceReel.svelte';

  // ── Props ───────────────────────────────────────
  let {
    dice,
    rolling    = false,
    canSelect  = false,
    selectedIds = [],
    onSelect,
    onAllSettled,
  }: {
    dice:         Die[];
    rolling?:     boolean;
    canSelect?:   boolean;
    selectedIds?: number[];
    onSelect?:    (dieId: number) => void;
    onAllSettled?: () => void;
  } = $props();

  // ── 动画追踪 ────────────────────────────────────
  // 需要动画的骰子数量（active 且未 kept）
  const activeCount = $derived(dice.filter(d => d.active && !d.kept).length);

  let settledCount = $state(0);
  let allSettledFired = false; // 防止 onAllSettled 被多次触发
  let safetyTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    // rolling 重新开始时，重置计数器并设置安全超时
    if (rolling) {
      settledCount = 0;
      allSettledFired = false;
      // 安全超时：如果 2 秒内 onAllSettled 未触发，强制触发
      if (safetyTimer) clearTimeout(safetyTimer);
      safetyTimer = setTimeout(() => {
        if (!allSettledFired) {
          allSettledFired = true;
          settledCount = activeCount;
          onAllSettled?.();
        }
      }, 2000);
    }
    return () => {
      if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
    };
  });

  function handleSettled() {
    settledCount++;
    if (settledCount >= activeCount && !allSettledFired) {
      allSettledFired = true;
      onAllSettled?.();
    }
  }

  function handleClick(die: Die) {
    if (!canSelect || die.kept || rolling) return;
    onSelect?.(die.id);
  }

  // 各骰子动画时长略有随机偏移，模拟真实感（仅在每次 rolling 切换时重新计算）
  const durations = $derived(
    rolling
      ? dice.map(() => 900 + Math.floor(Math.random() * 400))
      : dice.map(() => 1100)
  );
</script>

<div class="dice-group">
  {#each dice as die, i (die.id)}
    {@const def = getDieDefinition(die.type)}
    <div class="die-col">
      <button
        class="die-wrapper"
        class:not-active={!die.active}
        onclick={() => handleClick(die)}
        aria-label={`骰子 ${die.id + 1}`}
        disabled={!canSelect || die.kept || rolling}
      >
        <DiceReel
          value={die.value}
          dieType={die.type}
          rolling={rolling && die.active && !die.kept}
          kept={die.kept}
          selected={selectedIds.includes(die.id)}
          duration={durations[i]}
          onSettled={die.active && !die.kept ? handleSettled : undefined}
        />
      </button>
      {#if die.type !== 'NormalDie'}
        <span class="die-label" style:color={def.color}>{def.shortName}</span>
      {/if}
    </div>
  {/each}
</div>

<style>
  .dice-group {
    display:         flex;
    flex-wrap:       wrap;
    gap:             12px;
    justify-content: center;
    padding:         1rem;
  }

  .die-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .die-label {
    font-size: 0.65rem;
    font-weight: bold;
    white-space: nowrap;
    opacity: 0.85;
  }

  .die-wrapper {
    background:  transparent;
    border:      none;
    padding:     0;
    cursor:      pointer;
    border-radius: 10px;
    /* 悬停时放大 */
    transition:  transform 0.12s;
  }

  .die-wrapper:not([disabled]):hover {
    transform: scale(1.08);
  }

  .die-wrapper[disabled] {
    cursor: default;
  }

  /* 不参与本次掷骰（已 kept 等价）的骰子 */
  .die-wrapper.not-active {
    opacity: 0.35;
    pointer-events: none;
  }
</style>
