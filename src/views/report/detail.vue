<template>
  <div class="report-page">
    <Header/>

    <div class="page">
      <!-- ================= 页头 ================= -->
      <div class="page-head">
        <div class="page-title">
          {{ report?.title || '详细报告' }}
          <small v-if="report?.ganZhi">{{ report.ganZhi }}</small>
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
        <!-- ================= 生成中：进度 ================= -->
        <el-card v-if="report.status === REPORT_STATUS.DOING" class="progress-card" shadow="never">
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

        <!-- ================= 整单失败 ================= -->
        <el-alert
            v-if="report.status === REPORT_STATUS.ERR"
            class="err-alert"
            type="error"
            :closable="false"
            show-icon
            :title="report.errorMsg || '报告生成失败'"
        />

        <!-- ================= 报告元信息 ================= -->
        <div class="report-meta">
          <span v-if="report.birthTime">生辰 {{ report.birthTime }}</span>
          <span v-if="report.sex === 0 || report.sex === 1">{{ report.sex === 1 ? '男' : '女' }}</span>
          <span v-if="report.dateType === 1 || report.dateType === 2">
            {{ report.dateType === 2 ? '农历' : '公历' }}
          </span>
          <span v-if="report.leapMonth === 1">闰月</span>
          <span v-if="report.username">称呼 {{ report.username }}</span>
          <span v-if="report.createTime">创建于 {{ report.createTime }}</span>
        </div>

        <!-- ================= 章节 ================= -->
        <el-card v-for="s in sections" :key="s.id" class="section-card" shadow="never">
          <template #header>
            <div class="sec-head">
              <span class="sec-title">{{ s.title }}</span>
              <el-tag size="small" :type="sectionTagType(s.status)" effect="plain">
                {{ sectionStateText(s.status) }}
              </el-tag>
            </div>
          </template>

          <!-- 正文是 LLM 产物，前端只渲染不重算；markdown 渲染器先转义 HTML，
               可安全 v-html（见 utils/markdown.ts） -->
          <div v-if="s.status === SECTION_STATUS.END" class="sec-content" v-html="renderMarkdown(s.content || '')"/>
          <p v-else-if="s.status === SECTION_STATUS.ERR" class="sec-fail">
            这一章生成失败了：{{ s.errorMsg || '原因未知' }}。可点右上角「重试失败章节」再来一次。
          </p>
          <p v-else class="sec-wait">等待生成…</p>
        </el-card>
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
  downloadReportPdfById,
  getReportDetail,
  getReportStatus,
  retryReport,
  REPORT_STATUS,
  SECTION_STATUS,
} from '@/api/module/fortune';
import type {
  FortuneReportDetailVo,
  FortuneReportSectionVo,
  FortuneReportStatusVo,
  FortuneReportVo,
} from '@/api/module/fortune';
import {goLogin, NeedLoginError} from '@/utils/auth';
import {renderMarkdown} from '@/utils/markdown';

const route = useRoute();
const reportId = String(route.params.id ?? '');

const loading = ref(false);
const report = ref<FortuneReportVo | null>(null);
const sections = ref<FortuneReportSectionVo[]>([]);
/** 轮询拿到的轻量状态。只在生成中有值，用来显示「当前在写哪章」 */
const status = ref<FortuneReportStatusVo | null>(null);

const exporting = ref(false);
const retrying = ref(false);

/** 轮询定时器。只有「生成中」才存在，切页/终态即清 */
let pollTimer: ReturnType<typeof setInterval> | undefined;

const totalCount = computed(() => report.value?.totalSections ?? sections.value.length);
const doneCount = computed(() => report.value?.doneSections ?? 0);
const pct = computed(() =>
    totalCount.value ? Math.round((doneCount.value / totalCount.value) * 100) : 0,
);
/** 仅全部章节完成可导（后端同样会拦，400 带原因） */
const canExport = computed(() => report.value?.status === REPORT_STATUS.END);
/** 有失败节、或整单已判失败时才值得亮重试按钮 */
const canRetry = computed(
    () =>
        report.value?.status === REPORT_STATUS.ERR ||
        sections.value.some((s) => s.status === SECTION_STATUS.ERR),
);

async function loadDetail(): Promise<void> {
  loading.value = true;
  try {
    const res = await getReportDetail(reportId);
    const detail = res.data as FortuneReportDetailVo | undefined;
    if (!detail) {
      // 「不存在」与「不是你的」后端同一句提示，页面统一走空态
      report.value = null;
      return;
    }
    report.value = detail.report;
    sections.value = detail.sections ?? [];
    if (detail.report.status === REPORT_STATUS.DOING) {
      startPolling();
    } else {
      stopPolling();
    }
  } catch (e) {
    console.warn('[report] 读取报告详情失败', e);
  } finally {
    loading.value = false;
  }
}

/**
 * 轮询一次状态。终态（完成/失败）就停表并拉全量章节 ——
 * 刚写完的那几章只在详情里，status 接口刻意不碰正文。
 */
async function pollOnce(): Promise<void> {
  try {
    const res = await getReportStatus(reportId);
    const s = res.data;
    if (!s) return;
    status.value = s;
    if (s.status !== REPORT_STATUS.DOING) {
      stopPolling();
      await loadDetail();
    }
  } catch (e) {
    console.warn('[report] 轮询报告状态失败', e);
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

/**
 * 导出 PDF。
 *
 * <p>未完成时后端回 400 + JSON 原因（「报告尚未生成完成（x/N 章）」），
 * 原样弹给用户；按钮在完成态才亮，这里是双保险。
 */
async function onExport(): Promise<void> {
  if (exporting.value) return;
  exporting.value = true;
  try {
    const filename = await downloadReportPdfById(reportId);
    ElMessage.success(`已下载：${filename}`);
  } catch (e) {
    if (e instanceof NeedLoginError) {
      goLogin();
      return;
    }
    console.error('[report] 导出 PDF 失败', e);
    ElMessage.error(e instanceof Error ? e.message : '导出失败，请稍后重试');
  } finally {
    exporting.value = false;
  }
}

/**
 * 重试失败章节。
 *
 * <p>后端语义：失败节 status=3 → 0 重新入队；整单若是失败态也会被拖回
 * 「生成中」。所以收到 true 后本地先把主单拨回生成中并恢复轮询，
 * 不等下一次刷新 —— 否则用户会看着一个「失败」的页面几秒钟没反应。
 */
async function onRetry(): Promise<void> {
  if (retrying.value) return;
  retrying.value = true;
  try {
    const res = await retryReport(reportId);
    if (res.data === true) {
      ElMessage.success('已重新入队，稍候自动继续生成');
      if (report.value && report.value.status !== REPORT_STATUS.DOING) {
        report.value = {...report.value, status: REPORT_STATUS.DOING, errorMsg: null};
      }
      startPolling();
    } else {
      ElMessage.warning('没有需要重试的章节');
    }
  } catch (e) {
    console.warn('[report] 重试失败章节失败', e);
  } finally {
    retrying.value = false;
  }
}

function sectionStateText(status: number): string {
  if (status === SECTION_STATUS.END) return '已完成';
  if (status === SECTION_STATUS.ERR) return '失败';
  if (status === SECTION_STATUS.DOING) return '生成中';
  return '待生成';
}

function sectionTagType(status: number): 'info' | 'warning' | 'success' | 'danger' {
  if (status === SECTION_STATUS.END) return 'success';
  if (status === SECTION_STATUS.ERR) return 'danger';
  if (status === SECTION_STATUS.DOING) return 'warning';
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

/* 主体宽度锁在 $mainWidth，与 Header 内层同轴（版式规则 1） */
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

/* 阅读型内容限 900px（版式规则 2） */
.progress-card,
.err-alert,
.report-meta,
.section-card {
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
