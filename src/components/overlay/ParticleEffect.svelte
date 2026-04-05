<script lang="ts">
  import { onDestroy } from 'svelte';
  import { celebrationLevel } from '$lib/stores/gameStore';

  type Particle = {
    id: number;
    symbol: string;
    x: number;       // % from left edge
    delay: number;   // ms
    duration: number; // ms
    size: number;    // rem
    spin: number;    // total rotation in deg (can be negative)
    wobble: number;  // horizontal drift amplitude px
  };

  const COIN  = '🪙';
  const DICE  = '🎲';
  const SPARK = '✨';

  let particles = $state<Particle[]>([]);
  let glowActive = $state(false);
  let clearTimer: ReturnType<typeof setTimeout> | null = null;
  let pid = 0;

  /** Uniform random in [min, max) */
  function rand(min: number, max: number) {
    return min + Math.random() * (max - min);
  }

  function buildParticles(lv: number): Particle[] {
    const out: Particle[] = [];

    const add = (symbol: string, count: number, xMin: number, xMax: number) => {
      for (let i = 0; i < count; i++) {
        out.push({
          id: ++pid,
          symbol,
          x: rand(xMin, xMax),
          delay: rand(0, 900),
          duration: rand(1100, 1900),
          size: rand(1.3, 2.3),
          spin: rand(-720, 720),
          wobble: rand(20, 60) * (Math.random() < 0.5 ? 1 : -1),
        });
      }
    };

    if (lv === 1) {
      // 小庆祝：少量金币，集中在中央
      add(COIN, 9, 25, 75);
    } else if (lv === 2) {
      // 中庆祝：满屏金币 + 几枚骰子
      add(COIN, 16, 5, 95);
      add(DICE,  4, 10, 90);
    } else {
      // 大庆祝：铺天盖地金币 + 骰子 + 火花
      add(COIN,  22, 3, 97);
      add(DICE,   6, 5, 95);
      add(SPARK,  6, 5, 95);
    }

    // 打乱顺序让不同符号在时间轴上交错
    return out.sort(() => Math.random() - 0.5);
  }

  const unsub = celebrationLevel.subscribe(lv => {
    if (lv === 0) return;

    particles = buildParticles(lv);
    glowActive = lv >= 3;

    if (clearTimer) clearTimeout(clearTimer);
    // max delay(900) + max duration(1900) + 600ms 缓冲
    clearTimer = setTimeout(() => {
      particles = [];
      glowActive = false;
      celebrationLevel.set(0);
    }, 3400);
  });

  onDestroy(() => {
    unsub();
    if (clearTimer) clearTimeout(clearTimer);
  });
</script>

<!--
  边缘金光（仅 level 3）
  先于粒子渲染，z-index 低一层
-->
{#if glowActive}
  <div class="edge-glow" aria-hidden="true"></div>
{/if}

<!--
  粒子雨：每个粒子通过 inline style 注入随机参数
  CSS @keyframes 负责下落、旋转、淡出
-->
{#each particles as p (p.id)}
  <span
    class="particle"
    aria-hidden="true"
    style="left:{p.x.toFixed(1)}%;font-size:{p.size.toFixed(2)}rem;animation-delay:{p.delay}ms;animation-duration:{p.duration}ms;--spin:{p.spin.toFixed(0)}deg;--wobble:{p.wobble.toFixed(0)}px;"
  >{p.symbol}</span>
{/each}

<style>
  /* ── 单颗粒子 ── */
  .particle {
    position: fixed;
    top: -3rem;
    pointer-events: none;
    z-index: 500;
    display: inline-block;
    will-change: transform, opacity;
    animation: particle-fall linear forwards;
    /* 保证在最高层上 */
    isolation: isolate;
  }

  @keyframes particle-fall {
    0% {
      transform: translateY(0px) translateX(0px) rotate(0deg);
      opacity: 1;
    }
    /* 飘荡弧线：中途向旁边漂移 */
    45% {
      transform: translateY(50vh) translateX(var(--wobble)) rotate(calc(var(--spin) * 0.5));
      opacity: 1;
    }
    85% {
      opacity: 0.85;
    }
    100% {
      transform: translateY(112vh) translateX(0px) rotate(var(--spin));
      opacity: 0;
    }
  }

  /* ── 屏幕边缘金光（level 3 only） ── */
  .edge-glow {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 490;
    animation: glow-pulse 0.55s ease-in-out 5 alternate;
  }

  @keyframes glow-pulse {
    from {
      box-shadow: inset 0 0 50px rgba(212, 168, 67, 0.2);
    }
    to {
      box-shadow:
        inset 0 0 140px rgba(212, 168, 67, 0.65),
        inset 0 0 40px rgba(255, 220, 100, 0.3);
    }
  }
</style>
