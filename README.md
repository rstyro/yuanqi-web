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
cd yuanqi-web

# 安装初始化依赖
npm install
# 运行项目
npm run dev

# 最新推荐
# Corepack 是一个随 Node.js 分发的工具,
# 激活 Corepack 对 pnpm 命令的代理。执行后，你在命令行中输入的 pnpm 命令会被 Corepack 拦截

corepack enable pnpm

# 建议使用 corepack enable pnpm
#npm install -g pnpm

# 如果Corepack报错：Error: Cannot find matching keyid: {
# 那就是Corepack有些版本注册表签名密钥有问题，更新一下最新版本即可： npm install -g corepack@latest
pnpm install
pnpm run dev
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
                // 启用现代 API
                api: 'modern-compiler',
                // 全局引入 SCSS 文件
                additionalData: `@use "@/assets/css/style.scss" as *;`
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
/*主体宽度（除首页外所有页面的内容轴心，详见「三、5、主体宽度」）*/
$mainWidth: 1100px;
/*主体容器左右内边距（Header 与页面共用同一个值）*/
$mainPad: 24px;
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

- **配置国际化**
- Element Plus 组件 默认 使用英语
- 修改`main.ts`,添加如下内容
```ts
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

app.use(ElementPlus, {
    locale: zhCn,
})
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
      <component :is="Component"></component>
    </transition>
</router-view>
```

- 并引入animate.css ：`import 'animate.css'`
- 给Transition组件配置过渡class,`enter-active-class`为进入动画的生效状态


#### 4、状态持久化
- 在前端应用开发中，随着应用复杂度增加，组件之间共享状态变得困难。Props 逐级传递和事件回调会导致代码冗长且难以维护。
- 状态管理库提供了集中式的状态存储和管理机制，使得状态变化可预测、易于调试。
- Vuex 是 Vue 的官方状态管理库，采用集中式存储管理应用的所有组件的状态。
- **Pinia 是 Vue 官方推荐的新一代状态管理库**，具有以下优势：
  - 更简洁的 API
  - 完整的 TypeScript 支持
  - 无需复杂的模块嵌套
  - 更好的代码分割能力

##### ①、安装Pina

```bash
yarn add pinia
# 或者使用 npm
npm install pinia
```

##### ②、安装pinia-plugin-persistedstate
- `pinia-plugin-persistedstate`是提供对 Pinia store 的持久化
- 此插件与 `pinia>=2.0.0` 兼容（**旧的 `pinia-plugin-persist` 声明的是 `pinia@^2`，
  在 pinia 3 下 peer 一直不满足，所以本项目已换掉它**）
- 注意插件的 **v2 → v3 → v4 之间有破坏性改名**，照着旧文章写会静默失效：

  | 旧名字（v2） | 现名字（v3+） |
  | --- | --- |
  | `paths` | `pick` |
  | `beforeRestore` | `beforeHydrate` |
  | `afterRestore` | `afterHydrate` |

```bash
yarn add pinia-plugin-persistedstate

npm i pinia-plugin-persistedstate

pnpm add pinia-plugin-persistedstate

```

- 随后，在`main.ts`文件中引入并配置插件：

```ts
import { createApp } from 'vue'
import App from './App.vue'
import {createPinia} from 'pinia';
// 持久化存储pinia
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

const store = createPinia()
store.use(piniaPluginPersistedstate)

createApp(App)
    .use(store)
    .mount('#app')
```

##### ③、基本使用
- 假设我们需要管理用户信息userInfo，并将其持久化到本地存储中，那么就可以这样实现

```ts
import {defineStore} from "pinia";

export const useUserInfoStore = defineStore('userInfo', {
    state: () => ({
        userInfo: null as any
    }),
    persist: {
        key: 'userInfo',
        // 也可以使用sessionStorage；不写则默认 localStorage
        storage: localStorage,
        pick: ['userInfo'], // 明确声明要持久化的字段（v2 里叫 paths）
        // 自定义序列化
        serializer: {
            serialize: (state: any) => JSON.stringify(state.userInfo),
            deserialize: (str: string) => ({ userInfo: JSON.parse(str) })
        },
        // v2 里分别叫 beforeRestore / afterRestore
        beforeHydrate: (context) => {
            console.log('Before hydration...')
        },
        afterHydrate: (context) => {
            console.log('After hydration...')
        }
    } as any,
    actions: {
        setUserInfo(info: any) {
            this.userInfo = info;
        }
    }
});
```


#### 5、配置接口请求
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


#### 6、配置tsconfig.json

- 有时导入包报错：`Cannot find module ‘@/stores/modules/user‘ or its corresponding type declarations`
- 可以在`tsconfig.json` 添加配置如下：

```json
{
  "compilerOptions": {
    "baseUrl": ".",  
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### 二、对象创建复用
- ts 对象创建
- 新建：`/types/index.ts` 在文件中定义对象，使用`import { Pillar } from "@/types/bazi";` 引用具体的对象
- 可以新建一个工具类，对上面定义的对象进行初始化，如：`basiUtils.ts`

### 三、主题与设计令牌（明亮 / 暗黑）

全站颜色、圆角、阴影统一走 CSS 变量，**组件里只写 `var(--xxx)`，不写具体色值**。
换肤因此只是同一批变量在两个选择器下的两组赋值，不需要给每个组件写两遍样式。

#### 1、令牌放在哪

`src/assets/css/theme.css`，在 `main.ts` 里引入。同时覆盖了 Element Plus 的 `--el-*` 变量，
所以 `el-card` / `el-table` / `el-tag` 不用单独写覆盖样式就能跟主题一致。

```css
:root:root { /* 明亮 */ --bg: #f4f2ec; --gold: #8a6b20; }
html.dark:root { /* 暗黑 */ --bg: #12141a; --gold: #c9a65c; }
```

> **那两个 `:root:root` 不是手滑写重了。** Element Plus 的变量定义在 `:root`（特异性 0,1,0），
> 而它在本项目是按需注入的（`unplugin-vue-components` 的 `ElementPlusResolver`），
> 注入时机晚于 `main.ts` 的静态 import —— 靠加载顺序压不住，只能靠特异性。
> `:root:root` 是 (0,2,0) 稳赢 `:root`，`html.dark:root` 是 (0,2,1) 稳赢 `html.dark`。
> 改的时候别「顺手简化」成 `:root`。

#### 2、怎么切换

- 偏好存在 pinia：`useMainStore().theme`，`true` = 明亮（默认）
- 切换开关在 `src/components/Header.vue` 右上角
- **应用**主题统一由 `src/App.vue` 调 `src/utils/theme.ts` 的 `applyTheme()`，
  落在三处：`html.dark`（Element Plus 与本文件认它）、
  `#app[data-theme]`（旧页面如 `views/bazi/home.vue` 的暗色样式认它）、`localStorage`。
  放在根组件是为了覆盖没有 Header 的页面（如首页）。
- `index.html` 里有一段内联脚本做**首屏防闪烁**，它读的键是 `yuanqi.theme`，
  与 `theme.ts` 的 `THEME_STORAGE_KEY` 必须保持一致。

#### 3、AI 命理推演页

`src/views/fortune/index.vue`（路由 `/fortune`）。它把后端 `metaphysics-ai-fortune`
的 SSE 事件铺成界面，接口定义在 `src/api/module/fortune/`。

- 开发态走 `vite.config.ts` 里 `/graph` 的代理打到本机 8801，所以 `.env.dev` 的
  `VITE_AI_API_BASE` 是 `/`（后端没配 CORS，只能走同源代理）
- SSE 用原生 `fetch` + `ReadableStream` 自己解析，**不走 axios 实例** ——
  那个实例会加 `_t` 时间戳、按 `code!==200` 抛错、60s 超时，三处都和流式冲突
- 报告正文的 Markdown 由 `src/utils/markdown.ts` 渲染（自带实现，覆盖有限，见该文件注释）

#### 4、生辰八字页（排盘）

`src/views/bazi/home.vue`（路由 `/bazi`），接口定义在 `src/api/module/bazi/`。

接口是 admin 的 `POST /home/pillarData`，**数据契约以后端
`commons/common-ganzhi/docs/pillar-json-contract.md` 为准（当前 v6）**。
改任何绑定前先读那份文档 —— 这张盘的结构在 v1→v6 之间改过好几次。

**最容易踩的一处（曾经整页白屏的原因）**：柱子里的 `tianGan` / `diZhi` / `naYin`
现在只序列化**中文名字符串**（`"甲"` / `"子"` / `"海中金"`），完整属性挪到了顶层一份
`ganZhiDict`。所以不能再写 `item.tianGan.element.color` —— `"甲".element` 是 `undefined`，
再取 `.color` 会在渲染期抛 TypeError，**Vue 整棵子树渲染中断，页面一片空白且控制台之外没有提示**。
正确写法是查表：

```ts
const tianGan = (name?: string): Partial<GanZhi> =>
    name ? ganZhiDict.value.tianGan[name] ?? {} : {};   // 模板里 tianGan(item.tianGan).element?.color
```

其余易混的形状：`starLuck` / `selfStarLuck` 是 `{name}` 对象、`shenShaList` 是 `[{name}]`、
`hideGanGods` 是 `string[]` —— 三者各不相同，别记混。

**大运 / 流年**：`PillarVo.yun.luckPillarList[i].child[j]` 已删除，改成按流派分组的
`qiYunMap` / `daYunListMap`（key 是 `"1"` / `"2"`），大运是 `DaYun`、流年是 `LiuNian`。
`qiYunView.currentDaYunIndex` 是服务端算好的「当前第几步」——
**不要在前端比年份**（一步大运的真实区间可能横跨 11 个公历年，比年份会高亮错一格且看不出来）。
切流派只改 `sect`，两个流派的数据都已在本地，**不需要重新请求**。

**入参（与首页联动）**：`/bazi` 读 `route.query`：
`dateType` / `sex` / `dateTime` / `username` / `longitude` / `useTrueSolarTime` /
`withEquationOfTime` / `leapMonth`（开关类传 `'1'` 表示开）。
首页录入弹窗会把出生地经度与真太阳时开关一起带过来。
读取逻辑抽在 `applyRouteQuery()`，**`onMounted` 与 `watch(route.query)` 都会调它** ——
同路由只换 query 时 vue-router 会复用组件实例，只挂在 `onMounted` 上会停在上一份命盘。

出生地级联用 `getRegionChildren(parentCode)`（`GET /region/children`，不传即省级）。
返回项的 `longitude` 是**字符串**，用前要 `Number()`。

页头的「AI 推演」按钮会带着同一套生辰口径跳到 `/fortune`，
那边再用 `buildSeedFromQuery()` 预填成一句话（只预填、不自动发送 —— 自动发问会立刻产生一次真实的模型调用）。

##### 4.1 关系 / 格局 / 透干 / 通根：哪些是后端给的，哪些是本页推的

页面下半部分（「格局与用神」「干支关系」「透干与通根」）的数据来源必须分清，**改之前先看这张表**：

| 面板内容 | 来源 | 说明 |
|---|---|---|
| 八类合冲刑害（五合 / 六合 / 三合局 / 三会方 / 三刑 / 六冲 / 六害 / 暗合） | **后端 `mergeVo`** | 直接展示，列表项已是中文短语，别自己拆字重拼 |
| 喜用 / 忌凶五行、十神 | **后端 `lifeTime`** | `joyousElements` 是 `Element[]` 不是 `string[]` |
| 身强 / 身弱 | **后端 `lifeTime.strong`** | 派生值（`score > 50`），别在前端重复阈值 |
| 格局名 | **后端 `caput.name`** | 只有名字 |
| 半合 | 本页按标准定义推 | 后端只报「三支齐全」的三合局 |
| 天干相冲 | 本页按标准定义推 | 后端只有五合 |
| 透干 / 通根 | 本页按藏干推 | 后端不给「透没透」 |
| 取格依据 | 本页**印证**后端结论 | 见下 |

**取格依据为什么不自己算**：子平取格的正式规则是后端 `Caput` 里
`[日干][月支] → 透干 → 格局` 那张上百条的表。前端复制一份必然与后端漂移。
本页做的是「**印证**」：拿后端已给的月令藏干 / 十神 / 透出情况，
只有当透出者的十神恰好拼出后端那个格名时，才把因果说出来
（`取格依据` 左边框显示金色）；对不上就退回中性描述 ——
「皆不透则酌取其一」或「属外格」。
**这样永远不会出现「本页说的取法和接口给的格局不一致」。**

```ts
// 印证：十神 + '格' 必须等于后端给的格名，才敢展示因果
const witness = exposedHideStems.value.find(h => h.god && `${h.god}格` === caputName.value);
```

`hideGanGods` 与藏干**同序**（后端 `God.getGods` 按 List 顺序逐个映射），
所以 `hideGanGods[i]` 就是第 i 个藏干的十神，不必自己算十神。
「透出」的准确语义是**出现在四柱的天干位**（年/月/日/时干），不含藏干
（后端 `FourPillars.containsStem`）。

**身强弱量尺注意**：`lifeTime.score` 量程是 **−100 ~ +100**（按柱位加权累加，
月支占 ±40 为大头），判强弱的阈值是 **> 50**。所以刻度线上 50 那条线在 **75%** 处，
不是中点 —— 画成「过半即身强」是错的。

#### 5、主体宽度与页面轴心

**除首页外，所有页面的主体宽度统一为 `$mainWidth`（1100px）**，和 Header 内层共用同一条竖轴，
且左右内边距统一用 `$mainPad`。规则收在 `style.scss` 的 `@mixin main-container`：

```scss
.page {
  @include main-container($mainPad);   // border-box + width:100% + max-width:1100 + margin:auto + 左右 padding
  padding-top: 20px;
  padding-bottom: 64px;                // 竖向内边距自己写，横向交给 mixin
}
```

| 页面 | 容器 | 说明 |
|---|---|---|
| Header | `.header-inner` | 基准，全站对齐的参照 |
| 首页 `#/index` | `.container` | **不适用**，全屏宇宙背景，`width: 100vw` |
| 八字 `#/bazi` | `.page` | 曾为 1440px |
| AI 推演 `#/fortune` | `.content` / `.composer-inner` | 曾为 1080 / 1040，输入条必须与正文同轴 |
| 关于 `#/about` | `.main` | 内层告示卡仍限 900px（正文行不宜过长） |

**为什么要 mixin 而不是直接写 `max-width: $mainWidth`**：本项目**没有全局 `box-sizing: border-box`**
（`reset.css` / `style.css` 都没有），默认 `content-box` 下 `max-width` 只约束内容盒，
两边的 padding 会额外撑出去 —— 写 `max-width: 1100px` 配 `padding: 0 24px`，实际外框是 **1148px**，
比想约束的宽度还大，和 Header 反而对不齐。mixin 里就地声明 `box-sizing: border-box`，
不动全局（全局改会影响一批 `width + padding` 混写的老样式，如时间轴 `.tl-yun`）。

**连带约束：命盘表是流式列宽**。可用宽度只有 `1100 − 2×24 = 1052px`，
旧的「6 数据柱 × 165 + 标签列 76 = 1066px」必然溢出。现在数据柱用
`flex: 1 1 0` + `min-width: 0` 等分容器（列宽由容器决定，神煞的 `flex-wrap` 才真正生效），
`min-width`（120px / 窄屏 104px）只做「窄到不可读」的下限兜底，
触发时由 `.pillar-table` 自己的 `overflow-x` 承接 —— **页面本身不会出现横向滚动条**。

改主体宽度时记得三处一起看：`$mainWidth`、命盘表的 `min-width` 兜底、以及 `.two-col` /
`.sect-compare` 这些 `grid auto-fit` 的断点。
