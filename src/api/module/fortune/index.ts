/**
 * AI 命理推演接口 —— 流式对话。
 *
 * <h3>为什么不走 {@code src/api/index.ts} 里的 axios 实例</h3>
 * 那个实例对普通 JSON 接口很合适，但它有三处和 SSE 天然冲突：
 * <ol>
 *   <li>请求拦截器会给每个请求挂 {@code _t=<时间戳>} 防缓存参数，
 *       还按 URL+参数 做重复请求取消 —— 流式接口被误判成重复请求会直接掐断；</li>
 *   <li>响应拦截器按 {@code code !== 200} 判失败，而 SSE 的响应体根本不是那个信封；</li>
 *   <li>超时设了 60s，而首轮报告要跑 6 次模型调用、实测能到 2 分钟以上。</li>
 * </ol>
 * 所以这里用原生 {@code fetch} 自己读字节流。代价是多几十行解析代码，但换来的是
 * 「边收边渲染」这个能力 —— 这正是把排盘和解读拆开的全部意义。
 *
 * <h3>为什么不用 EventSource</h3>
 * {@code EventSource} 只能发 GET、不能带请求体，问题只能塞进 URL：
 * 长问题会被 URL 长度限制截断，中文还得手工编码。所以宁可自己解析报文。
 *
 * <h3>鉴权</h3>
 * {@code /graph/**} 需要用户体系登录。token 由本文件自己挂到 {@code token} 头上 ——
 * 用 {@code fetch} 就没法蹭 axios 的请求拦截器了，这正是「不用 axios」的额外代价。
 * 未登录时后端回 401，本文件把它转成 {@link NeedLoginError}，由调用方跳登录页。
 */
import {REPORT_PDF_PATH, SSE_ASK_PATH} from './constants';
import type {FortuneAskParams, FortuneEvent} from './types';
import {useUserInfoStore} from '@/store/userInfo';
import {HTTP_UNAUTHORIZED, NeedLoginError} from '@/utils/auth';

export * from './types';
export {REPORT_PDF_PATH, SSE_ASK_PATH} from './constants';
// 历史会话（普通 JSON 接口，走 axios 实例）。刻意逐个具名导出而不是 `export *` ——
// history.ts 自己也 `export * from './types'`，两边都用星号会让同一批类型名出现两条导出路径。
export {listSessions, getSessionDetail, deleteSession, downloadReportPdf} from './history';

/**
 * 解析出 AI 模块接口的基址（以 / 结尾，可直接拼相对路径）。
 *
 * <p>开发态 {@code VITE_AI_API_BASE=/}，配合 {@code vite.config.ts} 里
 * {@code /graph}、{@code /chat} 的代理打到本机 8800 —— 这样既躲开跨域（后端没配 CORS），
 * 前端代码里也不用区分「本地还是网关」。
 *
 * <p>生产态指向网关地址，例如 {@code https://xxx/metaphysics/}。
 */
export function resolveApiBase(): string {
  const base: string = import.meta.env.VITE_AI_API_BASE ?? '/';
  return base.endsWith('/') ? base : `${base}/`;
}

/** 推演接口的完整地址（SSE 用原生 fetch，拿不到 axios 实例的 baseURL） */
export function resolveAskUrl(): string {
  return `${resolveApiBase()}${SSE_ASK_PATH}`;
}

export interface StreamAskOptions extends FortuneAskParams {
  /** 每收到一个事件调一次 */
  onEvent: (ev: FortuneEvent<any>) => void;
  signal?: AbortSignal;
}

/**
 * 发起一次推演，边收边回调。
 *
 * <p>Promise 在**流结束**时才 resolve，网络/HTTP 层面的错误才 reject。
 * 业务错误（例如没识别出生日）是流里的 {@code error} 事件，不会 reject ——
 * 调用方要在 onEvent 里处理，别指望 catch 能兜住。
 *
 * <p>唯一的例外是**未登录**：后端 {@code LoginIntercept} 在进 Controller 之前就把请求
 * 挡掉了，回的是 HTTP 401 + JSON（不是 SSE 流），所以它会以
 * {@link NeedLoginError} reject。调用方 catch 到它就该跳登录页。
 */
export async function streamAsk(options: StreamAskOptions): Promise<void> {
  const {question, sessionId = '', onEvent, signal} = options;

  // 用户体系的 token 放在名为 token 的头里。
  // 为什么是 token 而不是 Sa-Token 默认的 saToken：StpKit.USER 覆写了
  // splicingKeyTokenName()，用户体系那一套的 token 名就是 token
  // （见后端 commons/common-satoken/.../StpKit.java）。
  // 从 store 里现取而不是当参数传 —— 这样调用方不必知道鉴权细节，
  // 也就不会出现「某个调用点忘了传」。
  const token = useUserInfoStore().getToken;

  const response = await fetch(resolveAskUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? {token} : {}),
    },
    body: JSON.stringify({question, sessionId}),
    signal,
  });

  // 未登录 / 登录已过期。/graph/** 的登录闸门直接回 401（见后端 LoginIntercept），
  // 这里必须显式认出来 —— 否则会被当成「HTTP 401」这种普通错误，
  // 用户看到的是一句没头没脑的连接失败，而不是登录页。
  if (response.status === HTTP_UNAUTHORIZED) {
    throw new NeedLoginError();
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error('当前浏览器不支持流式响应（response.body 为空）');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  for (; ;) {
    const {done, value} = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, {stream: true});
    // 有的容器会用 \r\n 分隔，先归一化，后面只按 \n\n 切块
    buffer = buffer.replace(/\r\n/g, '\n');

    let boundary: number;
    while ((boundary = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const parsed = parseBlock(block);
      if (parsed) onEvent(parsed);
    }
  }
}

/**
 * 解析一个 SSE 块。
 *
 * <p>帧格式：
 * <pre>
 * event: delta
 * data: {"text":"你好"}
 * </pre>
 * 注意 {@code data:} 后面<b>只有一个可选空格</b>，多剥会吃掉正文里的缩进，
 * 所以这里只去掉一个前导空格。
 */
function parseBlock(block: string): FortuneEvent<any> | null {
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      let value = line.slice(5);
      if (value.startsWith(' ')) value = value.slice(1);
      dataLines.push(value);
    }
    // 以 ':' 开头的是注释帧（心跳），忽略
  }

  if (dataLines.length === 0) return null;

  const raw = dataLines.join('\n');
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    // 不是 JSON 就原样给出去：调试时能看见后端吐了什么，比吞掉强
    data = raw;
  }
  return {event, data};
}
