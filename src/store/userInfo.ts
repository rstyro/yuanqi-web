import {defineStore} from "pinia";

// 定义明确的用户信息接口
interface UserInfo {
    token: string;
    uid: string;
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
        key: 'userInfoStore',
        storage: localStorage,
        paths: ['userInfo'], // 明确声明要持久化的字段
    } as any,
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
    },
});
