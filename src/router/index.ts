import {createRouter, createWebHashHistory, RouteRecordRaw} from 'vue-router'

// 定义路由下的 meta 类型
declare module 'vue-router'{
    interface RouteMeta{
        title:string
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
