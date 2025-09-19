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
