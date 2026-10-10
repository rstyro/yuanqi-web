/**
 * 历史会话接口（后端 {@code /chat/**}）。
 *
 * <h3>为什么走 axios 实例，而 {@code ./index.ts} 里的 SSE 走原生 fetch</h3>
 * 这三个都是普通 JSON 接口，不需要绕开拦截器 —— 正相反，它们**需要**拦截器：
 * 401 要能自动跳登录页、错误要能自动弹提示。所以直接复用 {@code src/api} 的实例，
 * 与 {@code module/bazi}、{@code module/user} 一致。
 *
 * <h3>鉴权</h3>
 * 后端把 {@code /chat/**} 加进了 {@code security.common.user-paths}，未登录回
 * HTTP 401 + {@code {"code":40001}}。两条判据都在 {@code src/api} 的响应拦截器里认了，
 * 这里不需要重复处理，也**不要**在这里手动拼 token / uid 头。
 *
 * <h3>归属</h3>
 * 请求里<b>没有</b> userId / visitorId 这类参数，服务端一律按 token 里的登录用户过滤。
 * 别顺手加 —— 那等于把「查谁的会话」交给客户端决定。
 *
 * @see 契约文档 {@code docs/ai-fortune-session-persistence.md}
 */
import http from '@/api';
import type {FortuneSessionDetailVo, FortuneSessionVo, PageVo} from './types';
import {useUserInfoStore} from '@/store/userInfo';
import {HTTP_UNAUTHORIZED, NeedLoginError} from '@/utils/auth';

export * from './types';

/**
 * 会话列表，按最后活跃时间倒序。
 *
 * <p>{@code pageSize} 后端封顶 50（那是浏览器要一次渲染完的列表，不是后台导出）。
 * 侧栏是常驻的，默认取前 20 条足够 —— 再多用户也不会一屏一屏翻。
 *
 * <p>记录里不含命盘与生辰（后端 {@code @JsonIgnore} 挡掉了），所以这个接口很轻，
 * 每次打开侧栏 / 每轮结束刷新一次都不心疼。
 */
export const listSessions = (pageNum = 1, pageSize = 20) => {
  return http.get<PageVo<FortuneSessionVo>>('chat/sessions', {
    params: {pageNum, pageSize},
  });
};

/**
 * 会话详情：会话元数据 + 全部轮次 + 命盘。
 *
 * <p>命盘服务端已经取好了（优先回放存下的快照，没有才按生辰重排），前端直接用。
 *
 * <p>「不存在」与「不是你的」后端返回的是同一句提示 —— 这是刻意的，
 * 区分开来就成了探测别人会话是否存在的手段，前端别试图分辨。
 *
 * <p>副作用（后端做的，值得知道）：读详情会把该会话的生辰快照回填进 Redis 的会话生辰缓存
 * （那条 TTL 只有 24h）。不回填的话，用户点开两个月前的会话接着追问，
 * 后端会因为「抽不到生辰 + 缓存里也没有」而回一句「没能从你的话里看出出生日期」。
 * <b>所以「打开历史会话」不能只在前端切状态，必须真的调一次这个接口。</b>
 */
export const getSessionDetail = (sessionId: string) => {
  return http.get<FortuneSessionDetailVo>(`chat/session/${sessionId}`);
};

/**
 * 逻辑删除会话（连带它的轮次行不再可查）。
 *
 * <p>返回 {@code data: true} = 删掉了；{@code false} = 不存在 / 不是你的。
 * 后端是逻辑删除（{@code is_del=1}），轮次行留着便于事后追查，
 * 所以这个接口**不会**立刻释放存储 —— 别拿它当「清理空间」用。
 */
export const deleteSession = (sessionId: string) => {
  return http.delete<boolean>(`chat/session/${sessionId}`);
};

/**
 * 解析 {@code Content-Disposition} 里的文件名。
 *
 * <p>后端同时给了两种写法：{@code filename="report.pdf"}（兼容老浏览器）和
 * {@code filename*=UTF-8''...}（RFC 5987，真正的中文名）。只认后者 ——
 * 前者固定是 {@code report.pdf}，拿它当文件名会把所有报告都存成同一个名字。
 */
function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const m = /filename\*=(?:UTF-8|utf-8)''([^;]+)/.exec(header);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1].trim());
  } catch {
    return null;
  }
}

/**
 * 下载某会话的报告 PDF（后端渲染，前端只落盘）。
 *
 * <h3>为什么走原生 fetch 而不是上面的 axios 实例</h3>
 * 共享实例的响应拦截器按 {@code res.code !== 200} 判失败，而 PDF 的响应体是二进制、
 * 根本没有 code 字段 —— 走拦截器会被误判成业务错误。SSE 那条链路（index.ts）也是
 * 同一个原因绕开 axios 的。代价是要自己挂 token 头、自己认 401。
 *
 * <h3>为什么不用 window.open 直接开</h3>
 * 那样 token 只能挂 query，会落进浏览器历史和服务端访问日志。
 * fetch + blob 让 token 只待在请求头里。
 *
 * <p>文件名优先取后端给的（{@code 八字报告-<标题>-<八字>-<日期>.pdf}），
 * 拿不到再退回本地拼一个。
 */
export async function downloadReportPdf(sessionId: string): Promise<string> {
  const token = useUserInfoStore().getToken;
  const base = import.meta.env.VITE_API_BASE_URL ?? '/';
  const url = `${base.endsWith('/') ? base : base + '/'}chat/session/${sessionId}/report.pdf`;

  const resp = await fetch(url, {headers: token ? {token} : {}});

  // 与 SSE 链路同一条规矩：401 要转成 NeedLoginError，让调用方跳登录页，
  // 而不是弹一句没头没脑的「下载失败」
  if (resp.status === HTTP_UNAUTHORIZED) {
    throw new NeedLoginError();
  }
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
  }

  const blob = await resp.blob();
  const filename =
      filenameFromDisposition(resp.headers.get('Content-Disposition')) ??
      `批八字报告-${sessionId.slice(0, 8)}.pdf`;

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
