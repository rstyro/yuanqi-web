<template>
  <!-- ================= 概要条 ================= -->
  <div class="summary-bar">
    <div class="summary-item">
      <span class="k">公历</span>
      <span class="v">{{ ctx.pillarVo.gregorianDate }}</span>
    </div>
    <div class="summary-item">
      <span class="k">农历</span>
      <span class="v">{{ ctx.pillarVo.lunarDate }}</span>
    </div>
    <div v-if="ctx.tstApplied" class="summary-item">
      <span class="k">真太阳时</span>
      <span class="v"><span class="tst-tag">{{ ctx.tstAppliedText }}</span></span>
    </div>
    <div class="summary-divider"/>
    <div class="summary-item">
      <span class="k">四柱</span>
      <span class="v mono">{{ ctx.pillarVo.ganZhi }}</span>
    </div>
    <div class="summary-divider"/>
    <div class="summary-item">
      <span class="k">生肖</span>
      <span class="v">{{ ctx.pillarVo.zodiac }}</span>
    </div>
    <div class="summary-item">
      <span class="k">星座</span>
      <span class="v">{{ ctx.pillarVo.starSign }}</span>
    </div>
    <template v-if="ctx.qiYunView">
      <div class="summary-divider"/>
      <div class="summary-item">
        <span class="k">当前</span>
        <span class="v">{{ ctx.qiYunView.currentAge }} 岁（虚 {{ ctx.qiYunView.currentNominalAge }}）</span>
      </div>
      <div class="summary-item">
        <span class="k">大运</span>
        <span class="v">{{ ctx.currentYunText }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type {BaziCtx} from '../composables/useBaziCtx';

const props = defineProps<{ctx: BaziCtx}>();
const ctx = props.ctx;
</script>

<style scoped lang="scss">
@use '../styles/tst-tag';

/* ============================ 概要条 ============================ */

.summary-bar {
  display: flex;
  align-items: center;
  gap: 22px;
  flex-wrap: wrap;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  padding: 12px 20px;
  margin-bottom: 16px;
}

.summary-item {
  display: flex;
  align-items: baseline;
  gap: 6px;

  .k {
    font-size: 12px;
    color: var(--text-faint);
  }

  .v {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);

    &.mono {
      font-family: var(--mono);
      letter-spacing: 1px;
    }
  }
}

.summary-divider {
  width: 1px;
  height: 16px;
  background: var(--line);
}
</style>
