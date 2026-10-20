/**
 * 推演页的纯展示层：常量、格式化与报告解析。
 *
 * <p>这里只有「进一段文字 / 出一段 HTML」的无状态函数，不碰 ref、不发请求 ——
 * 页面状态与 SSE 事件都在 composables/ 里，界面在 components/ 里。
 * 报告卡片化那套解析（splitVerdict / renderHead）之所以单独放一层：
 * 它产出的是 v-html 用的字符串，和模板无关，可以脱离页面看。
 */
import {ROUND_STATUS} from '@/api/module/fortune';
import type {ErrorPayload, PillarCode, PillarPayload, QaCategoryCode, QaPayload} from '@/api/module/fortune';
import {renderMarkdown} from '@/utils/markdown';

/**
 * 空态里的示例提问。
 *
 * <p>刻意把「出生地」与「按真太阳时排盘」都写进去：这两件事是这个页面最容易被忽略、
 * 又最影响时柱准不准的口径 —— 出生在西部的人按北京时间排，时柱可能差整整一个时辰。
 * 示例是用户唯一会照着写的一句话，示范它比写一段说明有用。
 *
 * <p>用户真这么说，后端抽取器接得住（「真太阳时」那句在抽取提示词里有专门一条）。
 */
export const SAMPLE_QUESTION = '我出生在深圳，公历1990年5月20日下午1点30分，男，请按真太阳时排盘，帮我看看整体运势';
export const FOLLOW_SAMPLES = ['为什么判断我有偏财？依据是什么？', '未来两个大运怎么样？'];

/** 四柱的固定顺序。后端是并发推送的，前端必须自己排，否则柱子会跳来跳去 */
export const PILLAR_ORDER: PillarCode[] = ['year', 'month', 'day', 'hour'];
export const PILLAR_KEYS = ['yearPillar', 'monthPillar', 'dayPillar', 'hourPillar'] as const;
export const PILLAR_LABELS: Record<PillarCode, string> = {
  year: '年柱', month: '月柱', day: '日柱', hour: '时柱',
};

export const STAGES = [
  {key: 'extract', label: '抽取生辰'},
  {key: 'calc', label: '排盘'},
  {key: 'summary', label: '解读'},
];

/**
 * 六大类的展示序 —— 与后端 {@code QuestionCategory} 的<b>声明序</b>逐字一致。
 *
 * <p>后端并发跑六类，事件按「谁先答完」到达；落库的全文与 {@code done} 却按声明序拼。
 * 卡片这里也按声明序排，用户看到的次序才和复制走的全文一致，同一张盘两次进来也不会换位 ——
 * 与柱子那套「固定槽位」是同一条理由：乱序点亮看着像 bug。
 */
export const CATEGORY_ORDER: QaCategoryCode[] = [
  'SHIYE_CAIXUN',
  'HUNYIN_GANQING',
  'JIATING_LIUQIN',
  'DAYUN_LIUNIAN',
  'RENSHENG_DASHI',
  'JIANKANG_XINGGE',
];

/**
 * 分类中文名 → 码值。
 *
 * <p>只在做历史回放时用：库里那行 {@code answer} 是一段连续文本，节标题只有中文名
 * （后端 {@code renderFirstRound} 就写了一行「## 中文名」），要靠这张表把节归回卡片次序。
 * 表里的值抄自后端枚举的 {@code label}，改了那边不改这边，历史会话的卡片会全排到最后 ——
 * 不影响能看见内容，所以是可接受的软失败，新会话不受影响。
 */
export const CATEGORY_BY_LABEL: Record<string, QaCategoryCode> = {
  事业财运: 'SHIYE_CAIXUN',
  婚姻感情: 'HUNYIN_GANQING',
  家庭六亲: 'JIATING_LIUQIN',
  大运流年: 'DAYUN_LIUNIAN',
  人生大势: 'RENSHENG_DASHI',
  健康性格: 'JIANKANG_XINGGE',
};

export const CACHE_LABEL: Record<string, string> = {
  extract: '抽取缓存',
  first: '报告缓存',
  followup: '追问缓存',
};

/**
 * 失败轮的错误码 → 人话。
 *
 * <p>为什么要在前端留一份：库里只落了 {@code errorCode}（如 {@code OVERLOADED}），
 * 当时那句面向用户的 {@code message} 是 SSE 事件里的、没有留存。
 * 所以从历史会话恢复失败轮时，只能在这里把码翻回中文，否则只剩一个英文码。
 */
export const ERROR_HINT: Record<string, string> = {
  EXTRACT_FAILED: '没能从那段描述里认出出生时间 —— 补上「公历还是农历 + 年月日 + 时辰 + 性别」再试',
  INTERNAL_ERROR: '服务端处理中断了，稍后重试就行',
  OVERLOADED: '当前排队的人有点多，稍后再试',
  BUSY: '同一会话上一轮还在生成中，等它结束再问',
};

/**
 * 后端「这一柱没成功」的降级文案特征串。
 *
 * <p>只用在<b>历史行的四柱卡</b>上（新首轮不再产生 {@code pillar_json}）：
 * {@code fortune_round.pillar_json} 里只有 {@code {柱位: 文本}}，没有独立的成功标记 ——
 * 降级柱存进去的就是后端当时的占位句。只能靠特征串反推，
 * 这也决定了判据要<b>宽</b>：认不出来就按正常柱渲染。
 * 反过来做的话，那句话与老数据稍有出入就满屏「降级」标记，比少个标记糟得多。
 */
export const PILLAR_FAILED_HINT = '该柱分析超时或失败';
/** 一轮问答的界面状态 */
export interface Round {
  question: string;
  /** stage 名 → 状态 */
  stage: Record<string, string>;
  /**
   * 首轮的六类问答，<b>按到达顺序</b>存。
   *
   * <p>渲染一律走 {@code orderedQa()}（按分类声明序排），这里不预排 ——
   * 后端并发跑六类、谁先答完先推谁，push 的顺序就是真实到达顺序，
   * 而卡片次序是口径，得由 {@code CATEGORY_ORDER} 一处决定。
   */
  qa: QaPayload[];
  /** 按柱位放的固定槽位。<b>只有历史行会有值</b>（2026-10-19 起后端不再产生四柱分析） */
  pillars: (PillarPayload | undefined)[];
  report: string;
  error: ErrorPayload | null;
  cacheHits: string[];
  streaming: boolean;
  elapsed: number;
  startedAt: number;
  /** 追问轮：不重新抽取生辰、不重新排盘 */
  followUp: boolean;
  /** 详章是否展开。跟每一轮走，不跨轮记忆 */
  detailOpen: boolean;
}
/** 状态点档位：0 生成中 / 1 已完成 / 2 失败。未知值按「已完成」画，免得列表一片红 */
export function statusKey(status: number | null | undefined): string {
  if (status === ROUND_STATUS.DOING) return 'doing';
  if (status === ROUND_STATUS.FAIL) return 'fail';
  return 'done';
}

/** 侧栏里的时间：今天给时分，更早给月-日。150px 的栏宽里塞不下完整时间戳 */
export function shortWhen(value: string | null): string {
  const m = value ? /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value) : null;
  if (!m) return '';
  const now = new Date();
  const today = Number(m[1]) === now.getFullYear()
      && Number(m[2]) === now.getMonth() + 1
      && Number(m[3]) === now.getDate();
  return today ? `${m[4]}:${m[5]}` : `${m[2]}-${m[3]}`;
}
/** 解析四柱结论 JSON。坏了就当没有 —— 四柱卡片不出现，报告正文照旧渲染 */
export function parsePillarTexts(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch (e) {
    console.warn('[fortune] 四柱结论 JSON 解析失败，本轮不显示四柱卡片', e);
    return {};
  }
}

/** 库里的缓存留痕是逗号分隔的层名（extract/first/followup），翻回给人看的标签 */
export function splitCacheHits(raw: string | null): string[] {
  if (!raw) return [];
  return raw
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => CACHE_LABEL[x] ?? x);
}
/**
 * 把任意值转成可显示文本。
 *
 * <p>后端这几个字段的序列化形状并不统一：{@code tianGan} 带
 * {@code @JsonFormat(shape=OBJECT)} 是对象，{@code tianGanGod} 是枚举名（字符串），
 * {@code shenShaList} 是数组。这里全部吃下 —— 前端不该因为后端某个枚举
 * 多加了个字段就白屏。
 */
export function disp(value: any): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    return value.map(disp).filter((v) => v !== '—').join('、') || '—';
  }
  return value.name ?? value.text ?? value.label ?? value.value ?? '—';
}

/** 后端给的是 "1990-04-26 13:30:00"，秒位在命盘场景里没有意义，去掉 */
export function shortDate(value: any): string {
  const text = disp(value);
  return text === '—' ? text : text.replace(/:00$/, '');
}

export function orderedPillars(round: Round): PillarPayload[] {
  return PILLAR_ORDER
      .map((code) => round.pillars.find((p) => p && p.pillar === code))
      .filter((p): p is PillarPayload => !!p);
}

/**
 * 后端「这一类没答上」的占位文案特征串。
 *
 * <p>和 {@link PILLAR_FAILED_HINT} 同一个道理，也只用在<b>历史回放</b>上：
 * 事件里的 {@code ok} 是现成的成功标记，但落库全文里只有这段占位文本 ——
 * 切回卡片时只能靠特征串反推。判据要<b>宽</b>：认不出来就按正常卡渲染。
 */
export const QA_FAILED_HINT = '这一类本轮没能答上';

/** 首轮的卡片序：按分类声明序排，认不出的码排到最后（到达序保持不动） */
export function orderedQa(round: Round): QaPayload[] {
  const rank = (code: string) => {
    const index = CATEGORY_ORDER.indexOf(code as QaCategoryCode);
    return index < 0 ? CATEGORY_ORDER.length : index;
  };
  // Array.sort 是稳定排序：认不出码值的那几张同秩，于是保持到达序 —— 「谁先亮」还在
  return [...round.qa].sort((a, b) => rank(a.category) - rank(b.category));
}

/**
 * 把首轮落库的全文切回卡片 —— 历史详情页读的就是这一条。
 *
 * <p>后端的 {@code renderFirstRound} 每类一节，节标题逐字是「## 分类中文名」，
 * 节之间空一行。这里<b>不</b>按「问：」行切：那是模型输出的一部分，
 * 少写一句、换个写法都会切歪，而标题行是服务端拼的、格式稳。
 *
 * <p>认不出的标题（后端加了一类还没同步这里、或模型自己写了个二级标题）
 * 连正文一起并回<b>上一张</b>卡片 —— 内容多一节看得见，比整节丢掉好。
 * 一段都没有标题（改造前那批自由报告、追问的回答）返回空数组，调用方按纯文本渲染。
 */
export function parseCategorySections(answer: string): QaPayload[] {
  if (!answer) return [];
  const groups: QaPayload[] = [];
  let current: {code: QaCategoryCode | string; label: string; body: string[]} | null = null;
  for (const line of answer.split('\n')) {
    const hit = /^[ \t]*##[ \t]*(.+?)[ \t]*$/.exec(line);
    const label = hit?.[1]?.trim() ?? '';
    const code = label ? CATEGORY_BY_LABEL[label] : undefined;
    if (hit && code) {
      if (current) groups.push(toQa(current));
      current = {code, label, body: []};
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current) groups.push(toQa(current));
  return groups;
}

function toQa(section: {code: QaCategoryCode | string; label: string; body: string[]}): QaPayload {
  const text = section.body.join('\n').trim();
  // 问题原文没单独入库（在模型正文里的「问：<原问题>」行），从那里捞回来只为卡片副标题好看；
  // 捞不到就当没有，卡片照样有正文
  const questions = text
      .split('\n')
      .map((line) => /^[ \t]*问：[ \t]*(.+?)[ \t]*$/.exec(line)?.[1]?.trim())
      .filter((x): x is string => !!x);
  return {
    category: section.code,
    label: section.label,
    intent: '',
    questions,
    text,
    ok: !text.includes(QA_FAILED_HINT),
  };
}

/** 一类问答的正文：与报告同一个渲染器（含转义）。一类的文本一次到位，不存在流式重解析的顾虑 */
export function renderQaText(group: QaPayload): string {
  return renderMarkdown(group.text);
}

/** 追问轮只跑 summary，抽取与排盘是复用上一轮的，别把它们画成「等待中」 */
export function stagesOf(round: Round) {
  return round.followUp ? STAGES.filter((s) => s.key === 'summary') : STAGES;
}

export function stageState(round: Round, key: string): string {
  const status = round.stage[key];
  if (status) return status;
  if (round.error && !round.stage.summary && key === 'summary') return 'failed';
  return 'idle';
}

export function stageTagType(round: Round, key: string): 'success' | 'warning' | 'danger' | 'info' {
  const state = stageState(round, key);
  if (state === 'running') return 'warning';
  if (state === 'done') return 'success';
  if (state === 'failed') return 'danger';
  return 'info';
}

// ==================== 「核心结论 + 详细分析」两段切分（只服务历史数据）====================

/**
 * 详章分隔标题。
 *
 * <p>2026-10-19 起后端提示词里<b>不再有</b>这一节了：首轮改成六类问答卡片，
 * 追问也不再用「核心结论 + 详细分析」那套骨架。所以这里只剩一个用途 ——
 * 回放改造前落库的那些轮次，格式约定当时是逐字 {@code ## 详细分析}。
 * 不删的理由和 {@link PILLAR_FAILED_HINT} 一样：历史即历史，删了它们就退化成整篇平铺。
 *
 * <p>刻意放宽到「1~6 级标题都认、前后空格都容忍」，只认那四个字 ——
 * 因为这个正则的失效方式是<b>静默</b>的：一旦没匹配上，页面就退化成「整篇平铺」，
 * 没有任何报错，很容易被当成「折叠功能没做」。宁可放宽匹配，也不要匹配不上。
 *
 * <p>不用 {@code g} 标志：这里每次都只找<b>第一个</b>（模型万一又写了一个，后面的算详章内容）。
 */
export const DETAIL_HEADING = /^[ \t]*#{1,6}[ \t]*详细分析[ \t]*$/m;

/** 切开的位置。没匹配到返回 -1 */
export function detailAt(report: string): { start: number; end: number } | null {
  const hit = DETAIL_HEADING.exec(report);
  return hit ? {start: hit.index, end: hit.index + hit[0].length} : null;
}

/**
 * 首屏那段（核心结论）。
 *
 * <p>2026-10-10 起做<b>卡片化</b>：四块行（{@code **事业：平** ｜ 依据… ｜ 应期…}）
 * 不再走通用 markdown 渲染（那会变成一整面文字墙），而是重排成卡片网格。
 * 解析是<b>宽容</b>的 —— 编号可有可无、任何块名都收（模型偶尔会把固定格式
 * 泛化出「**大运：顺**」这类骨架外的块，照样成卡，不丢内容）；
 * 一行都没匹配上时退回整段 markdown，等价于改动前的行为。
 */
export function renderHead(round: Round): string {
  const at = detailAt(round.report);
  const head = at ? round.report.slice(0, at.start) : round.report;
  const { rest, blocks, extras } = splitVerdict(head);
  if (!blocks.length && !extras.length) return renderMarkdown(head);

  const cards = blocks
    .map(
      (b) => `<div class="vcard ${DIR_CLASS[b.dir] ?? 'is-ping'}">` +
        `<div class="v-top"><span class="v-block">${escHtml(b.name)}</span>` +
        `<span class="v-badge">${escHtml(b.dir)}</span>` +
        `<span class="v-hint">${DIR_HINT[b.dir] ?? ''}</span></div>` +
        `<div class="v-row"><span class="v-k">依据</span><span>${inlineMini(b.basis)}</span></div>` +
        `<div class="v-row"><span class="v-k">应期</span><span>${inlineMini(b.timing)}</span></div>` +
        `</div>`,
    )
    .join('');
  const extraHtml = extras.length
    ? `<p class="vextras-title">补充判断</p>` +
      extras
        .map(
          (e) => `<div class="vx">` +
            `<div class="vx-head">${inlineMini(e.title)}</div>` +
            `<div class="v-row"><span class="v-k">依据</span><span>${inlineMini(e.basis)}</span></div>` +
            `<div class="v-row"><span class="v-k">应期</span><span>${inlineMini(e.timing)}</span></div>` +
            `</div>`,
        )
        .join('')
    : '';
  return renderMarkdown(rest) + `<div class="vgrid">${cards}</div>` + extraHtml;
}

// ---- 核心结论卡片化的解析（只认旧版汇总提示词写死的行格式；该模板已随 2026-10-19 首轮改造删除）----

/** 四块行：`**事业：平** ｜ 依据：… ｜ 应期：…`（编号可有可无）。方向限定 顺/平/逆 单字。 */
export const RE_VERDICT =
  /^[ \t]*(?:\d+[.)][ \t]+)?\*\*([^：*\n]{1,6})：([顺平逆])\*\*[ \t]*｜[ \t]*依据：(.+?)[ \t]*｜[ \t]*应期：(.+?)[ \t]*$/;

/** 补充条：`**结论** ｜ 依据：… ｜ 应期：…`（与四块行的差别：冒号后不是顺/平/逆）。 */
export const RE_EXTRA =
  /^[ \t]*(?:\d+[.)][ \t]+)?\*\*(.+?)\*\*[ \t]*｜[ \t]*依据：(.+?)[ \t]*｜[ \t]*应期：(.+?)[ \t]*$/;

export const DIR_CLASS: Record<string, string> = {顺: 'is-shun', 平: 'is-ping', 逆: 'is-ni'};
export const DIR_HINT: Record<string, string> = {顺: '推得动', 平: '信号相互抵消', 逆: '有阻，要绕'};

export function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 依据/应期里偶尔出现 **加粗**；与渲染器同口径：先转义再替换，v-html 安全 */
export function inlineMini(s: string): string {
  return escHtml(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

export interface VerdictBlock {
  name: string;
  dir: string;
  basis: string;
  timing: string;
}

export interface VerdictExtra {
  title: string;
  basis: string;
  timing: string;
}

/** 把「核心结论」段拆成：其余行 / 四块卡 / 补充条。解析只丢样式不丢内容。 */
export function splitVerdict(head: string): {rest: string; blocks: VerdictBlock[]; extras: VerdictExtra[]} {
  const blocks: VerdictBlock[] = [];
  const extras: VerdictExtra[] = [];
  const rest: string[] = [];
  for (const line of head.split('\n')) {
    const m = RE_VERDICT.exec(line);
    if (m) {
      blocks.push({name: m[1].trim(), dir: m[2], basis: m[3], timing: m[4]});
      continue;
    }
    const e = RE_EXTRA.exec(line);
    if (e) {
      extras.push({title: e[1], basis: e[2], timing: e[3]});
      continue;
    }
    rest.push(line);
  }
  return {rest: rest.join('\n'), blocks, extras};
}

/** 详章那段（不含分隔标题本身 —— 标题已经变成折叠按钮了） */
export function renderDetail(round: Round): string {
  const at = detailAt(round.report);
  return at ? renderMarkdown(round.report.slice(at.end)) : '';
}

/**
 * 是否可以折叠。
 *
 * <p>切开后两侧都必须有内容，否则宁可整篇平铺：
 * 首屏为空会造成「上面一片空白」，详章为空会让「点了展开什么也没有」——
 * 两种都比不折叠更像 bug。所以判据是<b>三段都有货</b>才算按约定输出。
 */
export function hasDetail(round: Round): boolean {
  const at = detailAt(round.report);
  if (!at) return false;
  return !!round.report.slice(0, at.start).trim() && !!round.report.slice(at.end).trim();
}

/** 详章里有几节（数标题行）。只用来给折叠按钮补一个「有多少东西」的预告 */
export function detailCount(round: Round): number {
  const at = detailAt(round.report);
  if (!at) return 0;
  return round.report
    .slice(at.end)
    .split('\n')
    .filter((line) => /^[ \t]*#{1,6}[ \t]*\S/.test(line)).length;
}

/** 四柱卡片正文：与报告同一个渲染器（含转义）。柱子事件一次到位，不存在流式重解析的性能顾虑 */
export function renderPillarText(p: PillarPayload): string {
  return renderMarkdown(p.text);
}
export function fmtElapsed(ms: number): string {
  if (!ms) return '';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}
