/**
 * 详细批八字报告接口（后端 {@code /chat/report/**}）。
 *
 * <h3>为什么 JSON 走 axios 实例、PDF 走原生 fetch</h3>
 * 与 {@link ./history.ts} 同一条规矩：列表/详情/轮询是普通 JSON 接口，
 * **需要**拦截器代劳 401 跳登录与错误提示；而 PDF 的响应体是二进制、
 * 没有 {@code code} 信封，走拦截器会被误判成业务错误，只能自己发。
 *
 * <h3>鉴权与归属</h3>
 * 后端把 {@code /chat/**} 加进了 {@code security.common.user-paths}，
 * 未登录回 401。请求里<b>没有</b> userId —— 服务端一律按 token 里的
 * 登录用户过滤，别顺手加。
 *
 * <h3>两个生成入口</h3>
 * <ol>
 *   <li><b>排盘页新建</b>：带 {@link ReportGenerateParams.birth}（前端表单已有这份入参）；</li>
 *   <li><b>历史会话一键生成</b>：带 {@link ReportGenerateParams.sessionId}，
 *       后端从 {@code fortune_session} 继承生辰与整盘快照。</li>
 * </ol>
 *
 * @see 设计文档 {@code docs/fortune-detailed-report-design-2026-10-13.md}
 */
import http from '@/api';
import type {
  FortuneReportDetailVo,
  FortuneReportStatusVo,
  FortuneReportVo,
  ReportGenerateParams,
  PageVo,
} from './types';
import {useUserInfoStore} from '@/store/userInfo';
import {HTTP_UNAUTHORIZED, NeedLoginError} from '@/utils/auth';
import {filenameFromDisposition} from './history';

/**
 * 生成详细报告 —— <b>建单即返回</b>，生成在后台跑。
 *
 * <p>返回的 reportId 是<b>字符串</b>（后端 Long 全局序列化）。
 * 拿到它直接进详情页：页面会开始轮询 status，用户看着进度往上走。
 *
 * <p>失败分两类，都由 axios 拦截器弹出中文提示，这里不重复处理：
 * 入参不合法（缺生辰 / 会话不是你的）与排不出盘。
 */
export const generateReport = (params: ReportGenerateParams) => {
  return http.post<string>('chat/report/generate', params);
};

/** 我的报告列表，按创建时间倒序。只读主单轻字段（后端封顶 size 50） */
export const listReports = (pageNum = 1, pageSize = 10) => {
  return http.get<PageVo<FortuneReportVo>>('chat/report/list', {
    params: {pageNum, pageSize},
  });
};

/**
 * 报告详情。<b>未生成完也返回</b> —— 已完成的章节渐进渲染，失败节带原因。
 *
 * <p>「不存在」与「不是你的」后端返回同一句提示（刻意的，防探测），
 * 前端别试图分辨。
 */
export const getReportDetail = (id: string | number) => {
  return http.get<FortuneReportDetailVo>(`chat/report/${id}`);
};

/** 轻量状态轮询（2~3 秒一次）：进度计数 + 当前章节标题，不碰正文 */
export const getReportStatus = (id: string | number) => {
  return http.get<FortuneReportStatusVo>(`chat/report/${id}/status`);
};

/**
 * 失败节重新入队。返回 {@code true} = 有节被复活（整单若是失败态也会
 * 被拖回「生成中」，所以调用方收到 true 后应恢复轮询）；
 * {@code false} = 没有需要重试的章节。
 */
export const retryReport = (id: string | number) => {
  return http.post<boolean>(`chat/report/${id}/retry`);
};

/**
 * 读出错误响应里的人话原因。
 *
 * <p>PDF 端点的 4xx/5xx 都带 JSON body（{@code R.fail}）—— 尤其是
 * 400「报告尚未生成完成（x/N 章）」这种用户操作时机不对的提示。
 * 不读 body 的话，前端只剩一个光状态码，弹不出该弹的提示。
 */
async function readFailMsg(resp: Response): Promise<string> {
  try {
    const data = await resp.json();
    return data?.msg || `HTTP ${resp.status}`;
  } catch {
    return `HTTP ${resp.status} ${resp.statusText}`;
  }
}

/**
 * 下载报告 PDF（后端渲染，前端只落盘）。
 *
 * <p>与 {@link ./history.ts#downloadReportPdf} 同构：fetch + token 头
 * （不走 axios，二进制响应体会被拦截器误判；也不用 window.open，
 * 那会把 token 挂进 query 落进浏览历史与访问日志）。
 * 仅全部章节完成后可导 —— 未完成时后端回 400 + JSON 原因，原样抛出。
 *
 * <p>文件名优先取后端给的（RFC 5987 中文名），拿不到再本地拼。
 */
export async function downloadReportPdfById(id: string | number): Promise<string> {
  const token = useUserInfoStore().getToken;
  const base = import.meta.env.VITE_API_BASE_URL ?? '/';
  const url = `${base.endsWith('/') ? base : base + '/'}chat/report/${id}/report.pdf`;

  const resp = await fetch(url, {headers: token ? {token} : {}});

  if (resp.status === HTTP_UNAUTHORIZED) {
    throw new NeedLoginError();
  }
  if (!resp.ok) {
    throw new Error(await readFailMsg(resp));
  }

  const blob = await resp.blob();
  const filename =
      filenameFromDisposition(resp.headers.get('Content-Disposition')) ??
      `批八字报告-${id}.pdf`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // 立刻 revoke 在部分浏览器（旧 Safari）里会掐断下载，拖一帧再放
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  return filename;
}
