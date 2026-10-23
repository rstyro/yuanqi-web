<template>
  <header>
    <div class="header-inner">
      <!--
        左「自由区」：品牌（logo + 站名）。
        它**脱离文档流**（绝对定位），不参与内容轴的居中计算 ——
        待在外侧这块放宽出来的空间里。以后想在这里加东西（版本号、公告入口……）
        直接塞进来即可，中间的菜单仍然贴着正文左边界。
      -->
      <div class="hd-left">
        <RouterLink class="brand" :to="{name: 'index'}">
          <img class="brand-logo" :src="logoImg" alt="玄学不玄"/>
          <span class="brand-name">玄学不玄</span>
        </RouterLink>
      </div>

      <!--
        中间「内容轴」：宽度 = 正文宽度（$mainWidth），居中 ——
        于是它的左、右边界正好落在正文的左、右边界的竖线上。

        轴内从左到右：菜单 …… 头像。
        · 菜单**右对齐** —— 贴在头像那一侧的左边，与右侧控件簇连成一组，
          左边缘随字宽浮动，正文左边界一侧留白；
        · 头像（未登录时是菜单本身）是轴内**最后一个在流元素**，它的右边缘
          正好压在正文右边界上 —— 这条看不见的竖线就是内容与扩展位分界。
        主题钮 / GitHub / 以后的社交入口**不占内容轴**，它们从正文右边界起、
        往导航条放宽出来的右侧「自由区」铺开（见下方 .hd-extras）。
        （刻意不用 el-menu：它自带的 24px 字号、菜单项之间的贴合、
         以及 active 的底部横线，正是「挤」和「重」的来源。）
      -->
      <div class="hd-center">
        <nav class="nav-links">
          <RouterLink
              v-for="item in navItems"
              :key="item.name"
              class="nav-link"
              :class="{'is-active': activeIndex === item.name}"
              :to="{name: item.name}"
          >{{ item.label }}
          </RouterLink>
        </nav>

        <!--
          已登录时的「头像 + 昵称 + 下拉」。刻意不放进导航 —— 导航项都是路由，
          而「退出登录」是个动作（历史上把它当路由推过，留了一堆 No match found 警告）。
        -->
        <UserMenu v-if="userInfoStore.isLoggedIn" class="user-area"/>

        <!--
          右侧「扩展位」：越过正文右边界，落在导航条放宽出来的右侧自由区。
          主题钮、GitHub 都在这儿；以后加微博 / 邮箱 / 语言切换等社交入口，
          直接往这个容器里塞即可 —— 宽度自适应，不用动内容轴的对齐。
        -->
        <div class="hd-extras">
          <button
              class="icon-btn theme-btn"
              type="button"
              :title="data.theme ? '切换到暗色' : '切换到明亮'"
              :aria-label="data.theme ? '切换到暗色' : '切换到明亮'"
              @click="toggleTheme"
          >
            <!-- 明亮态显示月亮（点了变暗），暗色态显示太阳，符合直觉 -->
            <el-icon><Moon v-if="data.theme"/><Sunny v-else/></el-icon>
          </button>

          <!-- GitHub 入口（扩展位）。
               原来是 index.html 里一个 80×80 的角标压住右上角，逼得主题开关
               留 96px 死区躲它；收进这一组后位置可控、也不再抢空间。 -->
          <a
              class="icon-btn github-btn"
              href="https://github.com/rstyro"
              target="_blank"
              rel="noopener noreferrer"
              title="查看源码"
              aria-label="查看源码"
          >
            <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import {computed, onMounted, reactive, watch} from 'vue';
import {useRoute} from 'vue-router';
import logoImg from '@/assets/images/logo.png';
import {Moon, Sunny} from '@element-plus/icons-vue';
import {useMainStore} from '@/store/index.js';
import {useUserInfoStore} from '@/store/userInfo';
import UserMenu from '@/components/UserMenu.vue';
import {applyTheme} from '@/utils/theme';

const route = useRoute();
const store = useMainStore();
const userInfoStore = useUserInfoStore();

/** 当前路由名，用来给导航项打 active */
const activeIndex = computed(() => route.name as string | undefined);

/**
 * 导航项。
 *
 * <p>「登录」只在未登录、且当前不在登录页时出现 —— 已经在登录页再挂一个
 * 「登录」入口，点了也是原地不动。
 */
const navItems = computed(() => {
  const items: Array<{ name: string; label: string }> = [
    {name: 'bazi', label: '生辰八字'},
    {name: 'ziwei', label: '紫微斗数'},
    {name: 'fortune', label: 'AI 推演'},
    {name: 'report-list', label: '详细报告'},
    {name: 'about', label: '关于'},
  ];
  if (!userInfoStore.isLoggedIn && route.name !== 'login') {
    items.push({name: 'login', label: '登录'});
  }
  return items;
});

const data = reactive<any>({
  theme: store.theme,
});

/** 主题按钮：切换 + 写回 store */
function toggleTheme(): void {
  data.theme = !data.theme;
}

// 把用户的选择写回 store。真正「应用主题」的三处落点（html.dark / #app[data-theme] /
// localStorage）统一由 App.vue 调 utils/theme.ts 的 applyTheme 处理 —— 放在根组件
// 才能覆盖没有 Header 的页面（如首页），那里只负责「应用」，这里只负责「改偏好」。
watch(() => data.theme, (newVal: boolean) => {
  store.theme = newVal;
});

// 首次进入时把 store 里的偏好落到 DOM 上。
// App.vue 已经做过一次，这里是幂等的兜底 —— 防止将来有人把 Header 单独挂到别处。
onMounted(() => {
  applyTheme(data.theme);
});
</script>

<style scoped lang="scss">
header {
  /* 细高条 + 半透明毛玻璃 + 底部一条分隔线 —— VitePress 导航的灵魂三件套。
     底色走 --bg-blur 令牌而不是写死的 $bgColor：明亮/暗色各有一组值，自动跟随主题，
     不用再在 App.vue 里按 data-theme 硬写一个纯色。 */
  height: $headerH;
  width: 100%;
  background: var(--bg-blur);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
  color: var(--text-dim);

  /* 跟随滚动吸顶。滚动容器是 #app（见 App.vue），sticky 相对它生效；
     万一某页父级有 overflow 打断，退化成普通流也不影响使用。 */
  position: sticky;
  top: 0;
  z-index: 50;

  /**
   * 导航条。背景铺满整宽（在 header 上），内容收在 $headerWidth 内居中。
   * position: relative 是给左侧自由区（绝对定位）当定位基准的。
   */
  .header-inner {
    box-sizing: border-box;
    width: 100%;
    max-width: $headerWidth;
    margin: 0 auto;
    padding: 0 $mainPad;
    height: 100%;
    display: flex;
    align-items: center;
    position: relative;
  }

  /* ---------- 左自由区：脱离文档流 ----------
     绝对定位是刻意的：若让它参与 flex，就会和右侧一起分走内容轴两侧的空间，
     窄视口下把内容轴挤窄、破坏「菜单贴正文左边界」的对齐。
     脱离流之后，内容轴永远能靠 margin: auto 精确居中，与它无关。 */
  .hd-left {
    position: absolute;
    left: $mainPad;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
  }

  /* ---------- 中间：内容轴（= 正文宽度）----------
     margin: auto 让它在本条内水平居中；条本身又居中于页面，于是它正好压在正文轴上。
     空间不够时（窄视口）靠 max-width: 100% 收缩，不会把页面撑出横向滚动。 */
  .hd-center {
    width: $mainWidth;
    max-width: 100%;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 8px;
    /* 右侧扩展位是绝对定位（left: 100%），以它为定位基准 */
    position: relative;
  }

  /* 菜单吃掉左侧所有空位（flex: 1），但自身内容靠右站 —— 于是菜单项
     贴在右侧控件簇的左边，和头像连成一组。
     这就是「菜单右对齐」：右边缘落在头像左边（未登录时就顶到正文右边界），
     左边缘则随字宽自然浮动，正文左边界一侧留白。 */
  .nav-links {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 2px;
    overflow: hidden;
  }

  /* ---------- 左：品牌 ---------- */
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    flex: none;
    text-decoration: none;
    color: var(--text);
    transition: opacity 0.18s ease;

    &:hover {
      opacity: 0.82;
    }

    /* logo.png 是 380×424 的竖图，原来被 el-image 的 height:90% + fit:cover
       拉到近 80px 高、还裁掉两边。改成固定 28px 高、宽度自适应，比例完整。 */
    .brand-logo {
      height: 28px;
      width: auto;
      display: block;
    }

    .brand-name {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.04em;
      white-space: nowrap;
    }
  }

  /* ---------- 导航链接 ---------- */
  .nav-link {
    flex: none;
    padding: 6px 12px;
    border-radius: 8px;
    // 14px 是 VitePress 的正文导航字号；原来 24px 显得又大又重。
    font-size: 14px;
    font-weight: 500;
    line-height: 1.4;
    color: var(--text-dim);
    text-decoration: none;
    white-space: nowrap;
    transition: color 0.18s ease, background-color 0.18s ease;

    &:hover {
      color: var(--text);
      background: var(--gold-wash);
    }

    /* active 只用颜色区分，去掉了 el-menu 那条底部横线 —— VitePress 就没有它 */
    &.is-active {
      color: var(--gold);
      font-weight: 600;
    }
  }

  /* 头像：内容轴里最后一个在流控件 —— 它的右边缘正好贴着正文右边界。
     未登录时没有头像，改由 .nav-links 自己顶到右边界（见上面的注释）。 */
  .user-area {
    flex: none;
  }

  /* ---------- 图标按钮 ---------- */
  /* 32×32 的图标按钮，hover 时浮一层金色底。
     原来主题开关是 el-switch 滑块，在导航里存在感过强；VitePress 用的是一个
     小小的图标按钮，主题钮和 GitHub 钮共用这套样式。 */
  .icon-btn {
    flex: none;
    position: relative;
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--text-dim);
    font-size: 17px;
    cursor: pointer;
    text-decoration: none;
    transition: color 0.18s ease, background-color 0.18s ease;

    &:hover,
    &:focus-visible {
      color: var(--text);
      background: var(--gold-wash);
    }

    svg {
      display: block;
    }
  }

  /**
   * 右侧「扩展位」：从正文右边界（left: 100%）往右边的自由区铺开。
   *
   * <p>绝对定位是刻意的 —— 若让它参与 flex，它就会和菜单一起分走内容轴的宽度，
   * 头像（未登录时是菜单）也就压不到正文右边界上了。
   * 宽度自适应：往里加几个社交图标都不必改内容轴的对齐。
   */
  .hd-extras {
    position: absolute;
    left: calc(100% + 8px);
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /**
   * 窄屏隐藏站名。
   *
   * <p>左侧自由区的宽度 = 内容轴左边到导航条左边的那段（约
   * ($headerWidth - $mainWidth) / 2）。窗口一旦窄于 $headerWidth，这段就被视口压小，
   * logo 图标 + 站名可能顶到内容轴的菜单上。这时只留图标 —— 与 VitePress 在窄屏
   * 收起站点标题是同一个做法。图标本身足够辨识，站名交给首页大标题去承担。
   */
  @media (max-width: $headerWidth) {
    .brand-name {
      display: none;
    }
  }

  /**
   * 更窄时的回退：右侧自由区被压到装不下扩展位（视口 ≲1280px）时，
   * 把扩展位收回内容轴内（position: static）—— 头像之后紧跟主题钮 / GitHub，
   * 整组一起贴右边界。否则它会在页面右侧撑出横向滚动条。
   */
  @media (max-width: 1280px) {
    .hd-extras {
      position: static;
      transform: none;
    }
  }
}
</style>
