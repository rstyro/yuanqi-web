<template>
  <!-- ================= 流月时间轴 ================= -->
  <el-card class="block">
    <template #header>
      <div class="card-head">
        <div class="card-title">
          流月
          <span class="hint">
            <template v-if="ctx.activeLiuNian">
              {{ ctx.activeLiuNian.year }} 年（{{ ctx.activeLiuNian.pillar?.ganZhi || '—' }} 年干支）·
            </template>
            按十二「节」划分：寅月起、丑月止
          </span>
        </div>
        <div class="legend">
          <span class="dot"></span>标记「今」为当前所处流月
        </div>
      </div>
    </template>

    <div v-if="ctx.liuYueLoading && !ctx.liuYueList.length" class="no-relation">流月加载中…</div>
    <div v-else-if="!ctx.liuYueList.length" class="no-relation">未取到流月数据</div>
    <div v-else class="timeline-scroll">
      <div class="timeline is-liuyue">
        <!-- 格子只有 78px 宽，第二行放得下「立春」这两个字、放不下「2月 · 立春」，
             所以公历月与完整区间走 title 悬停 + 下方那行说明。 -->
        <div v-for="(m, index) in ctx.liuYueList" :key="'ly' + index"
             class="tl-yun"
             :class="{ 'is-active': index === ctx.monthActiveIndex, 'is-now': ctx.isNowLiuYue(m) }"
             :title="m.name + '（' + m.termName + '）：' + ctx.fmt(m.startDateTime) + ' ~ ' + ctx.fmt(m.nextTermDateTime)"
             @click="ctx.checkMonth(index)">
          <div class="tl-years">{{ m.name }}</div>
          <div class="tl-age">{{ m.termName }}</div>
          <div class="tl-gz">{{ m.ganZhi }}</div>
          <div class="tl-gods">
            {{ ctx.getShortGod(m.pillar?.tianGanGod) }}{{ ctx.getShortGod(m.pillar?.diZhiGod) }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="ctx.monthActive" class="yun-note">
      {{ ctx.monthActive.index }} / 12 —— <b>{{ ctx.monthActive.name }}</b>（起节 {{ ctx.monthActive.termName }}）：
      真实区间 <b class="mono">{{ ctx.fmt(ctx.monthActive.startDateTime) }} ~ {{ ctx.fmt(ctx.monthActive.nextTermDateTime) }}</b>
      <span class="note-sub">
        区间为<b>半开</b>（含起节、不含下一个节）。月名按节气走，所以这一月落在
        <b>{{ ctx.monthActive.year }} 年 {{ ctx.monthActive.month }} 月</b> —— 不是公历月，
        跨年时（丑月）会落到流年的次年。
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
@use '../styles/relation';
</style>
