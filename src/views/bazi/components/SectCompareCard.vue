<template>
  <!-- ================= 流派对照 ================= -->
  <el-card v-if="ctx.sectCount > 1" class="block">
    <template #header>
      <div class="card-head">
        <div class="card-title">
          流派对照
          <span class="hint">起运差几天，整条大运年份就可能错位</span>
        </div>
      </div>
    </template>

    <div class="sect-compare">
      <div v-for="opt in ctx.availableSectOptions" :key="opt.value"
           class="sect-panel" :class="{ 'is-active': ctx.sect === opt.value }">
        <div class="sect-panel-head">
          <div class="sect-name">
            {{ ctx.qiYunView?.sectSummaryMap[opt.value]?.label }}
            <span v-if="ctx.sect === opt.value" class="sect-badge">当前</span>
          </div>
          <el-button v-if="ctx.sect !== opt.value" link type="primary" @click="ctx.sect = opt.value">
            切到此流派
          </el-button>
        </div>
        <div class="sect-body">
          <div class="sect-row">
            <span class="sk">起运时刻</span>
            <span class="sv">{{ ctx.fmt(ctx.qiYunView?.sectSummaryMap[opt.value]?.startYunDateTime) }}</span>
          </div>
          <div class="sect-row">
            <span class="sk">起运读数</span>
            <span class="sv">{{ ctx.qiYunView?.sectSummaryMap[opt.value]?.startYunText }}</span>
          </div>
          <div class="sect-row">
            <span class="sk">顺 / 逆</span>
            <span class="sv">{{ ctx.qiYunView?.sectSummaryMap[opt.value]?.contrary ? '逆推' : '顺推' }}</span>
          </div>
          <div class="year-block">
            <div class="sk">大运起始年份</div>
            <div class="year-seq">
              <span v-for="(y, yi) in ctx.qiYunView?.sectSummaryMap[opt.value]?.startYears" :key="yi"
                    class="year-chip" :class="{ 'is-diff': ctx.isYearDiff(opt.value, y) }">{{ y }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="diff-callout" :class="{ 'no-diff': !ctx.sectDiff.hasDiff }">
      <template v-if="ctx.sectDiff.hasDiff"><b>两流派有差异：</b>{{ ctx.sectDiff.text }}</template>
      <template v-else>两个流派算出的起运时刻与大运年份完全一致，无需取舍。</template>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import type {BaziCtx} from '../composables/useBaziCtx';

const props = defineProps<{ctx: BaziCtx}>();
const ctx = props.ctx;
</script>

<style scoped lang="scss">
@use '../styles/card-chrome';

/* ============================ 流派对照 ============================ */

.sect-compare {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.sect-panel {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;

  &.is-active {
    border-color: var(--gold);
    box-shadow: 0 0 0 2px var(--gold-wash);
  }
}

.sect-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  background: var(--panel-2);
  border-bottom: 1px solid var(--line);

  .sect-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .sect-badge {
    font-size: 11px;
    padding: 1px 7px;
    border-radius: 10px;
    background: var(--gold);
    color: #fff;
    margin-left: 6px;
  }
}

.sect-panel.is-active .sect-panel-head {
  background: var(--gold-wash);
}

.sect-body {
  padding: 12px 14px;
}

.sect-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;

  .sk {
    color: var(--text-faint);
    flex-shrink: 0;
  }

  .sv {
    text-align: right;
    font-family: var(--mono);
    color: var(--text);
  }
}

.year-block {
  margin-top: 8px;

  .sk {
    font-size: 12px;
    color: var(--text-faint);
  }
}

.year-seq {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.year-chip {
  font-family: var(--mono);
  font-size: 12px;
  padding: 2px 7px;
  border-radius: 4px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  color: var(--text-dim);

  &.is-diff {
    background: rgba(183, 138, 36, 0.16);
    border-color: var(--el-color-warning);
    color: var(--el-color-warning);
    font-weight: 600;
  }
}

.diff-callout {
  margin-top: 14px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: rgba(183, 138, 36, 0.14);
  border: 1px solid var(--el-color-warning);
  color: var(--el-color-warning);
  font-size: 12.5px;
  line-height: 1.7;

  &.no-diff {
    background: var(--panel-2);
    border-color: var(--line);
    color: var(--text-dim);
  }
}
</style>
