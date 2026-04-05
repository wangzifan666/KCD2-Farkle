<script lang="ts">
  import type { DieFace } from '$lib/game/types';

  let { value }: { value: DieFace } = $props();

  // 点阵位置：[col, row]，col/row ∈ {1,2,3}，对应 25%/50%/75% 的 SVG 坐标
  const DOT_POSITIONS: Record<number, [number, number][]> = {
    1: [[2, 2]],
    2: [[3, 1], [1, 3]],
    3: [[3, 1], [2, 2], [1, 3]],
    4: [[1, 1], [3, 1], [1, 3], [3, 3]],
    5: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]],
    6: [[1, 1], [3, 1], [1, 2], [3, 2], [1, 3], [3, 3]],
  };

  const colX = (col: number) => col === 1 ? 22 : col === 2 ? 50 : 78;
  const rowY = (row: number) => row === 1 ? 22 : row === 2 ? 50 : 78;
</script>

<svg
  class="die-face"
  viewBox="0 0 100 100"
  xmlns="http://www.w3.org/2000/svg"
  aria-label={value === 0 ? '恶魔之首' : `面值 ${value}`}
>
  {#if value === 0}
    <!-- 恶魔之首：火焰轮廓 + 骷髅图标占位 -->
    <circle cx="50" cy="50" r="38" fill="none" stroke="#c0392b" stroke-width="3" />
    <!-- 火焰路径 -->
    <path
      d="M50 20 C55 30 65 28 62 40 C70 35 72 48 65 55
         C72 52 74 62 68 68 C72 70 70 80 62 82
         C65 75 55 76 50 80 C45 76 35 75 38 82
         C30 80 28 70 32 68 C26 62 28 52 35 55
         C28 48 30 35 38 40 C35 28 45 30 50 20Z"
      fill="#c0392b"
      opacity="0.85"
    />
    <!-- 眼睛 -->
    <circle cx="41" cy="58" r="5" fill="#1a1008" />
    <circle cx="59" cy="58" r="5" fill="#1a1008" />
    <circle cx="42.5" cy="56.5" r="1.5" fill="#fff" opacity="0.6" />
    <circle cx="60.5" cy="56.5" r="1.5" fill="#fff" opacity="0.6" />
  {:else}
    <!-- 标准骰子点数 -->
    {#each DOT_POSITIONS[value] ?? [] as [col, row]}
      <circle
        cx={colX(col)}
        cy={rowY(row)}
        r="9"
        fill="currentColor"
      />
    {/each}
  {/if}
</svg>

<style>
  .die-face {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
