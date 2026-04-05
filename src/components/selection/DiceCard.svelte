<script lang="ts">
  import type { DieDefinition } from '$lib/game/diceRegistry';
  import { CATEGORY_LABELS } from '$lib/game/diceRegistry';
  import DiceFace from '../dice/DiceFace.svelte';
  import type { DieFace } from '$lib/game/types';

  let {
    die,
    selected = false,
    disabled = false,
    onclick,
  }: {
    die: DieDefinition;
    selected?: boolean;
    disabled?: boolean;
    onclick?: () => void;
  } = $props();

  const total = $derived(die.weights.reduce((a, b) => a + b, 0));
  const maxWeight = $derived(Math.max(...die.weights));

  const faces = $derived(die.weights.map((w, i) => ({
    value: (i + 1) as DieFace,
    pct: total > 0 ? Math.round(w / total * 100) : 17,
    // 背景透明度：0.1（最低概率）→ 1.0（最高概率）
    opacity: maxWeight > 0 ? 0.1 + 0.9 * (w / maxWeight) : 0.5,
    isPeak: w === maxWeight,
    isWildcard: die.wildcardFace !== undefined && (i + 1) === die.wildcardFace,
  })));
</script>

<button
  class="dice-card"
  class:selected
  class:disabled
  style:--die-color={die.color}
  onclick={onclick}
  {disabled}
>
  <div class="card-header">
    <span class="card-name">{die.name}</span>
    <span class="card-category">{CATEGORY_LABELS[die.category]}</span>
  </div>

  <div class="face-grid">
    {#each faces as f}
      <div
        class="face-cell"
        class:peak={f.isPeak}
        class:wildcard={f.isWildcard}
        style:--cell-opacity={f.opacity}
        title="面{f.value}: {f.pct}%{f.isPeak ? ' ★最常见' : ''}{f.isWildcard ? ' ⚡百搭' : ''}"
      >
        <div class="face-bg"></div>
        <div class="face-icon">
          <DiceFace value={f.value} />
        </div>
        {#if f.isPeak}
          <span class="peak-badge">★</span>
        {/if}
        {#if f.isWildcard}
          <span class="wildcard-badge">百搭</span>
        {/if}
      </div>
    {/each}
  </div>
</button>

<style>
  .dice-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.6rem 0.8rem;
    background: #2a1e0e;
    border: 2px solid #5a4a2a;
    border-radius: 10px;
    cursor: pointer;
    transition: transform 0.18s ease, border-color 0.15s, box-shadow 0.15s;
    text-align: left;
    font-family: inherit;
    color: #f0e6c8;
    min-width: 0;
  }

  .dice-card:hover:not(.disabled) {
    transform: scale(1.03);
    border-color: var(--die-color, #d4a843);
    box-shadow: 0 0 10px color-mix(in srgb, var(--die-color, #d4a843) 35%, transparent);
  }

  .dice-card.selected {
    border-color: var(--die-color, #d4a843);
    border-left-width: 4px;
    box-shadow: 0 0 14px color-mix(in srgb, var(--die-color, #d4a843) 55%, transparent);
    background: #312510;
  }

  .dice-card.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.3rem;
  }

  .card-name {
    font-weight: bold;
    font-size: 0.9rem;
    color: var(--die-color, #f0e6c8);
  }

  .card-category {
    font-size: 0.7rem;
    color: #8a7a5a;
    background: #1a1008;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    white-space: nowrap;
  }

  /* ── 骰面方格 ── */
  .face-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3px;
  }

  .face-cell {
    position: relative;
    aspect-ratio: 1;
    border-radius: 4px;
    overflow: hidden;
    background: #0f0a05;
    border: 1.5px solid transparent;
  }

  .face-bg {
    position: absolute;
    inset: 0;
    background: var(--die-color, #d4a843);
    opacity: var(--cell-opacity, 0.5);
    border-radius: inherit;
  }

  .face-icon {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    padding: 4px;
    color: #f0e6c8;
  }

  /* 峰值面：die-color 边框 + 顶部左角★角标 */
  .face-cell.peak {
    border-color: var(--die-color, #d4a843);
    box-shadow: 0 0 5px color-mix(in srgb, var(--die-color, #d4a843) 50%, transparent);
  }

  /* 百搭面：红色边框 */
  .face-cell.wildcard {
    border-color: #c0392b;
    box-shadow: 0 0 4px rgba(192, 57, 43, 0.5);
  }

  .peak-badge {
    position: absolute;
    top: 1px;
    right: 2px;
    font-size: 0.45rem;
    color: var(--die-color, #d4a843);
    line-height: 1;
    z-index: 2;
    text-shadow: 0 0 3px rgba(0,0,0,0.8);
  }

  .wildcard-badge {
    position: absolute;
    bottom: 1px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.38rem;
    color: #ff6b5b;
    line-height: 1;
    z-index: 2;
    white-space: nowrap;
    text-shadow: 0 0 3px rgba(0,0,0,0.9);
    font-weight: bold;
  }
</style>
