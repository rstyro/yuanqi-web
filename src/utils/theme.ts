/**
 * 主题（明亮 / 暗黑）切换。
 *
 * <h3>为什么要有这个文件</h3>
 * 原先这段逻辑写在 {@code components/Header.vue} 里：切换开关和「应用主题」是同一个
 * 组件的两块代码。后果是<b>只有 Header 挂载了，主题才会被应用</b> ——
 * 首页 {@code views/index.vue} 没有 Header，于是从暗色状态直接进首页会闪一下亮色。
 *
 * 现在把「应用」抽到这里，由 {@code App.vue} 在挂载时统一调用一次、并订阅 store 变化，
 * 与页面上有没有 Header 无关。Header 只负责改 store。
 *
 * <h3>三处落点，缺一不可</h3>
 * <ul>
 *   <li>{@code html.dark} —— Element Plus 的暗色 CSS 变量挂在这个类上，
 *       同时 {@code assets/css/theme.css} 的自定义令牌也认它；</li>
 *   <li>{@code #app[data-theme]} —— 项目原有约定，
 *       {@code views/bazi/home.vue} 等旧页面的暗色样式还挂在
 *       {@code #app[data-theme='dark']} 上，不能丢；</li>
 *   <li>{@code localStorage} —— 刷新后要保持，且 {@code index.html} 里的内联脚本
 *       靠它做首屏防闪烁。</li>
 * </ul>
 */
import {useMainStore} from "@/store";

/**
 * 防闪烁用的存储键。
 *
 * <p>刻意<b>不复用</b> pinia 持久化的 {@code theme_store}：那是插件按自己的格式
 * （可能是 {@code {theme:true}}，也可能是 {@code {state:{theme:true}}}）写进去的，
 * 内联脚本去解析它等于把插件的内部格式当成契约。这里另存一个只有自己读写的键，
 * 值就是 {@code 'light'} / {@code 'dark'} 两个字符串。
 */
export const THEME_STORAGE_KEY = 'yuanqi.theme';

/** 应用主题。light = true 是明亮态（本项目默认）。 */
export function applyTheme(light: boolean): void {
  const root = document.documentElement;

  // Element Plus + 自定义 CSS 变量
  root.classList.toggle('dark', !light);
  // 让浏览器原生控件（滚动条、表单、日期选择器）也跟着变
  root.style.colorScheme = light ? 'light' : 'dark';

  // 项目原有约定，旧页面的暗色样式依赖它
  const app = document.getElementById('app');
  if (app) {
    app.setAttribute('data-theme', light ? 'light' : 'dark');
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, light ? 'light' : 'dark');
  } catch {
    // 隐私模式下 localStorage 可能不可写。持久化失败不该让页面挂掉。
  }
}

/** 读 store 里的主题偏好。store.theme: true = 明亮。 */
export function useTheme() {
  const store = useMainStore();
  return {
    isLight: () => store.theme,
    setLight: (light: boolean) => {
      store.theme = light;
    },
    toggle: () => {
      store.theme = !store.theme;
    },
  };
}
