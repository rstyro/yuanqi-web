import {defineStore} from "pinia";

export const useMainStore = defineStore('main', {
    state: () => {
        return {
            theme: true
        }
    },
    /**
     * 持久化。插件是 pinia-plugin-persistedstate（在 main.ts 里注册）。
     *
     * <p>迁移自已废弃的 pinia-plugin-persist：那个包的 peer 声明是
     * {@code pinia@^2.0.0}，而本项目用的是 pinia 3，一直是 peer 不满足的状态。
     *
     * <p>三处对应关系：{@code enabled + strategies[]} → 直接一个对象（新插件按 store
     * 配置，不再有 strategies 这一层）；{@code paths} → {@code pick}；
     * 存储与 key 名字不变。
     *
     * <p><b>key 沿用 'theme_store' 是刻意的</b>：新旧插件写进去的都是
     * 「state 子集的 JSON 明文」（旧插件是 JSON.stringify(pick(state))，
     * 新插件默认序列化器同理），因此老用户浏览器里已经存着的偏好能直接读回来，
     * 不需要写迁移脚本。
     */
    persist: {
        // 默认值是 store.$id（'main'），显式写出来才和迁移前一致
        key: 'theme_store',
        // 新插件的默认存储就是 localStorage，写明是为了不让上游改默认值时行为悄悄变
        storage: localStorage,
        // 旧插件的 paths，在新插件里改名了
        pick: ['theme'],
    },
    getters: {
        getTheme(state) {
            return state.theme;
        }
    },
    actions: {
        changeTheme(str:boolean){
            this.theme = str     //action通过this操作state的数据
        }
    }
})
