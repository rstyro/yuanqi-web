<template>
        <!-- ==================== 对话流 ==================== -->
        <article class="round">
          <div class="ask">
            <span>{{ round.question }}</span>
          </div>

          <el-card class="answer" shadow="never">
            <template #header>
              <div class="answer-head">
                <el-tag
                    v-for="stage in stagesOf(round)"
                    :key="stage.key"
                    class="stage-tag"
                    size="small"
                    round
                    :type="stageTagType(round, stage.key)"
                    :effect="stageState(round, stage.key) === 'running' ? 'dark' : 'plain'"
                >
                  <i class="dot" :class="'is-' + stageState(round, stage.key)"></i>{{ stage.label }}
                </el-tag>
                <el-tag v-if="round.followUp" size="small" round type="info" effect="plain">
                  复用上轮命盘与生辰
                </el-tag>
                <el-tooltip v-for="(hit, i) in round.cacheHits" :key="'c' + i" content="这一层没调模型，直接回放了上次的结果">
                  <el-tag size="small" round class="cache-tag">{{ hit }}</el-tag>
                </el-tooltip>

                <span class="head-spacer"></span>
                <span v-if="round.elapsed" class="elapsed">{{ fmtElapsed(round.elapsed) }}</span>
                <el-tooltip v-if="!round.streaming && round.report" content="复制报告全文" placement="top">
                  <el-button link :icon="CopyDocument" @click="ctx.copyReport(round)"/>
                </el-tooltip>
              </div>
            </template>

            <!-- 首轮：六类问答卡片依次点亮（后端并发跑六类，谁先答完谁先到，顺序靠前端按声明序排）。
                 历史首轮没有独立字段，是从落库全文按「## 分类名」切回来的，走同一套渲染。 -->
            <div v-if="qaCards.length" class="qa-list">
              <div
                  v-for="group in qaCards"
                  :key="group.category"
                  class="qa-card"
                  :class="{ 'is-failed': !group.ok }"
              >
                <div class="qa-head">
                  <span class="qa-label">{{ group.label }}</span>
                  <el-tooltip
                      v-if="group.questions?.length"
                      :content="group.questions.join(' / ')"
                      placement="top"
                  >
                    <span class="qa-count">{{ group.questions.length }} 问</span>
                  </el-tooltip>
                  <el-tag v-if="!group.ok" type="danger" size="small" effect="plain" round>降级</el-tag>
                </div>
                <!-- 每类正文是 markdown（提示词要求「问：<原问题>」逐条分节），与报告共用同一渲染器；
                     渲染器先转义 HTML 再做行内替换，v-html 不会执行模型输出 -->
                <div class="qa-text markdown" v-html="renderQaText(group)"></div>
              </div>
            </div>

            <!-- 2026-10-19 之前的历史首轮：四柱逐根点亮。新首轮不再发 pillar 事件，这块只回放旧数据 -->
            <div v-if="orderedPillars(round).length" class="pillars">
              <div
                  v-for="p in orderedPillars(round)"
                  :key="p.pillar"
                  class="pillar"
                  :class="{ 'is-failed': !p.ok }"
              >
                <div class="pillar-head">
                  <span class="pillar-label">{{ p.label }}</span>
                  <el-tag v-if="!p.ok" type="danger" size="small" effect="plain" round>降级</el-tag>
                </div>
                <!-- 每柱结论是 markdown（后端提示词里有表格/标题），与报告共用同一渲染器；
                     渲染器先转义 HTML 再做行内替换，v-html 不会执行模型输出 -->
                <div class="pillar-text markdown" v-html="renderPillarText(p)"></div>
              </div>
            </div>

            <!-- 正文：流式期间走纯文本（每片 delta 重解析一遍 markdown 会把页面拖卡），收尾后再渲染。
                 首轮不在这条路上 —— 它的正文已经按类进卡片了，这里再渲染一遍就是两倍内容 -->
            <template v-if="!qaCards.length">
              <el-skeleton v-if="round.streaming && !round.report" :rows="4" animated class="report-skeleton"/>
              <div v-else-if="round.streaming" class="report plain">
                {{ round.report }}<span class="caret"></span>
              </div>
              <template v-else-if="round.report">
                <!-- 首屏：只有「核心结论」这几条（历史首轮的提示词保证 5~8 条、每条带依据+应期） -->
                <div class="report markdown" v-html="renderHead(round)"></div>

                <!-- 详章：按 metaphysics 仓库 docs/bazi-唯一设计与验收-2026-10-15.md 的约定折叠。
                     模型没按约定输出时 hasDetail() 为 false，下面的块整体不出现 —— 退化成「全展示」 -->
                <div v-if="hasDetail(round)" class="detail">
                  <button class="detail-toggle" type="button" @click="round.detailOpen = !round.detailOpen">
                    <el-icon class="detail-chev" :class="{ 'is-open': round.detailOpen }">
                      <ArrowRight/>
                    </el-icon>
                    <span>{{ round.detailOpen ? '收起详细分析' : '展开详细分析' }}</span>
                    <span class="detail-count">{{ detailCount(round) }} 节</span>
                  </button>
                  <div
                      v-show="round.detailOpen"
                      class="report markdown detail-body"
                      v-html="renderDetail(round)"
                  ></div>
                </div>
              </template>
            </template>

            <el-alert
                v-if="round.error"
                class="round-error"
                type="error"
                show-icon
                :closable="false"
                :title="round.error.code"
                :description="round.error.message"
            />
          </el-card>
        </article>
</template>

<script setup lang="ts">
/**
 * 一轮问答：提问气泡 + 阶段标签 + 首轮六类问答卡片 / 历史四柱回放 + 追问正文（详章折叠）。
 *
 * <p>{@code round} 由父级 v-for 传入，其余状态走 ctx；详章展开与否存在 round 自己身上。
 */
import {computed} from 'vue';
import {ArrowRight, CopyDocument} from '@element-plus/icons-vue';
import {
  fmtElapsed,
  hasDetail,
  orderedPillars,
  orderedQa,
  renderDetail,
  renderHead,
  renderPillarText,
  renderQaText,
  stageState,
  stagesOf,
  stageTagType,
  detailCount,
} from '../fortuneFormat';
import type {Round} from '../fortuneFormat';
import type {FortuneCtx} from '../composables/useFortuneCtx';

const props = defineProps<{ctx: FortuneCtx; round: Round}>();
const ctx = props.ctx;
const round = props.round;

/**
 * 首轮的分类卡片，按六大类声明序排好。
 *
 * <p>后排在这里而不是模板里：这个数组在一张卡片的渲染里被用了三次（判空、遍历、
 * 每类的问答数），而事件是按完成序到达的 —— 排一次和排三次不是一回事。
 */
const qaCards = computed(() => orderedQa(round));
</script>

<style scoped lang="scss">
/* ==================== 一轮对话 ==================== */

.round {
  margin-bottom: 26px;
}

.ask {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;

  span {
    max-width: 74%;
    padding: 10px 16px;
    border-radius: 14px 14px 4px 14px;
    background: var(--gold-wash);
    border: 1px solid var(--gold-soft);
    color: var(--text);
    font-size: 14px;
    line-height: 1.7;
  }
}

.answer {
  :deep(.el-card__header) {
    padding: 10px 16px;
    background: var(--panel-2);
  }
}

.answer-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-height: 24px;
}

.head-spacer {
  flex: 1;
}

.stage-tag {
  .dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-right: 6px;
    border-radius: 50%;
    background: var(--el-color-info);
    vertical-align: middle;
    transition: background-color 0.2s ease;

    &.is-running {
      background: var(--el-color-warning);
      animation: pulse 1.1s ease-in-out infinite;
    }

    &.is-done {
      background: var(--el-color-success);
    }

    &.is-failed {
      background: var(--el-color-danger);
    }
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.35;
    transform: scale(0.7);
  }
}

.cache-tag {
  border-color: var(--gold-soft) !important;
  color: var(--gold) !important;
  background: var(--gold-wash) !important;
}

.elapsed {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text-faint);
}

/* ==================== 首轮六类问答卡片 ==================== */

/**
 * 一类一张、纵向排，不给并排网格。
 *
 * 每类正文是 3 问 × 100~200 字，压进 minmax(210px,1fr) 那种窄栏会把整段变成一竖条，
 * 读起来比原来的四柱卡片更累 —— 这里的宽度是给「一段结论」用的。
 */
.qa-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 18px;
}

.qa-card {
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-left: 3px solid var(--gold-soft);
  border-radius: var(--radius-sm);
  padding: 12px 16px 13px;
  animation: rise 0.36s ease both;

  &.is-failed {
    border-left-color: var(--red);
    opacity: 0.72;
  }
}

.qa-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.qa-label {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--gold);
}

/* 这一类答了哪几问：悬停看原文，正文里已经有「问：」分节，占版面没必要 */
.qa-count {
  font-size: 11px;
  line-height: 1.7;
  padding: 0 8px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--text-faint);
}

.qa-text {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.85;
  color: var(--text-dim);
  word-break: break-word;
}

/* 卡片里的 markdown：整行宽度但篇幅短，标题与间距比报告区收一档。
   写成 .qa-text.markdown 双类，特异性压过下面的 .markdown 同名规则 */
.qa-text.markdown {
  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    font-size: 13.5px;
    margin: 14px 0 5px;
    padding-left: 0;
    border-left: none;
    color: var(--text);
  }

  :deep(h1:first-child),
  :deep(h2:first-child),
  :deep(h3:first-child) {
    margin-top: 0;
  }

  :deep(p) {
    margin: 0 0 8px;
  }

  :deep(p:last-child) {
    margin-bottom: 0;
  }

  :deep(ul),
  :deep(ol) {
    margin: 0 0 8px;
    padding-left: 20px;
  }

  :deep(blockquote) {
    margin: 0 0 8px;
    padding: 4px 12px;
  }

  :deep(table) {
    font-size: 12.5px;
    margin: 0 0 8px;
  }

  :deep(th),
  :deep(td) {
    padding: 4px 8px;
  }

  :deep(hr) {
    margin: 12px 0;
  }
}

/* 四柱（只回放 2026-10-19 之前的历史首轮） */
.pillars {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.pillar {
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-left: 3px solid var(--gold-soft);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  animation: rise 0.36s ease both;

  &.is-failed {
    border-left-color: var(--red);
    opacity: 0.72;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.pillar-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.pillar-label {
  font-size: 12px;
  letter-spacing: 0.12em;
  color: var(--gold);
}

.pillar-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-dim);
  word-break: break-word;
}

/* 卡片里的 markdown：比报告区窄（minmax(210px,1fr)），密度整体收紧一档。
   写成 .pillar-text.markdown 双类，特异性压过下面的 .markdown 同名规则 */
.pillar-text.markdown {
  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    font-size: 13px;
    margin: 10px 0 4px;
    padding-left: 0;
    border-left: none;
  }

  :deep(h1:first-child),
  :deep(h2:first-child),
  :deep(h3:first-child) {
    margin-top: 0;
  }

  :deep(p) {
    margin: 0 0 8px;
  }

  :deep(p:last-child) {
    margin-bottom: 0;
  }

  :deep(ul),
  :deep(ol) {
    margin: 0 0 8px;
    padding-left: 18px;
  }

  :deep(blockquote) {
    margin: 0 0 8px;
    padding: 4px 10px;
  }

  :deep(table) {
    font-size: 12px;
    margin: 0 0 8px;
  }

  :deep(th),
  :deep(td) {
    padding: 4px 6px;
  }

  :deep(hr) {
    margin: 10px 0;
  }
}

/* ==================== 报告 ==================== */

.report-skeleton {
  padding: 6px 0;
}

.report.plain {
  margin: 0;
  font-size: 14px;
  line-height: 1.95;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text);
}

.caret {
  display: inline-block;
  width: 7px;
  height: 15px;
  margin-left: 2px;
  vertical-align: text-bottom;
  background: var(--gold);
  animation: blink 1s steps(2, start) infinite;
}

@keyframes blink {
  to {
    visibility: hidden;
  }
}

.markdown {
  font-size: 14px;
  line-height: 1.95;
  word-break: break-word;
  color: var(--text);

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    color: var(--gold);
    letter-spacing: 0.05em;
    line-height: 1.5;
  }

  :deep(h1) {
    font-size: 19px;
    margin: 26px 0 12px;
  }

  :deep(h2) {
    font-size: 17px;
    margin: 24px 0 10px;
    padding-left: 10px;
    border-left: 3px solid var(--gold-2);
  }

  :deep(h3) {
    font-size: 15px;
    margin: 20px 0 8px;
  }

  :deep(h4),
  :deep(h5),
  :deep(h6) {
    font-size: 14px;
    margin: 16px 0 6px;
  }

  :deep(h1:first-child),
  :deep(h2:first-child),
  :deep(h3:first-child) {
    margin-top: 0;
  }

  :deep(p) {
    margin: 0 0 12px;
  }

  :deep(strong) {
    color: var(--gold);
    font-weight: 600;
  }

  :deep(ul),
  :deep(ol) {
    margin: 0 0 12px;
    padding-left: 22px;
  }

  :deep(li) {
    margin-bottom: 5px;
    list-style: inherit;
  }

  :deep(ul li) {
    list-style: disc;
  }

  :deep(ol li) {
    list-style: decimal;
  }

  :deep(code) {
    padding: 1px 6px;
    border-radius: 5px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    font-family: var(--mono);
    font-size: 13px;
  }

  :deep(.md-code) {
    margin: 0 0 14px;
    padding: 12px 14px;
    border-radius: var(--radius-sm);
    background: var(--panel-2);
    border: 1px solid var(--line);
    overflow-x: auto;

    code {
      padding: 0;
      border: none;
      background: transparent;
      font-size: 13px;
      line-height: 1.7;
      white-space: pre;
    }
  }

  :deep(blockquote) {
    margin: 0 0 12px;
    padding: 8px 14px;
    border-left: 3px solid var(--gold-soft);
    background: var(--gold-wash);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    color: var(--text-dim);

    p:last-child {
      margin-bottom: 0;
    }
  }

  :deep(table) {
    width: 100%;
    margin: 0 0 14px;
    border-collapse: collapse;
    font-size: 13px;
  }

  :deep(th),
  :deep(td) {
    padding: 7px 12px;
    border: 1px solid var(--line);
    text-align: left;
  }

  :deep(th) {
    background: var(--panel-2);
    color: var(--text-dim);
    font-weight: 500;
    letter-spacing: 0.08em;
  }

  :deep(hr) {
    margin: 20px 0;
    border: none;
    border-top: 1px solid var(--line);
  }

  :deep(a) {
    color: var(--gold);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  :deep(del) {
    color: var(--text-faint);
  }
}

.round-error {
  margin-top: 14px;
}

/* ==================== 核心结论卡片 ==================== */

/**
 * 四块（事业/财富/婚姻/健康…）从编号列表重排成卡片网格。
 * HTML 是 renderHead 里拼的（v-html 注入），所以全部要走 :deep。
 * 方向着色：顺=鎏金（正向）、平=中性线色、逆=冷蓝（收敛）——
 * 刻意不用红绿，那是 A 股涨跌的语义，放在命理报告里会误读。
 */
.report {
  :deep(.vgrid) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 2px 0 16px;
  }

  :deep(.vcard) {
    position: relative;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--panel-2);
    padding: 12px 14px 11px 16px;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      inset: 0 auto 0 0;
      width: 3px;
      background: var(--line-strong);
    }

    &.is-shun::before {
      background: var(--gold-2);
    }

    &.is-ni::before {
      background: var(--blue);
    }
  }

  :deep(.v-top) {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 7px;
  }

  :deep(.v-block) {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.12em;
    color: var(--text);
  }

  :deep(.v-badge) {
    font-size: 11px;
    line-height: 1.7;
    padding: 0 9px;
    border-radius: 999px;
    border: 1px solid var(--line-strong);
    color: var(--text-faint);
  }

  :deep(.is-shun .v-badge) {
    color: var(--gold);
    border-color: var(--gold-soft);
    background: var(--gold-wash);
  }

  :deep(.is-ni .v-badge) {
    color: var(--blue);
    border-color: var(--blue);
    background: rgba(61, 107, 150, 0.09);
  }

  :deep(.v-hint) {
    margin-left: auto;
    font-size: 11px;
    color: var(--text-faint);
    letter-spacing: 0.04em;
  }

  :deep(.v-row) {
    display: flex;
    gap: 7px;
    margin-top: 4px;
    font-size: 12.5px;
    line-height: 1.78;
    color: var(--text-dim);

    strong {
      color: var(--text);
      font-weight: 600;
    }
  }

  :deep(.v-k) {
    flex: none;
    width: 2.6em;
    color: var(--text-faint);
    font-size: 11px;
    letter-spacing: 0.1em;
    padding-top: 2px;
  }

  :deep(.vextras-title) {
    font-size: 12px;
    letter-spacing: 0.14em;
    color: var(--text-faint);
    margin: 14px 0 8px;
  }

  :deep(.vx) {
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 11px 14px;
    margin-bottom: 9px;
  }

  :deep(.vx-head) {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--gold);
    margin-bottom: 5px;
    letter-spacing: 0.04em;
  }
}

@media (max-width: 720px) {
  .report {
    :deep(.vgrid) {
      grid-template-columns: 1fr;
    }
  }
}

/* ==================== 详章折叠 ==================== */

/**
 * 折叠条做成「一整行的按钮」而不是 el-collapse：
 * 详章里要用和正文完全一致的 markdown 样式（h3 / 表格 / 引用），
 * 塞进 el-collapse-item 的话得再覆盖一层它的内边距与标题排版，得不偿失。
 */
.detail {
  margin-top: 4px;
}

.detail-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--panel-2);
  color: var(--gold);
  font-size: 13px;
  font-family: inherit;
  letter-spacing: 0.06em;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease;

  &:hover {
    border-color: var(--gold-soft);
    background: var(--gold-wash);
  }

  &:focus-visible {
    outline: 2px solid var(--gold-2);
    outline-offset: 2px;
  }
}

.detail-chev {
  transition: transform 0.2s ease;

  &.is-open {
    transform: rotate(90deg);
  }
}

.detail-count {
  margin-left: auto;
  font-size: 12px;
  letter-spacing: 0;
  color: var(--text-faint);
}

/* 详章与首屏的间距。上边距给在这里而不是 .detail，否则收起时也会留一道空档 */
.detail-body {
  margin-top: 18px;
}
</style>
