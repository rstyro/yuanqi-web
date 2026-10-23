<template>
  <!-- ================= 命盘 ================= -->
  <el-card class="block">
    <template #header>
      <div class="card-head">
        <div class="card-title">
          命盘
          <span class="hint">左侧四柱为原局，右侧「大运 / 流年 / 流月」跟随下方时间轴选择</span>
        </div>
      </div>
    </template>

    <div class="pillar-table">
      <!-- 行标签列 -->
      <div class="pt-col is-label">
        <div class="pt-cell is-head">柱</div>
        <div class="pt-cell">主星</div>
        <div class="pt-cell">天干</div>
        <div class="pt-cell">地支</div>
        <div class="pt-cell">副星</div>
        <div class="pt-cell is-tall">藏干</div>
        <div class="pt-cell">星运</div>
        <div class="pt-cell">自坐</div>
        <div class="pt-cell">空亡</div>
        <div class="pt-cell">纳音</div>
        <div class="pt-cell is-tall">神煞</div>
      </div>

      <!-- 四柱 -->
      <div v-for="(item, index) in ctx.fourPillars" :key="'fp' + index" class="pt-col is-pillar">
        <div class="pt-cell is-head">{{ item.title }}</div>

        <div class="pt-cell">
          <span v-if="item.tianGanGod === '元女' || item.tianGanGod === '元男'"
                class="tag-op is-strong">{{ item.tianGanGod }}</span>
          <el-popover v-else placement="bottom" :width="420" trigger="hover" :title="item.tianGanGod">
            <template #reference>
              <span class="tag-op">{{ item.tianGanGod }}</span>
            </template>
            <div class="pop-detail" v-html="ctx.getDetail(item.tianGanGod)"></div>
          </el-popover>
        </div>

        <div class="pt-cell">
          <span class="pt-gz" :style="{ color: ctx.tianGan(item.tianGan).element?.color }">{{ item.tianGan }}</span>
          <span class="pt-yy">{{ ctx.tianGan(item.tianGan).yinYang === 'YANG' ? '阳' : '阴' }}</span>
        </div>

        <div class="pt-cell">
          <span class="pt-gz" :style="{ color: ctx.diZhi(item.diZhi).element?.color }">{{ item.diZhi }}</span>
          <span class="pt-yy">{{ ctx.diZhi(item.diZhi).yinYang === 'YANG' ? '阳' : '阴' }}</span>
        </div>

        <div class="pt-cell">
          <el-popover placement="bottom" :width="420" trigger="hover" :title="item.diZhiGod">
            <template #reference>
              <span class="tag-op">{{ item.diZhiGod }}</span>
            </template>
            <div class="pop-detail" v-html="ctx.getDetail(item.diZhiGod)"></div>
          </el-popover>
        </div>

        <div class="pt-cell is-tall">
          <div v-for="(hs, hi) in (ctx.diZhi(item.diZhi).hideHeavenlyStems || [])" :key="'hs' + hi" class="pt-hide">
            <span :style="{ color: hs.element?.color }">{{ hs.name }}</span>
            <span class="pt-yy">{{ hs.yinYang === 'YANG' ? '阳' : '阴' }}</span>
            <span class="hg-god">{{ (item.hideGanGods || [])[hi] }}</span>
          </div>
        </div>

        <div class="pt-cell pt-mini">{{ (item.starLuck || {}).name || '' }}</div>
        <div class="pt-cell pt-mini">{{ (item.selfStarLuck || {}).name || '' }}</div>
        <div class="pt-cell pt-mini">{{ item.emptyDie }}</div>
        <div class="pt-cell pt-mini">{{ item.naYin }}</div>

        <div class="pt-cell is-tall">
          <div class="pt-shensha">
            <el-popover v-for="(ss, si) in item.shenShaList" :key="'ss' + index + '-' + si"
                        placement="bottom" :width="420" trigger="hover" :title="ss.name">
              <template #reference>
                <span class="tag-op">{{ ss.name }}</span>
              </template>
              <div class="pop-detail" v-html="ctx.getDetail(ss.name)"></div>
            </el-popover>
          </div>
        </div>
      </div>

      <!-- 大运 + 选中流年 -->
      <div v-for="(item, index) in ctx.yunPillars" :key="'yp' + index"
           class="pt-col is-pillar is-yun" :class="{ 'first-yun': index === 0 }">
        <div class="pt-cell is-head">{{ item.title }}</div>
        <div class="pt-cell">
          <span class="tag-op is-strong">{{ item.tianGanGod }}</span>
        </div>
        <div class="pt-cell">
          <span class="pt-gz" :style="{ color: ctx.tianGan(item.tianGan).element?.color }">{{ item.tianGan }}</span>
          <span class="pt-yy">{{ ctx.tianGan(item.tianGan).yinYang === 'YANG' ? '阳' : '阴' }}</span>
        </div>
        <div class="pt-cell">
          <span class="pt-gz" :style="{ color: ctx.diZhi(item.diZhi).element?.color }">{{ item.diZhi }}</span>
          <span class="pt-yy">{{ ctx.diZhi(item.diZhi).yinYang === 'YANG' ? '阳' : '阴' }}</span>
        </div>
        <div class="pt-cell">
          <span v-if="item.diZhiGod" class="tag-op">{{ item.diZhiGod }}</span>
        </div>
        <div class="pt-cell is-tall">
          <div v-for="(hs, hi) in (ctx.diZhi(item.diZhi).hideHeavenlyStems || [])" :key="'yh' + hi" class="pt-hide">
            <span :style="{ color: hs.element?.color }">{{ hs.name }}</span>
            <span class="pt-yy">{{ hs.yinYang === 'YANG' ? '阳' : '阴' }}</span>
            <span class="hg-god">{{ (item.hideGanGods || [])[hi] }}</span>
          </div>
        </div>
        <div class="pt-cell pt-mini">{{ (item.starLuck || {}).name || '' }}</div>
        <div class="pt-cell pt-mini">{{ (item.selfStarLuck || {}).name || '' }}</div>
        <div class="pt-cell pt-mini">{{ item.emptyDie }}</div>
        <div class="pt-cell pt-mini">{{ item.naYin }}</div>
        <div class="pt-cell is-tall">
          <div class="pt-shensha">
            <el-popover v-for="(ss, si) in item.shenShaList" :key="'yss' + si"
                        placement="bottom" :width="420" trigger="hover" :title="ss.name">
              <template #reference>
                <span class="tag-op">{{ ss.name }}</span>
              </template>
              <div class="pop-detail" v-html="ctx.getDetail(ss.name)"></div>
            </el-popover>
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
@use '../styles/pop-detail';

/* ============================ 命盘表 ============================
 * 列宽策略：数据柱等分容器剩余宽度（flex: 1 1 0 + min-width: 0），
 * 行标签列固定 76px。
 *
 * 为什么不用固定宽度：主体收在 $mainWidth（1100）后，可用宽度
 * 1100 − 2×24 = 1052px。若沿用旧稿给每根数据柱固定 165px，
 * 6 柱 + 标签列 = 1066px > 1052px，整表必然横向溢出。
 *
 * 【2026-10-12 补流月后的变化】数据柱从 6 根（四柱 + 大运 + 流年）变 7 根
 * （四柱 + 大运 + 流年 + 流月）。7 × 120 + 76 = 916 ≤ 1052，**桌面宽度下仍然不滚动**；
 * 但 900px 视口（卡片可用宽约 828px）从「刚好不滚」变成「会滚」——
 * 这是有意的取舍：再压 min-width 到 107 的话，藏干格与神煞格就挤烂了。
 * 也就是说 .pillar-table 的横向滚动在 900~1000px 区间会真的出现，不是 bug。
 *
 * 也不能只写 min-width 而不写 flex-basis：那是「宽度由内容决定」的列，
 * 神煞格虽写了 flex-wrap，在没有回绕边界的容器里永远不换行 ——
 * 神煞越多，列被撑得越宽。flex: 1 1 0 把列宽交回容器，
 * wrap 才真正生效；min-width: 0 是允许 flex 项收缩到内容宽度以下的关键，
 * 少了它，flex 项不会内收，上面两条都不成立。
 *
 * min-width 只兜「窄到不可读」的下限，触发时交给 .pillar-table 横向滚动。
 * ============================================================= */

.pillar-table {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--panel);
  // 正常宽度下列宽由容器算出来、正好铺满，不会滚动；
  // 只有窄屏撞到 .is-pillar 的 min-width 时才出现横向滚动条。
  overflow-x: auto;
}

.pt-col {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;

  &.is-label {
    flex: 0 0 76px;
    background: var(--panel-2);
    border-right: 1px solid var(--line);

    .pt-cell {
      color: var(--text-faint);
      font-size: 12px;
      justify-content: flex-start;
      padding-left: 12px;
    }
  }

  &.is-pillar {
    // 兜底下限：比这更窄格子就挤烂了，改为整表横向滚动。
    // 取值来自实测：900px 视口下卡片可用宽约 828px，
    // 6×120 + 76 = 796 < 828，刚好不触发滚动，故取 120。
    min-width: 120px;
    border-right: 1px solid var(--line);

    &:last-child {
      border-right: none;
    }
  }

  &.is-yun {
    background: var(--panel-2);

    &.first-yun {
      border-left: 2px solid var(--line-strong);
    }
  }
}

.pt-cell {
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 6px;
  border-bottom: 1px solid var(--line);
  font-size: 14px;
  color: var(--text);

  &:last-child {
    border-bottom: none;
  }

  &.is-tall {
    min-height: 76px;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
  }

  &.is-head {
    background: var(--gold-wash);
    font-weight: 600;
    font-size: 13px;
  }

  &.pt-mini {
    font-size: 12px;
    color: var(--text-dim);
  }
}

.pt-gz {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
}

.pt-yy {
  font-size: 11px;
  color: var(--text-faint);
}

.pt-hide {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  line-height: 1.45;
  max-width: 100%;
  flex-wrap: wrap;
  justify-content: center;

  .hg-god {
    color: var(--text-faint);
    font-size: 11px;
  }
}

/* 神煞格：固定高度 + 自动换行；只在纵向溢出时滚动，绝不撑宽列 */
.pt-shensha {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  justify-content: center;
  align-content: flex-start;
  width: 100%;
  min-height: 76px;
  overflow-y: auto;
  overflow-x: hidden;
}

.tag-op {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  color: var(--text-dim);
  font-size: 12px;
  cursor: help;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    background: var(--gold-wash);
    border-color: var(--gold-soft);
    color: var(--gold);
  }

  &.is-strong {
    font-weight: 600;
    color: var(--text);
  }
}

@media (max-width: 700px) {
  // 列宽由 flex 决定，这里调的是「下限」和「标签列基准」。
  // 直接写 width 是无效的 —— flex-basis: 0 会把它忽略掉。
  .pt-col.is-pillar {
    min-width: 104px;
  }

  .pt-col.is-label {
    flex-basis: 64px;
  }

  .pt-gz {
    font-size: 18px;
  }
}
</style>
