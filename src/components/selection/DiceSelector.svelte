<script lang="ts">
  import { getSpecialDice, getDiceByCategory, CATEGORY_LABELS } from '$lib/game/diceRegistry';
  import type { DieDefinition, DieCategory } from '$lib/game/diceRegistry';
  import { gameState, diceSelection, confirmDiceSelection } from '$lib/stores/gameStore';
  import DiceCard from './DiceCard.svelte';

  // 订阅 store
  let gs = $state(/** @type {any} */ ({} as any));
  gameState.subscribe(v => { gs = v; });
  let ds = $state(/** @type {any} */ ({} as any));
  diceSelection.subscribe(v => { ds = v; });

  const maxPicks = $derived(gs.config?.specialDiceCount ?? 2);

  // 本地选中（confirmed 前可改）
  let picks = $state<string[]>([]);

  // 可用特殊骰子（按类别分组）— 纯静态数据，无需 $derived
  const specialDice = getSpecialDice();
  const categories = ['lucky', 'evil', 'holy', 'trick', 'special'] as DieCategory[];
  const grouped = categories
    .map(cat => ({ cat, label: CATEGORY_LABELS[cat], dice: getDiceByCategory(cat) }))
    .filter(g => g.dice.length > 0);

  function togglePick(id: string) {
    if (ds.myConfirmed) return;
    if (picks.includes(id)) {
      picks = picks.filter(p => p !== id);
    } else if (picks.length < maxPicks) {
      picks = [...picks, id];
    }
  }

  function handleConfirm() {
    if (picks.length !== maxPicks) return;
    confirmDiceSelection(picks);
  }
</script>

<div class="selector">
  <div class="selector-top">
    <div class="top-title-row">
      <h2>选择特殊骰子</h2>
      <p class="subtitle">请选择 {maxPicks} 枚特殊骰子（对手不可见）</p>
    </div>

    <div class="picks-summary">
      <span class="pick-label">已选 {picks.length} / {maxPicks}：</span>
      {#each picks as id}
        <span class="pick-tag">{specialDice.find(d => d.id === id)?.shortName ?? id}</span>
      {:else}
        <span class="pick-empty">未选择</span>
      {/each}
    </div>

    {#if ds.myConfirmed}
      <div class="waiting-banner">
        <span class="dot-anim"></span>
        已确认，等待对手选择…
      </div>
    {/if}
  </div>

  <div class="category-list">
    {#each grouped as group}
      <div class="category-section">
        <h3 class="cat-title">{group.label}</h3>
        <div class="card-grid">
          {#each group.dice as die}
            <DiceCard
              {die}
              selected={picks.includes(die.id)}
              disabled={ds.myConfirmed || (!picks.includes(die.id) && picks.length >= maxPicks)}
              onclick={() => togglePick(die.id)}
            />
          {/each}
        </div>
      </div>
    {/each}
  </div>

  {#if !ds.myConfirmed}
    <button
      class="btn-confirm"
      disabled={picks.length !== maxPicks}
      onclick={handleConfirm}
    >
      确认选择 ({picks.length}/{maxPicks})
    </button>
  {/if}
</div>

<style>
  /* ── 自定义滚动条（全局，覆盖所有元素）── */
  :global(*) {
    scrollbar-width: thin;
    scrollbar-color: #5a4a2a #1a1008;
  }
  :global(*::-webkit-scrollbar) {
    width: 6px;
    height: 6px;
  }
  :global(*::-webkit-scrollbar-track) {
    background: #1a1008;
    border-radius: 3px;
  }
  :global(*::-webkit-scrollbar-thumb) {
    background: #5a4a2a;
    border-radius: 3px;
  }
  :global(*::-webkit-scrollbar-thumb:hover) {
    background: #d4a843;
  }
  :global(*::-webkit-scrollbar-corner) {
    background: #1a1008;
  }

  /* ── 整体容器（手机：竖向滚动）── */
  .selector {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.8rem;
    padding: 1rem;
    width: 100%;
    max-width: 600px;
    max-height: 100dvh;
    overflow-y: auto;
    box-sizing: border-box;
  }

  .selector-top {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    width: 100%;
    align-items: center;
  }

  .top-title-row {
    text-align: center;
  }

  h2 {
    color: #d4a843;
    font-size: 1.4rem;
    margin: 0;
  }

  .subtitle {
    color: #8a7a5a;
    font-size: 0.9rem;
    margin: 0.2rem 0 0;
  }

  .picks-summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    background: #2a1e0e;
    padding: 0.5rem 0.8rem;
    border-radius: 8px;
    border: 1px solid #5a4a2a;
    width: 100%;
  }

  .pick-label {
    color: #c8b888;
    font-size: 0.85rem;
  }

  .pick-tag {
    background: #d4a843;
    color: #1a1008;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: bold;
  }

  .pick-empty {
    color: #6a5a3a;
    font-size: 0.85rem;
  }

  .waiting-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #7dcea0;
    font-size: 0.9rem;
    padding: 0.5rem 1rem;
    background: rgba(125, 206, 160, 0.1);
    border-radius: 8px;
    width: 100%;
    justify-content: center;
  }

  .dot-anim {
    width: 8px;
    height: 8px;
    background: #7dcea0;
    border-radius: 50%;
    animation: pulse 1.2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50%      { opacity: 1; }
  }

  /* 手机：类别纵向列表 */
  .category-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }

  .category-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .cat-title {
    color: #c8b888;
    font-size: 0.95rem;
    border-bottom: 1px solid #3a2e1a;
    border-left: 3px solid #d4a843;
    padding-bottom: 0.25rem;
    padding-left: 0.6rem;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.5rem;
  }

  .btn-confirm {
    background: #d4a843;
    color: #1a1008;
    border: none;
    border-radius: 8px;
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: bold;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.15s;
    position: sticky;
    bottom: 0.5rem;
    width: 100%;
    max-width: 320px;
  }

  .btn-confirm:hover:not(:disabled) {
    background: #e8bf5a;
  }

  .btn-confirm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ── PC 宽屏布局（≥800px，横铺式）── */
  @media (min-width: 800px) {
    /* 整体恢复竖向滚动，但放宽最大宽度充分利用横向空间 */
    .selector {
      max-width: 1200px;
      padding: 1rem 2rem;
    }

    /* 顶栏横排：标题左、已选居中、等待右 */
    .selector-top {
      flex-direction: row;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem 1.2rem;
    }

    .top-title-row {
      text-align: left;
      flex-shrink: 0;
    }

    .picks-summary {
      flex: 1;
      min-width: 200px;
      width: auto;
    }

    .waiting-banner {
      width: auto;
      flex: 0 1 220px;
    }

    /* 类别仍然竖向堆叠，但每类内部卡片横向多列铺满 */
    .card-grid {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    }

    .btn-confirm {
      position: sticky;
      bottom: 0.5rem;
      max-width: 320px;
    }
  }
</style>
