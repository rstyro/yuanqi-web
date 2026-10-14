<template>
  <!-- ================= 宫位六亲 ================= -->
  <!-- 「宫」「星」两法并出：stars 走子平（哪个十神代表哪位亲属），
       palaces 走盲派宫法（哪一柱代表哪位亲属、宫安不安）。v12 新增。 -->
  <el-card v-if="ctx.kin" class="block">
    <template #header>
      <div class="card-head">
        <div class="card-title">
          宫位六亲
          <span class="hint">
            子平以「星」论六亲（十神映射），盲派以「宫」论（某柱主某亲）；
            两法并列给依据，不断六亲存殁
          </span>
        </div>
      </div>
    </template>

    <!-- 四宫 -->
    <div class="relation-block">
      <div class="relation-label">
        四宫
        <span class="cnt">{{ ctx.kin.palaces?.length || 0 }}</span>
        <span class="label-hint">冲 / 刑 / 害为「扰动」，合 / 会为「牵绊」，二者不同义</span>
      </div>
      <div class="palace-grid">
        <div v-for="p in (ctx.kin.palaces || [])" :key="p.palace" class="palace-cell"
             :class="ctx.palaceClass(p)">
          <div class="palace-head">
            <span class="palace-name">{{ p.palace }}</span>
            <span class="palace-pillar">{{ p.pillarType }} {{ p.ganZhi }}</span>
          </div>
          <div class="palace-kin">{{ (p.kin || []).join('、') }} · {{ p.ageRange }}</div>
          <div class="palace-gods">
            <span>干 {{ p.ganGod || '—' }}</span>
            <span>支 {{ p.zhiGod || '—' }}</span>
          </div>
          <div class="relation-tags">
            <span v-for="(r, ri) in (p.disrupt || [])" :key="'pd' + ri"
                  class="rel-chip is-disrupt">{{ r }}</span>
            <span v-for="(r, ri) in (p.bond || [])" :key="'pb' + ri"
                  class="rel-chip is-bond">{{ r }}</span>
            <span v-if="!(p.disrupt || []).length && !(p.bond || []).length"
                  class="rel-chip is-quiet">安静</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 六亲星 -->
    <div class="relation-block">
      <div class="relation-label">
        六亲星
        <span class="cnt">{{ ctx.kin.stars?.length || 0 }}</span>
        <span class="label-hint">
          子平映射；只认天干位与地支本气，中气 / 余气不计
        </span>
      </div>
      <div class="star-grid">
        <div v-for="s in (ctx.kin.stars || [])" :key="s.role" class="star-cell"
             :class="'is-' + ctx.STAR_CLASS[s.state]">
          <div class="star-head">
            <span class="star-role">{{ s.role }}</span>
            <span class="star-state">{{ s.state }}</span>
          </div>
          <div class="star-mapping">{{ s.mapping }}</div>
          <div class="relation-tags">
            <span v-for="(c, ci) in (s.chars || [])" :key="'sc' + ci" class="finding-char">
              <b>{{ c }}</b><em>{{ s.positions[ci] }}</em>
            </span>
            <span v-if="!(s.chars || []).length" class="no-relation">原局不现</span>
          </div>
          <div class="star-gods">十神 {{ (s.gods || []).join('、') }}</div>
        </div>
      </div>
    </div>

    <!-- 宫星合参 -->
    <div v-if="ctx.kin.notes?.length" class="relation-block">
      <div class="relation-label">
        宫星合参
        <span class="label-hint">首条恒为两法分工说明；【】标出「宫破星无」与「星宫俱安」</span>
      </div>
      <ul class="kin-notes">
        <li v-for="(n, ni) in ctx.kin.notes" :key="'kn' + ni"
            :class="{ 'is-key': n.startsWith('【') }">{{ n }}</li>
      </ul>
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
@use '../styles/relation';

/* ---------------- 宫位六亲（v12） ---------------- */

.palace-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.palace-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  border-left: 3px solid var(--line-strong);
  background: var(--panel-2);
  font-size: 12px;

  .palace-head {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
  }

  .palace-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .palace-pillar {
    font-size: 12px;
    color: var(--text-faint);
  }

  .palace-kin {
    color: var(--text-dim);
  }

  .palace-gods {
    display: flex;
    gap: 12px;
    color: var(--text-faint);
  }

  // 有扰动优先于牵绊：宫同时被冲与被合时，底色要表示「动荡」而不是「牵连」，
  // 与后端 `palaceClass` 的判序保持一致。
  &.is-disrupt {
    border-left-color: var(--red);
  }

  &.is-bond {
    border-left-color: var(--blue);
  }
}

/* 关系小片：扰动（冲刑害）与牵绊（合会）用不同色，两者含义不同不该混看 */
.rel-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 12px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--text-dim);
  white-space: nowrap;

  &.is-disrupt {
    color: var(--red);
    border-color: currentColor;
  }

  &.is-bond {
    color: var(--blue);
    border-color: currentColor;
  }

  &.is-quiet {
    color: var(--text-faint);
    border-style: dashed;
  }
}

.star-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.star-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  border-top: 2px solid var(--line-strong);
  background: var(--panel-2);
  font-size: 12px;

  .star-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .star-role {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .star-state {
    font-size: 11px;
    padding: 1px 7px;
    border-radius: 999px;
    border: 1px solid currentColor;
    color: var(--text-faint);
    white-space: nowrap;
  }

  .star-mapping {
    color: var(--text-faint);
    font-size: 11px;
    line-height: 1.6;
  }

  .star-gods {
    color: var(--text-dim);
    font-size: 11px;
  }

  // 四档自上而下由实到虚：透干通根最实（金），透干虚浮（暗金），
  // 通根沉实（蓝），不见最虚（灰）。
  &.is-both {
    border-top-color: var(--gold);

    .star-state {
      color: var(--gold);
    }
  }

  &.is-gan {
    border-top-color: var(--gold-2);

    .star-state {
      color: var(--gold-2);
    }
  }

  &.is-zhi {
    border-top-color: var(--blue);

    .star-state {
      color: var(--blue);
    }
  }

  &.is-absent {
    background: transparent;
  }
}

.kin-notes {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.85;
  color: var(--text-dim);

  li + li {
    margin-top: 5px;
  }

  // 【宫破星无】/【星宫俱安】那两条是合参的落点，给重点色
  li.is-key {
    color: var(--text);
  }
}

@media (max-width: 1000px) {
  // 六亲星 3 列在中等屏挤成 2 列：六颗星刚好两行，比挤成三列好读
  .star-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  // 四宫与六亲星同理：窄屏一律单列
  .palace-grid,
  .star-grid {
    grid-template-columns: 1fr;
  }
}
</style>
