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
import type {MiniRegisterDto, MiniUserVo, UserInfoDto, UserInfoEnvelope} from './types';

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
 *
 * <p>⚠️ 返回的信封里 {@code data} 是 {@link UserInfoEnvelope}，
 * 用户信息在 {@code data.userInfo} —— 而登录接口是直接把 {@code MiniUserVo} 放在
 * {@code data} 上的，两者形状**不一样**，别顺手抄。
 *
 * <p>登录成功后 store 里只存了 token/uid/nickName（见 views/login），
 * **头像等其余字段要在这里补**。后端优先从 Sa-Token session 里取，
 * 缺失时才回查库（{@code UserServiceImpl#getUserInfo}）。
 */
export const getUserInfo = () => {
  return http.get<UserInfoEnvelope>('user/getUserInfo');
};

/**
 * 更新当前用户的资料。
 *
 * <p>只传要改的字段即可 —— 后端 {@code setIfNotNull} 逐字段判空落库，
 * 但**空字符串也算「空」会被跳过**（想清空签名之类的操作不会生效）。
 *
 * <p>{@code nickName} 会查重，重名时后端抛
 * {@code MINI_USER_NICK_NAME_EXIST}（axios 拦截器已弹提示）。
 *
 * <p>成功后后端会刷新 Sa-Token session 里的用户信息，但**不会同步前端 store** ——
 * 调用方要自己把新值写回去（个人资料页是重新拉一次 {@link getUserInfo}）。
 */
export const updateUserInfo = (dto: UserInfoDto) => {
  return http.post<boolean>('user/updateUserInfo', dto);
};

/**
 * 上传头像，返回**新的头像地址**（形如 {@code /show/avatar/xxx.png}）。
 *
 * <p>后端这个接口没有 {@code @RequestBody}，是标准的 multipart 表单绑定
 * （{@code UserAvatarDto} 里的 {@code avatarFile} 是 {@code MultipartFile}），
 * 所以必须走 {@code FormData}、字段名只能是 {@code avatarFile}。
 *
 * <p>⚠️ 这里**不能**沿用实例默认的 {@code Content-Type: application/json}：
 * multipart 的 boundary 必须由浏览器自己生成。传 FormData 时 axios 的 xhr adapter
 * 会把 Content-Type 撤掉（{@code setContentType(false)}），所以**不要手动写死**
 * {@code multipart/form-data}（写死了反而丢掉 boundary）。这里刻意不传 headers 覆盖。
 *
 * <p>另外一个坑：地址落在服务端本地（{@code admin.common.upload.root}），
 * 返回的是**相对路径**，展示前要用 {@code utils/asset.ts#resolveFileUrl} 拼前缀。
 */
export const updateUserAvatar = (file: File) => {
  const formData = new FormData();
  formData.append('avatarFile', file, file.name);
  return http.post<string>('user/updateUserAvatar', formData);
};

export type {MiniRegisterDto, MiniUserVo, UserInfoDto, UserInfoEnvelope};
