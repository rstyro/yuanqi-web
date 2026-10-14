<template>
        <!-- ==================== 命盘（会话级，只推一次） ==================== -->
        <el-card v-if="ctx.chart" class="chart-card" shadow="never">
          <template #header>
            <div class="chart-head">
              <div class="ganzhi">{{ disp(ctx.chart.ganZhi) }}</div>
              <div class="chart-meta">
                <el-tag v-if="ctx.chart.zodiac" size="small" effect="plain">生肖 · {{ disp(ctx.chart.zodiac) }}</el-tag>
                <el-tag v-if="ctx.chart.starSign" size="small" effect="plain">星座 · {{ disp(ctx.chart.starSign) }}</el-tag>
                <el-tag v-if="ctx.chart.lunarDate" size="small" effect="plain">农历 · {{ shortDate(ctx.chart.lunarDate) }}</el-tag>
                <el-tag v-if="ctx.chart.gregorianDate" size="small" effect="plain">公历 · {{ shortDate(ctx.chart.gregorianDate) }}</el-tag>
                <!-- 刻意不展示 chart.sect：它是个流派编号（如 "2"），不是给人看的文案 -->
              </div>
            </div>
          </template>

          <!-- 属性 × 柱位 的矩阵。列是动态的：某一柱缺失时不硬塞空列 -->
          <el-table :data="ctx.chartRows" border size="small" class="pillar-table">
            <el-table-column prop="label" label="" width="66" align="left">
              <template #default="{ row }">
                <span class="attr-label">{{ row.label }}</span>
              </template>
            </el-table-column>
            <el-table-column
                v-for="col in ctx.chartColumns"
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

          <template v-if="ctx.chart.qiYunView">
            <el-divider content-position="left">大运流转</el-divider>
            <el-descriptions :column="4" size="small" border>
              <el-descriptions-item label="当前大运">{{ ctx.currentDaYunText }}</el-descriptions-item>
              <el-descriptions-item label="起运年份">{{ ctx.qiYunYearText }}</el-descriptions-item>
              <el-descriptions-item label="当前年龄">
                {{ ctx.chart.qiYunView.currentAge }} 岁
              </el-descriptions-item>
              <el-descriptions-item label="虚岁">
                {{ ctx.chart.qiYunView.currentNominalAge }} 岁
              </el-descriptions-item>
            </el-descriptions>
          </template>
        </el-card>
</template>

<script setup lang="ts">
/**
 * 命盘卡片：属性 × 柱位矩阵 + 大运流转。命盘是会话级的，只推一次。
 */
import {disp, shortDate} from '../fortuneFormat';
import type {FortuneCtx} from '../composables/useFortuneCtx';

const props = defineProps<{ctx: FortuneCtx}>();
const ctx = props.ctx;
</script>

<style scoped lang="scss">
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
</style>
