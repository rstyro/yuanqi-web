/**
 * AI 命理推演的接口路径常量。
 *
 * <p>单独拆一个文件，是为了让 {@code vite.config.ts} 的代理配置和前端请求代码
 * 能指向同一个字符串 —— 代理挂了但代码改了路径，是最难查的一类联调问题。
 */

/** 推演接口路径（相对于 VITE_AI_API_BASE） */
export const SSE_ASK_PATH = 'graph/ask';
