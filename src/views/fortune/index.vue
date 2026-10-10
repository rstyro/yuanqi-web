<template>
  <div class="container">
    <Header></Header>

    <!--
      方案 A 的两栏骨架：左边历史会话，右边主区。
      主区不再单独让位 —— 侧栏宽度由 CSS 的 .hist 定，主区 flex 自适应。
    -->
    <div class="layout" :class="{'is-rail': rail && !overlayOpen, 'is-overlay': overlayOpen}">
      <div v-if="overlayOpen" class="hist-veil" @click="overlayOpen = false"></div>

      <!--
        历史会话栏（方案 A 的左栏）。

        为什么常驻而不是收进抽屉：这一页的主区是长阅读（命盘 + 四柱 + 多轮问答），
        同时开着两三个盘时，「我现在在哪个会话」必须一眼可见 ——
        一旦变成「点开才知道」的状态，就会点错盘。

        窄屏（<900px）自动收成图标栏；此时点「历史」把它摊成覆盖层，
        而不是继续挤压本来就不够的报告区。
      -->
      <aside class="hist">
        <div class="hist-head">
          <el-tooltip content="开一条新对话" placement="right" :disabled="showText">
            <button class="hist-new" type="button" :disabled="busy" @click="newSession">
              <el-icon><Plus/></el-icon>
              <span v-if="showText">新对话</span>
            </button>
          </el-tooltip>
        </div>

        <div class="hist-body">
          <p v-if="histLoading" class="hist-tip">正在读取历史会话…</p>
          <p v-else-if="!sessions.length" class="hist-tip">还没有历史会话。聊过一次之后，这里会留档。</p>

          <el-tooltip
              v-for="item in sessions"
              :key="item.sessionId"
              placement="right"
              :content="item.ganZhi || item.title || '未命名会话'"
              :disabled="showText"
          >
            <div class="hist-item" :class="{'is-active': item.sessionId === sessionId}">
              <button
                  class="hist-hit"
                  type="button"
                  :disabled="openingId === item.sessionId"
                  @click="openHistory(item)"
              >
                <span class="h-dot" :class="'is-' + statusKey(item.status)"></span>
                <span v-if="showText" class="h-main">
                  <span class="h-gz">{{ item.ganZhi || item.title || '未命名会话' }}</span>
                  <span class="h-sub">
                    <span v-if="item.roundCount > 1">{{ item.roundCount }} 轮</span>
                    <span>{{ shortWhen(item.lastActiveTime) }}</span>
                  </span>
                </span>
              </button>
              <button
                  v-if="showText"
                  class="h-del"
                  type="button"
                  title="删除这条会话"
                  @click.stop="removeSession(item)"
              >
                <el-icon><Delete/></el-icon>
              </button>
            </div>
          </el-tooltip>
        </div>

        <div class="hist-foot">
          <button class="rail-btn" type="button" @click="toggleRail">
            <el-icon>
              <ArrowLeft v-if="!rail"/><ArrowRight v-else/>
            </el-icon>
            <span v-if="showText">{{ rail && !overlayOpen ? '展开' : '收起' }}</span>
          </button>
        </div>
      </aside>

      <!--
        主区。composer 是吸底的（position: sticky; bottom: 0），必须和 .content
        待在同一个「有高度的块容器」里 —— 把两者拆进 flex / grid 的不同行，
        sticky 就失去可粘区间了，输入框会跟着内容一起滚走。
      -->
      <div class="main">
      <div class="content">
        <!-- ==================== 页头 ==================== -->
        <section class="hero">
          <div class="seal">命</div>
          <div class="hero-text">
            <h1>AI 命理推演</h1>
            <p>一句话说出出生时间 —— 命盘先出，四柱次之，解读流式补齐</p>
            <!-- 左栏负责「列表里哪条是高亮」，这里补一句「它叫什么」，两处一起才够定位 -->
            <p v-if="currentTitle" class="hero-current">当前会话 · {{ currentTitle }}</p>
          </div>
          <div class="hero-actions">
            <el-tooltip v-if="sessionId" :content="sessionId" placement="bottom">
              <el-tag type="info" effect="plain" round>会话 {{ sessionId.slice(0, 8) }}</el-tag>
            </el-tooltip>
            <el-tag :type="busy ? 'warning' : 'success'" effect="plain" round>
              {{ busy ? '推演中' : '空闲' }}
            </el-tag>
            <el-tooltip
                v-if="chartVersionStale"
                content="这份报告是按旧版排盘口径生成的。历史即历史 —— 命盘不会随引擎升级而改变"
                placement="bottom"
            >
              <el-tag type="warning" effect="plain" round>旧口径</el-tag>
            </el-tooltip>
            <el-button
                plain
                :icon="Download"
                :disabled="!canExport"
                :loading="pdfDownloading"
                @click="downloadPdf"
            >
              下载 PDF
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
                <!-- 每柱结论是 markdown（后端提示词里有表格/标题），与报告共用同一渲染器；
                     渲染器先转义 HTML 再做行内替换，v-html 不会执行模型输出 -->
                <div class="pillar-text markdown" v-html="renderPillarText(p)"></div>
              </div>
            </div>

            <!-- 正文：流式期间走纯文本（每片 delta 重解析一遍 markdown 会把页面拖卡），收尾后再渲染 -->
            <el-skeleton v-if="round.streaming && !round.report" :rows="4" animated class="report-skeleton"/>
            <div v-else-if="round.streaming" class="report plain">
              {{ round.report }}<span class="caret"></span>
            </div>
            <template v-else-if="round.report">
              <!-- 首屏：只有「核心结论」这几条（后端提示词保证 5~8 条、每条带依据+应期） -->
              <div class="report markdown" v-html="renderHead(round)"></div>

              <!-- 详章：按 metaphysics 仓库 docs/ai-fortune-prompt-tuning.md §三③ 的约定折叠。
                   模型没按约定输出时 hasDetail() 为 false，下面的块整体不出现 —— 退化成「全展示」 -->
              <div v-if="hasDetail(round)" class="detail">
                <button class="detail-toggle" type="button" @click="round.detailOpen = !round.detailOpen">
                  <el-icon class="detail-chev" :class="{ 'is-open': round.detailOpen }">
                    <ArrowRight/>
                  </el-icon>
                  <span>{{ round.detailOpen ? '收起详细分析' : '展开详细分析' }}</span>
                  <span class="detail-count">{{ detailCount(round) }} 节</span>
                </button>
                <div
                    v-show="round.detailOpen"
                    class="report markdown detail-body"
                    v-html="renderDetail(round)"
                ></div>
              </div>
            </template>

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

          <div class="input-box" :class="{ 'is-disabled': busy }">
            <el-input
                v-model="question"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 8 }"
                resize="none"
                :disabled="busy"
                placeholder="说出生辰八字，或直接追问…"
                @keydown.enter.exact.prevent="send()"
            />
            <div class="input-bar">
              <span class="input-tip">Enter 发送 · Shift + Enter 换行</span>
              <span class="bar-spacer"></span>
              <!-- 按钮被 disabled 时自身不派发鼠标事件，tooltip 会失效；
                   套一层 span 让 tooltip 有可命中的宿主，也顺便定住尺寸 -->
              <el-tooltip :content="sendTip" placement="top">
                <span class="send-wrap">
                  <el-button
                      type="primary"
                      circle
                      class="send-btn"
                      :icon="Promotion"
                      :loading="busy"
                      :disabled="!busy && !question.trim()"
                      @click="send()"
                  />
                </span>
              </el-tooltip>
            </div>
          </div>

          <p class="composer-hint">
            {{ busy
                ? '生成期间输入框会锁住 —— 同一会话并发会损坏对话记忆，后端也会直接拒绝。'
                : '追问会自动带上当前会话的命盘与生辰，不必重复生日。' }}
          </p>
        </div>
      </div>
      </div>
    </div>


    <!--
      报告 PDF 由后端渲染（/chat/session/{id}/report.pdf，openhtmltopdf + 内嵌中文字体子集），
      前端只负责触发下载 —— 所以这里没有预览弹窗。
      2026-10-10 之前的 html2canvas + jsPDF 光栅化方案已整体移除：
      它要把报告在页面里按 A4 再排一遍版，和后端是两条要各自维护的管线，
      而「预览的样子 ≠ 下载到的 PDF」本身就是缺陷。
    -->

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
import {computed, nextTick, onMounted, onUnmounted, reactive, ref, watch} from 'vue';
import {useRoute} from 'vue-router';
import {ElMessage, ElMessageBox} from 'element-plus';
import {
  ArrowLeft,
  ArrowRight,
  CopyDocument,
  Delete,
  Download,
  Plus,
  Promotion,
} from '@element-plus/icons-vue';
import Header from '@/components/Header.vue';
import {
  deleteSession,
  downloadReportPdf,
  getSessionDetail,
  listSessions,
  ROUND_STATUS,
  streamAsk,
} from '@/api/module/fortune';
import type {
  ErrorPayload,
  FortuneChart,
  FortuneRoundVo,
  FortuneSessionDetailVo,
  FortuneSessionVo,
  PillarCode,
  PillarPayload,
} from '@/api/module/fortune';
import {renderMarkdown} from '@/utils/markdown';
import {goLogin, NeedLoginError} from '@/utils/auth';

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

/**
 * 失败轮的错误码 → 人话。
 *
 * <p>为什么要在前端留一份：库里只落了 {@code errorCode}（如 {@code OVERLOADED}），
 * 当时那句面向用户的 {@code message} 是 SSE 事件里的、没有留存。
 * 所以从历史会话恢复失败轮时，只能在这里把码翻回中文，否则只剩一个英文码。
 */
const ERROR_HINT: Record<string, string> = {
  EXTRACT_FAILED: '没能从那段描述里认出出生时间 —— 补上「公历还是农历 + 年月日 + 时辰 + 性别」再试',
  INTERNAL_ERROR: '服务端处理中断了，稍后重试就行',
  OVERLOADED: '当前排队的人有点多，稍后再试',
  BUSY: '同一会话上一轮还在生成中，等它结束再问',
};

/**
 * 后端「这一柱没成功」的降级文案特征串。
 *
 * <p>{@code fortune_round.pillar_json} 里只有 {@code {柱位: 文本}}，没有独立的成功标记 ——
 * 降级柱存进去的就是后端 {@code FortunePipeline.PILLAR_FAILED_TEXT} 那句话。
 * 只能靠特征串反推，这也决定了判据要<b>宽</b>：认不出来就按正常柱渲染。
 * 反过来做的话，后端把那句话改一个字，满屏「降级」标记就成了新的 bug。
 */
const PILLAR_FAILED_HINT = '该柱分析超时或失败';

/** 侧栏收起偏好存在这里。前缀跟项目的 {@code yuanqi-theme} 保持一致 */
const RAIL_KEY = 'yuanqi-fortune-rail';

/** 窄于此宽度就把侧栏收成图标栏 —— 150px 的常驻栏在手机上会把报告区挤没 */
const NARROW_QUERY = '(max-width: 899px)';

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
  /** 详章是否展开。跟每一轮走，不跨轮记忆 */
  detailOpen: boolean;
}

const route = useRoute();

const sessionId = ref('');
const question = ref('');
const busy = ref(false);
const chart = ref<FortuneChart | null>(null);
const rounds = ref<Round[]>([]);

/** 当前会话的标题。命盘还没出来时，hero 区靠它说明「我现在在哪个会话」 */
const currentTitle = ref('');
/** 详情接口说这份命盘是按旧口径排的 —— 提示一句就够，不是错误 */
const chartVersionStale = ref(false);

let controller: AbortController | null = null;

// ==================== 左栏：历史会话 ====================

const sessions = ref<FortuneSessionVo[]>([]);
/** 只用于首次加载的占位。后续静默刷新不动它，否则列表会一闪一闪 */
const histLoading = ref(false);
/** 正在打开的那条 —— 转圈用，同时防重复点击 */
const openingId = ref('');

/** 用户手动收起。与「窄屏强制收起」分开记，视口变宽时才恢复得回来 */
const railManual = ref(readRailPref());
/** 窄屏强制收成图标栏。setup 阶段就定好，避免移动端先闪一下展开态 */
const railForced = ref(typeof window !== 'undefined' && window.matchMedia(NARROW_QUERY).matches);
/** 窄屏下把左栏当覆盖层展开，而不是继续挤压报告区 */
const overlayOpen = ref(false);

const rail = computed(() => railManual.value || railForced.value);
/** 图标栏下只留状态点 + 「新对话」图标，文字全隐 */
const showText = computed(() => !rail.value || overlayOpen.value);

/** 收起偏好落 localStorage：每次进页面都被重置回展开态会让人烦 */
function readRailPref(): boolean {
  try {
    return localStorage.getItem(RAIL_KEY) === '1';
  } catch {
    // 隐私模式下 localStorage 可能直接抛，读不到就按展开算
    return false;
  }
}

watch(railManual, (next) => {
  try {
    localStorage.setItem(RAIL_KEY, next ? '1' : '0');
  } catch {
    // 写不进去不影响使用，只是下次进来恢复不了
  }
});

// ==================== 报告 PDF 下载 ====================

/** 下载按钮的 loading。PDF 由后端渲染，前端只是等一个二进制响应 */
const pdfDownloading = ref(false);

// ==================== 衍生数据 ====================

/** 发送按钮的提示语。按钮是图标了，语义得靠 tooltip 补 */
const sendTip = computed(() => {
  if (busy.value) return '推演中，请稍候';
  return question.value.trim() ? '发送（Enter）' : '先写下生辰或要问的事';
});

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

// ==================== 左栏与导出的衍生数据 ====================

/**
 * 可以进预览 / PDF 的轮次。
 *
 * <p>滤掉流式中的那一轮（半成品），也滤掉既没正文又没四柱的空轮次。
 * 失败轮如果留下了部分正文，仍然要导 —— 用户看到过的东西就该能带走。
 */
const printableRounds = computed(() =>
  rounds.value.filter((r) => !r.streaming && (!!r.report || orderedPillars(r).length > 0)),
);

const canExport = computed(() => printableRounds.value.length > 0);

/** 状态点档位：0 生成中 / 1 已完成 / 2 失败。未知值按「已完成」画，免得列表一片红 */
function statusKey(status: number | null | undefined): string {
  if (status === ROUND_STATUS.DOING) return 'doing';
  if (status === ROUND_STATUS.FAIL) return 'fail';
  return 'done';
}

/** 侧栏里的时间：今天给时分，更早给月-日。150px 的栏宽里塞不下完整时间戳 */
function shortWhen(value: string | null): string {
  const m = value ? /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value) : null;
  if (!m) return '';
  const now = new Date();
  const today = Number(m[1]) === now.getFullYear()
      && Number(m[2]) === now.getMonth() + 1
      && Number(m[3]) === now.getDate();
  return today ? `${m[4]}:${m[5]}` : `${m[2]}-${m[3]}`;
}

// ==================== 发送 ====================

function send(preset?: string): void {
  const text = (preset ?? question.value).trim();
  if (!text || busy.value) return;

  const isFollowUp = rounds.value.length > 0 && !!sessionId.value;

  question.value = '';
  busy.value = true;

  // 必须 reactive()，不能是普通对象。
  // ref([]) 只把**数组本身**变成响应式：push 一个普通对象进去，数组存的是原始对象，
  // 而模板读到的却是它的响应式代理 —— 于是后面 handleEvent 里对 round 的每一次
  // 赋值（stage / report / pillars）都绕过了代理，不触发重渲染。
  // 症状很隐蔽：busy 与 chart 会触发重渲染，所以骨架屏、命盘卡片都正常出现，
  // 但「四柱逐根点亮」和「报告打字机」全程不动，直到 finally 里 busy=false 才一次性糊上来。
  const round = reactive<Round>({
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
    // 默认收起：首屏留给「核心结论」，详章是备查用的。
    // 想让详章默认展开，把这里改成 true 即可 —— 折叠与否只是展示，不影响报告内容。
    detailOpen: false,
  });
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
        // 未登录 / 登录已过期：不做「连接中断」渲染，直接去登录页 ——
        // 登录成功后会带回本页（见 utils/auth.ts 的 goLogin），
        // 用户不必自己再点一次「AI 推演」。
        if (e instanceof NeedLoginError) {
          goLogin();
          return;
        }
        if (!round.error) {
          round.error = {
            code: 'NETWORK',
            message: '连接中断：' + (e instanceof Error ? e.message : String(e)),
          };
        }
      })
      .finally(() => settle(round));
  }

  /**
   * 收掉一轮的界面状态：报告定稿（切回 markdown 渲染）、按钮停止转圈。
   *
   * <p>为什么不能只在 {@code streamAsk} 的 finally 里做那件事：那个 finally 等的是
   * <b>HTTP 连接关闭</b>，而不是「服务端说完了」。正常时两者几乎同时，但一旦响应
   * 没能正常收尾（服务端在收尾阶段抛异常 → chunked 少了结束块；再经 vite / nginx
   * 这类代理把上游断连吞掉），浏览器就会一直等下去。
   * 症状正是「正文都看见了，按钮却永远在转，最后一段也不渲染」——
   * 2026-10-09 就踩过：{@code LoginIntercept} 在 SSE 的 ASYNC 派发上抛
   * {@code SaTokenContextException}，把响应收尾打断了。
   *
   * <p>所以判据改用<b>事件语义</b>：收到 {@code done}（正常说完）或
   * {@code error}（说完了，只是坏消息）就算本轮结束，不必再等 TCP。
   * 幂等 —— 事件先到、连接随后关闭时会再走一遍，第二次直接返回。
   */
  function settle(round: Round): void {
    if (!round.streaming) return;
    round.streaming = false;
    round.elapsed = Math.round(performance.now() - round.startedAt);
    busy.value = false;
    scrollToBottom();
    // 一轮收尾 = 库里多了一行（会话行 + 轮次行）。静默刷一次左栏：
    // 「新会话」立刻出现在列表里；失败的轮也在，用户看得见、删得掉。
    void refreshSessions(true);
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
      // 服务端已经把这一轮说完了，界面立刻定稿，不等连接关闭
      settle(round);
      break;

    case 'error':
      round.error = ev.data as ErrorPayload;
      // error 也是终态：流水线以它收场，之后不会再有任何事件
      settle(round);
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

/**
 * 清空当前会话，回到「新对话」状态。
 *
 * <p>注意这不是「删除」—— 已经落库的那些还在左栏里。这也正是它跟改版前那个
 * 纯前端 reset 的区别：以前一清就真没了，现在清掉的是看板，资产还在。
 */
function reset(): void {
  controller?.abort();
  sessionId.value = '';
  rounds.value = [];
  chart.value = null;
  question.value = '';
  busy.value = false;
  currentTitle.value = '';
  chartVersionStale.value = false;
}

/** 开一条新对话。左栏的「新对话」、以及删掉当前会话时都会走到这里 */
function newSession(): void {
  reset();
  overlayOpen.value = false;
  // 刚结束的那一轮已经落库了，立刻反映到左栏 —— 否则新会话开出来了，列表里却还看不见它
  void refreshSessions(true);
}

/** 收起 / 展开左栏。窄屏下展开的是覆盖层 —— 不能再挤压本来就不够的报告区 */
function toggleRail(): void {
  if (railForced.value) {
    overlayOpen.value = !overlayOpen.value;
    return;
  }
  railManual.value = !railManual.value;
}

// ==================== 历史会话：拉列表 / 打开 / 删除 ====================

/**
 * 刷新左栏列表。
 *
 * <p>失败只打日志、不弹提示 —— {@code src/api} 的响应拦截器已经弹过一次了，
 * 这里再弹就是两条一模一样的红条。何况「列表没刷新出来」不该打断用户正在读的报告。
 *
 * @param silent 静默刷新：不动 loading 占位。列表已经在屏上了，再闪一下很难看
 */
async function refreshSessions(silent = false): Promise<void> {
  if (!silent) histLoading.value = true;
  try {
    const res = await listSessions(1, 20);
    sessions.value = res.data?.records ?? [];
  } catch (e) {
    console.warn('[fortune] 拉取历史会话失败', e);
  } finally {
    if (!silent) histLoading.value = false;
  }
}

/**
 * 打开一条历史会话：拉详情 → 整页复原。
 *
 * <p>为什么必须真调接口，而不是拿列表里那点数据在前端拼：轮次、四柱结论、命盘
 * 都只在详情里。而且后端读详情时会把该会话的生辰快照<b>回填进 Redis</b>
 * （那条 TTL 只有 24h）—— 不回填的话，点开两个月前的会话接着追问，
 * 后端会因为「抽不到生辰 + 缓存里也没有」而回一句「没能从你的话里看出出生日期」。
 * <b>所以「打开历史会话」不能只是前端切状态。</b>
 */
async function openHistory(item: FortuneSessionVo): Promise<void> {
  if (busy.value) {
    ElMessage.warning('正在推演中，等这一轮结束再切换会话');
    return;
  }
  // 已经在看这一条了，别白跑一趟接口
  if (item.sessionId === sessionId.value && rounds.value.length) {
    overlayOpen.value = false;
    return;
  }
  openingId.value = item.sessionId;
  try {
    const res = await getSessionDetail(item.sessionId);
    const detail = res.data as FortuneSessionDetailVo | undefined;
    if (!detail) {
      ElMessage.warning('这条会话打不开了');
      return;
    }
    applyDetail(detail);
    overlayOpen.value = false;
  } catch (e) {
    console.warn('[fortune] 打开历史会话失败', e);
  } finally {
    openingId.value = '';
  }
}

/** 把详情铺到页面上：会话级字段 + 每一轮 */
function applyDetail(detail: FortuneSessionDetailVo): void {
  controller?.abort();
  sessionId.value = detail.session.sessionId;
  currentTitle.value = detail.session.title ?? '';
  chartVersionStale.value = !!detail.chartVersionStale;
  // 命盘直接用服务端给的：它优先回放当时存下的整盘快照。
  // 前端拿 birthJson 再调一次 /graph/chart 就绕过了这个口径 —— 引擎升级过的旧会话会当场换一张盘。
  chart.value = detail.chart ?? null;
  question.value = '';
  rounds.value = (detail.rounds ?? []).map(fromRoundVo);
  busy.value = false;
  scrollToTop();
}

/**
 * 一条落库的轮次 → 页面状态。
 *
 * <p>还原的是已经定稿的轮次，所以 stage 直接标完成态，不走「等待中」的骨架。
 * 四柱结论文本是 LLM 的产物、逐字存在 {@code pillarJson} 里 —— 只解析，不重算。
 */
function fromRoundVo(row: FortuneRoundVo): Round {
  const failed = row.status === ROUND_STATUS.FAIL;
  const round = reactive<Round>({
    question: row.question ?? '',
    stage: {},
    pillars: [],
    report: row.answer ?? '',
    error: row.errorCode
        ? {code: row.errorCode, message: ERROR_HINT[row.errorCode] ?? '这一轮没能生成出来'}
        : null,
    cacheHits: splitCacheHits(row.cacheHits),
    streaming: false,
    elapsed: row.elapsedMs ?? 0,
    startedAt: 0,
    followUp: row.followUp === 1,
    detailOpen: false,
  });

  if (round.followUp) {
    // 追问轮不跑抽取与排盘（复用会话的），只点亮「解读」
    round.stage.summary = failed ? 'failed' : 'done';
  } else {
    round.stage.extract = 'done';
    round.stage.calc = 'done';
    round.stage.summary = failed ? 'failed' : 'done';
  }

  const texts = parsePillarTexts(row.pillarJson);
  PILLAR_ORDER.forEach((code, index) => {
    const text = texts[code];
    if (!text) return;
    round.pillars[index] = {
      pillar: code,
      label: PILLAR_LABELS[code],
      text,
      ok: !text.includes(PILLAR_FAILED_HINT),
    };
  });
  return round;
}

/** 解析四柱结论 JSON。坏了就当没有 —— 四柱卡片不出现，报告正文照旧渲染 */
function parsePillarTexts(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch (e) {
    console.warn('[fortune] 四柱结论 JSON 解析失败，本轮不显示四柱卡片', e);
    return {};
  }
}

/** 库里的缓存留痕是逗号分隔的层名（extract/first/followup），翻回给人看的标签 */
function splitCacheHits(raw: string | null): string[] {
  if (!raw) return [];
  return raw
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => CACHE_LABEL[x] ?? x);
}

/** 删除（后端是逻辑删除）。删掉的正好是当前会话时，页面一起回到新对话状态 */
async function removeSession(item: FortuneSessionVo): Promise<void> {
  const label = item.ganZhi || item.title || '未命名会话';
  try {
    await ElMessageBox.confirm(
        `删除后这条会话不再出现在列表里。「${label}」`,
        '删除会话',
        {type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消'},
    );
  } catch {
    // 用户点了取消。ElMessageBox 用 reject 表达「取消」，不是异常，直接返回
    return;
  }
  try {
    const res = await deleteSession(item.sessionId);
    if (res.data !== true) {
      ElMessage.warning('这条会话已经不在了');
    }
    if (item.sessionId === sessionId.value) {
      // 删的是正在看的这条：页面留在原地已经没有意义了
      newSession();
    } else {
      await refreshSessions(true);
    }
  } catch (e) {
    console.warn('[fortune] 删除会话失败', e);
  }
}

// ==================== 下载报告 PDF ====================

/**
 * 下载报告 PDF。
 *
 * <p>排版与渲染都在后端（openhtmltopdf + 内嵌中文字体子集），前端只管把二进制
 * 存成文件 —— 所以这里没有「准备画布 / 等字体 / 等两帧」那一套了。
 * 文件名以后端给的为准（含标题与八字，堆在下载目录里认得出是哪一次）。
 */
async function downloadPdf(): Promise<void> {
  if (!sessionId.value || pdfDownloading.value) return;
  pdfDownloading.value = true;
  try {
    const filename = await downloadReportPdf(sessionId.value);
    ElMessage.success(`已下载：${filename}`);
  } catch (e) {
    if (e instanceof NeedLoginError) {
      goLogin();
      return;
    }
    console.error('[fortune] 下载报告 PDF 失败', e);
    ElMessage.error('下载 PDF 失败：' + (e instanceof Error ? e.message : String(e)));
  } finally {
    pdfDownloading.value = false;
  }
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

// ==================== 「核心结论 + 详细分析」两段切分 ====================

/**
 * 详章分隔标题。
 *
 * <p>约定的原文是<b>逐字</b> {@code ## 详细分析}（见后端 {@code FortuneSummarizer} 的
 * 类注释与 {@code docs/ai-fortune-prompt-tuning.md}）。这里刻意放宽到「1~6 级标题都认、
 * 前后空格都容忍」，只认那四个字 —— 因为这个正则的失效方式是<b>静默</b>的：
 * 一旦没匹配上，页面就退化成「整篇平铺」，没有任何报错，很容易被当成「折叠功能没做」。
 * 宁可放宽匹配，也不要匹配不上。
 *
 * <p>不用 {@code g} 标志：这里每次都只找<b>第一个</b>（模型万一又写了一个，后面的算详章内容）。
 */
const DETAIL_HEADING = /^[ \t]*#{1,6}[ \t]*详细分析[ \t]*$/m;

/** 切开的位置。没匹配到返回 -1 */
function detailAt(report: string): { start: number; end: number } | null {
  const hit = DETAIL_HEADING.exec(report);
  return hit ? {start: hit.index, end: hit.index + hit[0].length} : null;
}

/**
 * 首屏那段（核心结论）。
 *
 * <p>2026-10-10 起做<b>卡片化</b>：四块行（{@code **事业：平** ｜ 依据… ｜ 应期…}）
 * 不再走通用 markdown 渲染（那会变成一整面文字墙），而是重排成卡片网格。
 * 解析是<b>宽容</b>的 —— 编号可有可无、任何块名都收（模型偶尔会把固定格式
 * 泛化出「**大运：顺**」这类骨架外的块，照样成卡，不丢内容）；
 * 一行都没匹配上时退回整段 markdown，等价于改动前的行为。
 */
function renderHead(round: Round): string {
  const at = detailAt(round.report);
  const head = at ? round.report.slice(0, at.start) : round.report;
  const { rest, blocks, extras } = splitVerdict(head);
  if (!blocks.length && !extras.length) return renderMarkdown(head);

  const cards = blocks
    .map(
      (b) => `<div class="vcard ${DIR_CLASS[b.dir] ?? 'is-ping'}">` +
        `<div class="v-top"><span class="v-block">${escHtml(b.name)}</span>` +
        `<span class="v-badge">${escHtml(b.dir)}</span>` +
        `<span class="v-hint">${DIR_HINT[b.dir] ?? ''}</span></div>` +
        `<div class="v-row"><span class="v-k">依据</span><span>${inlineMini(b.basis)}</span></div>` +
        `<div class="v-row"><span class="v-k">应期</span><span>${inlineMini(b.timing)}</span></div>` +
        `</div>`,
    )
    .join('');
  const extraHtml = extras.length
    ? `<p class="vextras-title">补充判断</p>` +
      extras
        .map(
          (e) => `<div class="vx">` +
            `<div class="vx-head">${inlineMini(e.title)}</div>` +
            `<div class="v-row"><span class="v-k">依据</span><span>${inlineMini(e.basis)}</span></div>` +
            `<div class="v-row"><span class="v-k">应期</span><span>${inlineMini(e.timing)}</span></div>` +
            `</div>`,
        )
        .join('')
    : '';
  return renderMarkdown(rest) + `<div class="vgrid">${cards}</div>` + extraHtml;
}

// ---- 核心结论卡片化的解析（只认后端 SUMMARIZE_USER 写死的行格式，见 metaphysics 仓库 FortunePrompts）----

/** 四块行：`**事业：平** ｜ 依据：… ｜ 应期：…`（编号可有可无）。方向限定 顺/平/逆 单字。 */
const RE_VERDICT =
  /^[ \t]*(?:\d+[.)][ \t]+)?\*\*([^：*\n]{1,6})：([顺平逆])\*\*[ \t]*｜[ \t]*依据：(.+?)[ \t]*｜[ \t]*应期：(.+?)[ \t]*$/;

/** 补充条：`**结论** ｜ 依据：… ｜ 应期：…`（与四块行的差别：冒号后不是顺/平/逆）。 */
const RE_EXTRA =
  /^[ \t]*(?:\d+[.)][ \t]+)?\*\*(.+?)\*\*[ \t]*｜[ \t]*依据：(.+?)[ \t]*｜[ \t]*应期：(.+?)[ \t]*$/;

const DIR_CLASS: Record<string, string> = {顺: 'is-shun', 平: 'is-ping', 逆: 'is-ni'};
const DIR_HINT: Record<string, string> = {顺: '推得动', 平: '信号相互抵消', 逆: '有阻，要绕'};

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 依据/应期里偶尔出现 **加粗**；与渲染器同口径：先转义再替换，v-html 安全 */
function inlineMini(s: string): string {
  return escHtml(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

interface VerdictBlock {
  name: string;
  dir: string;
  basis: string;
  timing: string;
}

interface VerdictExtra {
  title: string;
  basis: string;
  timing: string;
}

/** 把「核心结论」段拆成：其余行 / 四块卡 / 补充条。解析只丢样式不丢内容。 */
function splitVerdict(head: string): {rest: string; blocks: VerdictBlock[]; extras: VerdictExtra[]} {
  const blocks: VerdictBlock[] = [];
  const extras: VerdictExtra[] = [];
  const rest: string[] = [];
  for (const line of head.split('\n')) {
    const m = RE_VERDICT.exec(line);
    if (m) {
      blocks.push({name: m[1].trim(), dir: m[2], basis: m[3], timing: m[4]});
      continue;
    }
    const e = RE_EXTRA.exec(line);
    if (e) {
      extras.push({title: e[1], basis: e[2], timing: e[3]});
      continue;
    }
    rest.push(line);
  }
  return {rest: rest.join('\n'), blocks, extras};
}

/** 详章那段（不含分隔标题本身 —— 标题已经变成折叠按钮了） */
function renderDetail(round: Round): string {
  const at = detailAt(round.report);
  return at ? renderMarkdown(round.report.slice(at.end)) : '';
}

/**
 * 是否可以折叠。
 *
 * <p>切开后两侧都必须有内容，否则宁可整篇平铺：
 * 首屏为空会造成「上面一片空白」，详章为空会让「点了展开什么也没有」——
 * 两种都比不折叠更像 bug。所以判据是<b>三段都有货</b>才算按约定输出。
 */
function hasDetail(round: Round): boolean {
  const at = detailAt(round.report);
  if (!at) return false;
  return !!round.report.slice(0, at.start).trim() && !!round.report.slice(at.end).trim();
}

/** 详章里有几节（数标题行）。只用来给折叠按钮补一个「有多少东西」的预告 */
function detailCount(round: Round): number {
  const at = detailAt(round.report);
  if (!at) return 0;
  return round.report
    .slice(at.end)
    .split('\n')
    .filter((line) => /^[ \t]*#{1,6}[ \t]*\S/.test(line)).length;
}

/** 四柱卡片正文：与报告同一个渲染器（含转义）。柱子事件一次到位，不存在流式重解析的性能顾虑 */
function renderPillarText(p: PillarPayload): string {
  return renderMarkdown(p.text);
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

/** 换会话时回到顶部。滚动容器同样是 #app，不是 window */
function scrollToTop(): void {
  nextTick(() => {
    const scroller = document.getElementById('app');
    if (scroller) scroller.scrollTop = 0;
  });
}

// ==================== 视口档位 / 生成中轮询 ====================

let mq: MediaQueryList | null = null;
let pollTimer: number | null = null;

/** 视口在宽窄之间切换时，只改「强制收起」这一档；用户手动收起的选择一直保留 */
function onViewportChange(): void {
  railForced.value = !!mq?.matches;
  if (!railForced.value) {
    // 变宽了，覆盖层就没有存在意义了 —— 留着它会让主区莫名其妙地全宽
    overlayOpen.value = false;
  }
}

/**
 * 「生成中」的会话轮询。
 *
 * <p>这是「异步」在界面上的落点。用户提交完关掉页面，后端线程会把报告跑完并落库；
 * 过一会儿回来，左栏那条会话会自己从「生成中」变成「已完成」。
 * 没有这个轮询，用户就只能手动刷新才看得见状态变了。
 *
 * <p>两个前置条件都要满足才发请求：左侧列表里确实有「生成中」的，
 * 且当前没在推演（自己正在跑的时候 SSE 会驱动刷新，再轮询就是纯重复请求）。
 */
function startPolling(): void {
  pollTimer = window.setInterval(() => {
    if (busy.value) return;
    if (!sessions.value.some((s) => s.status === ROUND_STATUS.DOING)) return;
    void refreshSessions(true);
  }, 20000);
}

onMounted(() => {
  document.title = 'AI 命理推演';
  // 从排盘页「AI 推演」按钮带过来的生辰：预填成一句完整的话。
  // 刻意只预填、不自动发送 —— 自动发问会立刻产生一次真实的模型调用，
  // 用户应该自己决定什么时候开始。
  const seed = buildSeedFromQuery();
  if (seed) question.value = seed;

  mq = window.matchMedia(NARROW_QUERY);
  onViewportChange();
  mq.addEventListener('change', onViewportChange);

  void refreshSessions();
  startPolling();
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
  mq?.removeEventListener('change', onViewportChange);
  if (pollTimer !== null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
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

/* ==================== 方案 A：左侧常驻历史栏 ==================== */

/**
 * 侧栏两档宽度。主区靠 flex 自适应，不需要别处再手动让位 ——
 * 改这两个值就够，不用同步改 padding。
 */
$histW: 150px;
$histRailW: 40px;

.layout {
  display: flex;
  // 必须是 flex-start。默认的 stretch 会把侧栏拉到和主区一样高，
  // 那样 sticky 就没有可粘区间了，侧栏会跟着页面一起滚走。
  align-items: flex-start;
}

.main {
  flex: 1;
  // 少了它，长内容的 min-content 宽度会把 flex 项撑破，报告区就出横向滚动条了
  min-width: 0;
}

.hist {
  flex: none;
  /**
   * 吸顶。header（90px）在正常流里、会随页面滚走，侧栏贴住视口顶之后才谈得上「常驻」。
   *
   * <p>用 sticky 而不是 fixed：fixed 与正常流里的 header 会重叠，
   * 窄屏下正好压住左下角的 logo。sticky 天然从 header 下方开始。
   */
  position: sticky;
  top: 0;
  z-index: 15;

  box-sizing: border-box;
  width: $histW;
  // 减掉 header 高度，页首那一刻正好铺满一屏，不会有一截伸到视口外
  height: calc(100vh - #{$headerH});
  display: flex;
  flex-direction: column;
  padding: 8px 8px 12px;
  border-right: 1px solid var(--line);
  background: var(--bg);
  transition: width 0.18s ease;

  .layout.is-rail & {
    width: $histRailW;
    padding-left: 4px;
    padding-right: 4px;
  }
}

/* 窄屏展开态：把左栏摊成覆盖层，而不是继续挤压报告区 */
.hist-veil {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(38, 33, 25, 0.42);
}

.layout.is-overlay .hist {
  position: fixed;
  left: 0;
  top: 0;
  width: 240px;
  height: 100vh;
  padding: 10px 10px 16px;
  background: var(--panel);
  box-shadow: var(--shadow);
  z-index: 45;
}

.hist-head {
  flex: none;
}

.hist-new {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px 6px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--gold);
  font-family: inherit;
  font-size: 13px;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease;

  &:hover:not(:disabled) {
    border-color: var(--gold-soft);
    background: var(--gold-wash);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.hist-body {
  flex: 1;
  // 必须有 min-height: 0，否则 flex 子项不肯收缩，列表会把整个侧栏顶高
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 8px;
  scrollbar-width: thin;
}

.hist-tip {
  margin: 8px 2px;
  font-size: 12px;
  line-height: 1.75;
  color: var(--text-faint);
}

.hist-item {
  position: relative;
  display: flex;
  align-items: stretch;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  transition: background-color 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: var(--panel-2);
  }

  // 当前会话：主色描边 + 淡底。这是「我现在在哪个会话」的全部视觉依据
  &.is-active {
    background: var(--gold-wash);
    border-color: var(--gold-soft);
  }
}

.hist-hit {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 6px;
  border: none;
  background: transparent;
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: progress;
  }
}

.h-dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--green);

  &.is-doing {
    background: var(--el-color-warning);
    // 复用下面「阶段点」的同一个动画，两处含义一致：进行中
    animation: pulse 1.1s ease-in-out infinite;
  }

  &.is-fail {
    background: var(--red);
  }
}

.h-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.h-gz {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--text);
  word-break: break-all;
}

.h-sub {
  display: flex;
  gap: 6px;
  font-size: 11px;
  color: var(--text-faint);
}

/**
 * 删除按钮。常显（低透明度）而不是 hover 才出现 ——
 * 手机上根本没有 hover，藏起来就等于没有这个功能。
 */
.h-del {
  flex: none;
  width: 22px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-faint);
  cursor: pointer;
  opacity: 0.4;
  transition: opacity 0.15s ease, color 0.15s ease;

  &:hover {
    opacity: 1;
    color: var(--red);
  }
}

.hist-foot {
  flex: none;
  padding-top: 6px;
  border-top: 1px solid var(--line);
}

.rail-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 7px 4px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-faint);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover {
    background: var(--panel-2);
    color: var(--text-dim);
  }
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

    /* 当前会话名。压在副标题下面一行，颜色提亮一档，和上面那句说明区分开 */
    .hero-current {
      color: var(--gold);
      word-break: break-all;
    }
  }

  .hero-actions {
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
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
  word-break: break-word;
}

/* 卡片里的 markdown：比报告区窄（minmax(210px,1fr)），密度整体收紧一档。
   写成 .pillar-text.markdown 双类，特异性压过下面的 .markdown 同名规则 */
.pillar-text.markdown {
  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    font-size: 13px;
    margin: 10px 0 4px;
    padding-left: 0;
    border-left: none;
  }

  :deep(h1:first-child),
  :deep(h2:first-child),
  :deep(h3:first-child) {
    margin-top: 0;
  }

  :deep(p) {
    margin: 0 0 8px;
  }

  :deep(p:last-child) {
    margin-bottom: 0;
  }

  :deep(ul),
  :deep(ol) {
    margin: 0 0 8px;
    padding-left: 18px;
  }

  :deep(blockquote) {
    margin: 0 0 8px;
    padding: 4px 10px;
  }

  :deep(table) {
    font-size: 12px;
    margin: 0 0 8px;
  }

  :deep(th),
  :deep(td) {
    padding: 4px 6px;
  }

  :deep(hr) {
    margin: 10px 0;
  }
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

/* ==================== 核心结论卡片 ==================== */

/**
 * 四块（事业/财富/婚姻/健康…）从编号列表重排成卡片网格。
 * HTML 是 renderHead 里拼的（v-html 注入），所以全部要走 :deep。
 * 方向着色：顺=鎏金（正向）、平=中性线色、逆=冷蓝（收敛）——
 * 刻意不用红绿，那是 A 股涨跌的语义，放在命理报告里会误读。
 */
.report {
  :deep(.vgrid) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 2px 0 16px;
  }

  :deep(.vcard) {
    position: relative;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--panel-2);
    padding: 12px 14px 11px 16px;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      inset: 0 auto 0 0;
      width: 3px;
      background: var(--line-strong);
    }

    &.is-shun::before {
      background: var(--gold-2);
    }

    &.is-ni::before {
      background: var(--blue);
    }
  }

  :deep(.v-top) {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 7px;
  }

  :deep(.v-block) {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.12em;
    color: var(--text);
  }

  :deep(.v-badge) {
    font-size: 11px;
    line-height: 1.7;
    padding: 0 9px;
    border-radius: 999px;
    border: 1px solid var(--line-strong);
    color: var(--text-faint);
  }

  :deep(.is-shun .v-badge) {
    color: var(--gold);
    border-color: var(--gold-soft);
    background: var(--gold-wash);
  }

  :deep(.is-ni .v-badge) {
    color: var(--blue);
    border-color: var(--blue);
    background: rgba(61, 107, 150, 0.09);
  }

  :deep(.v-hint) {
    margin-left: auto;
    font-size: 11px;
    color: var(--text-faint);
    letter-spacing: 0.04em;
  }

  :deep(.v-row) {
    display: flex;
    gap: 7px;
    margin-top: 4px;
    font-size: 12.5px;
    line-height: 1.78;
    color: var(--text-dim);

    strong {
      color: var(--text);
      font-weight: 600;
    }
  }

  :deep(.v-k) {
    flex: none;
    width: 2.6em;
    color: var(--text-faint);
    font-size: 11px;
    letter-spacing: 0.1em;
    padding-top: 2px;
  }

  :deep(.vextras-title) {
    font-size: 12px;
    letter-spacing: 0.14em;
    color: var(--text-faint);
    margin: 14px 0 8px;
  }

  :deep(.vx) {
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 11px 14px;
    margin-bottom: 9px;
  }

  :deep(.vx-head) {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--gold);
    margin-bottom: 5px;
    letter-spacing: 0.04em;
  }
}

@media (max-width: 720px) {
  .report {
    :deep(.vgrid) {
      grid-template-columns: 1fr;
    }
  }
}

/* ==================== 详章折叠 ==================== */

/**
 * 折叠条做成「一整行的按钮」而不是 el-collapse：
 * 详章里要用和正文完全一致的 markdown 样式（h3 / 表格 / 引用），
 * 塞进 el-collapse-item 的话得再覆盖一层它的内边距与标题排版，得不偿失。
 */
.detail {
  margin-top: 4px;
}

.detail-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--panel-2);
  color: var(--gold);
  font-size: 13px;
  font-family: inherit;
  letter-spacing: 0.06em;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease;

  &:hover {
    border-color: var(--gold-soft);
    background: var(--gold-wash);
  }

  &:focus-visible {
    outline: 2px solid var(--gold-2);
    outline-offset: 2px;
  }
}

.detail-chev {
  transition: transform 0.2s ease;

  &.is-open {
    transform: rotate(90deg);
  }
}

.detail-count {
  margin-left: auto;
  font-size: 12px;
  letter-spacing: 0;
  color: var(--text-faint);
}

/* 详章与首屏的间距。上边距给在这里而不是 .detail，否则收起时也会留一道空档 */
.detail-body {
  margin-top: 18px;
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
  // ⚠️ 这一条是常驻吸底条，「回到顶部」按钮必须浮在它上面：
  //    z-index 见 App.vue 的 .el-backtop（30），高度见 router/index.ts 里
  //    /fortune 的 backtopBottom（208）。改了本块高度，那两处要跟着核。
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

/**
 * 输入区做成一个「盒子」：文本域在上、工具条在下。
 *
 * <p>为什么不是文本域 + 右侧按钮两列：按钮竖在右边会把文本域的可用宽度吃掉一截，
 * 而且长文换行时按钮高度会跟着撑开，看着很怪。收到盒内右下角之后，
 * 文本域能占满整行，输入区高度只随内容长。
 */
.input-box {
  position: relative;
  padding: 10px 10px 8px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--bg-soft);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    border-color: var(--line-strong);
  }

  &:focus-within {
    border-color: var(--gold-2);
    box-shadow: 0 0 0 4px var(--gold-wash);
  }

  &.is-disabled {
    opacity: 0.72;
  }

  // 焦点环画在整个盒子上，所以要把 textarea 自带的那圈描边关掉。
  // theme.css 给 .el-textarea__inner 上了 box-shadow 描边 + 白底，
  // 不关掉的话盒子里会再套一个更小的方框，边框会「双线」。
  :deep(.el-textarea__inner) {
    padding: 0 4px 6px 0;
    background: transparent;
    box-shadow: none;
    font-size: 14px;
    line-height: 1.75;

    &:hover,
    &:focus {
      box-shadow: none;
    }
  }

  // 禁用态 Element Plus 会给灰底，同样要在盒子里抹掉
  :deep(.el-textarea.is-disabled .el-textarea__inner) {
    background: transparent;
    color: var(--text-dim);
  }
}

.input-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 32px;
}

.input-tip {
  padding-left: 2px;
  font-size: 11px;
  color: var(--text-faint);
  user-select: none;
}

.bar-spacer {
  flex: 1;
}

.send-wrap {
  display: inline-flex;
}

.send-btn {
  width: 34px;
  height: 34px;
  padding: 0;
  font-size: 16px;
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

  .input-box {
    padding: 8px 8px 6px 12px;
  }

  // 窄屏没有 Shift+Enter 这个概念，提示语省掉，给文本域让宽度
  .input-tip {
    display: none;
  }
}
</style>
