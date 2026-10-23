<template>
  <div class="report-page">
    <Header/>

    <div class="page">
      <div class="page-head">
        <div class="page-title">紫微详细报告</div>
        <div class="head-actions">
          <el-button size="small" @click="router.push({name: 'ziwei'})">去排盘</el-button>
        </div>
      </div>
      <p class="page-sub">
        正文 11 章按人生问题组织（性格、事业、钱、感情、身心、现在与未来），
        专业盘面收在 3 章附录里。后台逐章生成，约 12 分钟；生成中也能看已完成章节，
        全部完成后可导出 PDF。
      </p>

      <div v-if="loading" class="list-state">正在读取报告列表…</div>
      <el-empty
          v-else-if="!records.length"
          description="还没有紫微报告。排盘之后点「详细报告」即可生成。"
      />
      <template v-else>
        <div class="report-list">
          <el-card v-for="r in records" :key="r.id" class="report-card" shadow="never">
            <div class="card-head">
              <div class="card-title">
                <span class="t">{{ r.title }}</span>
                <span class="gz">
                  {{ r.mingGongGanZhi || '—' }}命宫
                  <template v-if="r.bureau"> · {{ r.bureau }}</template>
                </span>
              </div>
              <el-tag :type="statusTagType(r.status)" effect="plain" round size="small">
                {{ statusText(r) }}
              </el-tag>
            </div>

            <el-progress
                v-if="r.status === ZIWEI_REPORT_STATUS.DOING"
                class="card-progress"
                :percentage="pct(r)"
                :stroke-width="8"
                :show-text="false"
            />

            <el-alert
                v-if="r.status === ZIWEI_REPORT_STATUS.ERR && r.errorMsg"
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
                    v-if="r.status === ZIWEI_REPORT_STATUS.ERR"
                    link
                    type="warning"
                    @click="retry(r)"
                >重试
                </el-button>
                <el-button
                    v-if="r.status === ZIWEI_REPORT_STATUS.END"
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
  downloadZiweiReportPdfById,
  listZiweiReports,
  retryZiweiReport,
  ZIWEI_REPORT_STATUS,
} from '@/api/module/ziwei';
import type {ZiweiReportVo} from '@/api/module/ziwei';
import {goLogin, NeedLoginError} from '@/utils/auth';

const router = useRouter();

const loading = ref(false);
const records = ref<ZiweiReportVo[]>([]);
const pageNum = ref(1);
const size = ref(10);
const total = ref(0);
const exportingId = ref('');

async function loadList(): Promise<void> {
  loading.value = true;
  try {
    const res = await listZiweiReports(pageNum.value, size.value);
    const page = res.data;
    records.value = page?.records ?? [];
    // 全局 JacksonConfig 把 Long 序列化成字符串，分页计数也是 "3" 这种
    total.value = Number(page?.total ?? 0);
    size.value = Number(page?.size ?? 10);
  } catch (e) {
    console.warn('[ziwei-report] 拉取报告列表失败', e);
  } finally {
    loading.value = false;
  }
}

function statusText(r: ZiweiReportVo): string {
  if (r.status === ZIWEI_REPORT_STATUS.DOING) {
    return `生成中 ${r.doneSections ?? 0}/${r.totalSections ?? '?'}`;
  }
  if (r.status === ZIWEI_REPORT_STATUS.ERR) return '失败';
  return '已完成';
}

function statusTagType(status: number): 'warning' | 'success' | 'danger' | 'info' {
  if (status === ZIWEI_REPORT_STATUS.DOING) return 'warning';
  if (status === ZIWEI_REPORT_STATUS.ERR) return 'danger';
  return 'success';
}

function pct(r: ZiweiReportVo): number {
  const totalSections = r.totalSections ?? 0;
  if (!totalSections) return 0;
  return Math.round(((r.doneSections ?? 0) / totalSections) * 100);
}

function open(r: ZiweiReportVo): void {
  router.push({name: 'ziwei-report-detail', params: {id: r.id}});
}

function onPageChange(page: number): void {
  pageNum.value = page;
  void loadList();
}

async function exportPdf(r: ZiweiReportVo): Promise<void> {
  if (exportingId.value) return;
  exportingId.value = r.id;
  try {
    const filename = await downloadZiweiReportPdfById(r.id);
    ElMessage.success(`已下载：${filename}`);
  } catch (e) {
    if (e instanceof NeedLoginError) {
      goLogin();
      return;
    }
    console.error('[ziwei-report] 导出 PDF 失败', e);
    ElMessage.error(e instanceof Error ? e.message : '导出失败，请稍后重试');
  } finally {
    exportingId.value = '';
  }
}

async function retry(r: ZiweiReportVo): Promise<void> {
  try {
    const res = await retryZiweiReport(r.id);
    if (res.data === true) {
      ElMessage.success('已重新入队，稍候自动继续生成');
      await loadList();
    } else {
      ElMessage.warning('没有需要重试的章节');
    }
  } catch (e) {
    console.warn('[ziwei-report] 重试失败章节失败', e);
    ElMessage.error(e instanceof Error ? e.message : '重试失败，请稍后重试');
  }
}

onMounted(loadList);
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
