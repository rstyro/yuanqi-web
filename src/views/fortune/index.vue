<template>
  <div class="container">
    <Header></Header>

    <!--
      方案 A 的两栏骨架：左边历史会话，右边主区。
      侧栏宽度由 CSS 的 .hist 定 —— 宽视口下它**脱离文档流**（fixed 贴屏幕左缘），
      把占的宽度还给主区，正文才能和 Header 的内容轴对齐；窄视口退回占位写法。
    -->
    <div class="layout" :class="{'is-rail': ctx.rail && !ctx.overlayOpen, 'is-overlay': ctx.overlayOpen}">
      <div v-if="ctx.overlayOpen" class="hist-veil" @click="ctx.overlayOpen = false"></div>

      <SessionRail :ctx="ctx"/>

      <!--
        主区。composer 是吸底的（position: sticky; bottom: 0），必须和 .content
        待在同一个「有高度的块容器」里 —— 把两者拆进 flex / grid 的不同行，
        sticky 就失去可粘区间了，输入框会跟着内容一起滚走。
      -->
      <div class="main">
      <div class="content">
        <FortuneHero :ctx="ctx"/>

        <ChartCard :chart="ctx.chart"/>

        <FortuneEmpty :ctx="ctx"/>

        <RoundArticle v-for="(round, index) in ctx.rounds" :key="index" :round="round" :ctx="ctx"/>
      </div>

      <FortuneComposer :ctx="ctx"/>

      <!--
        「回到底部」。流式期间不再每个 delta 都把用户拽回底部（那正是往上翻重读时
        最烦人的事），代价是用户自己滚上去之后就离开了正在生长的文末 —— 得给他一个
        一键回来的出口，否则「不抢滚动条」就变成了「跟不上」。
        只在推演中且用户确实离开了底部时出现，平时不占地方。
      -->
      <button v-if="ctx.busy && !ctx.atBottom" class="to-bottom" type="button" @click="ctx.jumpToBottom">
        <el-icon><ArrowDown/></el-icon>
        <span>回到底部</span>
      </button>
      </div>
    </div>


    <!--
      报告 PDF 由后端渲染（/chat/session/{id}/report.pdf，openhtmltopdf + 内嵌中文字体子集），
      前端只负责触发下载 —— 所以这里没有预览弹窗。
      2026-10-10 之前的 html2canvas + jsPDF 光栅化方案已整体移除：
      它要把报告在页面里按 A4 再排一遍版，和后端是两条要各自维护的管线，
      而「预览的样子 ≠ 下载到的 PDF」本身就是缺陷。
    -->

  </div>
</template>

<script setup lang="ts">
/**
 * AI 命理推演页。
 *
 * <h3>这一页在做什么</h3>
 * 把后端 {@code /graph/ask} 的 SSE 事件铺成界面，并守住一条产品原则：
 * <b>命盘先出</b>。排盘是纯计算、毫秒级；解读要调多次模型、几十秒。
 * 所以 chart 事件一到就渲染命盘卡片，用户能一边看盘一边等解读。
 *
 * <h3>为什么是这个结构</h3>
 * 命盘是<b>会话级</b>的，不是每轮一份 —— 后端只在首轮推 chart，追问轮不重推。
 * 因此命盘卡片挂在 {@code rounds} 循环外面。
 */
import {onMounted} from 'vue';
import {useRoute} from 'vue-router';
import {ArrowDown} from '@element-plus/icons-vue';
import type {PageBirthSpec} from '@/api/module/fortune';
import Header from '@/components/Header.vue';
import ChartCard from './components/ChartCard.vue';
import FortuneComposer from './components/FortuneComposer.vue';
import FortuneEmpty from './components/FortuneEmpty.vue';
import FortuneHero from './components/FortuneHero.vue';
import RoundArticle from './components/RoundArticle.vue';
import SessionRail from './components/SessionRail.vue';
import {useFortuneCtx} from './composables/useFortuneCtx';

const route = useRoute();
const ctx = useFortuneCtx();

onMounted(() => {
  document.title = 'AI 命理推演';
  // 从排盘页「AI 推演」按钮带过来的生辰：预填成一句完整的话。
  // 刻意只预填、不自动发送 —— 自动发问会立刻产生一次真实的模型调用，
  // 用户应该自己决定什么时候开始。
  const seed = buildSeedFromQuery();
  if (seed) ctx.question = seed;
  // 与预填句同源的「结构化口径」：出生地 / 真太阳时 / 均时差。
  // 两者一起带，但走的是不同的路 —— 见 readPageSpec 的说明。
  ctx.pageSpec = readPageSpec();

  void ctx.refreshSessions();
  ctx.startPolling();

  // URL 上带着会话 id（刷新页面、或别人发给你的链接）：回到那一条会话，
  // 而不是从零开始的新对话。它排在预填之后 —— 真打开了会话，
  // applyDetail 会把输入框清空，那句排盘页带来的预填话也就不会留下。
  const sessionFromUrl = queryValue(route.query.session);
  if (sessionFromUrl) void ctx.openSession(sessionFromUrl);
});

/** route.query 的值可能是 string | string[] | null，统一成 string */
function queryValue(v: unknown): string {
  if (Array.isArray(v)) return String(v[0] ?? '');
  return v == null ? '' : String(v);
}

/**
 * 把 URL 上的排盘口径还原成一句可被后端抽取的自然语言。
 *
 * <p>与排盘页共用同一套参数（dateType / dateTime / sex / leapMonth），
 * 所以 AI 抽出来的生辰与刚才看到的那张命盘是同一个。
 *
 * <p>出生地也写进句子里 —— 用户看到这句话就知道系统是按哪儿排的盘，
 * 这是他能核对「地球对不对」的唯一入口（后端另有结构化通道，两处一致、互为兜底）。
 *
 * <p><b>「真太阳时」「均时差」刻意不写进句子</b>：那是我们的术语，用户从不说这句话。
 * 它们走 {@link readPageSpec} 的结构化通道，不指望模型从这句话里反读回来 ——
 * 反读漏了就是「页面按校正后排、AI 按北京时间排」两张盘，而且一声不吭。
 */
function buildSeedFromQuery(): string {
  const dateTime = queryValue(route.query.dateTime);
  if (!dateTime) return '';

  const isLunar = queryValue(route.query.dateType) === '2';
  const sexText = queryValue(route.query.sex) === '0' ? '女' : '男';
  const leapText = isLunar && queryValue(route.query.leapMonth) === '1' ? '（闰月）' : '';
  const place = queryValue(route.query.birthPlace);
  const placeText = place ? `，出生地${place}` : '';
  return `我出生于${isLunar ? '农历' : '公历'} ${dateTime}${leapText}，性别${sexText}${placeText}，帮我看看整体运势`;
}

/**
 * 从 URL 解出结构化口径，随首轮请求发给后端（请求体的 {@code birth}）。
 *
 * <h3>为什么这几样必须结构化传，不能塞进预填句</h3>
 * <p>预填句要经过一次模型抽取才能变成排盘参数，而抽取器只在用户<b>明说</b>时才认：
 * <ul>
 *   <li>「请按真太阳时排盘」—— 用户不会说这种话，不说就永远校验不了时柱；</li>
 *   <li>「含均时差」—— 抽取器<b>没有这个概念</b>（提示词里没这条），
 *       整条链路里只有页面上有这个勾选框；</li>
 *   <li>出生地 / 经度 —— 用户可能说地名，但说不准；经度更是只有页面（行政区级联
 *       或首页弹窗）才拿得到。</li>
 * </ul>
 *
 * <h3>与预填句的分工</h3>
 * <p>生日 / 性别只走预填句（用户会改那句话，「以用户的话为准」）；
 * 这几样只走结构化（用户改不到、也说不清）。后端把两边合流后按同一口径排盘，
 * 并存进本会话的生辰快照 —— 追问轮重排的仍是同一张盘。
 *
 * <h3>为什么经度也要带</h3>
 * <p>出生地与经度是<b>两条独立的通道</b>：排盘页从行政区级联选出来时两者都有；
 * 而首页那个弹窗跳到 {@code /bazi} 时不还原级联选择器，排盘页收到的只有经度。
 * 那条路上若不带经度，后端 {@code applyTrueSolarTime} 会因为「既没地名又没经度」
 * 而整段跳过 —— 用户明明开了真太阳时开关，AI 这张盘却按北京时间排，正是要修的那个 bug。
 *
 * @return 四项全空时返回 {@code null}（不是页面跳过来的，或页面什么都没选）
 */
function readPageSpec(): PageBirthSpec | null {
  // 经度在 URL 里是字符串，转成数再发；非数字（理论上不该出现）一律当没带
  const lngText = queryValue(route.query.longitude);
  const longitude = lngText !== '' && !Number.isNaN(Number(lngText))
      ? Number(lngText)
      : undefined;
  const spec: PageBirthSpec = {
    birthPlace: queryValue(route.query.birthPlace) || undefined,
    longitude,
    useTrueSolarTime: queryValue(route.query.useTrueSolarTime) === '1',
    withEquationOfTime: queryValue(route.query.withEquationOfTime) === '1',
  };
  if (!spec.birthPlace && spec.longitude == null && !spec.useTrueSolarTime && !spec.withEquationOfTime) {
    return null;
  }
  return spec;
}
</script>

<style scoped lang="scss">
.container {
  width: 100%;
  min-height: 100%;
  background-color: var(--bg);
  // 顶部一层暖光晕，让大片留白不至于单调
  background-image: var(--halo);
  background-repeat: no-repeat;
  background-position: center top;
  transition: background-color 0.25s ease;
}

.content {
  // 主体宽度与 Header 内层同轴（$mainWidth），不再单开 1080px
  @include main-container($mainPad);
  padding-top: 28px;
  padding-bottom: 8px;
}

/* ==================== 方案 A：左侧常驻历史栏 ==================== */

/**
 * 侧栏两档宽度。主区靠 flex 自适应，不需要别处再手动让位 ——
 * 改这两个值就够，不用同步改 padding。
 *
 * <p>{@code $histW} 是「还要占文档流」那一档（视口低于 $histBreakW）：
 * 这一档每加宽 1px，正文就少 1px，所以上不去太多。
 * {@code $histWideW} 是脱流档的上限，见下面的媒体查询。
 */
$histW: 150px;
$histRailW: 40px;
$histWideW: 240px;

/**
 * 侧栏「脱流」的视口门槛。
 *
 * <p>正文轴左边界 = (视口 − $mainWidth) / 2（≥$mainWidth 时），要让它大于侧栏宽
 * $histW 并留出呼吸间隙，视口至少 ≈1416，取整 1420。低于此值退回占位写法：
 * 宁可暂时与 Header 内容轴差半个侧栏宽，也不能让侧栏压住正文。
 *
 * <p>1420 正好是「脱流后侧栏 = $histW」的那个视口（见下面 width 的算式），
 * 两档在门槛上不跳号。
 */
$histBreakW: 1420px;

.layout {
  display: flex;
  // 必须是 flex-start。默认的 stretch 会把侧栏拉到和主区一样高，
  // 那样 sticky 就没有可粘区间了，侧栏会跟着页面一起滚走。
  // （宽视口下侧栏转 fixed，这个容器里就只剩 .main 一个在流项。）
  align-items: flex-start;
}

.main {
  flex: 1;
  // 少了它，长内容的 min-content 宽度会把 flex 项撑破，报告区就出横向滚动条了
  min-width: 0;
}

/**
 * 「回到底部」浮标。
 *
 * <p>横向居中于整页轴（正文也是 margin:auto 居中的，两者同轴），
 * 纵向与「回到顶部」按钮同一档（bottom 见 router/index.ts 的 backtopBottom=208），
 * 一个居中一个贴右，不会撞车。
 *
 * <p>z-index 22：压过 .composer 的 20（浮在输入条之上），仍低于侧栏的 25 ——
 * 窄屏展开态是覆盖层（45），本来就该盖住它。
 */
.to-bottom {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 208px;
  z-index: 22;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: var(--panel);
  color: var(--text-dim);
  font-family: inherit;
  font-size: 12px;
  letter-spacing: 0.04em;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;

  &:hover {
    border-color: var(--gold-soft);
    color: var(--gold);
  }
}

.hist {
  flex: none;
  /**
   * 定位两档，见文件末尾的媒体查询：
   * · 默认（窄/中视口）sticky **占位** —— 页首那一刻正好顶到 header 下沿，
   *   所以要靠 top: $headerH 让位（header 是 sticky 的，不让位会钻到它背面被盖住）。
   * · 宽视口（≥$histBreakW）改 fixed **脱流**，把占的这 150px 还给主区，
   *   正文才能和 Header 的内容轴对齐。
   */
  position: sticky;
  top: $headerH;
  // 25 要压过 .composer 的 20：宽视口下侧栏 fixed、吸底输入条铺满整页，
  // 两者在左下角重叠，得让侧栏盖在输入条上面；同时仍低于 Header 的 50。
  z-index: 25;

  box-sizing: border-box;
  width: $histW;
  // 从 header 下沿（top 偏移）起算减掉 header 高度，页首那一刻正好铺到视口底，
  // 不会有一截伸到视口外。top 偏移 + 这个高度 = 100vh，严丝合缝。
  height: calc(100vh - #{$headerH});
  display: flex;
  flex-direction: column;
  padding: 8px 8px 12px;
  border-right: 1px solid var(--line);
  background: var(--bg);
  transition: width 0.18s ease;

  .layout.is-rail & {
    width: $histRailW;
    padding-left: 4px;
    padding-right: 4px;
  }
}

/**
 * 宽视口：侧栏脱流，贴屏幕左缘。
 *
 * <p><b>为什么必须脱流</b>：正文容器（.content / .composer-inner）靠 margin: auto 居中，
 * 而 auto 的基准是**父容器的内容盒** —— 只要侧栏还在文档流里占着 $histW，
 * .main 的宽度就只剩「视口 − $histW」，整条正文轴被推右 $histW/2（=75px），
 * 和 Header 那条居中于整个视口的内容轴对不上。
 * 「生辰八字」「关于」两页没有侧栏，.main 即视口宽，所以它们天然对齐 ——
 * 不是它们写对了，是它们没被挤过。
 *
 * <p>脱流后 .main 恢复满宽，正文回到整页轴，与那两页走同一条路径。
 * 位置与原来 sticky 时完全一致（top: $headerH，高度 100vh − header），
 * 所以视觉零变化 —— 变的只是「不再占文档流的宽度」，
 * 顺带让吸底输入条的模糊背景重新铺满整页（原来是齐着侧栏右缘断开的）。
 *
 * <p>⚠️ 阈值由 $histBreakW 的注释推导。窄于它时退回上面的占位写法：
 * 宁可正文与 Header 轴差半个侧栏宽，也不能让侧栏压住正文。
 *
 * <p><b>宽度跟着视口走</b>：脱流后侧栏不再吃正文的宽度，所以这里可以给足 ——
 * 但要留出与正文轴之间的呼吸。可用宽 = (视口 − $mainWidth) / 2，减 10px 呼吸，
 * 再用 $histWideW 封顶（240 与窄屏覆盖层同宽，两档「展开」看着是同一个东西）。
 * 于是 1420 上是 150（与占位档接得上，不跳号），1512 上约 196，
 * ≥1580 一路稳在 240 —— 十二字的「庚午年辛巳月乙酉日癸未时」排得下一整行，
 * 不再被两行截断。（那 10px 呼吸里，#app 的滚动条已占掉约 6px，
 * 所以真实间隙约 4px 起，随视口变宽。）
 */
@media (min-width: $histBreakW) {
  .hist {
    position: fixed;
    left: 0;
    width: calc((100vw - #{$mainWidth}) / 2 - 10px);
    max-width: $histWideW;

    // 收起态必须回到 40px：width 是跟着视口算的，光靠 .layout.is-rail 那条
    // 定不住 —— 这里的 max-width 会把 calc 的结果压回 40（max-width 优先级高于 width）
    .layout.is-rail & {
      max-width: $histRailW;
    }
  }
}

/* 窄屏展开态：把左栏摊成覆盖层，而不是继续挤压报告区 */
.hist-veil {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(38, 33, 25, 0.42);
}

.layout.is-overlay .hist {
  position: fixed;
  left: 0;
  top: 0;
  width: 240px;
  height: 100vh;
  padding: 10px 10px 16px;
  background: var(--panel);
  box-shadow: var(--shadow);
  z-index: 45;
}


@media (max-width: 720px) {
  .content {
    padding: 18px 14px 8px;
  }
}
</style>
