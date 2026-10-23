<template>
  <!-- ================= 流年时间轴 ================= -->
  <el-card v-if="ctx.activeYun" class="block">
    <template #header>
      <div class="card-head">
        <div class="card-title">
          流年
          <span class="hint">{{ ctx.activeYun.startYear }} ~ {{ ctx.activeYun.endYear }} 年（{{ ctx.activeYun.pillar?.ganZhi }} 运）</span>
        </div>
      </div>
    </template>

    <div class="timeline-scroll">
      <div class="timeline is-liunian">
        <div v-for="(ln, index) in ctx.activeYun.liuNianList" :key="'ln' + index"
             class="tl-yun"
             :class="{ 'is-active': index === ctx.fleetActiveIndex, 'is-now': ctx.isNowLiuNian(ln) }"
             @click="ctx.checkFleetYear(index)">
          <div class="tl-years">{{ ln.year }}</div>
          <div class="tl-age">{{ ln.age }}岁</div>
          <div class="tl-gz">{{ ln.pillar?.ganZhi }}</div>
          <div class="tl-gods">
            {{ ctx.getShortGod(ln.pillar?.tianGanGod) }}{{ ctx.getShortGod(ln.pillar?.diZhiGod) }}
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import type {BaziCtx} from '../composables/useBaziCtx';

const props = defineProps<{ctx: BaziCtx}>();
const ctx = props.ctx;
</script>

<style scoped lang="scss">
@use '@/views/shared/styles/card-chrome';
@use '../styles/timeline';
</style>
