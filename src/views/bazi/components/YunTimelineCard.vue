<template>
  <!-- ================= 大运时间轴 ================= -->
  <el-card class="block">
    <template #header>
      <div class="card-head">
        <div class="card-title">
          大运
          <span class="hint">{{ ctx.sectLabel }} · 每步十年，点击查看该运下的流年</span>
        </div>
        <div class="legend">
          <span class="dot"></span>标记「今」为当前所处大运
        </div>
      </div>
    </template>

    <div class="timeline-scroll">
      <div class="timeline">
        <div v-for="(dy, index) in ctx.daYunList" :key="'dy' + index"
             class="tl-yun"
             :class="{ 'is-active': index === ctx.yunActiveIndex, 'is-now': ctx.isNowYun(dy) }"
             @click="ctx.checkYun(index)">
          <div class="tl-years">{{ dy.startYear }}</div>
          <div class="tl-age">{{ dy.age }}岁</div>
          <div class="tl-gz">{{ dy.pillar?.ganZhi }}</div>
          <div class="tl-gods">
            {{ ctx.getShortGod(dy.pillar?.tianGanGod) }}{{ ctx.getShortGod(dy.pillar?.diZhiGod) }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="ctx.activeYun" class="yun-note">
      第 {{ ctx.activeYun.index }} 步：名义 <b>{{ ctx.activeYun.startYear }} ~ {{ ctx.activeYun.endYear }}</b> 年（管 10 个流年）；
      真实区间 <b class="mono">{{ ctx.fmt(ctx.activeYun.startDateTime) }} ~ {{ ctx.fmt(ctx.activeYun.endDateTime) }}</b>
      <span v-if="ctx.activeYunSpansEleven" class="warn">
        —— 交运日在年中，真实区间横跨 11 个公历年，判断「现在第几步」须比时刻而非年份
      </span>
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
