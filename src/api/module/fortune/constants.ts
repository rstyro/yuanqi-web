/**
 * AI 命理推演的接口路径常量。
 *
 * <p>单独拆一个文件，是为了让 {@code vite.config.ts} 的代理配置和前端请求代码
 * 能指向同一个字符串 —— 代理挂了但代码改了路径，是最难查的一类联调问题。
 */

/** 推演接口路径（相对于 VITE_AI_API_BASE） */
export const SSE_ASK_PATH = 'graph/ask';

/**
 * 报告 PDF 下载路径模板（相对于 VITE_AI_API_BASE），{@code {id}} 替换为会话 ID。
 *
 * <p>PDF 由<b>后端</b>渲染（openhtmltopdf + 内嵌 Noto Sans SC 子集），
 * 前端只负责把二进制存成文件 —— 2026-10-10 起，前端 html2canvas + jsPDF
 * 那套光栅化方案已整体移除，别再往回加。</p>
 */
export const REPORT_PDF_PATH = 'chat/session/{id}/report.pdf';
