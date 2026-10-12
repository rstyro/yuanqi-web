// 导入 defineConfig 函数，用于定义 Vite 配置
import {defineConfig} from 'vite'
// 导入 Vue 插件，用于支持 Vue 项目
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import {ElementPlusResolver} from 'unplugin-vue-components/resolvers'
import {fileURLToPath, URL} from 'url'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'


// 使用 defineConfig 定义 Vite配置: https://vitejs.dev/config/
export default defineConfig({
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
            // AI 命理推演的 SSE 接口打到本机 8800（metaphysics-admin）。
            // 2026-10-09 起该能力已从独立服务 metaphysics-ai-fortune（:8801）
            // 并入 admin 单体，接口路径 /graph/** 未变，只有端口从 8801 变 8800。
            // 后端没配 CORS，所以只能走同源代理，前端才敢写相对路径。
            // 这里的 '/graph' 必须和 src/api/module/fortune/constants.ts 里的
            // SSE_ASK_PATH 对得上；改了一处忘了另一处，症状是 404 而不是报错。
            //
            // SSE 不需要额外配置：http-proxy 对流式响应是边收边转的，
            // 不会攒到响应结束才发给浏览器。若将来发现「报告一次性蹦出来」，
            // 先怀疑中间多了一层压缩代理，而不是这里。
            '/graph': {
                target: 'http://127.0.0.1:8800',
                changeOrigin: true,
                // SSE 是长连接，别让代理提前超时断流
                timeout: 0,
                proxyTimeout: 0,
            },
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

})
