### 一、前端项目构建
- 前端的项目大致技术栈：Vite、vue3、TypeScript
- 前提条件需要安装node.js，Node.js版本：`20.18.0`
- 全局安装vite命令 ：`npm install -g vite`
- 我们需要创建一个Vite 的Vue项目
- 执行命令：`npm init vite@latest` .
- 然后按照提示选择：输入项目名称和模板类型与脚本语言
- 如下图所示

![](initCode.png)

- 然后按照提示，npm安装依赖，命令如下：

```bash
# 进入项目根目录
cd poetry

# 安装初始化依赖
npm install

# 运行项目
npm run dev
```
- 运行成功，没报错，说明项目初始化完成。
- 接下来继续安装我们项目所需要的其他依赖

#### 1、配置scss的公共变量

- 首先安装sass,命令：`npm install sass-loader sass -D`
- 比如我们现在在 `src/assets/css/`下新建一个 公共变量的文件：`style.scss`
- 然后需要在 `vite.config.ts` 配置如下：

```
// https://vitejs.dev/config/
export default defineConfig({
    css:{
        preprocessorOptions:{
            scss: {
                additionalData: `@import "@/assets/css/style.scss";`
            }
        }
    }

})
```
- 然后 style.scss 就定义几个变量，如下：

```
/*导航菜单背景颜色*/
$bgColor: #f5f5f5;
/*导航背景高度*/
$headerH: 90px;
/*主体宽度*/
$mainWidth: 1200px;
```
- 然后即可在页面中的`<style>`块中使用这几个变量，不需要export。

#### 2、引入Element-UI组件
- 这里我们选择按需引入,的自动导入
- 安装依赖：`npm install -D unplugin-vue-components unplugin-auto-import`
- 安装Element-ui 组件命令：`npm install element-plus -S`
- 配置 自动导入 在文件：`vite.config.ts`,添加如下内容

```js
import { defineConfig } from 'vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  // ...
  plugins: [
    // ...
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
})

```

- 保存，然后启动就可以在页面中使用 Element-UI了。
- 但是咧，不能使用图标，图标要另外安装
- 安装命令：`npm install @element-plus/icons-vue -S`
- 图标我们也是按需引入，所以还要额外在安装依赖：`npm install -D unplugin-icons`
- 然后在文件：`vite.config.ts` 最终的配置如下：

```

import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import {ElementPlusResolver} from 'unplugin-vue-components/resolvers'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        AutoImport({
            resolvers: [
                // 自动导入 Element Plus 组件
                ElementPlusResolver(),
                // 自动导入图标组件
                IconsResolver({
                    prefix: 'Icon',
                }),
            ],
        }),
        Components({
            resolvers: [
                //自动导入 Element Plus 组件
                ElementPlusResolver(),
                // 自动注册图标组件
                IconsResolver({
                    enabledCollections: ['ep'],
                }),
            ],
        }),
        // 让unplugin-icons自动安装图标库
        Icons({
            autoInstall: true,
        }),
    ]
})

```

- 最终在页面的使用方式如下：

```
<i-ep-add-location />

<i-ep-search />

<el-button @click="handleClick">
	<template #icon><i-ep-search /></template>搜索
</el-button>

<el-button class="btn-search">
	<el-icon class="el-icon--left"><i-ep-search /></el-icon>搜索
</el-button>
```




#### 3、配置页面路由
- 需要安装路由依赖
- 执行安装路由命令： `npm install vue-router -S`
- 然后在`src`下新建一个 `router`目录
- 然后在router目录下新建一个 `index.ts`,配置路由信息
- 在 `/router/index.ts`下，编辑路由，代码如下：

```js
import {createRouter, createWebHashHistory, RouteRecordRaw} from 'vue-router'

 //主路由模块容器
const routes:Array<RouteRecordRaw> = [    
    {
        path: '/',
        redirect: '/index',
    },
    {
        path: '/index',
        name: 'index',
        component: () => import("../views/index.vue")
    }

]

// 创建路由，默认选择 history
const router = createRouter({
    history: createWebHashHistory(),
    routes
})

// 暴露出去
export default router
```

- 其中如上面的 `../` 这种也可以替换成`@`,但是需要在 `vite.config.ts` 配置一下
- 如下：

```js

// 引入 方法
import {fileURLToPath,URL} from 'url'

// 配置  resolve 的别名 
export default defineConfig({
  
  resolve: {
    alias: {
      // @ 就代表 ./src 下面的
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    }
  }
})
```

- 然后在`main.ts`中就可以引入使用了

```
import router from "./router";

//use(router) 使用路由，然后在需要掉转路由的地方，写<router-view/> 即可
createApp(App).use(router).mount('#app')

```

- 如果新增路由页面，编辑：`/src/router/index.ts` 文件即可。

**3.1、配置页面的一个加载进度条特效**

- 首先我们新建一个 加载特效的页面 LoadingBar.vue
- 内容如下：

```
<template>
    <div class="warps">
        <div ref="bar" class="bar"></div>
    </div>
</template>

<script setup lang="ts">
    import {ref} from 'vue';

    // 进度条百分比
    const speed = ref<number>(1);
    // 指向进度条元素
    const bar = ref<HTMLElement>();
    //任务ID
    const taskId = ref<number>(1);

    const  start=()=>{
        let dom = bar.value as HTMLDivElement;
        dom.style.opacity="1";
        speed.value=1;
        taskId.value = window.requestAnimationFrame(function fn(){
            if(speed.value<90){
                speed.value+=1;
                dom.style.width=speed.value+"%";
                // 递归
                taskId.value=window.requestAnimationFrame(fn);
            }else {
                speed.value=1;
                window.cancelAnimationFrame(taskId.value);
            }
        })
    }
    const  end=()=>{
        let dom = bar.value as HTMLDivElement;
        setTimeout(()=>{
            window.requestAnimationFrame(()=>{
                speed.value=100;
                dom.style.width=speed.value+"%";
            })
        },300);

        // 最终隐藏进度条
        setTimeout(()=>{
            dom.style.opacity="0";
        },600);

    }
    // 暴露出去
    defineExpose({
        start,
        end
    })
</script>

<style scoped lang="scss">
    .warps{
      position: fixed;
      top:0px;
      height: 2px;
      width: 100%;

      .bar{
        height: inherit;
        width: 0px;
        background: #00ff05;
      }
    }
</style>

```
> 内容参考自 B站大佬：小满zs 
> 

- 然后我们配置一下前置和后置路由，如下配置：

```
import {createVNode,render } from 'vue'
import LoadingBar from '@/components/LoadingBar.vue';

const vNode = createVNode(LoadingBar);
render(vNode,document.body);

// 路由前置拦截器
router.beforeEach((to:RouteLocationNormalized, from:RouteLocationNormalized, next:NavigationGuardNext) => {
    vNode.component?.exposed.start();
    if(to.path==="/search" && to.query.q){
        // 把搜索的内容变成标题
        document.title=to.query.q;
    }
    next();
})

// 路由后置拦截器
router.afterEach((to:RouteLocationNormalized, from:RouteLocationNormalized) => {
    vNode.component?.exposed.end();
})
```


**3.2、配置路由的过度特效**
- 学习内容也来着 `B站大佬：小满zs` 前端知识我看到有用的就学 (抄，是不是不太好听，哈哈)。
- 废话不多说,我们使用到的特效来自 animate.css 库，所以我们需要安装一下依赖
- 安装依赖命令： `npm install animate.css -S`
- 打开我们的路由页面：`router/index.ts` 在每个路由的 meta下面添加transition
- 在其中写入你需要特效的class类名，可以在：[https://animate.style/](https://animate.style/)找到你需要的特效类名
- 例如：

```
{
    path: '/index',
    name: 'index',
    component: () => import("@/views/index.vue"),
    meta:{
        title:"首页",
        transition:'animate__lightSpeedInRight'
    }
}
```

- 然后再App.vue的 `router-view`标签修改如下内容：

```
<router-view #default="{route,Component}">
    <transition :enter-active-class="`animate__animated ${route.meta.transition}`">

    </transition>
</router-view>
```
- 并引入animate.css ：`import 'animate.css'`

#### 4、配置接口请求
- 需要安装 axios 依赖

```bash
# axios api请求需要
npm install axios -S
```

- 安装之后我们还要配置一个环境变量。
- 主要是为了区分开发环境与测试生产环境的不同api请求地址
- 在src同级目录下，新建一个 `.env` 和`.env.dev` 文件。
- 其中`.env`是所有环境都可以使用，而`.env.dev`一般代表着开发环境的变量。
- 在`.env.dev`文件写入：`VITE_API_BASE_URL=http://localhost:8080/`
- 然后我们在`package.json`的启动脚本dev位置，添加：`--mode dev`,代表开发环境变量

```
"scripts": {
    "dev": "vite --mode dev",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview"
}
```

- 我这里只添加了开发环境，可自行添加测试环境和生产环境的文件与配置。
- 环境变量也配置好了，我们就可以二次封装axios,方便我们请求接口。
- 在src下新建一个api文件夹，然后在api文件夹下新建 `index.ts`文件，该文件就是我们要封装的axios了，内容如下，不过多介绍，直接看注释，前端大佬应该随便开得懂

```
import axios, {AxiosRequestConfig, AxiosResponse} from "axios";

// axios 配置
const config: AxiosRequestConfig = {
    baseURL: import.meta.env.VITE_API_BASE_URL,
    // 定义请求超时时间
    timeout: 60000,
    // 请求带上 cookie
    withCredentials: true,
    // 定义消息头
    headers: {
        "Content-Type": "application/json; charset=utf-8",
    }
}
// 创建 axios 实例
const http = axios.create(config);


// 定义请求拦截
http.interceptors.request.use(
    (config:AxiosRequestConfig) => {
        return config;
    },
    (error) => {
        ElMessage.error('请求失败，请检查你的参数!');
        Promise.reject(error);
    }
)

// 请求返回拦截
http.interceptors.response.use(
    (response:AxiosResponse) => {
        const res = response.data;
        // 响应数据
        return res;
    },
    (error) => {
        return Promise.reject(error);
    }
)

// 暴露出去
export default http;
```
- 可以看到我们的 `AxiosRequestConfig` 里面的`baseURL` 就用到了我们的环境变量了
- 然后我们就可以不同的环境配置不同的 api接口了，接下来配置接口
- 在api目录下，新建一个module目录用来存放我们不同模块的api接口
- 我们在module新建一个`search.ts` 用来存放搜索相关的接口。简单内容如下：

```
import http from "../index";

// 搜索
export const getSearchList =(dto:any)=>{
    return http.post('search/list',dto)
}
```
- 自此接口就配置好了。
- 自此前端的基本脚手架都搭建好了，接下来就是优化方面的了。

