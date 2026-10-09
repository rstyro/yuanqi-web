/**
 * 用户体系（H5 端）接口类型。
 *
 * <p>契约以后端 {@code top.lrshuai.admin.api.UserController} +
 * {@code top.lrshuai.admin.api.vo.mini.MiniUserVo} 为准。
 */

/**
 * 登录成功后拿到的用户信息。
 *
 * <p>⚠️ {@code userId} 是**字符串**，不是 number。后端
 * {@code JacksonConfig} 给 {@code Long} 全局挂了 {@code ToStringSerializer}
 * （防 JS 精度丢失），所以 JSON 里看到的是 {@code "1234567890..."} 这样的引号串。
 * 前端把它原样存进 store 的 {@code uid}，别去 {@code Number()} 转 —— 转了才会丢精度。
 */
export interface MiniUserVo {
  userId: string;
  /** 用户体系（StpKit.USER）的 token。后续请求带 `token` 头 */
  token: string;
  nickName?: string;
  avatarUrl?: string;
  /** 1=男 2=女 0=未知 */
  sex?: number;
  signature?: string;
  city?: string;
  province?: string;
  country?: string;
  email?: string;
  phone?: string;
  /** 1=正常 2=锁定 */
  status?: number;
  birthday?: string;
}

/**
 * 登录 / 注册 / 发验证码的入参，对应后端 {@code MiniRegisterDto}。
 */
export interface MiniRegisterDto {
  /** 邮箱验证码。后端对 test / admin / 1006059906@qq.com 三个账号跳过校验 */
  code?: string;
  /** 账号（本项目就是邮箱） */
  email: string;
  password: string;
  /**
   * {@code register}=注册，{@code login}=登录。
   *
   * <p>⚠️ 「发验证码」与「登录」两次请求必须传**同一个值** ——
   * 后端拿它拼验证码的 Redis key
   * （{@code MINI_USER_EMAIL_CODE + email + actionType}），
   * 两次不一致的症状是「验证码明明发了却说验证码错误」。
   */
  actionType: 'login' | 'register';
}

/**
 * 后端对这三个账号跳过邮箱验证码校验。
 *
 * <p>与 {@code UserServiceImpl#login} 里的白名单保持一致 ——
 * 那里是 {@code StrUtil.equalsAnyIgnoreCase(email, "test", "admin", "1006059906@qq.com")}。
 * 前端用它是为了**决定要不要显示验证码输入框**，不是安全边界：
 * 真正的校验在后端，前端判错了最坏结果只是多填/少填一个框。
 */
export const CODE_FREE_ACCOUNTS: readonly string[] = ['test', 'admin', '1006059906@qq.com'];
