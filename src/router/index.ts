import {createRouter, createWebHashHistory, RouteRecordRaw} from 'vue-router'

// 定义路由下的 meta 类型
declare module 'vue-router'{
    interface RouteMeta{
        title:string
        /**
         * 「回到顶部」按钮距视口底部的像素（App.vue 里的 el-backtop）。
         *
         * <p>留空 = 96，适用于没有吸底元素的普通长页面。
         * 页面底部有常驻条（如 AI 推理页吸底的输入区）时必须抬高，否则按钮会被它压住。
         * 该页输入区最高约 193px（窄屏 chips 行 24+10 + 输入盒约 107 + 提示约 22 +
         * 上下内边距 12/18），故取 208，留约 15px 间隙。
         *
         * <p>⚠️ 改了那个页面的 .composer 高度，这里要跟着调。
         */
        backtopBottom?:number
        /**
         * 进入该页需要「用户体系」登录（后端 StpKit.USER，即 /user/login 登进来的身份）。
         *
         * <p>守卫在 `src/main.ts` 的 beforeEach 里。这里**只是省一次注定失败的请求**，
         * 不是安全边界 —— 真正的闸门在后端（`security.common.user-paths` 里的 `/graph/**`）。
         * 别因为「守卫拦住了」就以为后端可以松掉。
         */
        requiresLogin?:boolean
    }
}

const routes:Array<RouteRecordRaw> = [     //主路由模块容器
    {
        path: '/',
        redirect: '/index',
    },
    {
        path: '/index',
        name: 'index',
        component: () => import("@/views/index.vue"),
        meta:{
            title:"玄学不玄",
            transition:'animate__zoomInDown'
        }
    },
    {
        path: '/bazi',
        name: 'bazi',
        component: () => import("@/views/bazi/home.vue"),
        meta:{
            title:"生辰八字",
            transition:'animate__fadeInUpBig'
        }
    },
    {
        path: '/fortune',
        name: 'fortune',
        component: () => import("@/views/fortune/index.vue"),
        meta:{
            title:"AI 命理推演",
            // 这一页有吸底输入区，且滚动容器是 #app。含位移的入场动画
            // （fadeInUpBig 之类）会让吸底条在动画期间看着在抖，故只用淡入。
            transition:'animate__fadeIn',
            // 把「回到顶部」抬到吸底输入区之上，见 RouteMeta 的说明
            backtopBottom: 208,
            // 后端 /graph/** 已改为必须登录（security.common.user-paths）。
            // 这里提前拦一道：不然用户打完一大段问题才被 401 挡回来，白等。
            requiresLogin: true,
        }
    },
    {
        /**
         * 登录页。
         *
         * <p>和首页一样是**全屏、不带 Header** 的独立版式（星空背景见
         * `components/AuthShell.vue`）。不带 Header 的原因有两个：
         * 一是首页也不带，两页之间切换视觉才连贯；
         * 二是登录/注册这种「半路被拦下来的落点」不该给一堆导航岔路。
         *
         * <p>刻意**不**参与 requiresLogin，也**不**做「已登录就自动跳走」——
         * 本地 token 还在但服务端会话已过期时，自动跳走会让用户彻底进不来登录页。
         */
        path: '/login',
        name: 'login',
        component: () => import("@/views/login/index.vue"),
        meta:{
            title:"登录",
            transition:'animate__fadeIn'
        }
    },
    {
        /**
         * 注册页。与登录页共用 `components/AuthShell.vue` 的全屏外壳，
         * 落点（`?redirect=`）与登录页语义一致。
         */
        path: '/register',
        name: 'register',
        component: () => import("@/views/register/index.vue"),
        meta:{
            title:"注册",
            transition:'animate__fadeIn'
        }
    },
    {
        /**
         * 个人资料页。入口在 Header 的「头像 + 昵称」下拉里（components/UserMenu.vue）。
         *
         * <p>必须 `requiresLogin`：它读的是 store 里的登录态、调的是
         * `/user/getUserInfo` 与 `/user/updateUserInfo` —— 两个接口都在
         * `security.common.excludes` 之外，未登录必 401。
         * 守卫在这里拦一道只是省掉这几次注定失败的请求。
         *
         * <p>不带 `backtopBottom`：这页是固定高度的卡片，不存在长滚动。
         */
        path: '/profile',
        name: 'profile',
        component: () => import("@/views/profile/index.vue"),
        meta:{
            title:"个人资料",
            transition:'animate__fadeIn',
            requiresLogin: true,
        }
    },
    {
        path: '/test',
        name: 'test',
        component: () => import("@/views/bazi/test.vue"),
        meta:{
            title:"测试",
            transition:'animate__fadeInUpBig'
        }
    },
    {
        path: '/search',
        name: 'search',
        component: () => import("@/views/search/index.vue"),
        // meta:{
        //     transition: 'animate__slideInUp'
        // }
    },

    {
        path: '/about',
        name: 'about',
        component: () => import("@/views/about/index.vue"),
        meta:{
            title:"关于我",
        }
    }
]
const router = createRouter({
    history: createWebHashHistory(),
    scrollBehavior:(to,from,savedPosition)=>{
        if(savedPosition){
            return savedPosition;
        }else {
            return {
                top:0
            }
        }
    },
    routes
})

export default router
