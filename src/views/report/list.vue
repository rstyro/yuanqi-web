<template>
  <div class="report-page">
    <Header/>

    <div class="page">
      <!-- ================= 页头 ================= -->
      <div class="page-head">
        <div class="page-title">详细报告</div>
        <div class="head-actions">
          <el-button size="small" @click="router.push({name: 'bazi'})">去排盘</el-button>
          <el-button size="small" type="primary" @click="router.push({name: 'fortune'})">去推演</el-button>
        </div>
      </div>
      <p class="page-sub">
        流年 × 流月的完整批八字报告：后台逐章生成，生成中也能看已完成的章节，全部完成后可导出 PDF。
      </p>

      <!-- ================= 列表 ================= -->
      <div v-if="loading" class="list-state">正在读取报告列表…</div>
      <el-empty
          v-else-if="!records.length"
          description="还没有报告。排盘或推演之后点「详细报告」即可生成。"
      />
      <template v-else>
        <div class="report-list">
          <el-card v-for="r in records" :key="r.id" class="report-card" shadow="never">
            <div class="card-head">
              <div class="card-title">
                <span class="t">{{ r.title }}</span>
                <span v-if="r.ganZhi" class="gz">{{ r.ganZhi }}</span>
              </div>
              <el-tag :type="statusTagType(r.status)" effect="plain" round size="small">
                {{ statusText(r) }}
              </el-tag>
            </div>

            <el-progress
                v-if="r.status === REPORT_STATUS.DOING"
                class="card-progress"
                :percentage="pct(r)"
                :stroke-width="8"
                :show-text="false"
            />

            <el-alert
                v-if="r.status === REPORT_STATUS.ERR && r.errorMsg"
                class="card-err"
                type="error"
                :closable="false"
                show-icon
                :title="r.errorMsg"
            />

            <div class="card-foot">
              <span class="time">创建于 {{ r.createTime || '—' }}</span>
              <div class="actions">
                <el-button link type="primary" @click="open(r)">查看</el-button>
                <el-button
                    v-if="r.status === REPORT_STATUS.ERR"
                    link
                    type="warning"
                    @click="retry(r)"
                >重试
                </el-button>
                <el-button
                    v-if="r.status === REPORT_STATUS.END"
                    link
                    type="primary"
                    :loading="exportingId === r.id"
                    @click="exportPdf(r)"
                >导出 PDF
                </el-button>
              </div>
            </div>
          </el-card>
        </div>

        <el-pagination
            v-if="total > size"
            class="pager"
            layout="prev, pager, next"
            :current-page="pageNum"
            :page-size="size"
            :total="total"
            @current-change="onPageChange"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {useRouter} from 'vue-router';
import {ElMessage} from 'element-plus';
import Header from '@/components/Header.vue';
import {
  downloadReportPdfById,
  listReports,
  retryReport,
  REPORT_STATUS,
} from '@/api/module/fortune';
import type {FortuneReportVo} from '@/api/module/fortune';
import {goLogin, NeedLoginError} from '@/utils/auth';

const router = useRouter();

const loading = ref(false);
const records = ref<FortuneReportVo[]>([]);
const pageNum = ref(1);
const size = ref(10);
const total = ref(0);
const exportingId = ref('');

/**
 * 拉一页报告。
 *
 * <p>失败只打日志 —— 拦截器已经弹过一次提示，这里再弹就是两条一模一样的红条。
 * 「列表没刷出来」也不该打断用户，留空态让他自己能重进。
 */
async function loadList(): Promise<void> {
  loading.value = true;
  try {
    const res = await listReports(pageNum.value, size.value);
    const page = res.data;
    records.value = page?.records ?? [];
    // ⚠️ 全局 JacksonConfig 把 Long 也序列化成字符串，分页计数在响应里是
    // "3" 这种 —— el-pagination 要 number，必须转。（记录行里的 Integer 字段
    // 不受影响，仍是数字。）
    total.value = Number(page?.total ?? 0);
    size.value = Number(page?.size ?? 10);
  } catch (e) {
    console.warn('[report] 拉取报告列表失败', e);
  } finally {
    loading.value = false;
  }
}

/** 状态文案。生成中带进度（done/total），失败/完成给终态一句话 */
function statusText(r: FortuneReportVo): string {
  if (r.status === REPORT_STATUS.DOING) {
    return `生成中 ${r.doneSections ?? 0}/${r.totalSections ?? '?'}`;
  }
  if (r.status === REPORT_STATUS.ERR) return '失败';
  return '已完成';
}

function statusTagType(status: number): 'warning' | 'success' | 'danger' | 'info' {
  if (status === REPORT_STATUS.DOING) return 'warning';
  if (status === REPORT_STATUS.ERR) return 'danger';
  return 'success';
}

/** 进度百分比。total 缺失（老数据）时按 0 处理，别除出 NaN */
function pct(r: FortuneReportVo): number {
  const totalSections = r.totalSections ?? 0;
  if (!totalSections) return 0;
  return Math.round(((r.doneSections ?? 0) / totalSections) * 100);
}

function open(r: FortuneReportVo): void {
  router.push({name: 'report-detail', params: {id: r.id}});
}

function onPageChange(page: number): void {
  pageNum.value = page;
  void loadList();
}

/**
 * 导出 PDF。未完成时后端回 400 + JSON 原因（「报告尚未生成完成（x/N 章）」），
 * 原样弹给用户 —— 按钮虽已在完成态才亮，双保险。
 */
async function exportPdf(r: FortuneReportVo): Promise<void> {
  if (exportingId.value) return;
  exportingId.value = r.id;
  try {
    const filename = await downloadReportPdfById(r.id);
    ElMessage.success(`已下载：${filename}`);
  } catch (e) {
    if (e instanceof NeedLoginError) {
      goLogin();
      return;
    }
    console.error('[report] 导出 PDF 失败', e);
    ElMessage.error(e instanceof Error ? e.message : '导出失败，请稍后重试');
  } finally {
    exportingId.value = '';
  }
}

/**
 * 重试。返回 true = 失败节已重新入队（整单失败态也会被拖回生成中），
 * 刷新列表让状态与进度动起来；false = 没有需要重试的章节。
 */
async function retry(r: FortuneReportVo): Promise<void> {
  try {
    const res = await retryReport(r.id);
    if (res.data === true) {
      ElMessage.success('已重新入队，稍候自动继续生成');
      await loadList();
    } else {
      ElMessage.warning('没有需要重试的章节');
    }
  } catch (e) {
    console.warn('[report] 重试失败章节失败', e);
  }
}

onMounted(loadList);
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
}

.page-sub {
  margin: 6px 0 18px;
  font-size: 13px;
  color: var(--text-faint);
}

.list-state {
  padding: 48px 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-faint);
}

/* 卡片流是阅读型内容，限 900px（版式规则 2） */
.report-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 900px;
}

.report-card {
  border-color: var(--line);

  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .card-title {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    .t {
      font-size: 15px;
      font-weight: 600;
    }

    .gz {
      font-size: 12px;
      color: var(--text-dim);
      letter-spacing: 0.05em;
    }
  }

  .card-progress {
    margin-top: 10px;
  }

  .card-err {
    margin-top: 10px;
  }

  .card-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 10px;

    .time {
      font-size: 12px;
      color: var(--text-faint);
    }
  }
}

.pager {
  max-width: 900px;
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
