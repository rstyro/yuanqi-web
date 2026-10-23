<template>
  <div class="report-page">
    <Header/>

    <div class="page">
      <div class="page-head">
        <div class="page-title">
          {{ report?.title || '紫微详细报告' }}
          <small v-if="report?.mingGongGanZhi">
            {{ report.mingGongGanZhi }}命宫<template v-if="report.bureau"> · {{ report.bureau }}</template>
          </small>
        </div>
        <div class="head-actions">
          <el-button
              v-if="canRetry"
              size="small"
              :loading="retrying"
              @click="onRetry"
          >重试失败章节
          </el-button>
          <el-button
              size="small"
              type="primary"
              :loading="exporting"
              :disabled="!canExport"
              @click="onExport"
          >导出 PDF
          </el-button>
        </div>
      </div>

      <div v-if="loading" class="list-state">正在读取报告…</div>
      <el-empty v-else-if="!report" description="报告不存在或无权访问"/>
      <template v-else>
        <el-card v-if="report.status === ZIWEI_REPORT_STATUS.DOING" class="progress-card" shadow="never">
          <div class="progress-head">
            <span class="progress-label">
              正在生成：{{ status?.currentSectionTitle || '排队中…' }}
            </span>
            <span class="progress-num">{{ doneCount }} / {{ totalCount }} 章</span>
          </div>
          <el-progress :percentage="pct" :stroke-width="8" :show-text="false"/>
          <p class="progress-tip">
            生成在后台进行，可以离开此页 —— 报告列表里会留下「生成中」的记录，随时回来继续看。
          </p>
        </el-card>

        <el-alert
            v-if="report.status === ZIWEI_REPORT_STATUS.ERR"
            class="err-alert"
            type="error"
            :closable="false"
            show-icon
            :title="report.errorMsg || '报告生成失败'"
        />

        <div class="report-meta">
          <span v-if="report.birthTime">生辰 {{ report.birthTime }}</span>
          <span v-if="report.sex === 0 || report.sex === 1">{{ report.sex === 1 ? '男' : '女' }}</span>
          <span v-if="report.dateType === 1 || report.dateType === 2">
            {{ report.dateType === 2 ? '农历' : '公历' }}
          </span>
          <span v-if="report.leapMonth === 1">闰月</span>
          <span v-if="report.username">称呼 {{ report.username }}</span>
          <span v-if="report.chartVersion">盘面 {{ report.chartVersion }}</span>
          <span v-if="report.createTime">创建于 {{ report.createTime }}</span>
        </div>

        <el-card v-if="isNewTemplate" class="guide-card" shadow="never">
          <template #header>
            <div class="sec-head">
              <span class="sec-title">这份报告怎么读</span>
            </div>
          </template>
          <p class="guide-line">
            正文 11 章按人生问题排列：先读「三分钟读懂你」「你的性格底色」「工作与事业」
            「你正在走的十年」，其余章节按兴趣读。
          </p>
          <p class="guide-line">
            每章末尾的「依据」行是与盘面对账过的事实，不是套话；想核对盘面与专业细节，
            展开下面的附录。
          </p>
        </el-card>

        <el-card v-for="s in bodySections" :key="s.id" class="section-card" shadow="never">
          <template #header>
            <div class="sec-head">
              <span class="sec-title">{{ s.title }}</span>
              <el-tag size="small" :type="sectionTagType(s.status)" effect="plain">
                {{ sectionStateText(s.status) }}
              </el-tag>
            </div>
          </template>

          <!-- 正文是 LLM 产物，前端只渲染不重算；renderMarkdown 先转义 HTML，可安全 v-html -->
          <div v-if="s.status === ZIWEI_SECTION_STATUS.END" class="sec-content" v-html="renderMarkdown(s.content || '')"/>
          <p v-else-if="s.status === ZIWEI_SECTION_STATUS.ERR" class="sec-fail">
            这一章生成失败了：{{ s.errorMsg || '原因未知' }}。可点右上角「重试失败章节」再来一次。
          </p>
          <p v-else class="sec-wait">等待生成…</p>
        </el-card>

        <div v-if="appendixSections.length" class="appendix-block">
          <div class="appendix-title">
            附录
            <small>盘面速查与专业细节，默认收起</small>
          </div>
          <el-collapse v-model="openedAppendix" class="appendix-collapse">
            <el-collapse-item v-for="s in appendixSections" :key="s.id" :name="s.id">
              <template #title>
                <div class="appendix-head">
                  <span class="sec-title">{{ s.title }}</span>
                  <el-tag size="small" :type="sectionTagType(s.status)" effect="plain">
                    {{ sectionStateText(s.status) }}
                  </el-tag>
                </div>
              </template>

              <div v-if="s.status === ZIWEI_SECTION_STATUS.END" class="sec-content" v-html="renderMarkdown(s.content || '')"/>
              <p v-else-if="s.status === ZIWEI_SECTION_STATUS.ERR" class="sec-fail">
                这一章生成失败了：{{ s.errorMsg || '原因未知' }}。可点右上角「重试失败章节」再来一次。
              </p>
              <p v-else class="sec-wait">等待生成…</p>
            </el-collapse-item>
          </el-collapse>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref} from 'vue';
import {useRoute} from 'vue-router';
import {ElMessage} from 'element-plus';
import Header from '@/components/Header.vue';
import {
  downloadZiweiReportPdfById,
  getZiweiReportDetail,
  getZiweiReportStatus,
  retryZiweiReport,
  ZIWEI_REPORT_STATUS,
  ZIWEI_SECTION_STATUS,
} from '@/api/module/ziwei';
import type {
  ZiweiReportDetailVo,
  ZiweiReportSectionVo,
  ZiweiReportStatusVo,
  ZiweiReportVo,
} from '@/api/module/ziwei';
import {goLogin, NeedLoginError} from '@/utils/auth';
import {renderMarkdown} from '@/utils/markdown';

const route = useRoute();
const reportId = String(route.params.id ?? '');

const loading = ref(false);
const report = ref<ZiweiReportVo | null>(null);
const sections = ref<ZiweiReportSectionVo[]>([]);
/** 轮询拿到的轻量状态。只在生成中有值，用来显示「当前在写哪章」 */
const status = ref<ZiweiReportStatusVo | null>(null);
/** 附录默认全部收起；用户展开过的章节 id 记在这里 */
const openedAppendix = ref<string[]>([]);

const exporting = ref(false);
const retrying = ref(false);

/** C-lite 正文 11 键，按后端 seq 顺序 */
const BODY_KEYS = new Set([
  'read_me', 'personality', 'strengths', 'career', 'wealth', 'love_family',
  'wellbeing', 'current_decade', 'next_years', 'decade_map', 'advice',
]);
/** C-lite 附录 3 键 */
const APPENDIX_KEYS = new Set(['appendix', 'pro_palaces', 'pro_sanfang']);

/**
 * 是否新版报告。历史单（overview / ming_shen / twelve_palaces / sanfang /
 * decadal / liunian_YYYY）照旧平铺展示，但不显示阅读引导，也不拆附录。
 *
 * <p>旧模板也有 appendix 键，所以判据取「正文 11 键里至少出现一个」——
 * 新单建单时就展开全部 14 行，不存在只有附录没有正文的中间态。
 */
const isNewTemplate = computed(() => sections.value.some((s) => BODY_KEYS.has(s.sectionKey)));
const bodySections = computed(() =>
    isNewTemplate.value
        ? sections.value.filter((s) => BODY_KEYS.has(s.sectionKey))
        : sections.value,
);
const appendixSections = computed(() =>
    isNewTemplate.value
        ? sections.value.filter((s) => APPENDIX_KEYS.has(s.sectionKey))
        : [],
);

let pollTimer: ReturnType<typeof setInterval> | undefined;

const totalCount = computed(() => report.value?.totalSections ?? sections.value.length);
const doneCount = computed(() => report.value?.doneSections ?? 0);
const pct = computed(() =>
    totalCount.value ? Math.round((doneCount.value / totalCount.value) * 100) : 0,
);
/** 仅全部章节完成可导（后端同样会拦，400 带原因） */
const canExport = computed(() => report.value?.status === ZIWEI_REPORT_STATUS.END);
/** 有失败节、或整单已判失败时才值得亮重试按钮 */
const canRetry = computed(
    () =>
        report.value?.status === ZIWEI_REPORT_STATUS.ERR ||
        sections.value.some((s) => s.status === ZIWEI_SECTION_STATUS.ERR),
);

async function loadDetail(): Promise<void> {
  loading.value = true;
  try {
    const res = await getZiweiReportDetail(reportId);
    const detail = res.data as ZiweiReportDetailVo | undefined;
    if (!detail) {
      report.value = null;
      return;
    }
    report.value = detail.report;
    sections.value = detail.sections ?? [];
    if (detail.report.status === ZIWEI_REPORT_STATUS.DOING) {
      startPolling();
    } else {
      stopPolling();
    }
  } catch (e) {
    console.warn('[ziwei-report] 读取报告详情失败', e);
  } finally {
    loading.value = false;
  }
}

// 生成中每完成一章都要把正文与进度拉回来；静默刷新不碰 loading，避免整页闪成「正在读取报告」
async function refreshDetailSilently(): Promise<void> {
  try {
    const res = await getZiweiReportDetail(reportId);
    const detail = res.data as ZiweiReportDetailVo | undefined;
    if (!detail) return;
    report.value = detail.report;
    sections.value = detail.sections ?? [];
  } catch (e) {
    console.warn('[ziwei-report] 刷新报告详情失败', e);
  }
}

/**
 * 轮询一次状态。终态就停表并拉全量章节 ——
 * 刚写完的那几章只在详情里，status 接口刻意不碰正文。
 */
async function pollOnce(): Promise<void> {
  try {
    const res = await getZiweiReportStatus(reportId);
    const s = res.data;
    if (!s) return;
    const prevDone = report.value?.doneSections ?? 0;
    status.value = s;
    if (s.status !== ZIWEI_REPORT_STATUS.DOING) {
      stopPolling();
      await loadDetail();
    } else if ((s.doneSections ?? 0) > prevDone) {
      await refreshDetailSilently();
    }
  } catch (e) {
    console.warn('[ziwei-report] 轮询报告状态失败', e);
  }
}

function startPolling(): void {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    void pollOnce();
  }, 3000);
}

function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = undefined;
  }
}

async function onExport(): Promise<void> {
  if (exporting.value) return;
  exporting.value = true;
  try {
    const filename = await downloadZiweiReportPdfById(reportId);
    ElMessage.success(`已下载：${filename}`);
  } catch (e) {
    if (e instanceof NeedLoginError) {
      goLogin();
      return;
    }
    console.error('[ziwei-report] 导出 PDF 失败', e);
    ElMessage.error(e instanceof Error ? e.message : '导出失败，请稍后重试');
  } finally {
    exporting.value = false;
  }
}

/**
 * 重试失败章节。返回 true 后本地先把主单拨回生成中并恢复轮询，
 * 不等下一次刷新 —— 否则用户会看着一个「失败」的页面几秒钟没反应。
 */
async function onRetry(): Promise<void> {
  if (retrying.value) return;
  retrying.value = true;
  try {
    const res = await retryZiweiReport(reportId);
    if (res.data === true) {
      ElMessage.success('已重新入队，稍候自动继续生成');
      if (report.value && report.value.status !== ZIWEI_REPORT_STATUS.DOING) {
        report.value = {...report.value, status: ZIWEI_REPORT_STATUS.DOING, errorMsg: null};
      }
      startPolling();
    } else {
      ElMessage.warning('没有需要重试的章节');
    }
  } catch (e) {
    console.warn('[ziwei-report] 重试失败章节失败', e);
    ElMessage.error(e instanceof Error ? e.message : '重试失败，请稍后重试');
  } finally {
    retrying.value = false;
  }
}

function sectionStateText(status: number): string {
  if (status === ZIWEI_SECTION_STATUS.END) return '已完成';
  if (status === ZIWEI_SECTION_STATUS.ERR) return '失败';
  if (status === ZIWEI_SECTION_STATUS.DOING) return '生成中';
  return '待生成';
}

function sectionTagType(status: number): 'info' | 'warning' | 'success' | 'danger' {
  if (status === ZIWEI_SECTION_STATUS.END) return 'success';
  if (status === ZIWEI_SECTION_STATUS.ERR) return 'danger';
  if (status === ZIWEI_SECTION_STATUS.DOING) return 'warning';
  return 'info';
}

onMounted(loadDetail);
onUnmounted(stopPolling);
</script>

<style scoped lang="scss">
.report-page {
  width: 100%;
  min-height: 100%;
}

.page {
  @include main-container($mainPad);
  padding-top: 20px;
  padding-bottom: 64px;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.5px;

  small {
    font-size: 12px;
    font-weight: 400;
    color: var(--text-faint);
    margin-left: 8px;
    letter-spacing: 0;
  }
}

.head-actions {
  display: flex;
  gap: 8px;
}

.list-state {
  padding: 48px 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-faint);
}

.progress-card,
.err-alert,
.report-meta,
.guide-card,
.section-card,
.appendix-block {
  max-width: 900px;
}

.progress-card {
  margin-bottom: 16px;
  border-color: var(--line);

  .progress-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    font-size: 13px;
    color: var(--text-dim);
    margin-bottom: 8px;

    .progress-num {
      flex: none;
      font-variant-numeric: tabular-nums;
      color: var(--text-faint);
    }
  }

  .progress-tip {
    margin: 10px 0 0;
    font-size: 12px;
    color: var(--text-faint);
  }
}

.err-alert {
  margin-bottom: 16px;
}

.guide-card {
  margin-bottom: 16px;
  border-color: var(--line);

  .guide-line {
    margin: 0 0 8px;
    font-size: 13px;
    line-height: 1.8;
    color: var(--text-dim);

    &:last-child {
      margin-bottom: 0;
    }
  }
}

.appendix-block {
  margin-top: 24px;

  .appendix-title {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 10px;
    font-size: 16px;
    font-weight: 600;

    small {
      font-size: 12px;
      font-weight: 400;
      color: var(--text-faint);
    }
  }

  .appendix-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding-right: 8px;
  }

  .sec-content {
    font-size: 14px;
    line-height: 1.9;
    color: var(--text);
  }

  .sec-fail,
  .sec-wait {
    margin: 0;
    font-size: 13px;
  }

  .sec-fail {
    color: var(--red);
  }

  .sec-wait {
    color: var(--text-faint);
  }
}

.report-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  font-size: 12px;
  color: var(--text-faint);
  margin-bottom: 16px;
}

.section-card {
  margin-bottom: 14px;
  border-color: var(--line);

  .sec-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .sec-title {
    font-size: 15px;
    font-weight: 600;
  }

  .sec-content {
    font-size: 14px;
    line-height: 1.9;
    color: var(--text);
  }

  .sec-fail,
  .sec-wait {
    margin: 0;
    font-size: 13px;
  }

  .sec-fail {
    color: var(--red);
  }

  .sec-wait {
    color: var(--text-faint);
  }
}
</style>
