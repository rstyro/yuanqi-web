/**
 * 用户资料同步。
 *
 * <h3>为什么单独一个文件</h3>
 * 原因有两个，都不是「整齐」洁癖：
 * <ol>
 *   <li><b>登录那一刻拿不到完整资料</b>。`/user/login` 返回的 `MiniUserVo` 里
 *       昵称/头像可能是空的（老账号尤其如此），要另外调 `/user/getUserInfo` 补。</li>
 *   <li><b>不能把这段逻辑放进 `store/userInfo.ts`</b>：那个 store 被
 *       `api/index.ts` 的拦截器反向依赖（取 token），store 再去 import api 模块
 *       就形成了 import 环。<b>环在 ESM 里不报错，但会随机拿到 undefined</b>，
 *       症状是「偶尔报 useUserInfoStore is not a function」。放在这里两个方向就都成立了：
 *       utils → api → store，utils → store。</li>
 * </ol>
 *
 * <h3>调用点</h3>
 * `components/UserMenu.vue` 挂载时（登录后刷新昵称与头像）、
 * `views/profile/index.vue` 保存成功后（拿后端定稿的值回灌）。
 */
import {getUserInfo} from '@/api/module/user';
import type {MiniUserVo} from '@/api/module/user';
import {useUserInfoStore, type UserInfo} from '@/store/userInfo';

/**
 * 把后端 `MiniUserVo` 映射成 store 的形状。
 *
 * <p>`token` / `uid` 用 `??` 兜住旧值：`getUserInfo` 走「回查库」那条分支时
 * 返回的 vo 里 token 是 `StpKit.USER.getTokenValue()`，正常不会丢；但一旦丢了，
 * 把它写成空串等于**把用户登出**（`isLoggedIn` 判的就是 token 真值），代价太大。
 */
export function toUserInfo(vo: MiniUserVo, prev?: UserInfo | null): UserInfo {
    return {
        // ⚠️ userId 是字符串（后端 Long 全局 ToStringSerializer），别 Number()
        uid: vo.userId != null ? String(vo.userId) : (prev?.uid ?? ''),
        token: vo.token || prev?.token || '',
        nickName: vo.nickName,
        avatarUrl: vo.avatarUrl,
        sex: vo.sex,
        signature: vo.signature,
        email: vo.email,
        phone: vo.phone,
        birthday: vo.birthday,
        city: vo.city,
        province: vo.province,
        country: vo.country,
    };
}

/**
 * 拉一次当前登录用户资料并回灌 store。
 *
 * <p>失败时**静默忽略**：这个调用只是「让头像和昵称更新一点」，
 * 失败了 Header 依旧有本地缓存可以显示，没必要打断用户。
 * 未登录导致的 401 已经在 axios 拦截器里跳登录页了，这里再弹一次就是重复报错。
 *
 * @returns 成功时返回刷新后的资料，失败 / 未登录返回 null
 */
export async function refreshUserInfo(): Promise<UserInfo | null> {
    const store = useUserInfoStore();
    if (!store.isLoggedIn) return null;
    try {
        const res = await getUserInfo();
        // 信封形状：{ code, msg, data: { userInfo, unReadCount } }
        const vo = res?.data?.userInfo;
        if (!vo) return null;
        const next = toUserInfo(vo, store.userInfo);
        store.setUserInfo(next);
        return next;
    } catch {
        return null;
    }
}
