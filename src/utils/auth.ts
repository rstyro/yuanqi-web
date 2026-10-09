/**
 * 登录态：判定「后端说需要登录」以及统一跳转。
 *
 * <h3>为什么要抽一个文件</h3>
 * 「需要登录」这个信号会从三条完全不同的链路回来，判据和善后动作都必须一致：
 * <ol>
 *   <li>{@code src/api/index.ts} 的 axios 响应拦截器 —— 普通 JSON 接口；</li>
 *   <li>{@code src/api/module/fortune/index.ts} 的原生 fetch —— SSE 拿不到 axios 的拦截器；</li>
 *   <li>路由守卫（{@code src/main.ts}）—— 进页面之前就拦掉，省一次注定失败的请求。</li>
 * </ol>
 * 三处各写一份判定，迟早会出现「有一处漏认了某个 code」的诡异现象。
 *
 * <h3>后端「未登录」的两种表达（都要认）</h3>
 * <table border="1">
 *   <caption>判据来源</caption>
 *   <tr><th>路径</th><th>HTTP</th><th>响应体</th></tr>
 *   <tr>
 *     <td>{@code /graph/**}</td><td><b>401</b></td>
 *     <td>{@code {"code":40001,"msg":"用户未登录或登录已过期"}}</td>
 *   </tr>
 *   <tr>
 *     <td>{@code /user/**}</td><td>200</td>
 *     <td>{@code {"code":40001,...}}（走全局异常处理器）</td>
 *   </tr>
 * </table>
 * 前者是 {@code LoginIntercept} 自己写的（见后端 {@code SecurityCommonConfig#userPaths}），
 * 后者是 {@code ServiceException} 经 {@code GlobalExceptionHandler} 出来的。
 * 之所以要对齐成一个判据，是因为前端不该关心「这个接口属于哪一套闸门」。
 */
import router from '@/router';
import {useUserInfoStore} from '@/store/userInfo';
import type {LocationQueryValue} from 'vue-router';

/** {@code ApiResultEnum.MINI_USER_NO_LOGIN_OR_EXPIRED} —— 用户未登录或登录已过期 */
export const CODE_USER_NO_LOGIN = 40001;

/** {@code ApiResultEnum.TOKEN_USER_INVALID} —— Token 过期或用户未登录 */
export const CODE_TOKEN_INVALID = 20005;

/** {@code /graph/**} 的登录闸门直接回 401，不会再给 200 信封 */
export const HTTP_UNAUTHORIZED = 401;

/** 登录页路径。只有一处定义，免得「守卫跳这个、拦截器跳那个」 */
export const LOGIN_PATH = '/login';

/** 注册页路径 */
export const REGISTER_PATH = '/register';

/** 登录 / 注册成功后默认去哪（AI 推演是被闸门拦下的那一页，登完直接去用） */
export const DEFAULT_REDIRECT = '/fortune';

/**
 * 解析「登录成功后回到哪」。
 *
 * <p>放在这里而不是各自写在页面里：登录页与注册页都要用，
 * 而且这条判据是**安全相关**的 —— 两处各写一份迟早有一处会漏掉检查。
 *
 * <p>只接受站内绝对路径。`redirect` 来自 URL 查询参数，直接喂给
 * `router.replace` 等于把一个开放重定向塞进自己的页面：
 * `?redirect=https://evil.com` 就会在「登录成功」的旗号下把用户送出去。
 * 所以拒绝 `//` 开头（协议相对 URL）与非 `/` 开头的一切。
 *
 * @param raw 路由 query 里的 redirect，可能是数组（`?redirect=a&redirect=b`）
 * @param fallback 没有合法 redirect 时的落点
 */
export function resolveRedirect(raw: LocationQueryValue | LocationQueryValue[] | undefined, fallback: string = DEFAULT_REDIRECT): string {
  const target = Array.isArray(raw) ? raw[0] : raw;
  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) {
    return target;
  }
  return fallback;
}

/**
 * 未登录 / 登录过期。
 *
 * <p>用独立的错误类型而不是普通 {@code Error}：调用方要能一眼区分
 * 「需要登录（该跳登录页）」和「网络断了 / 服务 500（该原地报错）」。
 * 判断字符串消息里的关键字是行不通的 —— 后端文案改一个字就失效。
 */
export class NeedLoginError extends Error {
  constructor(message = '登录状态已过期，请重新登录') {
    super(message);
    this.name = 'NeedLoginError';
  }
}

/**
 * HTTP 状态码与业务码任一命中，即认为「需要登录」。
 *
 * @param status HTTP 状态码。网络层没拿到响应时为 undefined
 * @param code   响应体里的业务码。响应体不是那个信封时为 undefined
 */
export function isNeedLogin(status?: number, code?: number): boolean {
  return status === HTTP_UNAUTHORIZED
      || code === CODE_USER_NO_LOGIN
      || code === CODE_TOKEN_INVALID;
}

/**
 * 清掉本地登录态并跳到登录页，登录成功后回到原来的位置。
 *
 * <p>为什么带上 {@code redirect}：用户点「AI 推演」才被拦下来，
 * 登录完却把他丢回首页，等于要再点一次 —— 这类小摩擦最招人烦。
 *
 * @param redirect 登录成功后回到哪里。缺省为当前页面
 */
export function goLogin(redirect?: string): void {
  useUserInfoStore().clearUserInfo();

  const target = redirect ?? router.currentRoute.value.fullPath;

  // 已经在登录页就不要再跳 —— 否则每次请求失败都 replace 一次，
  // 把 redirect 参数也越套越乱。
  if (target.startsWith(LOGIN_PATH)) return;

  void router.replace({path: LOGIN_PATH, query: {redirect: target}});
}
