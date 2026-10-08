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
    next();
})

// 路由后置拦截器
router.afterEach((to:RouteLocationNormalized, from:RouteLocationNormalized) => {
    vNode.component?.exposed?.end();
})
