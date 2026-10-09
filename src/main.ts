import { createApp,createVNode,render } from 'vue'
import './assets/css/reset.css';
import App from './App.vue'
import router from "./router";
import {NavigationGuardNext, RouteLocationNormalized} from "vue-router";
import LoadingBar from './components/LoadingBar.vue';
import {createPinia} from 'pinia';
// 持久化存储pinia
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import {useUserInfoStore} from '@/store/userInfo'
import {LOGIN_PATH} from '@/utils/auth'
// 暗黑模式
import 'element-plus/theme-chalk/dark/css-vars.css'
// 设计令牌（颜色 / 圆角 / 阴影 / Element Plus 变量对齐）。
// 注意：这里的先后顺序只是为了让「谁覆盖谁」读起来顺，真正保证生效的是
// theme.css 里 :root:root 的特异性写法 —— Element Plus 的样式是按需注入的，
// 到达顺序晚于本行，靠顺序压不住它。详见该文件顶部注释。
import './assets/css/theme.css'

const store = createPinia()
store.use(piniaPluginPersistedstate)

createApp(App)
    .use(store)
    .use(router)
    .use(ElementPlus, {locale: zhCn})
    .mount('#app')

const vNode = createVNode(LoadingBar);
render(vNode,document.body)
// 路由前置拦截器
router.beforeEach((to:RouteLocationNormalized, from:RouteLocationNormalized, next:NavigationGuardNext) => {
    vNode.component?.exposed?.start();
    if(to.path==="/search" && to.query.q){
        // 把搜索的内容变成标题
        document.title=to.query.q as string;
    } else if(to.meta.title){
        document.title=to.meta.title;
    }

    // 需要登录的页面（见 router/index.ts 的 RouteMeta.requiresLogin）。
    // 这里拦一道只是省掉一次注定 401 的请求、顺带把用户直接送到登录页；
    // 真正的闸门在后端，前端守卫不是安全边界。
    // 注意：pinia 已经在上面 .use(store) 装好，守卫又是运行时才跑，所以这里能取到 store。
    if (to.meta.requiresLogin && !useUserInfoStore().isLoggedIn) {
        // 用 replace 而不是 push：不把「被拦下来的那一页」塞进历史，
        // 否则用户在登录页按返回键会回到同一个页面又被拦一次，来回打转。
        next({path: LOGIN_PATH, replace: true, query: {redirect: to.fullPath}});
        return;
    }

    next();
})

// 路由后置拦截器
router.afterEach((to:RouteLocationNormalized, from:RouteLocationNormalized) => {
    vNode.component?.exposed?.end();
})
