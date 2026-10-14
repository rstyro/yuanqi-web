// 导入 defineConfig 函数，用于定义 Vite 配置
import {defineConfig, loadEnv} from 'vite'
// 导入 Vue 插件，用于支持 Vue 项目
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import {ElementPlusResolver} from 'unplugin-vue-components/resolvers'
import {fileURLToPath, URL} from 'url'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'


// 使用 defineConfig 定义 Vite配置: https://vitejs.dev/config/
export default defineConfig(({mode}) => {
    // 开发态后端地址（metaphysics-admin，本机 8800）。
    // 只有 vite 进程读这个文件，不会打进前端产物，所以没有 VITE_ 前缀
    // （加了反而会被内联进 bundle 暴露内网地址）。留空时用下面的默认值。
    // process.cwd() 是 Node.js 的一个方法，返回当前 Node 进程启动时所在的目录（
    const env = loadEnv(mode, process.cwd(), '')
    const proxyTarget = env.DEV_PROXY_TARGET || 'http://127.0.0.1:8800'

    return {
    define: {
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false)
    },
    base:'/yuanqi-web/',
    plugins: [
        vue(),
        AutoImport({
            resolvers: [
                ElementPlusResolver(),
                // 自动导入图标组件
                IconsResolver({
                    prefix: 'Icon',
                }),
            ],
        }),
        Components({
            resolvers: [
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
    ],
    server: {
        proxy: {
            // 开发态所有后端请求都走同源代理（.env.dev 里两个 BASE 都是 '/'）。
            // 后端没配 CORS，之前的 axios 直连 127.0.0.1:8800 其实一直在裸奔跨域；
            // 现在 JSON、SSE、静态文件（头像 /show）统一走这里，和线上网关行为一致。
            //
            // 这些前缀必须覆盖 src 里所有请求路径的第一段：
            //   /graph  SSE 推演（对应 fortune/constants.ts 的 SSE_ASK_PATH）
            //   /chat   历史会话与详细报告（history.ts / report.ts，含 PDF）
            //   /user   登录、注册、用户信息
            //   /home   排盘（home/pillarData 等）
            //   /search 搜索
            //   /region 行政区数据（首页/排盘页的地区下拉）
            //   /show   头像等静态文件（utils/asset.ts 拼 BASE 后指向这里）
            // 漏一个前缀的症状是 404 而不是报错，新增接口前缀时记得回来加。
            //
            // SSE 不需要额外配置：http-proxy 对流式响应是边收边转的，
            // 不会攒到响应结束才发给浏览器。若将来发现「报告一次性蹦出来」，
            // 先怀疑中间多了一层压缩代理，而不是这里。
            // /graph 与其它前缀是同一个后端，只是长连接要单独放宽超时。
            '/graph': {
                target: proxyTarget,
                changeOrigin: true,
                // SSE 是长连接，别让代理提前超时断流
                timeout: 0,
                proxyTimeout: 0,
            },
            '/chat': {target: proxyTarget, changeOrigin: true},
            '/user': {target: proxyTarget, changeOrigin: true},
            '/home': {target: proxyTarget, changeOrigin: true},
            '/search': {target: proxyTarget, changeOrigin: true},
            '/region': {target: proxyTarget, changeOrigin: true},
            '/show': {target: proxyTarget, changeOrigin: true},
        },
    },
    resolve: {
        alias: {
            // @ 就代表 ./src 下面的
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        }
    },
    css:{
        preprocessorOptions:{
            scss: {
                api: 'modern-compiler',
                /**
                 * 把全局变量（$headerH / $mainWidth / $mainPad）和 main-container mixin
                 * 预置进每个 scss 编译单元，组件里才能直接引到，不必逐个 @use。
                 *
                 * <p><b>必须是函数、并且跳过 style.scss 自身</b>：这个文件本身就是变量库，
                 * 若连它也注入一句「@use 自己」，sass 会直接抛
                 * `Module loop: this module is already being loaded`，全站样式编译失败。
                 * 这个坑之前一直被 vite 的编译缓存盖着（style.scss 长期没动过，
                 * 缓存里还是好的），一旦改动它就暴露。
                 *
                 * <p>注入串末尾的换行别去掉：字符串是直接拼在文件内容前的，
                 * 少了它，`@use ...;` 会和文件第一行黏成同一行。
                 */
                additionalData: (content: string, filePath: string) => {
                    const normalized = filePath.replace(/\\/g, '/');
                    if (normalized.endsWith('assets/css/style.scss')) return content;
                    return `@use "@/assets/css/style.scss" as *;\n${content}`;
                },
            }
        }
    }
    }
})
