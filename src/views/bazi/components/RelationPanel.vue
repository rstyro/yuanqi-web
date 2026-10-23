<template>
  <!-- ================= 干支关系 / 透干通根 ================= -->
  <div class="two-col">
    <el-card>
      <template #header>
        <div class="card-head">
          <div class="card-title">
            干支关系
            <span class="hint">原局内部的合冲刑害 · 共 {{ ctx.relationTotal }} 条</span>
          </div>
        </div>
      </template>

      <div class="relation-block">
        <div class="relation-label">
          天干<span class="cnt">{{ ctx.tianGanRelations.length }}</span>
        </div>
        <div class="relation-tags">
          <span v-for="(r, ri) in ctx.tianGanRelations" :key="'tg' + ri"
                class="tag-relation" :class="'is-' + r.tone">{{ r.text }}</span>
          <span v-if="!ctx.tianGanRelations.length" class="no-relation">无</span>
        </div>
      </div>

      <div class="relation-block">
        <div class="relation-label">
          地支<span class="cnt">{{ ctx.branchRelationGroups.reduce((n, g) => n + g.list.length, 0) }}</span>
        </div>
        <div v-if="ctx.hasBranchRelation" class="branch-groups">
          <div v-for="g in ctx.branchRelationGroups" :key="g.key" class="branch-group">
            <span class="group-key" :class="'is-' + g.tone">{{ g.label }}</span>
            <div class="relation-tags">
              <span v-for="(t, ti) in g.list" :key="g.key + ti"
                    class="tag-relation" :class="'is-' + g.tone">{{ t }}</span>
            </div>
          </div>
        </div>
        <div v-else class="no-relation">无</div>
      </div>
    </el-card>

    <el-card>
      <template #header>
        <div class="card-head">
          <div class="card-title">
            透干与通根
            <span class="hint">藏干上透天干 · 天干下扎地支</span>
          </div>
        </div>
      </template>

      <div class="relation-block">
        <div class="relation-label">
          透干<span class="cnt">{{ ctx.touGanCountText }}</span>
        </div>
        <div class="tg-rows">
          <div v-for="row in ctx.touGanRows" :key="'tgr' + row.pos" class="tg-row">
            <span class="tg-branch" :style="{ color: ctx.diZhi(row.branch).element?.color }">{{ row.branch }}</span>
            <span class="tg-pos">{{ row.pos }}支</span>
            <div class="tg-stems">
              <span v-for="s in row.stems" :key="'tgs' + row.pos + s.char"
                    class="hide-chip is-mini" :class="{ 'is-exposed': s.exposed }">
                <b :style="{ color: s.color }">{{ s.char }}</b>
                <em>{{ s.god }}</em>
                <i v-if="s.exposed" class="dot">透</i>
              </span>
            </div>
          </div>
        </div>
        <!-- 「四柱藏干皆未透干」和「根本没有结构数据」是两回事：
             前者是真结论，后者是后端没返回（旧缓存 / 服务没重启）。别混成一句。 -->
        <div v-if="!ctx.structureView" class="no-relation">未获取到结构数据（后端未返回 structureView）</div>
        <div v-else-if="!ctx.touGanCount" class="no-relation">四柱藏干皆未透干</div>
      </div>

      <div class="relation-block">
        <div class="relation-label">
          通根<span class="cnt">{{ ctx.tongGenCountText }}</span>
        </div>
        <div class="tg-rows">
          <div v-for="row in ctx.tongGenRows" :key="'tgrr' + row.pos" class="tg-row">
            <span class="tg-branch" :style="{ color: row.color }">{{ row.stem }}</span>
            <span class="tg-pos">{{ row.pos }}干</span>
            <div class="tg-stems">
              <span v-for="(rt, ri) in row.roots" :key="'rt' + row.pos + ri"
                    class="root-chip" :class="{ 'is-same': rt.same }">
                {{ rt.pos }}支<b>{{ rt.branch }}</b><i>{{ rt.via }}</i>
              </span>
              <span v-if="!row.roots.length" class="root-chip is-none">无根（虚浮）</span>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import type {BaziCtx} from '../composables/useBaziCtx';

const props = defineProps<{ctx: BaziCtx}>();
const ctx = props.ctx;
</script>

<style scoped lang="scss">
@use '@/views/shared/styles/card-chrome';
@use '../styles/relation';
@use '../styles/hide-chip';

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* 地支关系分组：每组「类名 + 该类的条目」一行 */
.branch-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.branch-group {
  display: flex;
  align-items: flex-start;
  gap: 10px;

  .group-key {
    flex: none;
    width: 84px;
    font-size: 12px;
    line-height: 1.9;
    color: var(--text-faint);
    text-align: right;

    &.is-he {
      color: var(--gold);
    }

    &.is-chong {
      color: var(--red);
    }

    &.is-harm {
      color: var(--red);
      opacity: 0.8;
    }
  }

  .relation-tags {
    flex: 1;
    min-width: 0;
  }
}

.tag-relation {
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 13px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  color: var(--text-dim);
  cursor: help;
  transition: border-color 0.12s, color 0.12s;

  // 合 / 会：金色（聚而成象）
  &.is-he {
    border-color: var(--gold-soft);
    background: var(--gold-wash);
    color: var(--gold);
  }

  // 冲：红（逆）
  &.is-chong {
    border-color: rgba(184, 68, 44, 0.4);
    background: rgba(184, 68, 44, 0.1);
    color: var(--red);
  }

  // 刑 / 害：红但更暗，与「冲」分层
  &.is-harm {
    border-color: rgba(184, 68, 44, 0.24);
    background: rgba(184, 68, 44, 0.06);
    color: var(--red);
    opacity: 0.85;
  }
}

/* ---------------- 透干 / 通根 行表 ---------------- */

.tg-rows {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.tg-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.tg-branch {
  flex: none;
  width: 20px;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.5;
}

.tg-pos {
  flex: none;
  width: 28px;
  font-size: 11px;
  color: var(--text-faint);
  line-height: 2.4;
}

.tg-stems {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.root-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  border: 1px solid var(--line);
  background: var(--panel-2);
  color: var(--text-dim);
  white-space: nowrap;

  b {
    font-size: 14px;
    color: var(--text);
  }

  i {
    font-style: normal;
    font-size: 10px;
    color: var(--text-faint);
  }

  // 同名之根（乙见卯）比异名同五行更实，加重提示
  &.is-same {
    border-color: var(--gold-soft);
    background: var(--gold-wash);

    b {
      color: var(--gold);
    }
  }

  &.is-none {
    color: var(--text-faint);
    border-style: dashed;
  }
}

@media (max-width: 1000px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  // 分组类名不再占固定宽度，改成压在标签上方
  .branch-group {
    flex-direction: column;
    gap: 5px;

    .group-key {
      width: auto;
      text-align: left;
      line-height: 1.4;
    }
  }
}
</style>
