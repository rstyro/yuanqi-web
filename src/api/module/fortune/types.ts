/**
 * AI 命理推演接口类型。
 *
 * 契约以后端 {@code top.lrshuai.ai.fortune.FortuneSse} 为准，
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
