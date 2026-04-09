<script lang="ts">
  import {
    startOffer,
    acceptOffer,
    finalizeAnswer,
    closeManualConnection,
  } from '$lib/network/manualP2P';
  import { networkState } from '$lib/network/trystero';

  let {
    role,
    playerName,
  }: {
    role: 'host' | 'guest';
    playerName: string;
  } = $props();

  // ─────────────────────────────────────────────
  //  状态机
  // ─────────────────────────────────────────────

  type Phase =
    | 'idle'         // 等待用户操作
    | 'gathering'    // 正在收集 ICE candidate（等待 STUN）
    | 'show_offer'   // host：展示 Offer 码，等待用户粘贴 Answer
    | 'finalizing'   // host：已提交 Answer，等待 DataChannel 建立
    | 'show_answer'  // guest：展示 Answer 码，等待 DataChannel 建立
    | 'connected'    // DataChannel 已建立
    | 'error';       // 出错，可重试

  let phase = $state<Phase>('idle');
  let offerCode  = $state('');
  let answerCode = $state('');
  let inputAnswer = $state('');
  let inputOffer  = $state('');
  let errorMsg   = $state('');
  let copied     = $state(false);
  let gatherSeconds = $state(0);
  let gatherTimer: ReturnType<typeof setInterval> | null = null;

  // ─────────────────────────────────────────────
  //  监听 networkState → DataChannel 建立时切换 phase
  // ─────────────────────────────────────────────

  $effect(() => {
    const unsub = networkState.subscribe((ns) => {
      if (ns.status === 'connected' && phase !== 'connected') {
        phase = 'connected';
      }
    });
    return () => {
      unsub();
      stopGatherTimer();
      // 只有未成功连接时才清理 RTCPeerConnection
      if (phase !== 'connected') {
        closeManualConnection();
      }
    };
  });

  // ─────────────────────────────────────────────
  //  计时器
  // ─────────────────────────────────────────────

  function startGatherTimer() {
    gatherSeconds = 0;
    gatherTimer = setInterval(() => gatherSeconds++, 1000);
  }

  function stopGatherTimer() {
    if (gatherTimer) {
      clearInterval(gatherTimer);
      gatherTimer = null;
    }
  }

  // ─────────────────────────────────────────────
  //  房主流程
  // ─────────────────────────────────────────────

  async function handleGenerateOffer() {
    phase = 'gathering';
    startGatherTimer();
    try {
      offerCode = await startOffer();
      phase = 'show_offer';
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : '生成连接码失败，请重试';
      phase = 'error';
    } finally {
      stopGatherTimer();
    }
  }

  async function handleFinalize() {
    if (!inputAnswer.trim()) return;
    phase = 'finalizing';
    try {
      await finalizeAnswer(inputAnswer.trim());
      // DataChannel.onopen 会在 manualP2P.ts 中更新 networkState → 'connected'
    } catch {
      errorMsg = '应答码无效，请检查后重新粘贴';
      phase = 'show_offer';
    }
  }

  // ─────────────────────────────────────────────
  //  客人流程
  // ─────────────────────────────────────────────

  async function handleAcceptOffer() {
    if (!inputOffer.trim()) return;
    phase = 'gathering';
    startGatherTimer();
    try {
      answerCode = await acceptOffer(inputOffer.trim());
      phase = 'show_answer';
    } catch {
      errorMsg = '连接码无效，请联系对方重新生成';
      phase = 'error';
    } finally {
      stopGatherTimer();
    }
  }

  // ─────────────────────────────────────────────
  //  通用工具
  // ─────────────────────────────────────────────

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      // 兼容不支持 Clipboard API 的环境
    }
  }

  function handleRetry() {
    phase = 'idle';
    errorMsg = '';
    offerCode = '';
    answerCode = '';
    inputAnswer = '';
    inputOffer = '';
  }
</script>

<div class="manual-connect">
  <div class="header">
    <span class="icon">⚡</span>
    <div>
      <p class="title">手动连接模式</p>
      <p class="subtitle">无需信令服务器，通过连接码直连 · {playerName}</p>
    </div>
  </div>

  {#if role === 'host'}
    <!-- ══ 房主流程 ══ -->
    {#if phase === 'idle'}
      <p class="step">① 点击按钮，生成你的连接码</p>
      <button class="btn-primary" onclick={handleGenerateOffer}>生成连接码</button>

    {:else if phase === 'gathering'}
      <div class="waiting">
        <span class="dot-anim"></span>
        正在收集连接信息…已用 {gatherSeconds} 秒
      </div>
      <p class="hint">通常需要 5～20 秒，收集完毕后自动进入下一步</p>

    {:else if phase === 'show_offer'}
      <p class="step">① 将下方连接码发给对方（微信/QQ 粘贴均可）</p>
      <div class="code-block">
        <textarea class="code-box" readonly value={offerCode}></textarea>
        <button class="btn-copy" onclick={() => handleCopy(offerCode)}>
          {copied ? '已复制 ✓' : '一键复制'}
        </button>
      </div>

      {#if errorMsg}
        <p class="error">{errorMsg}</p>
      {/if}

      <p class="step">② 将对方发给你的应答码粘贴到下方，然后点确认</p>
      <textarea
        class="code-input"
        bind:value={inputAnswer}
        placeholder="在此粘贴对方的应答码…"
      ></textarea>
      <button class="btn-primary" onclick={handleFinalize} disabled={!inputAnswer.trim()}>
        确认连接
      </button>

    {:else if phase === 'finalizing'}
      <div class="waiting">
        <span class="dot-anim"></span>
        正在建立连接，请稍候…
      </div>

    {:else if phase === 'connected'}
      <p class="success">✓ 连接已建立！</p>

    {:else if phase === 'error'}
      <p class="error">{errorMsg}</p>
      <button class="btn-secondary" onclick={handleRetry}>重试</button>
    {/if}

  {:else}
    <!-- ══ 客人流程 ══ -->
    {#if phase === 'idle'}
      <p class="step">① 将对方（房主）发给你的连接码粘贴到下方</p>
      <textarea
        class="code-input"
        bind:value={inputOffer}
        placeholder="在此粘贴对方的连接码…"
      ></textarea>
      <button class="btn-primary" onclick={handleAcceptOffer} disabled={!inputOffer.trim()}>
        处理并生成应答码
      </button>

    {:else if phase === 'gathering'}
      <div class="waiting">
        <span class="dot-anim"></span>
        正在处理连接码…已用 {gatherSeconds} 秒
      </div>

    {:else if phase === 'show_answer'}
      <p class="step">② 将下方应答码发给对方（房主）</p>
      <div class="code-block">
        <textarea class="code-box" readonly value={answerCode}></textarea>
        <button class="btn-copy" onclick={() => handleCopy(answerCode)}>
          {copied ? '已复制 ✓' : '一键复制'}
        </button>
      </div>
      <div class="waiting">
        <span class="dot-anim"></span>
        等待对方确认连接，连接建立后自动进入游戏…
      </div>

    {:else if phase === 'connected'}
      <p class="success">✓ 连接已建立！</p>

    {:else if phase === 'error'}
      <p class="error">{errorMsg}</p>
      <button class="btn-secondary" onclick={handleRetry}>重试</button>
    {/if}
  {/if}
</div>

<style>
  .manual-connect {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
    padding: 1.2rem;
    border: 1px dashed #5a4a2a;
    border-radius: 10px;
    background: #0d0904;
    box-sizing: border-box;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    align-self: flex-start;
  }

  .icon {
    font-size: 1.5rem;
  }

  .title {
    font-size: 1rem;
    font-weight: bold;
    color: #d4a843;
    margin: 0;
  }

  .subtitle {
    font-size: 0.78rem;
    color: #8a7a5a;
    margin: 0;
  }

  .step {
    font-size: 0.88rem;
    color: #c8b888;
    align-self: flex-start;
    margin: 0;
  }

  .hint {
    font-size: 0.78rem;
    color: #6a5a3a;
    text-align: center;
    margin: 0;
  }

  .code-block {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  /* 展示用代码框（只读，绿色字体易区分） */
  .code-box {
    width: 100%;
    min-height: 90px;
    background: #060402;
    border: 1px solid #3a2a10;
    border-radius: 6px;
    color: #90d060;
    font-family: 'Courier New', monospace;
    font-size: 0.68rem;
    padding: 0.5rem;
    resize: vertical;
    word-break: break-all;
    box-sizing: border-box;
  }

  /* 输入用代码框 */
  .code-input {
    width: 100%;
    min-height: 90px;
    background: #1a1008;
    border: 1px solid #5a4a2a;
    border-radius: 6px;
    color: #f0e6c8;
    font-family: 'Courier New', monospace;
    font-size: 0.68rem;
    padding: 0.5rem;
    resize: vertical;
    box-sizing: border-box;
  }

  .code-input:focus,
  .code-box:focus {
    outline: none;
    border-color: #d4a843;
  }

  .btn-primary {
    background: linear-gradient(135deg, #c8860a, #d4a843);
    color: #1a0e05;
    border: none;
    border-radius: 6px;
    padding: 0.55rem 1.4rem;
    font-size: 0.95rem;
    font-weight: bold;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 0.15s;
  }

  .btn-primary:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .btn-secondary {
    background: transparent;
    color: #c8b888;
    border: 1px solid #5a4a2a;
    border-radius: 6px;
    padding: 0.45rem 1.2rem;
    font-size: 0.9rem;
    cursor: pointer;
    font-family: inherit;
  }

  .btn-copy {
    align-self: flex-end;
    background: #1e1608;
    color: #d4a843;
    border: 1px solid #5a4a2a;
    border-radius: 6px;
    padding: 0.35rem 1rem;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.85rem;
  }

  .waiting {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #c8b888;
    font-size: 0.88rem;
  }

  .error {
    color: #e05050;
    font-size: 0.88rem;
    text-align: center;
    margin: 0;
  }

  .success {
    color: #60d060;
    font-size: 1.05rem;
    font-weight: bold;
  }

  /* 点动画（局部定义，不依赖全局样式） */
  .dot-anim {
    display: inline-block;
    width: 8px;
    height: 8px;
    background: #d4a843;
    border-radius: 50%;
    flex-shrink: 0;
    animation: dot-pulse 1.2s ease-in-out infinite;
  }

  @keyframes dot-pulse {
    0%, 100% { opacity: 0.2; transform: scale(0.8); }
    50%       { opacity: 1;   transform: scale(1.2); }
  }
</style>
