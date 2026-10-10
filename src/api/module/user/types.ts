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

/**
 * {@code GET /user/getUserInfo} 的 {@code data}。
 *
 * <p>注意是**包了一层**的：真正的用户信息在 {@code data.userInfo} 里，
 * 不是 {@code data} 本身（见后端 {@code UserController#getUserInfo} 往 Map 里塞了两个键）。
 */
export interface UserInfoEnvelope {
  userInfo: MiniUserVo | null;
  /** 未读消息数，与个人资料无关，暂未使用 */
  unReadCount?: number;
}

/**
 * {@code POST /user/updateUserInfo} 的入参，对应后端 {@code UserInfoDto}。
 *
 * <p>⚠️ 后端是用 {@code setIfNotNull} 逐字段落库的，而那里的判据是
 * {@code value != null && !ObjectUtils.isEmpty(value)} —— 也就是说
 * **空字符串与 null 都会被跳过**。所以「把签名清空」这种操作保存后**不会生效**
 * （旧值原样留在库里），UI 上要有对应的提示，别让用户以为保存失败了。
 *
 * <p>⚠️ {@code email} 是登录账号（后端拿它当用户名），改它等于换账号，
 * 个人资料页刻意**不提供**修改入口。
 * <p>⚠️ {@code birthday} 的时间格式必须是 {@code yyyy-MM-dd HH:mm:ss} ——
 * 后端 {@code JacksonConfig} 给 {@code LocalDateTime} 挂的就是这个 pattern，
 * 传 {@code 1992-06-20} 这种纯日期会反序列化失败。
 */
export interface UserInfoDto {
  nickName?: string;
  avatarUrl?: string;
  /** 1=男 2=女 0=未知 */
  sex?: number;
  signature?: string;
  city?: string;
  province?: string;
  country?: string;
  phone?: string;
  /** 格式固定 {@code yyyy-MM-dd HH:mm:ss} */
  birthday?: string;
}

