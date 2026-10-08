<template>
  <div class="container">
    <Header></Header>

    <div class="content">
      <!-- ==================== 页头 ==================== -->
      <section class="hero">
        <div class="seal">命</div>
        <div class="hero-text">
          <h1>AI 命理推演</h1>
          <p>一句话说出出生时间 —— 命盘先出，四柱次之，解读流式补齐</p>
        </div>
        <div class="hero-actions">
          <el-tooltip v-if="sessionId" :content="sessionId" placement="bottom">
            <el-tag type="info" effect="plain" round>会话 {{ sessionId.slice(0, 8) }}</el-tag>
          </el-tooltip>
          <el-tag :type="busy ? 'warning' : 'success'" effect="plain" round>
            {{ busy ? '推演中' : '空闲' }}
          </el-tag>
          <el-button plain :icon="RefreshRight" :disabled="busy || !rounds.length" @click="reset">
            新会话
          </el-button>
        </div>
      </section>

      <!-- ==================== 命盘（会话级，只推一次） ==================== -->
      <el-card v-if="chart" class="chart-card" shadow="never">
        <template #header>
          <div class="chart-head">
            <div class="ganzhi">{{ disp(chart.ganZhi) }}</div>
            <div class="chart-meta">
              <el-tag v-if="chart.zodiac" size="small" effect="plain">生肖 · {{ disp(chart.zodiac) }}</el-tag>
              <el-tag v-if="chart.starSign" size="small" effect="plain">星座 · {{ disp(chart.starSign) }}</el-tag>
              <el-tag v-if="chart.lunarDate" size="small" effect="plain">农历 · {{ shortDate(chart.lunarDate) }}</el-tag>
              <el-tag v-if="chart.gregorianDate" size="small" effect="plain">公历 · {{ shortDate(chart.gregorianDate) }}</el-tag>
              <!-- 刻意不展示 chart.sect：它是个流派编号（如 "2"），不是给人看的文案 -->
            </div>
          </div>
        </template>

        <!-- 属性 × 柱位 的矩阵。列是动态的：某一柱缺失时不硬塞空列 -->
        <el-table :data="chartRows" border size="small" class="pillar-table">
          <el-table-column prop="label" label="" width="66" align="left">
            <template #default="{ row }">
              <span class="attr-label">{{ row.label }}</span>
            </template>
          </el-table-column>
          <el-table-column
              v-for="col in chartColumns"
              :key="col.key"
              :label="col.label"
              min-width="112"
              align="center"
          >
            <template #default="{ row }">
              <span class="cell" :class="row.cls">{{ row.cells[col.index] }}</span>
            </template>
          </el-table-column>
        </el-table>

        <template v-if="chart.qiYunView">
          <el-divider content-position="left">大运流转</el-divider>
          <el-descriptions :column="4" size="small" border>
            <el-descriptions-item label="当前大运">
              第 {{ chart.qiYunView.currentDaYunIndex }} 步
            </el-descriptions-item>
            <el-descriptions-item label="起运年份">
              {{ chart.qiYunView.currentDaYunStartYear }} 年
            </el-descriptions-item>
            <el-descriptions-item label="当前年龄">
              {{ chart.qiYunView.currentAge }} 岁
            </el-descriptions-item>
            <el-descriptions-item label="虚岁">
              {{ chart.qiYunView.currentNominalAge }} 岁
            </el-descriptions-item>
          </el-descriptions>
        </template>
      </el-card>

      <!-- ==================== 空态 ==================== -->
      <el-empty v-if="!rounds.length" description="说一句出生时间，开始推演" :image-size="130">
        <el-button class="sample-btn" plain @click="send(SAMPLE_QUESTION)">{{ SAMPLE_QUESTION }}</el-button>
        <p class="empty-hint">
          排盘是纯计算，毫秒级，不走模型；解读才调模型。<br/>
          命中缓存的那一层会打上「缓存」标记 —— 那一轮不会真的花钱。
        </p>
      </el-empty>

      <!-- ==================== 对话流 ==================== -->
      <article v-for="(round, index) in rounds" :key="index" class="round">
        <div class="ask">
          <span>{{ round.question }}</span>
        </div>

        <el-card class="answer" shadow="never">
          <template #header>
            <div class="answer-head">
              <el-tag
                  v-for="stage in stagesOf(round)"
                  :key="stage.key"
                  class="stage-tag"
                  size="small"
                  round
                  :type="stageTagType(round, stage.key)"
                  :effect="stageState(round, stage.key) === 'running' ? 'dark' : 'plain'"
              >
                <i class="dot" :class="'is-' + stageState(round, stage.key)"></i>{{ stage.label }}
              </el-tag>
              <el-tag v-if="round.followUp" size="small" round type="info" effect="plain">
                复用上轮命盘与生辰
              </el-tag>
              <el-tooltip v-for="(hit, i) in round.cacheHits" :key="'c' + i" content="这一层没调模型，直接回放了上次的结果">
                <el-tag size="small" round class="cache-tag">{{ hit }}</el-tag>
              </el-tooltip>

              <span class="head-spacer"></span>
              <span v-if="round.elapsed" class="elapsed">{{ fmtElapsed(round.elapsed) }}</span>
              <el-tooltip v-if="!round.streaming && round.report" content="复制报告全文" placement="top">
                <el-button link :icon="CopyDocument" @click="copyReport(round)"/>
              </el-tooltip>
            </div>
          </template>

          <!-- 四柱逐根点亮。后端是并发推的，顺序靠前端排 -->
          <div v-if="orderedPillars(round).length" class="pillars">
            <div
                v-for="p in orderedPillars(round)"
                :key="p.pillar"
                class="pillar"
                :class="{ 'is-failed': !p.ok }"
            >
              <div class="pillar-head">
                <span class="pillar-label">{{ p.label }}</span>
                <el-tag v-if="!p.ok" type="danger" size="small" effect="plain" round>降级</el-tag>
              </div>
              <p class="pillar-text">{{ p.text }}</p>
            </div>
          </div>

          <!-- 正文：流式期间走纯文本（每片 delta 重解析一遍 markdown 会把页面拖卡），收尾后再渲染 -->
          <el-skeleton v-if="round.streaming && !round.report" :rows="4" animated class="report-skeleton"/>
          <div v-else-if="round.streaming" class="report plain">
            {{ round.report }}<span class="caret"></span>
          </div>
          <div v-else-if="round.report" class="report markdown" v-html="renderReport(round)"></div>

          <el-alert
              v-if="round.error"
              class="round-error"
              type="error"
              show-icon
              :closable="false"
              :title="round.error.code"
              :description="round.error.message"
          />
        </el-card>
      </article>
    </div>

    <!-- ==================== 输入区（吸底） ==================== -->
    <div class="composer">
      <div class="composer-inner">
        <div v-if="rounds.length" class="chips">
          <el-button
              v-for="s in FOLLOW_SAMPLES"
              :key="s"
              size="small"
              round
              plain
              :disabled="busy"
              @click="send(s)"
          >{{ s }}</el-button>
        </div>

        <div class="input-row">
          <el-input
              v-model="question"
              type="textarea"
              :rows="2"
              resize="none"
              :disabled="busy"
              placeholder="说出生辰八字，或直接追问…　Enter 发送 / Shift + Enter 换行"
              @keydown.enter.exact.prevent="send()"
          />
          <el-button
              type="primary"
              size="large"
              class="send-btn"
              :loading="busy"
              :disabled="!busy && !question.trim()"
              @click="send()"
          >{{ busy ? '推演中…' : '开始推演' }}</el-button>
        </div>

        <p class="composer-hint">
          {{ busy
              ? '生成期间输入框会锁住 —— 同一会话并发会损坏对话记忆，后端也会直接拒绝。'
              : '追问会自动带上当前会话的命盘与生辰，不必重复生日。' }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * AI 命理推演页。
 *
 * <h3>这一页在做什么</h3>
 * 把后端 {@code /graph/ask} 的 SSE 事件铺成界面，并守住一条产品原则：
 * <b>命盘先出</b>。排盘是纯计算、毫秒级；解读要调多次模型、几十秒。
 * 所以 chart 事件一到就渲染命盘卡片，用户能一边看盘一边等解读。
 *
 * <h3>为什么是这个结构</h3>
 * 命盘是<b>会话级</b>的，不是每轮一份 —— 后端只在首轮推 chart，追问轮不重推。
 * 因此命盘卡片挂在 {@code rounds} 循环外面。
 */
import {computed, nextTick, onMounted, onUnmounted, ref} from 'vue';
import {useRoute} from 'vue-router';
import {ElMessage} from 'element-plus';
import {CopyDocument, RefreshRight} from '@element-plus/icons-vue';
import Header from '@/components/Header.vue';
import {streamAsk} from '@/api/module/fortune';
import type {
  ErrorPayload,
  FortuneChart,
  PillarCode,
  PillarPayload,
} from '@/api/module/fortune';
import {renderMarkdown} from '@/utils/markdown';

const SAMPLE_QUESTION = '我是公历1990年5月20日下午1点30分出生的，性别男，帮我看看整体运势';
const FOLLOW_SAMPLES = ['为什么判断我有偏财？依据是什么？', '未来两个大运怎么样？'];

/** 四柱的固定顺序。后端是并发推送的，前端必须自己排，否则柱子会跳来跳去 */
const PILLAR_ORDER: PillarCode[] = ['year', 'month', 'day', 'hour'];
const PILLAR_KEYS = ['yearPillar', 'monthPillar', 'dayPillar', 'hourPillar'] as const;
const PILLAR_LABELS: Record<PillarCode, string> = {
  year: '年柱', month: '月柱', day: '日柱', hour: '时柱',
};

const STAGES = [
  {key: 'extract', label: '抽取生辰'},
  {key: 'calc', label: '排盘'},
  {key: 'summary', label: '解读'},
];

const CACHE_LABEL: Record<string, string> = {
  extract: '抽取缓存',
  first: '报告缓存',
  followup: '追问缓存',
};

/** 一轮问答的界面状态 */
interface Round {
  question: string;
  /** stage 名 → 状态 */
  stage: Record<string, string>;
  /** 按柱位放的固定槽位，避免并发到达时柱子乱序 */
  pillars: (PillarPayload | undefined)[];
  report: string;
  error: ErrorPayload | null;
  cacheHits: string[];
  streaming: boolean;
  elapsed: number;
  startedAt: number;
  /** 追问轮：不重新抽取生辰、不重新排盘 */
  followUp: boolean;
}

const route = useRoute();

const sessionId = ref('');
const question = ref('');
const busy = ref(false);
const chart = ref<FortuneChart | null>(null);
const rounds = ref<Round[]>([]);

let controller: AbortController | null = null;

// ==================== 衍生数据 ====================

const chartColumns = computed(() => {
  const vo = chart.value;
  if (!vo) return [];
  return PILLAR_ORDER.map((code, index) => ({
    key: code,
    index,
    label: PILLAR_LABELS[code],
    present: !!vo[PILLAR_KEYS[index] as keyof FortuneChart],
  })).filter((col) => col.present);
});

const chartRows = computed(() => {
  const vo = chart.value;
  if (!vo) return [];
  const at = (index: number) => vo[PILLAR_KEYS[index] as keyof FortuneChart] as any;
  const cells = (pick: (pillar: any) => string): string[] =>
    PILLAR_ORDER.map((_code, index) => {
      const pillar = at(index);
      return pillar ? pick(pillar) : '—';
    });
  const pair = (main: any, god: any) => {
    const head = disp(main);
    const tail = god ? disp(god) : '';
    return tail && tail !== '—' ? `${head} · ${tail}` : head;
  };

  return [
    {key: 'ganZhi', label: '干支', cls: 'gz', cells: cells((p) => disp(p.ganZhi))},
    {key: 'tianGan', label: '天干', cls: '', cells: cells((p) => pair(p.tianGan, p.tianGanGod))},
    {key: 'diZhi', label: '地支', cls: '', cells: cells((p) => pair(p.diZhi, p.diZhiGod))},
    {key: 'hideGan', label: '藏干', cls: 'dim', cells: cells((p) => disp(p.hideGanGods))},
    {key: 'naYin', label: '纳音', cls: 'dim', cells: cells((p) => disp(p.naYin))},
    {key: 'shenSha', label: '神煞', cls: 'dim ss', cells: cells((p) => disp(p.shenShaList))},
    {key: 'emptyDie', label: '空亡', cls: 'dim', cells: cells((p) => disp(p.emptyDie))},
  ];
});

// ==================== 发送 ====================

function send(preset?: string): void {
  const text = (preset ?? question.value).trim();
  if (!text || busy.value) return;

  const isFollowUp = rounds.value.length > 0 && !!sessionId.value;

  question.value = '';
  busy.value = true;

  const round: Round = {
    question: text,
    stage: {},
    pillars: [],
    report: '',
    error: null,
    cacheHits: [],
    streaming: true,
    elapsed: 0,
    startedAt: performance.now(),
    followUp: isFollowUp,
  };
  rounds.value.push(round);
  scrollToBottom();

  controller = new AbortController();
  streamAsk({
    question: text,
    sessionId: sessionId.value,
    signal: controller.signal,
    onEvent: (ev) => handleEvent(ev, round),
  })
      .catch((e: unknown) => {
        if (!round.error) {
          round.error = {
            code: 'NETWORK',
            message: '连接中断：' + (e instanceof Error ? e.message : String(e)),
          };
        }
      })
      .finally(() => {
        round.streaming = false;
        round.elapsed = Math.round(performance.now() - round.startedAt);
        busy.value = false;
        scrollToBottom();
      });
}

function handleEvent(ev: { event: string; data: any }, round: Round): void {
  switch (ev.event) {
    case 'stage':
      if (ev.data?.name) round.stage[ev.data.name] = ev.data.status;
      break;

    case 'cache':
      // 一次请求可能推多条（抽取一条、报告一条）
      round.cacheHits.push(CACHE_LABEL[ev.data?.layer] ?? ev.data?.layer ?? '缓存');
      break;

    case 'chart':
      // 会话级：首轮推一次，追问轮不重推，所以直接替换即可
      chart.value = ev.data as FortuneChart;
      break;

    case 'pillar':
      upsertPillar(round, ev.data as PillarPayload);
      break;

    case 'delta':
      if (ev.data?.text) round.report += ev.data.text;
      break;

    case 'done':
      if (ev.data?.sessionId) sessionId.value = ev.data.sessionId;
      // 全文为准，且是整体替换而非追加 —— 这样既不会得到两倍正文，
      // 又能在 delta 丢包（断线重连、粘包）时把结果纠正过来
      if (ev.data?.text) round.report = ev.data.text;
      break;

    case 'error':
      round.error = ev.data as ErrorPayload;
      break;
  }
  scrollToBottom();
}

/** 四根柱子是并发推的，按柱位放进固定槽位 */
function upsertPillar(round: Round, payload?: PillarPayload): void {
  if (!payload?.pillar) return;
  const index = PILLAR_ORDER.indexOf(payload.pillar);
  if (index < 0) {
    round.pillars.push(payload);
    return;
  }
  round.pillars[index] = payload;
}

function reset(): void {
  controller?.abort();
  sessionId.value = '';
  rounds.value = [];
  chart.value = null;
  question.value = '';
  busy.value = false;
}

// ==================== 展示工具 ====================

/**
 * 把任意值转成可显示文本。
 *
 * <p>后端这几个字段的序列化形状并不统一：{@code tianGan} 带
 * {@code @JsonFormat(shape=OBJECT)} 是对象，{@code tianGanGod} 是枚举名（字符串），
 * {@code shenShaList} 是数组。这里全部吃下 —— 前端不该因为后端某个枚举
 * 多加了个字段就白屏。
 */
function disp(value: any): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    return value.map(disp).filter((v) => v !== '—').join('、') || '—';
  }
  return value.name ?? value.text ?? value.label ?? value.value ?? '—';
}

/** 后端给的是 "1990-04-26 13:30:00"，秒位在命盘场景里没有意义，去掉 */
function shortDate(value: any): string {
  const text = disp(value);
  return text === '—' ? text : text.replace(/:00$/, '');
}

function orderedPillars(round: Round): PillarPayload[] {
  return PILLAR_ORDER
      .map((code) => round.pillars.find((p) => p && p.pillar === code))
      .filter((p): p is PillarPayload => !!p);
}

/** 追问轮只跑 summary，抽取与排盘是复用上一轮的，别把它们画成「等待中」 */
function stagesOf(round: Round) {
  return round.followUp ? STAGES.filter((s) => s.key === 'summary') : STAGES;
}

function stageState(round: Round, key: string): string {
  const status = round.stage[key];
  if (status) return status;
  if (round.error && !round.stage.summary && key === 'summary') return 'failed';
  return 'idle';
}

function stageTagType(round: Round, key: string): 'success' | 'warning' | 'danger' | 'info' {
  const state = stageState(round, key);
  if (state === 'running') return 'warning';
  if (state === 'done') return 'success';
  if (state === 'failed') return 'danger';
  return 'info';
}

function renderReport(round: Round): string {
  return renderMarkdown(round.report);
}

async function copyReport(round: Round): Promise<void> {
  if (!round.report) return;
  try {
    await navigator.clipboard.writeText(round.report);
    ElMessage.success('已复制报告全文');
  } catch {
    ElMessage.warning('浏览器拒绝了剪贴板访问，请手动选中复制');
  }
}

function fmtElapsed(ms: number): string {
  if (!ms) return '';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

// ==================== 滚动 ====================

/**
 * 滚到底。
 *
 * <p>滚动容器是 {@code #app}（App.vue 里设了 {@code overflow:auto}），
 * 不是本组件里的某个 div —— 所以只能往上找。
 */
function scrollToBottom(): void {
  nextTick(() => {
    const scroller = document.getElementById('app');
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  });
}

onMounted(() => {
  document.title = 'AI 命理推演';
  // 从排盘页「AI 推演」按钮带过来的生辰：预填成一句完整的话。
  // 刻意只预填、不自动发送 —— 自动发问会立刻产生一次真实的模型调用，
  // 用户应该自己决定什么时候开始。
  const seed = buildSeedFromQuery();
  if (seed) question.value = seed;
});

/**
 * 把 URL 上的排盘口径还原成一句可被后端抽取的自然语言。
 *
 * 与排盘页共用同一套参数（dateType / dateTime / sex / leapMonth），
 * 所以 AI 抽出来的生辰与刚才看到的那张命盘是同一个。
 */
function buildSeedFromQuery(): string {
  const pick = (v: unknown): string => (Array.isArray(v) ? String(v[0] ?? '') : v == null ? '' : String(v));
  const dateTime = pick(route.query.dateTime);
  if (!dateTime) return '';

  const isLunar = pick(route.query.dateType) === '2';
  const sexText = pick(route.query.sex) === '0' ? '女' : '男';
  const leapText = isLunar && pick(route.query.leapMonth) === '1' ? '（闰月）' : '';
  return `我出生于${isLunar ? '农历' : '公历'} ${dateTime}${leapText}，性别${sexText}，帮我看看整体运势`;
}

onUnmounted(() => {
  controller?.abort();
});
</script>

<style scoped lang="scss">
.container {
  width: 100%;
  min-height: 100%;
  background-color: var(--bg);
  // 顶部一层暖光晕，让大片留白不至于单调
  background-image: var(--halo);
  background-repeat: no-repeat;
  background-position: center top;
  transition: background-color 0.25s ease;
}

.content {
  // 主体宽度与 Header 内层同轴（$mainWidth），不再单开 1080px
  @include main-container($mainPad);
  padding-top: 28px;
  padding-bottom: 8px;
}

/* ==================== 页头 ==================== */

.hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 4px 0 26px;

  .seal {
    flex: none;
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: linear-gradient(160deg, var(--gold-2), var(--gold));
    color: #fff;
    font-size: 26px;
    font-weight: 600;
    letter-spacing: 0;
    box-shadow: var(--shadow-sm);
    user-select: none;
  }

  .hero-text {
    flex: 1;
    min-width: 0;

    h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: var(--text);
    }

    p {
      margin: 4px 0 0;
      font-size: 13px;
      color: var(--text-faint);
    }
  }

  .hero-actions {
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
  }
}

/* ==================== 命盘 ==================== */

.chart-card {
  margin-bottom: 26px;

  .chart-head {
    display: flex;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
  }

  .ganzhi {
    font-size: 26px;
    font-weight: 500;
    letter-spacing: 0.18em;
    color: var(--gold);
    line-height: 1.2;
  }

  .chart-meta {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
}

.pillar-table {
  width: 100%;

  .attr-label {
    display: block;
    padding-left: 10px;
    font-size: 12px;
    color: var(--text-faint);
    letter-spacing: 0.1em;
  }

  .cell {
    display: block;
    font-size: 13px;
    line-height: 1.6;
    word-break: break-word;

    &.gz {
      font-size: 16px;
      letter-spacing: 0.08em;
      color: var(--gold);
      font-weight: 500;
    }

    &.dim {
      font-size: 12px;
      color: var(--text-dim);
    }

    &.ss {
      line-height: 1.5;
    }
  }
}

/* ==================== 空态 ==================== */

.sample-btn {
  white-space: normal !important;
  height: auto !important;
  padding: 12px 20px !important;
  max-width: 620px;
  line-height: 1.6 !important;
  text-align: left;
}

.empty-hint {
  margin: 18px auto 0;
  max-width: 620px;
  font-size: 12px;
  line-height: 2;
  color: var(--text-faint);
}

/* ==================== 一轮对话 ==================== */

.round {
  margin-bottom: 26px;
}

.ask {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;

  span {
    max-width: 74%;
    padding: 10px 16px;
    border-radius: 14px 14px 4px 14px;
    background: var(--gold-wash);
    border: 1px solid var(--gold-soft);
    color: var(--text);
    font-size: 14px;
    line-height: 1.7;
  }
}

.answer {
  :deep(.el-card__header) {
    padding: 10px 16px;
    background: var(--panel-2);
  }
}

.answer-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-height: 24px;
}

.head-spacer {
  flex: 1;
}

.stage-tag {
  .dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-right: 6px;
    border-radius: 50%;
    background: var(--el-color-info);
    vertical-align: middle;
    transition: background-color 0.2s ease;

    &.is-running {
      background: var(--el-color-warning);
      animation: pulse 1.1s ease-in-out infinite;
    }

    &.is-done {
      background: var(--el-color-success);
    }

    &.is-failed {
      background: var(--el-color-danger);
    }
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.35;
    transform: scale(0.7);
  }
}

.cache-tag {
  border-color: var(--gold-soft) !important;
  color: var(--gold) !important;
  background: var(--gold-wash) !important;
}

.elapsed {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text-faint);
}

/* 四柱 */
.pillars {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.pillar {
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-left: 3px solid var(--gold-soft);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  animation: rise 0.36s ease both;

  &.is-failed {
    border-left-color: var(--red);
    opacity: 0.72;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.pillar-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.pillar-label {
  font-size: 12px;
  letter-spacing: 0.12em;
  color: var(--gold);
}

.pillar-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-dim);
  white-space: pre-wrap;
  word-break: break-word;
}

/* ==================== 报告 ==================== */

.report-skeleton {
  padding: 6px 0;
}

.report.plain {
  margin: 0;
  font-size: 14px;
  line-height: 1.95;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text);
}

.caret {
  display: inline-block;
  width: 7px;
  height: 15px;
  margin-left: 2px;
  vertical-align: text-bottom;
  background: var(--gold);
  animation: blink 1s steps(2, start) infinite;
}

@keyframes blink {
  to {
    visibility: hidden;
  }
}

.markdown {
  font-size: 14px;
  line-height: 1.95;
  word-break: break-word;
  color: var(--text);

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    color: var(--gold);
    letter-spacing: 0.05em;
    line-height: 1.5;
  }

  :deep(h1) {
    font-size: 19px;
    margin: 26px 0 12px;
  }

  :deep(h2) {
    font-size: 17px;
    margin: 24px 0 10px;
    padding-left: 10px;
    border-left: 3px solid var(--gold-2);
  }

  :deep(h3) {
    font-size: 15px;
    margin: 20px 0 8px;
  }

  :deep(h4),
  :deep(h5),
  :deep(h6) {
    font-size: 14px;
    margin: 16px 0 6px;
  }

  :deep(h1:first-child),
  :deep(h2:first-child),
  :deep(h3:first-child) {
    margin-top: 0;
  }

  :deep(p) {
    margin: 0 0 12px;
  }

  :deep(strong) {
    color: var(--gold);
    font-weight: 600;
  }

  :deep(ul),
  :deep(ol) {
    margin: 0 0 12px;
    padding-left: 22px;
  }

  :deep(li) {
    margin-bottom: 5px;
    list-style: inherit;
  }

  :deep(ul li) {
    list-style: disc;
  }

  :deep(ol li) {
    list-style: decimal;
  }

  :deep(code) {
    padding: 1px 6px;
    border-radius: 5px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    font-family: var(--mono);
    font-size: 13px;
  }

  :deep(.md-code) {
    margin: 0 0 14px;
    padding: 12px 14px;
    border-radius: var(--radius-sm);
    background: var(--panel-2);
    border: 1px solid var(--line);
    overflow-x: auto;

    code {
      padding: 0;
      border: none;
      background: transparent;
      font-size: 13px;
      line-height: 1.7;
      white-space: pre;
    }
  }

  :deep(blockquote) {
    margin: 0 0 12px;
    padding: 8px 14px;
    border-left: 3px solid var(--gold-soft);
    background: var(--gold-wash);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    color: var(--text-dim);

    p:last-child {
      margin-bottom: 0;
    }
  }

  :deep(table) {
    width: 100%;
    margin: 0 0 14px;
    border-collapse: collapse;
    font-size: 13px;
  }

  :deep(th),
  :deep(td) {
    padding: 7px 12px;
    border: 1px solid var(--line);
    text-align: left;
  }

  :deep(th) {
    background: var(--panel-2);
    color: var(--text-dim);
    font-weight: 500;
    letter-spacing: 0.08em;
  }

  :deep(hr) {
    margin: 20px 0;
    border: none;
    border-top: 1px solid var(--line);
  }

  :deep(a) {
    color: var(--gold);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  :deep(del) {
    color: var(--text-faint);
  }
}

.round-error {
  margin-top: 14px;
}

/* ==================== 输入区 ==================== */

.composer {
  position: sticky;
  bottom: 0;
  z-index: 20;
  // 左右内边距挪到 .composer-inner —— 内外层各管一半的话，
  // 输入框与上方正文的左边界会差一个 padding，看着是歪的。
  padding: 12px 0 18px;
  border-top: 1px solid var(--line);
  background: var(--bg-blur);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.composer-inner {
  // 与 .content 用同一套容器规则，输入框才会和正文对齐
  @include main-container($mainPad);
}

.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.input-row {
  display: flex;
  gap: 12px;
  align-items: stretch;

  :deep(.el-textarea) {
    flex: 1;
  }
}

.send-btn {
  flex: none;
  height: auto;
  min-height: 54px;
  padding: 0 30px;
  letter-spacing: 0.1em;
}

.composer-hint {
  margin: 8px 2px 0;
  font-size: 11px;
  color: var(--text-faint);
}

/* ==================== 窄屏 ==================== */

@media (max-width: 720px) {
  .content {
    padding: 18px 14px 8px;
  }

  .hero {
    flex-wrap: wrap;

    .hero-text h1 {
      font-size: 21px;
    }

    .hero-actions {
      width: 100%;
    }
  }

  .composer {
    padding: 10px 0 14px;
  }

  .composer-inner {
    padding-left: 14px;
    padding-right: 14px;
  }

  .input-row {
    flex-direction: column;

    .send-btn {
      min-height: 44px;
    }
  }
}
</style>
