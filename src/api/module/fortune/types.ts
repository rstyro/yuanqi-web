/**
 * AI 命理推演接口类型。
 *
 * 契约以后端 {@code top.lrshuai.admin.fortune.fortune.FortuneSse} 为准，
 * 改后端事件时记得回来同步这里。
 */
import type {PillarVo, QiYunView} from "@/api/module/bazi/types";

// 起运视图直接用排盘契约里的那一份 —— 后端 /graph/chart 与 /home/pillarData
// 返回的是同一个 PillarVo，没必要在这里再抄一份子集（抄了就会随契约漂移）。
export type {QiYunView};

// ==================== event 名称 ====================

export const SSE_STAGE = 'stage';
export const SSE_CHART = 'chart';
export const SSE_PILLAR = 'pillar';
export const SSE_DELTA = 'delta';
export const SSE_DONE = 'done';
export const SSE_ERROR = 'error';
export const SSE_CACHE = 'cache';

// ==================== stage ====================

/** extract=抽取生辰, calc=排盘, summary=生成解读 */
export type StageName = 'extract' | 'calc' | 'summary';
export type StageStatus = 'running' | 'done';

export interface StagePayload {
  name: StageName | string;
  status: StageStatus | string;
}

// ==================== cache ====================

/** extract=生辰抽取缓存, first=首轮四柱+报告缓存, followup=追问缓存 */
export type CacheLayer = 'extract' | 'first' | 'followup';

export interface CachePayload {
  layer: CacheLayer | string;
  /** 恒为 true —— 未命中不发这个事件，免得前端要处理「一个说没命中的事件」 */
  hit: boolean;
}

// ==================== pillar ====================

/** 柱位编码，与后端 PILLAR_ORDER 一致 */
export type PillarCode = 'year' | 'month' | 'day' | 'hour';

export interface PillarPayload {
  pillar: PillarCode;
  /** 中文名：年柱 / 月柱 / 日柱 / 时柱 */
  label: string;
  /** 该柱的分析结论 */
  text: string;
  /** false = 该柱超时或失败，text 是占位文案 */
  ok: boolean;
}

// ==================== delta / done / error ====================

export interface DeltaPayload {
  /** 正文增量片段，直接拼接 */
  text: string;
}

export interface DonePayload {
  /** 下次请求要带回来才能续上多轮与生辰复用 */
  sessionId: string;
  /** ISO-8601 */
  finishedAt: string;
  /**
   * 报告完整正文。
   *
   * <p>渲染请只用 delta 拼接 —— 这个字段是给「落库 / 非流式客户端 / 断线后取全文」用的。
   * 前端在 done 时<b>整体替换</b>（而不是追加）已拼好的正文，这样既不会得到两倍正文，
   * 又能在 delta 丢包时纠正过来。
   */
  text: string;
}

export interface ErrorPayload {
  /** EXTRACT_FAILED / INTERNAL_ERROR / OVERLOADED / BUSY */
  code: string;
  /** 面向用户的中文提示 */
  message: string;
}

// ==================== chart ====================

/**
 * 命盘。后端 `chart` 事件推的就是排盘契约里的 `PillarVo`（与 `/home/pillarData` 同源），
 * 所以直接复用同一个类型，不再叠加可选字段 —— 那样会与契约要求（如 `sect` 必填）冲突。
 */
export type FortuneChart = PillarVo;

// ==================== 请求 ====================

export interface FortuneAskParams {
  /** 用户原话 */
  question: string;
  /** 首轮留空，由后端生成并随 done 事件返回 */
  sessionId?: string;
}

/** 解析出来的单个 SSE 事件 */
export interface FortuneEvent<T = unknown> {
  event: string;
  data: T;
}

/** 各事件载荷的映射，供 onEvent 做窄化 */
export interface FortuneEventMap {
  [SSE_STAGE]: StagePayload;
  [SSE_CACHE]: CachePayload;
  [SSE_CHART]: FortuneChart;
  [SSE_PILLAR]: PillarPayload;
  [SSE_DELTA]: DeltaPayload;
  [SSE_DONE]: DonePayload;
  [SSE_ERROR]: ErrorPayload;
}

// ==================== 历史会话（/chat/**） ====================

/**
 * 会话 / 轮次状态：0=生成中，1=已完成，2=失败。
 *
 * <p>与后端 {@code FortuneRound.RoundStatus}、{@code mini_ai_record.status} 同口径 ——
 * 后端三处共用一套数字，前端也只该有一套常量，别在页面里散写 {@code status === 1}。
 */
export const ROUND_STATUS = {
  /** 生成中。会话行在排盘完成时就落库，此刻是它 */
  DOING: 0,
  /** 已完成 */
  DONE: 1,
  /** 失败（errorCode 有值） */
  FAIL: 2,
} as const;

/**
 * 一行会话，对应后端 {@code FortuneSession}。
 *
 * <p>⚠️ 响应里<b>没有</b> {@code birthJson} / {@code chartJson} —— 后端给这两个字段
 * 打了 {@code @JsonIgnore}（一页十几行、每行挂 58KB 的整盘，光列表就是几百 KB 的无效流量）。
 * 命盘只在详情接口里给。
 */
export interface FortuneSessionVo {
  id: number;
  /** 32 位 UUID，与后端 Redis 的对话记忆键同源。续聊靠它 */
  sessionId: string;
  userId: number;
  /** 首轮提问截断而来的标题，模型不参与。列表里只当兜底，优先展示 gz */
  title: string;
  /** 八字四柱，空格分隔，如「庚午 辛巳 戊子 己未」。排盘没跑完时为空 */
  ganZhi: string | null;
  /** 排盘时间（已含真太阳时校正） */
  birthTime: string | null;
  /** 1=公历 2=农历 */
  dateType: number | null;
  /** 是否闰月，仅农历有意义 */
  leapMonth: number | null;
  /** 1=男 0=女 */
  sex: number | null;
  username: string | null;
  /** 命盘口径版本（如 v10）。与当前不一致时详情接口会给 chartVersionStale=true */
  chartVersion: string | null;
  status: number;
  /** 轮次计数：首轮=1，每次追问 +1 */
  roundCount: number;
  /** 最后活跃时间。列表按它倒序 */
  lastActiveTime: string | null;
  createTime: string | null;
}

/** 一轮问答，对应后端 {@code FortuneRound} */
export interface FortuneRoundVo {
  id: number;
  sessionId: string;
  /** 轮次序号，同一会话内从 1 递增 */
  seq: number;
  /** 1=追问轮（跳过四柱），0=首轮 */
  followUp: number;
  question: string;
  /** 报告 / 回答正文。失败轮是 null */
  answer: string | null;
  /**
   * 首轮四柱结论（柱位编码 → 文本）的 JSON 字符串，追问轮为 null。
   *
   * <p>它是 LLM 的产物而非算出来的，丢了就只能再花 4 次模型调用 ——
   * 所以必须原样存、原样读，<b>不要</b>拿命盘去重算四柱文案。
   */
  pillarJson: string | null;
  /** 命中的应答缓存层，逗号分隔：extract / first / followup */
  cacheHits: string | null;
  status: number;
  /** 失败错误码：EXTRACT_FAILED / INTERNAL_ERROR / OVERLOADED / BUSY */
  errorCode: string | null;
  elapsedMs: number | null;
  createTime: string | null;
}

/**
 * 会话详情 —— 点开一条历史会话要的全部数据。
 *
 * <p>对应后端 {@code FortuneSessionDetailVo}。命盘由服务端一并返回，前端<b>不要</b>
 * 再拿生辰去调一次 {@code /graph/chart}：那会绕过「原样回放快照」的口径，
 * 引擎升级过的旧会话会当场换一张盘。
 */
export interface FortuneSessionDetailVo {
  session: FortuneSessionVo;
  /** 全部轮次，已按 seq 升序 */
  rounds: FortuneRoundVo[];
  /**
   * 命盘。<b>可能为 null</b>（快照与生辰都缺），此时只渲染文字部分，不要整页报错。
   *
   * <p>类型标成 {@link FortuneChart} 是因为它确实是命盘、页面也按命盘消费它；
   * 但要清楚它是<b>某个历史版本写下的快照</b>，字段可能比当前契约少 ——
   * 所以页面读取一律走容错路径（见 index.vue 的 {@code disp()}），不要直接点深字段。
   */
  chart: FortuneChart | null;
  /** 库里记的口径与当前不一致。标题旁提示一句即可，不是错误 */
  chartVersionStale: boolean;
}

/** MyBatis-Plus 的分页信封 */
export interface PageVo<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

// ==================== 详细报告（/chat/report/**） ====================

/**
 * 报告主单状态：0=生成中，1=已完成，2=失败。
 *
 * <p>与后端 {@code FortuneReport.ReportStatus}、{@code FortuneSession.status}
 * 同口径 —— 前端只该有一套常量，别在页面里散写 {@code status === 1}。
 */
export const REPORT_STATUS = {
  /** 生成中（含排队）。建单即落库，此刻就是它 */
  DOING: 0,
  /** 已完成（全部章节终态） */
  END: 1,
  /** 整体失败（建单时排盘失败等；章节级失败见 SECTION_STATUS） */
  ERR: 2,
} as const;

/**
 * 章节状态：0=待生成，1=生成中，2=已完成，3=失败。
 *
 * <p>⚠️ 与主单的「2=失败」**刻意不同号**（章节失败是 3）——
 * 后端注释原话「免得两处看串」。自动重试耗尽后停 3，等用户手动 retry。
 */
export const SECTION_STATUS = {
  TODO: 0,
  DOING: 1,
  END: 2,
  ERR: 3,
} as const;

/**
 * 报告主单，对应后端 {@code FortuneReport}。
 *
 * <p>⚠️ 响应里<b>没有</b> {@code birthJson} / {@code chartJson}（后端
 * {@code @JsonIgnore} 挡掉了，列表页一行挂几十 KB 快照纯属浪费）——
 * 命盘快照只在后端重试时用，前端永远不需要。
 *
 * <p>⚠️ 全局 {@code JacksonConfig} 把 {@code Long} 序列化成字符串，
 * 所以 {@code id} / {@code userId} 是 {@code "3"} 这种，别当 number 用。
 */
export interface FortuneReportVo {
  id: string;
  userId: string;
  title: string;
  /** 八字四柱，空格分隔，如「壬申 丙午 丁卯 己酉」 */
  ganZhi: string | null;
  /** 1=男，0=女（注意不是 mini_user 的 1/2） */
  sex: number | null;
  /** `yyyy-MM-dd HH:mm:ss` */
  birthTime: string | null;
  /** 1=公历，2=农历 */
  dateType: number | null;
  leapMonth: number | null;
  username: string | null;
  /** 来源会话标识（历史会话一键生成时带上，排盘页新建为空） */
  sessionId: string | null;
  status: number;
  /** 章节总数（流年已展开），建单时算好 */
  totalSections: number | null;
  /** 已完成章节数。进度条用 */
  doneSections: number | null;
  /** 整体失败原因；章节级失败在节行的 errorMsg 上 */
  errorMsg: string | null;
  createTime: string | null;
  updateTime: string | null;
}

/** 报告的一章，对应后端 {@code FortuneReportSection} */
export interface FortuneReportSectionVo {
  id: string;
  reportId: string;
  /** 报告内从 1 递增，决定渲染与导出顺序 */
  seq: number;
  /** overview / career / wealth / marriage / health / liunian_2026 … */
  sectionKey: string;
  title: string;
  status: number;
  /** 章节正文（markdown）。失败/待生成时为 null */
  content: string | null;
  retryCount: number | null;
  /** 本节失败原因（后端截断到 512 字符内） */
  errorMsg: string | null;
  elapsedMs: number | null;
}

/**
 * 报告详情 —— 主单 + 全部章节（按 seq 升序）。
 *
 * <p><b>未生成完也返回</b>：已完成的章节渐进渲染，失败节带 errorMsg。
 */
export interface FortuneReportDetailVo {
  report: FortuneReportVo;
  sections: FortuneReportSectionVo[];
}

/**
 * 轻量轮询结果（2~3 秒打一次）。刻意不带 content 大字段 ——
 * 每 2 秒拉整份报告正文，流量与序列化开销都荒唐。
 */
export interface FortuneReportStatusVo {
  id: string;
  title: string;
  ganZhi: string | null;
  status: number;
  totalSections: number | null;
  doneSections: number | null;
  /** 当前正在生成的章节标题；全部终态时为 null */
  currentSectionTitle: string | null;
  errorMsg: string | null;
}

/**
 * 「排盘页新建」入口的生辰入参，对应后端 {@code ReportBirthRequest}。
 *
 * <p>字段与排盘页的 {@link BaziQuery} 同口径（dateType / sex / dateTime /
 * leapMonth / longitude / birthPlace / useTrueSolarTime / withEquationOfTime）。
 *
 * <p>⚠️ {@link dateTime} 的格式是 <b>{@code yyyy-MM-dd HH:mm:ss}</b>（空格分隔，
 * 不是 ISO 的 {@code T}）—— 全局 {@code JacksonConfig} 钉死了这个 pattern，
 * 与 {@link BaziQuery} 同一口径。发 {@code T} 格式会 503。
 */
export interface ReportBirthParams {
  dateType?: number;
  /** 1=男，0=女。可空 —— 空则后端按「未提供」处理并在报告里声明 */
  sex?: number | null;
  dateTime: string;
  leapMonth?: boolean;
  username?: string;
  longitude?: number | null;
  /** 出生地名。只用于回显与说明，不参与排盘（真太阳时只用经度） */
  birthPlace?: string;
  useTrueSolarTime?: boolean;
  withEquationOfTime?: boolean;
}

/**
 * 「生成详细报告」请求。<b>两个入口二选一</b>：
 * {@link sessionId}（历史会话一键生成，后端继承当时的盘）或
 * {@link birth}（排盘页新建）。两个都带以 sessionId 为准。
 */
export interface ReportGenerateParams {
  sessionId?: string;
  birth?: ReportBirthParams;
  /** 流年窗口年数，可空（默认取后端配置 = 当前大运十年）。建单时定死 */
  liuNianYears?: number;
}
