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
