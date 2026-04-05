<script lang="ts">
  import { getDieDefinition } from '$lib/game/diceRegistry';
  import type { DieDefinition } from '$lib/game/diceRegistry';
  import { gameState, diceSelection, myRole, makeDraftPick } from '$lib/stores/gameStore';
  import type { PlayerId } from '$lib/game/types';
  import DiceCard from './DiceCard.svelte';

  let gs = $state({} as any);
  gameState.subscribe(v => { gs = v; });
  let ds = $state({} as any);
  diceSelection.subscribe(v => { ds = v; });
  let role = $state<PlayerId>('host');
  myRole.subscribe(v => { role = v; });

  const maxPicks = $derived(gs.config?.specialDiceCount ?? 2);
  const isMyTurn = $derived(ds.draftTurn === role);

  // 从池中获取骰子定义
  const poolDice = $derived<DieDefinition[]>(
    (ds.draftPool ?? [])
      .filter((id: string) => id !== '')
      .map((id: string) => getDieDefinition(id))
  );

  // 我的已选骰子
  const myPickDefs = $derived<DieDefinition[]>(
    (ds.myPicks ?? []).map((id: string) => getDieDefinition(id))
  );

  // 对手已选骰子
  const opPickDefs = $derived<DieDefinition[]>(
    (ds.opponentPicks ?? []).map((id: string) => getDieDefinition(id))
  );

  function handlePick(id: string) {
    if (!isMyTurn) return;
    makeDraftPick(id);
  }
</script>

<div class="draft">
  <h2>轮流抓取骰子</h2>
  <p class="subtitle">每人选择 {maxPicks} 枚，互不重复</p>

  <!-- 轮次提示 -->
  <div class="turn-indicator" class:my-turn={isMyTurn}>
    {#if ds.draftTurn === null}
      选择完毕！
    {:else if isMyTurn}
      轮到你抓取！
    {:else}
      等待对手抓取…
    {/if}
  </div>

  <!-- 双方已选 -->
  <div class="picks-row">
    <div class="pick-column">
      <span class="pick-header">我的骰子</span>
      {#each myPickDefs as d}
        <span class="pick-chip" style:--c={d.color}>{d.shortName}</span>
      {:else}
        <span class="pick-none">—</span>
      {/each}
    </div>
    <div class="pick-column">
      <span class="pick-header">对手骰子</span>
      {#each opPickDefs as d}
        <span class="pick-chip" style:--c={d.color}>{d.shortName}</span>
      {:else}
        <span class="pick-none">—</span>
      {/each}
    </div>
  </div>

  <!-- 抓取池 -->
  {#if poolDice.length > 0}
    <div class="pool">
      <h3 class="pool-title">可选骰子池 ({poolDice.length} 枚)</h3>
      <div class="card-grid">
        {#each poolDice as die, idx}
          <DiceCard
            {die}
            selected={false}
            disabled={!isMyTurn}
            onclick={() => handlePick((ds.draftPool ?? [])[idx])}
          />
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .draft {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    max-width: 600px;
    width: 100%;
    max-height: 100dvh;
    overflow-y: auto;
  }

  h2 {
    color: #d4a843;
    font-size: 1.4rem;
    margin: 0;
  }

  .subtitle {
    color: #8a7a5a;
    font-size: 0.9rem;
  }

  .turn-indicator {
    font-size: 1.1rem;
    color: #8a7a5a;
    padding: 0.5rem 1.2rem;
    border-radius: 8px;
    background: #2a1e0e;
    border: 1px solid #5a4a2a;
    text-align: center;
    width: 100%;
  }

  .turn-indicator.my-turn {
    color: #d4a843;
    border-color: #d4a843;
    background: rgba(212, 168, 67, 0.1);
    animation: glow-pulse 1.5s ease-in-out infinite;
  }

  @keyframes glow-pulse {
    0%, 100% { box-shadow: 0 0 4px rgba(212, 168, 67, 0.2); }
    50%      { box-shadow: 0 0 12px rgba(212, 168, 67, 0.4); }
  }

  .picks-row {
    display: flex;
    gap: 1rem;
    width: 100%;
  }

  .pick-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    background: #2a1e0e;
    padding: 0.5rem;
    border-radius: 8px;
    border: 1px solid #3a2e1a;
  }

  .pick-header {
    font-size: 0.8rem;
    color: #8a7a5a;
    margin-bottom: 0.2rem;
  }

  .pick-chip {
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: bold;
    background: color-mix(in srgb, var(--c, #c8b888) 25%, #2a1e0e);
    color: var(--c, #c8b888);
    border: 1px solid var(--c, #5a4a2a);
  }

  .pick-none {
    color: #5a4a2a;
    font-size: 0.85rem;
  }

  .pool {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .pool-title {
    color: #c8b888;
    font-size: 0.95rem;
    border-bottom: 1px solid #3a2e1a;
    padding-bottom: 0.3rem;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 0.5rem;
  }
</style>
