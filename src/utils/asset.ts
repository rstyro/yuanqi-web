/**
 * 静态文件地址拼接。
 *
 * <h3>为什么需要它</h3>
 * 后端的 `upload.pre`（`admin.common.upload.pre`）**在代码里根本没被用到** ——
 * `UserServiceImpl#updateUserAvatar` 落库与返回的都是 `/show/avatar/xxx.png`
 * 这种**相对路径**（同一个 `ShowController` 的 `@RequestMapping("/show")` 提供读取）。
 * 直接把相对路径塞进 `<img src>`，浏览器会去**前端站点**找这张图（找不到 → 裂图），
 * 而不是去后端。所以展示前必须拼上后端地址。
 *
 * <p>另外用户也可能压根没传过头像，或者 `avatarUrl` 存的是一个外链
 * （后端 `UserAvatarDto` 允许直接给 `avatarUrl` 让它去下载）——
 * 这两种都得以原样用。
 */

/** 后端根地址，去掉尾部斜杠便于拼接。取不到时回落到同源 `''` */
const FILE_BASE = String(import.meta.env.VITE_API_BASE_URL || '/').replace(/\/+$/, '');

/**
 * 把后端给的图片/文件地址转成浏览器可直接用的 URL。
 *
 * @param path 后端返回的地址。可能是相对路径 `/show/avatar/a.png`、绝对 URL、data URI
 * @returns 可直接用于 `src` 的地址；传空返回空串（调用方据此回落到默认图）
 */
export function resolveFileUrl(path?: string | null): string {
    if (!path) return '';
    const raw = String(path).trim();
    if (!raw) return '';
    // 已经是完整地址（http/https、协议相对、内联数据、blob）就别再拼前缀
    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) {
        return raw;
    }
    return `${FILE_BASE}/${raw.replace(/^\/+/, '')}`;
}
