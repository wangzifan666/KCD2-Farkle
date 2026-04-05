<script lang="ts">
  import { gameState, isMyTurn, awaitingRoll } from '$lib/stores/gameStore';

  let phase      = $state('selecting');
  let rollCount  = $state(0);
  let myTurn     = $state(false);
  let needsRoll  = $state(true);

  gameState.subscribe(s => { phase = s.phase; rollCount = s.rollCount; });
  isMyTurn.subscribe(v  => { myTurn    = v; });
  awaitingRoll.subscribe(v => { needsRoll = v; });

  type Glow = 'none' | 'gold' | 'fire';
  type Info = { icon: string; text: string; glow: Glow };

  function compute(): Info {
    switch (phase) {
      case 'rolling':   return { icon: '🎲', text: '骰子掷出……',        glow: 'gold' };
      case 'hot_dice':  return { icon: '🔥', text: '满盘！命运垂青！',   glow: 'fire' };
      case 'bust':      return { icon: '💀', text: '爆点！本回合清零',   glow: 'none' };
      case 'game_over': return { icon: '🏆', text: '对局结束',           glow: 'none' };
    }
    if (!myTurn) return { icon: '⌛', text: '等待对手出招……',    glow: 'none' };
    if (needsRoll) return rollCount === 0
      ? { icon: '🎲', text: '掷骰，命运在手',        glow: 'none' }
      : { icon: '🎲', text: `第 ${rollCount + 1} 掷——继续！`, glow: 'none' };
    return { icon: '✦', text: '选好要保留的骰子',   glow: 'none' };
  }

  const info = $derived(compute());
</script>

<div
  class="placard"
  class:glow-gold={info.glow === 'gold'}
  class:glow-fire={info.glow === 'fire'}
  class:dim={!myTurn && phase === 'selecting'}
  aria-live="polite"
  aria-label="当前阶段提示"
>
  <span class="rivet rivet-l" aria-hidden="true">◆</span>
  <div class="placard-body">
    <span class="plc-icon" aria-hidden="true">{info.icon}</span>
    <span class="plc-text">{info.text}</span>
  </div>
  <span class="rivet rivet-r" aria-hidden="true">◆</span>
</div>

<style>
  .placard {
    display: flex;
    align-items: center;
    width: 100%;
    /* 木质牌匾底色：中心略亮，模拟烛光从上方打在桌面标牌上 */
    background:
      radial-gradient(ellipse 60% 80% at 50% 30%, rgba(200, 130, 30, 0.10) 0%, transparent 70%),
      linear-gradient(175deg, #2e2210 0%, #231a0c 50%, #1e1609 100%);
    border: 1px solid #7a5220;
    /* 顶部内侧微高光，营造牌匾雕刻感 */
    box-shadow:
      inset 0 1px 0 rgba(255, 210, 100, 0.12),
      inset 0 -1px 0 rgba(0, 0, 0, 0.45),
      0 3px 12px rgba(0, 0, 0, 0.5);
    border-radius: 8px;
    padding: 0.45rem 0.75rem;
    gap: 0.6rem;
    position: relative;
    transition: opacity 0.3s;
  }

  /* 对手回合时整体压暗 */
  .placard.dim {
    opacity: 0.6;
  }

  /* 掷骰中：金色脉冲呼吸 */
  .placard.glow-gold .plc-text,
  .placard.glow-gold .plc-icon {
    animation: pulse-gold 1.1s ease-in-out infinite alternate;
  }
  @keyframes pulse-gold {
    from { text-shadow: 0 0 4px rgba(212, 168, 67, 0.4); }
    to   { text-shadow: 0 0 16px rgba(212, 168, 67, 0.95), 0 0 30px rgba(212, 168, 67, 0.4); }
  }

  /* 满盘：橙火呼吸 */
  .placard.glow-fire .plc-text,
  .placard.glow-fire .plc-icon {
    animation: pulse-fire 0.85s ease-in-out infinite alternate;
  }
  @keyframes pulse-fire {
    from { text-shadow: 0 0 4px rgba(230, 110, 10, 0.5); }
    to   { text-shadow: 0 0 14px rgba(255, 140, 20, 1), 0 0 28px rgba(230, 90, 5, 0.5); }
  }

  /* 铆钉装饰 */
  .rivet {
    font-size: 0.5rem;
    color: rgba(212, 168, 67, 0.45);
    flex-shrink: 0;
    line-height: 1;
    user-select: none;
  }

  /* 中央内容 */
  .placard-body {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    flex: 1;
  }

  .plc-icon {
    font-size: 1rem;
    line-height: 1;
  }

  .plc-text {
    color: #d4a843;
    font-size: 0.92rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    /* 文字本身带微弱金色底光 */
    text-shadow: 0 0 8px rgba(212, 168, 67, 0.25);
    white-space: nowrap;
  }

  @media (max-width: 480px) {
    .plc-text {
      font-size: 0.82rem;
      letter-spacing: 0.03em;
    }
    .plc-icon {
      font-size: 0.9rem;
    }
  }
</style>
