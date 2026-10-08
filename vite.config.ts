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
            // AI 命理推演的 SSE 接口打到本机 8801（metaphysics-ai-fortune）。
            // 后端没配 CORS，所以只能走同源代理，前端才敢写相对路径。
            // 这里的 '/graph' 必须和 src/api/module/fortune/constants.ts 里的
            // SSE_ASK_PATH 对得上；改了一处忘了另一处，症状是 404 而不是报错。
            //
            // SSE 不需要额外配置：http-proxy 对流式响应是边收边转的，
            // 不会攒到响应结束才发给浏览器。若将来发现「报告一次性蹦出来」，
            // 先怀疑中间多了一层压缩代理，而不是这里。
            '/graph': {
                target: 'http://127.0.0.1:8801',
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
                additionalData: `@use "@/assets/css/style.scss" as *;`
            }
        }
    }

})
