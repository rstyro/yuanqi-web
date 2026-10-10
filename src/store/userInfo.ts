import {defineStore} from "pinia";

// 定义明确的用户信息接口
export interface UserInfo {
    token: string;
    uid: string;
    /**
     * 昵称，仅用于界面展示（Header 上的用户名）。
     *
     * <p>可选：老用户 localStorage 里存的对象没有这个字段，读回来是 undefined。
     * 别把它当成「一定有」来用，展示处要有兜底文案。
     */
    nickName?: string;
    /**
     * 头像地址。**可能是相对路径**（形如 `/show/avatar/xxx.png`，
     * 后端上传接口存的就是这种），展示前必须过 `utils/asset.ts#resolveFileUrl`。
     *
     * <p>可选：老登录态里没有这个字段 —— 此时 Header 回落到本地默认头像。
     */
    avatarUrl?: string;
    /** 1=男 2=女 0=未知 */
    sex?: number;
    /** 个性签名 */
    signature?: string;
    email?: string;
    phone?: string;
    /** 生日，后端格式固定 `yyyy-MM-dd HH:mm:ss` */
    birthday?: string;
    city?: string;
    province?: string;
    country?: string;
}

interface UserState {
    userInfo: UserInfo | null;
}


export const useUserInfoStore = defineStore('userInfo', {
    state: (): UserState => ({
        userInfo: null,
    }),
    persist: {
        // 与迁移前的 key 保持一致，老用户已存的登录态能直接读回来
        key: 'userInfoStore',
        storage: localStorage,
        pick: ['userInfo'], // 明确声明要持久化的字段（旧插件里叫 paths）
    },
    actions: {
        setUserInfo(info: UserInfo | null) {
            this.userInfo = info;
        },
        /**
         * 局部更新用户信息。
         *
         * <h3>为什么不是直接 `this.userInfo.xxx = yyy`</h3>
         * 一是 token / uid 不能被覆盖掉（它们只在登录那一刻有值），
         * 二是没登录时 `userInfo` 是 null，直接写字段会抛 TypeError。
         *
         * <p>注意**不做 undefined 过滤**：调用方传 undefined 就是「不动这个字段」，
         * 传空字符串才是「置空」。是否需要过滤由调用方决定 ——
         * 从后端全量回灌时用 {@link setUserInfo}，局部改动用本方法。
         */
        patchUserInfo(patch: Partial<UserInfo>) {
            if (!this.userInfo) return;
            this.userInfo = {...this.userInfo, ...patch};
        },
        // 添加一个清晰的登出操作，用于清除用户信息
        clearUserInfo() {
            this.userInfo = null;
        },
    },
    getters: {
        // 添加getters便于组件中获取具体的用户信息
        isLoggedIn: (state) => !!state.userInfo?.token,
        getToken: (state) => state.userInfo?.token || '',
        getUid: (state) => state.userInfo?.uid || '',
        getNickName: (state) => state.userInfo?.nickName || '',
        /** 原始头像地址（可能是相对路径），**不要直接塞给 <img>** */
        getAvatarUrl: (state) => state.userInfo?.avatarUrl || '',
    },
});
