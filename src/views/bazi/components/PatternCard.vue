<template>
  <!-- ================= 格局与用神 ================= -->
  <el-card class="block">
    <template #header>
      <div class="card-head">
        <div class="card-title">
          格局与用神
          <span class="hint">格局取自月令透干；用神按扶抑法（身弱取生扶、身强取泄耗）</span>
        </div>
      </div>
    </template>

    <!-- 格局 + 取格依据 -->
    <div class="pattern-row">
      <div class="pattern-head">
        <span class="pattern-key">格局</span>
        <el-popover v-if="ctx.caputName" placement="bottom" :width="420" trigger="hover" :title="ctx.caputName">
          <template #reference>
            <span class="pattern-name">{{ ctx.caputName }}</span>
          </template>
          <div class="pop-detail" v-html="ctx.getDetail(ctx.caputName)"></div>
        </el-popover>
        <span v-else class="pattern-name">—</span>
        <!-- 「八格 / 外格」只认 structureView.standardPattern。拿不到结构视图时**不显示**，
             而不是退回「非八格」——那会把正官格标成「外格」，比空着更误导。 -->
        <span v-if="ctx.structureView" class="pattern-kind" :class="ctx.isBaGe ? 'is-ba' : 'is-other'">
          {{ ctx.isBaGe ? '八格' : '外格' }}
        </span>
        <span class="pattern-meta">
          日主 {{ ctx.fourPillars[2]?.tianGan || '—' }} · 月令 {{ ctx.monthBranch || '—' }}
        </span>
      </div>
      <div class="pattern-basis" :class="'is-' + ctx.caputBasis.kind">
        <span class="basis-key">取格依据</span>
        <span class="basis-text">{{ ctx.caputBasis.text }}</span>
      </div>
    </div>

    <!-- 格局成败与救应：格名之外那一段。子平论命的落点在这里，不在格名上。
         v12 新增；旧缓存里没有 pattern 时整块不渲染。 -->
    <div v-if="ctx.pattern" class="grade-row" :class="'is-' + ctx.gradeClass">
      <div class="grade-head">
        <span class="pattern-key">成败</span>
        <span class="grade-chip" :class="'is-' + ctx.gradeClass">
          {{ ctx.pattern.grade?.name || '—' }}
        </span>
        <el-popover placement="bottom" :width="460" trigger="hover" title="格局成败怎么判">
          <template #reference><span class="grade-help">判据</span></template>
          <div class="pop-detail">
            <p><b>三把钥匙</b>：<b>相神</b>辅佐本格、<b>破格之神</b>破坏本格、<b>救应</b>制住破格之神。</p>
            <p><b>破格之神必须透干</b>（落在年 / 月 / 时干）才算有力；<b>相神与救应「见」即可</b>
              （透干或见于地支本气）。这一条刻意不对称 —— 判破太宽会人人破格，
              判救太严会把「有救」说成「无救」，后者是更重的结论。</p>
            <p><b>五档</b>：成格（无破且有相神）、待辅（无破但相神不备）、
              <b>破而有救</b>（有破但被制住 / 通关）、<b>破而不救</b>（有破且无救）、
              不论成败（外格：建禄 / 阳刃 / 专旺，成败另有体系）。</p>
            <p><b>本档只判「格」，不判「命」。</b>破格说的是这个格局被破坏了，
              不等于人不好 —— 层次高低还看大运与喜用得地。</p>
          </div>
        </el-popover>
      </div>
      <div class="grade-summary">{{ ctx.pattern.summary }}</div>
      <div v-if="ctx.pattern.findings?.length" class="grade-findings">
        <div v-for="(f, fi) in ctx.pattern.findings" :key="'pf' + fi" class="finding-row">
          <span class="finding-role" :class="'is-' + ctx.ROLE_CLASS[f.role]">{{ f.role }}</span>
          <span class="finding-label">{{ f.label }}</span>
          <div class="relation-tags">
            <span v-for="(c, ci) in f.chars" :key="'fc' + fi + ci" class="finding-char">
              <b>{{ c }}</b><em>{{ f.positions[ci] }}</em>
            </span>
            <span v-if="!f.chars.length" class="no-relation">（无字可指，见说明）</span>
          </div>
        </div>
      </div>
      <div v-else class="grade-findings">
        <span class="no-relation">
          {{ ctx.pattern.grade?.code === 'NOT_APPLICABLE'
            ? '外格不按八格的相神 / 破格 / 救应论，故无依据可列'
            : '本档无依据条目' }}
        </span>
      </div>
    </div>

    <!-- 月令藏干与透干 -->
    <div class="relation-block">
      <div class="relation-label">
        月令藏干与透干
        <span class="cnt">{{ ctx.monthHideStems.length }}</span>
        <span class="label-hint">带「透」者已出现在四柱天干位</span>
      </div>
      <div class="relation-tags">
        <span v-for="h in ctx.monthHideStems" :key="'mh' + h.char"
              class="hide-chip" :class="{ 'is-exposed': h.exposed }">
          <b :style="{ color: h.color }">{{ h.char }}</b>
          <em>{{ h.god }}</em>
          <i v-if="h.isMain" class="via">本气</i>
          <i v-if="h.exposed" class="dot">透</i>
        </span>
        <span v-if="!ctx.monthHideStems.length" class="no-relation">—</span>
      </div>
    </div>

    <!-- 身强弱量尺 -->
    <div class="strength-row">
      <span class="strength-tag" :class="ctx.lifeTime?.strong ? 'is-strong' : 'is-weak'">
        身{{ ctx.lifeTime?.strong ? '强' : '弱' }}
      </span>
      <div class="score-scale"
           :title="`量程 −100 ~ +100；本盘阈值 ${ctx.lifeTime?.strongBaseline ?? 0}（高于它判身强）`">
        <div class="scale-track">
          <div class="scale-fill" :style="{ width: ctx.scorePct + '%' }"></div>
          <div class="scale-mark" :style="{ left: ctx.STRONG_THRESHOLD_PCT + '%' }"></div>
        </div>
        <div class="scale-foot">
          <span>−100</span>
          <span class="scale-mid">阈值 {{ ctx.lifeTime?.strongBaseline ?? 0 }}</span>
          <span>+100</span>
        </div>
      </div>
      <span class="score-num" :class="ctx.lifeTime?.strong ? 'is-strong' : 'is-weak'">
        {{ ctx.lifeTime?.score ?? 0 }}
      </span>
    </div>

    <!-- 用神：五行 + 十神，喜忌分列 -->
    <div class="god-grid">
      <div class="god-cell">
        <div class="god-key is-joy">喜用五行</div>
        <div class="relation-tags">
          <span v-for="e in (ctx.lifeTime?.joyousElements || [])" :key="'je' + e.name"
                class="elem-chip is-joy" :style="{ borderColor: e.color, color: e.color }">{{ e.name }}</span>
          <span v-if="!(ctx.lifeTime?.joyousElements || []).length" class="no-relation">—</span>
        </div>
      </div>
      <div class="god-cell">
        <div class="god-key is-fear">忌凶五行</div>
        <div class="relation-tags">
          <span v-for="e in (ctx.lifeTime?.fearElements || [])" :key="'fe' + e.name"
                class="elem-chip is-fear" :style="{ borderColor: e.color, color: e.color }">{{ e.name }}</span>
          <span v-if="!(ctx.lifeTime?.fearElements || []).length" class="no-relation">—</span>
        </div>
      </div>
      <div class="god-cell">
        <div class="god-key is-joy">喜用十神</div>
        <div class="relation-tags">
          <el-popover v-for="(g, gi) in (ctx.lifeTime?.joyousGods || [])" :key="'jg' + gi"
                      placement="bottom" :width="420" trigger="hover" :title="g">
            <template #reference><span class="tag-god is-joy">{{ g }}</span></template>
            <div class="pop-detail" v-html="ctx.getDetail(g)"></div>
          </el-popover>
          <span v-if="!(ctx.lifeTime?.joyousGods || []).length" class="no-relation">—</span>
        </div>
      </div>
      <div class="god-cell">
        <div class="god-key is-fear">忌凶十神</div>
        <div class="relation-tags">
          <el-popover v-for="(g, gi) in (ctx.lifeTime?.fearGods || [])" :key="'fg' + gi"
                      placement="bottom" :width="420" trigger="hover" :title="g">
            <template #reference><span class="tag-god is-fear">{{ g }}</span></template>
            <div class="pop-detail" v-html="ctx.getDetail(g)"></div>
          </el-popover>
          <span v-if="!(ctx.lifeTime?.fearGods || []).length" class="no-relation">—</span>
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
@use '../styles/card-chrome';
@use '../styles/relation';
@use '../styles/hide-chip';
@use '../styles/pop-detail';

/* ---------------- 格局 + 取格依据 ---------------- */

.pattern-row {
  margin-bottom: 18px;
}

.pattern-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.pattern-key {
  font-size: 13px;
  color: var(--text-faint);
}

.pattern-name {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--gold);
  cursor: help;
}

.pattern-kind {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 9px;
  border: 1px solid;

  &.is-ba {
    color: var(--gold);
    border-color: var(--gold-soft);
    background: var(--gold-wash);
  }

  &.is-other {
    color: var(--blue);
    border-color: rgba(61, 107, 150, 0.36);
    background: rgba(61, 107, 150, 0.1);
  }
}

.pattern-meta {
  font-size: 12px;
  color: var(--text-faint);
}

.pattern-basis {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  border-left: 3px solid var(--line-strong);
  background: var(--panel-2);
  font-size: 13px;
  line-height: 1.7;

  .basis-key {
    flex: none;
    color: var(--text-faint);
    font-size: 12px;
    padding-top: 1px;
  }

  .basis-text {
    color: var(--text-dim);
  }

  // 由「月令透干」印证成立时给金色；退到中性描述时保持素色，
  // 颜色本身就提示了「这条是确证还是仅陈述」。
  &.is-exposed {
    border-left-color: var(--gold);
  }

  &.is-multi {
    border-left-color: var(--gold-2);
  }

  &.is-other {
    border-left-color: var(--blue);
  }

  &.is-fallback {
    border-left-color: var(--red);
  }
}

/* ---------------- 身强弱量尺 ---------------- */

.strength-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 0 16px;
}

.strength-tag {
  flex: none;
  font-size: 15px;
  font-weight: 600;
  padding: 2px 12px;
  border-radius: 6px;

  &.is-strong {
    color: var(--red);
    background: rgba(184, 68, 44, 0.12);
  }

  &.is-weak {
    color: var(--green);
    background: rgba(47, 122, 82, 0.12);
  }
}

.score-scale {
  flex: 1;
  min-width: 0;
}

.scale-track {
  position: relative;
  height: 8px;
  border-radius: 4px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  overflow: hidden;
}

.scale-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--gold-soft), var(--gold));
  transition: width 0.3s ease;
}

/* 阈值刻线压在填充之上。注意它在 75% 处而非中点 ——
   量程 −100~+100 而阈值是 +50，画成「过半即身强」就错了。 */
.scale-mark {
  position: absolute;
  top: -1px;
  bottom: -1px;
  width: 2px;
  background: var(--text-faint);
  opacity: 0.7;
}

.scale-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 10px;
  color: var(--text-faint);

  .scale-mid {
    transform: translateX(-50%);
    margin-left: 25%;
  }
}

.score-num {
  flex: none;
  font-family: var(--mono);
  font-size: 16px;
  font-weight: 600;

  &.is-strong {
    color: var(--red);
  }

  &.is-weak {
    color: var(--green);
  }
}

/* ---------------- 用神：2×2 喜忌对照 ---------------- */

.god-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 20px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.god-key {
  font-size: 12px;
  margin-bottom: 7px;

  &.is-joy {
    color: var(--green);
  }

  &.is-fear {
    color: var(--red);
  }
}

.elem-chip {
  display: inline-block;
  min-width: 34px;
  text-align: center;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid currentColor;
  background: var(--panel-2);
}

.tag-god {
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 13px;
  border: 1px solid transparent;
  cursor: help;

  &.is-joy {
    background: rgba(47, 122, 82, 0.12);
    border-color: rgba(47, 122, 82, 0.4);
    color: var(--green);
  }

  &.is-fear {
    background: rgba(184, 68, 44, 0.12);
    border-color: rgba(184, 68, 44, 0.36);
    color: var(--red);
  }
}

/* ---------------- 格局成败与救应（v12） ---------------- */

/* 一档一个色阶：成格最正用金、待辅中性用蓝、破而有救用暗金（弱于成格）、
   破而不救用红（最重的一档）、不论成败用灰。颜色本身就是档位的一层提示，
   但**文字永远同时给出档位名** —— 只靠颜色表达档位对色觉障碍读者不友好。 */
.grade-row {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 11px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  border-left: 3px solid var(--line-strong);
  background: var(--panel-2);
  font-size: 13px;

  .grade-head {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .grade-chip {
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid currentColor;
    color: var(--text-dim);

    /* 徽章也要跟着档位变色。模板给 .grade-chip 和 .grade-row 都挂了 is-<code>，
       但只有外层有规则时徽章恒为灰 —— 那样「一眼看出是哪一档」就只剩那根 3px 的左边线。 */
    &.is-cheng {
      color: var(--gold);
    }

    &.is-dai_fu {
      color: var(--blue);
    }

    &.is-po_with_rescue {
      color: var(--gold-2);
    }

    &.is-po {
      color: var(--red);
    }

    &.is-not_applicable {
      color: var(--text-dim);
    }
  }

  .grade-help {
    font-size: 12px;
    color: var(--text-faint);
    border-bottom: 1px dashed var(--line-strong);
    cursor: help;
  }

  .grade-summary {
    color: var(--text-dim);
    line-height: 1.75;
  }

  .grade-findings {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .finding-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .finding-role {
    flex: none;
    padding: 1px 8px;
    border-radius: 5px;
    font-size: 12px;
    border: 1px solid currentColor;

    &.is-support {
      color: var(--gold);
    }

    &.is-break {
      color: var(--red);
    }

    &.is-rescue {
      color: var(--blue);
    }
  }

  .finding-label {
    color: var(--text-dim);
    font-size: 12px;
  }

  &.is-cheng {
    border-left-color: var(--gold);
  }

  &.is-dai_fu {
    border-left-color: var(--blue);
  }

  &.is-po_with_rescue {
    border-left-color: var(--gold-2);
  }

  &.is-po {
    border-left-color: var(--red);
  }

  /* 外格（建禄 / 阳刃 / 专旺）单列一档：它「不论成败」而不是「破了」，
     所以不能用红色 —— 那是把「另一套体系」误读成「坏了」。 */
  &.is-not_applicable {
    border-left-color: var(--line-strong);
  }
}

@media (max-width: 700px) {
  // 用神 2×2 在窄屏塌成一列，否则「喜用五行」这种四字标签会先被压换行
  .god-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .pattern-name {
    font-size: 19px;
  }
}
</style>
