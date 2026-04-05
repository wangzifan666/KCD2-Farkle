<script lang="ts">
  import type { GameConfig, SelectionMode } from '$lib/game/types';
  import { DEFAULT_CONFIG } from '$lib/game/types';
  import { validateConfig } from '$lib/game/rules';

  let {
    onConfirm,
  }: {
    onConfirm: (config: GameConfig) => void;
  } = $props();

  let targetScore = $state(DEFAULT_CONFIG.targetScore);
  let badgesEnabled = $state(false);
  let specialDiceCount = $state<0 | 1 | 2 | 3>(DEFAULT_CONFIG.specialDiceCount);
  let selectionMode = $state<SelectionMode>(DEFAULT_CONFIG.selectionMode);
  let errors = $state<string[]>([]);

  function handleConfirm() {
    const config: GameConfig = {
      targetScore,
      badgesEnabled,
      specialDiceCount,
      selectionMode,
      activeBadges: [],
    };

    const errs = validateConfig(config);
    if (errs.length > 0) {
      errors = errs;
      return;
    }

    errors = [];
    onConfirm(config);
  }
</script>

<div class="rules-config">
  <h2>游戏规则设置</h2>

  <label class="field">
    <span class="label">目标分数</span>
    <input
      type="number"
      min="500"
      max="10000"
      step="500"
      bind:value={targetScore}
    />
  </label>

  <label class="field">
    <span class="label">徽章系统</span>
    <div class="toggle-row">
      <input type="checkbox" bind:checked={badgesEnabled} disabled />
      <span class="hint">（即将推出）</span>
    </div>
  </label>

  <label class="field">
    <span class="label">特殊骰子数量</span>
    <div class="btn-group">
      {#each ([0, 1, 2, 3] as const) as n}
        <button
          class="btn-option"
          class:active={specialDiceCount === n}
          onclick={() => specialDiceCount = n}
        >
          {n === 0 ? '不使用' : n}
        </button>
      {/each}
    </div>
    <span class="hint">
      {specialDiceCount === 0 ? '全程使用普通骰子，直接猜拳决定先后手' : '每人可选择的特殊骰子上限'}
    </span>
  </label>

  {#if specialDiceCount > 0}
  <label class="field">
    <span class="label">选骰模式</span>
    <div class="btn-group">
      <button
        class="btn-option"
        class:active={selectionMode === 'free'}
        onclick={() => selectionMode = 'free'}
      >
        自由选择
      </button>
      <button
        class="btn-option"
        class:active={selectionMode === 'draft'}
        onclick={() => selectionMode = 'draft'
        }
      >
        轮流抓取
      </button>
    </div>
    <span class="hint">{selectionMode === 'free' ? '双方自由搭配，无限制' : '猜拳定序，轮流抓取，互不重复'}</span>
  </label>
  {/if}

  {#if errors.length > 0}
    <div class="errors">
      {#each errors as err}
        <p class="error">{err}</p>
      {/each}
    </div>
  {/if}

  <button class="btn-primary" onclick={handleConfirm}>
    确认规则，开始游戏
  </button>
</div>

<style>
  .rules-config {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    padding: 1.5rem;
    background: #2a1e0e;
    border: 1px solid #5a4a2a;
    border-radius: 12px;
    max-width: 380px;
    width: 100%;
  }

  h2 {
    color: #d4a843;
    font-size: 1.3rem;
    text-align: center;
    margin-bottom: 0.5rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .label {
    color: #c8b888;
    font-size: 0.9rem;
  }

  input[type="number"] {
    background: #1a1008;
    border: 1px solid #5a4a2a;
    border-radius: 6px;
    color: #f0e6c8;
    padding: 0.5rem 0.75rem;
    font-size: 1rem;
    font-family: inherit;
    width: 100%;
  }

  input[type="number"]:focus {
    outline: none;
    border-color: #d4a843;
  }

  .toggle-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  input[type="checkbox"] {
    accent-color: #d4a843;
    width: 18px;
    height: 18px;
  }

  .hint {
    color: #6a5a3a;
    font-size: 0.8rem;
  }

  .errors {
    background: rgba(192, 57, 43, 0.15);
    padding: 0.5rem;
    border-radius: 6px;
  }

  .error {
    color: #e74c3c;
    font-size: 0.85rem;
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

  .btn-group {
    display: flex;
    gap: 0.5rem;
  }

  .btn-option {
    flex: 1;
    background: #1a1008;
    border: 1px solid #5a4a2a;
    border-radius: 6px;
    color: #c8b888;
    padding: 0.5rem 0.75rem;
    font-size: 0.95rem;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-option:hover {
    border-color: #d4a843;
    color: #f0e6c8;
  }

  .btn-option.active {
    background: #d4a843;
    color: #1a1008;
    border-color: #d4a843;
    font-weight: bold;
  }
</style>
