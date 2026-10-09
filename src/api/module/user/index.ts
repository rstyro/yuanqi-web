/**
 * 用户体系接口（登录 / 注册 / 退出 / 用户信息）。
 *
 * <p>全部走 {@code src/api/index.ts} 那个 axios 实例 —— 它们是普通 JSON 接口，
 * 不像 SSE 那样需要绕开拦截器（对比 {@code src/api/module/fortune/index.ts} 的说明）。
 *
 * <p>这些路径都在后端 {@code security.common.excludes} 白名单里，不需要登录即可调用；
 * 其余 {@code /user/**} 接口需要登录。
 */
import http from '@/api';
import type {MiniRegisterDto, MiniUserVo} from './types';

export * from './types';

/**
 * 发送邮箱验证码。
 *
 * <p>后端把验证码缓存在 Redis 里，key 由 {@code email + actionType} 拼成 ——
 * 所以这里的 {@code actionType} 必须和随后调用 {@link login} 时的值一致。
 */
export const sendEmailCode = (dto: Pick<MiniRegisterDto, 'email' | 'actionType'>) => {
  return http.post('user/sendEmail', dto);
};

/**
 * H5 登录。成功时响应体的 {@code data} 是 {@link MiniUserVo}，
 * 其中 {@code data.token} 就是用户体系（StpKit.USER）的 token。
 *
 * <p>返回值是完整的 {@code R<MiniUserVo>} 信封（axios 拦截器只剥掉了 AxiosResponse
 * 那一层，没剥信封），所以调用方要取 {@code res.data.token}。
 */
export const login = (dto: MiniRegisterDto) => {
  return http.post('user/login', dto);
};

/** H5 注册。同样返回 {@code R<MiniUserVo>}，注册即登录。 */
export const register = (dto: MiniRegisterDto) => {
  return http.post('user/register', dto);
};

/**
 * 退出登录。只清服务端的会话；本地 store 由调用方自己
 * {@code clearUserInfo()}（见 login 页与 Header 的处理）。
 */
export const logout = () => {
  return http.post('user/logout', {});
};

/** 服务端视角的「当前是否已登录」 */
export const isLogin = () => {
  return http.get('user/isLogin');
};

/**
 * 当前登录用户信息（含未读消息数）。
 *
 * <p>仅在 {@code /user/**} 的白名单之外，所以未登录调它会被拦。
 * 用来在登录状态下刷新昵称/头像。
 */
export const getUserInfo = () => {
  return http.get('user/getUserInfo');
};

export type {MiniRegisterDto, MiniUserVo};
