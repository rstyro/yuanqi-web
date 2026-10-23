<template>
  <el-card class="block">
    <template #header>
      <div class="card-head">
        <div class="card-title">
          十二宫方盘
          <small class="hint">{{ chart.yearGanZhi }}年 · {{ chart.bureau }} · {{ chart.hourZhi }}时生</small>
        </div>
        <div class="legend">
          <span class="dot strong"></span>庙旺
          <span class="dot mid"></span>得利益平
          <span class="dot weak"></span>不陷
          <span class="hua hua-lu">禄</span>
          <span class="hua hua-quan">权</span>
          <span class="hua hua-ke">科</span>
          <span class="hua hua-ji">忌</span>
        </div>
      </div>
    </template>

    <el-alert v-if="schemaWarn" type="warning" :closable="false" show-icon
              :title="schemaWarn" class="warn"/>

    <p class="board-tip">
      点任意一格展开它的完整读法（三方四正、大小限落宫、六限带进这一宫的流耀），再点一次收回。
      <span v-if="selectedLabel">
        已选中 <b>{{ selectedLabel }}</b>，
        其余格上的角标是相对它的位置关系：<span class="m">对</span>对宫、
        <span class="m">合</span>三合位、<span class="m">夹</span>邻宫（夹本宫的左右两格）。
      </span>
    </p>

    <div class="board-scroll">
      <!-- 4×4 的格子摆 12 个地支位 + 中间 2×2 的信息块：紫微盘的传统读法是这个方阵，
           不是表格。地支位置恒定格子位置（巳午未申在顶行、寅丑子亥在底行），
           所以命宫在哪一格、眼睛一扫就知道，不需要每次都换算。 -->
      <div class="board">
        <ZiweiPalaceCell
            v-for="p in palaces"
            :key="p.index"
            :palace="p"
            :decadal-name="nameAt(decadalNames, p.index)"
            :yearly-name="nameAt(yearlyNames, p.index)"
            :selected="isSelected(p.index)"
            :mark="relationMark(p.index)"
            :style="posStyle(p.index)"
            @select="selectPalace"
        />

        <div class="center">
          <div class="center-title">{{ chart.gender || '—' }}命 · {{ chart.mingGongGanZhi }}命宫</div>
          <dl>
            <template v-for="m in meta" :key="m.label">
              <dt>{{ m.label }}</dt>
              <dd>{{ m.value }}</dd>
            </template>
          </dl>
          <p class="note">盘面只画星曜、宫位与运限；格局与断语的审核口径未定，本页一个字都不给。</p>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import ZiweiPalaceCell from './ZiweiPalaceCell.vue';
import type {ZiweiCtx} from '../composables/useZiweiCtx';

const props = defineProps<{ctx: ZiweiCtx}>();
const ctx = props.ctx;

const chart = computed(() => ctx.chart);
const palaces = computed(() => ctx.palaces);
const meta = computed(() => ctx.meta);
const schemaWarn = computed(() => ctx.schemaWarn);
const selectedLabel = computed(() => ctx.selectedLabel);
const isSelected = (index: number) => ctx.isSelected(index);
const relationMark = (index: number) => ctx.relationMark(index);
const selectPalace = (index: number) => ctx.selectPalace(index);

/**
 * 地支序号 → 方阵落位（列, 行），1 起算。
 *
 * 位置是**地支的**，不是宫位的：命宫、财帛这些名字在十二格里流转，
 * 而巳永远在左上角、子永远在底行中间。后端 `palaces[i].index` 就是地支序号（0=子），
 * 所以这里是一张常量表，不做任何推导 —— 推导出来一次错位，整张盘就成了一张谁也对不上的图。
 */
const POSITIONS: Array<[number, number]> = [
  [3, 4], [2, 4], [1, 4],   // 子 丑 寅
  [1, 3], [1, 2], [1, 1],   // 卯 辰 巳
  [2, 1], [3, 1], [4, 1],   // 午 未 申
  [4, 2], [4, 3], [4, 4],   // 酉 戌 亥
];

const posStyle = (index: number) => {
  const [col, row] = POSITIONS[index] ?? [1, 1];
  return {gridColumn: String(col), gridRow: String(row)};
};

/** 运限叠宫：大限盘 / 流年盘上落在本命地支 index 那一格的宫名 */
const decadalNames = computed(() => ctx.horoscope?.decadal?.palaceNames ?? []);
const yearlyNames = computed(() => ctx.horoscope?.yearly?.palaceNames ?? []);
const nameAt = (names: string[], index: number) => names[index] || '';
</script>

<style scoped lang="scss">
@use '@/views/shared/styles/card-chrome';

.warn {
  margin-bottom: 12px;
}

.board-tip {
  margin: 0 0 10px;
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-faint);

  b {
    color: var(--gold);
    font-weight: 600;
  }

  // 与宫格里那个角标同一套样式，读者不用猜「提示里的字」和「盘上的字」是不是同一个东西
  .m {
    display: inline-block;
    margin: 0 1px;
    padding: 0 3px;
    border: 1px solid var(--blue);
    border-radius: 2px;
    color: var(--blue);
    font-size: 10px;
  }
}

.board-scroll {
  overflow-x: auto;
}

.board {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  grid-template-rows: repeat(4, minmax(128px, auto));
  min-width: 640px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.center {
  grid-column: 2 / span 2;
  grid-row: 2 / span 2;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: var(--bg-soft);

  .center-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--gold);
  }

  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 3px 10px;
    margin: 0;
    font-size: 12px;
  }

  dt {
    color: var(--text-faint);
  }

  dd {
    margin: 0;
    color: var(--text);
    font-family: var(--mono);
    word-break: break-all;
  }

  .note {
    margin: auto 0 0;
    font-size: 11px;
    line-height: 1.6;
    color: var(--text-faint);
  }
}

.legend {
  .strong {
    background: var(--gold);
  }

  .mid {
    background: var(--text-dim);
  }

  .weak {
    background: var(--text-faint);
    opacity: .5;
  }

  .hua {
    padding: 0 3px;
    border-radius: 2px;
    font-size: 10px;
    color: #fff;

    &.hua-lu {
      background: var(--green);
    }

    &.hua-quan {
      background: var(--blue);
    }

    &.hua-ke {
      background: var(--gold);
      color: #1a1a1a;
    }

    &.hua-ji {
      background: var(--red);
    }
  }
}
</style>
