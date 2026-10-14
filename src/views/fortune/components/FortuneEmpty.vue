<template>
        <!-- ==================== 空态 ==================== -->
        <el-empty v-if="!ctx.rounds.length" description="说一句出生时间，开始推演" :image-size="130">
          <el-button class="sample-btn" plain @click="ctx.send(SAMPLE_QUESTION)">{{ SAMPLE_QUESTION }}</el-button>
          <p class="empty-hint">
            排盘是纯计算，毫秒级，不走模型；解读才调模型。<br/>
            命中缓存的那一层会打上「缓存」标记 —— 那一轮不会真的花钱。
          </p>
        </el-empty>
</template>

<script setup lang="ts">
/**
 * 空态：给一句可直接照抄的示例提问。
 */
import {SAMPLE_QUESTION} from '../fortuneFormat';
import type {FortuneCtx} from '../composables/useFortuneCtx';

const props = defineProps<{ctx: FortuneCtx}>();
const ctx = props.ctx;
</script>

<style scoped lang="scss">
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
</style>
