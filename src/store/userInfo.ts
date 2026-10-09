import {defineStore} from "pinia";

// 定义明确的用户信息接口
interface UserInfo {
    token: string;
    uid: string;
    /**
     * 昵称，仅用于界面展示（Header 上的用户名）。
     *
     * <p>可选：老用户 localStorage 里存的对象没有这个字段，读回来是 undefined。
     * 别把它当成「一定有」来用，展示处要有兜底文案。
     */
    nickName?: string;
    // 可根据实际需求添加更多字段，如 username, avatar 等
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
    },
});
