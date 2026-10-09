<template>
  <router-view #default="{route,Component}">
    <transition :enter-active-class="`animate__animated  ${route.meta.transition}`">
      <component :is="Component"></component>
    </transition>
    <!--
      回到顶部。下面两条都踩过坑，改之前先读：

      1. target 必须显式写成 #app。本项目的滚动容器是 #app（见下方 #app 样式里的
         height:100vh + overflow:auto），而不是 document。el-backtop 不传 target 时
         默认监听 document / documentElement，滚动事件永远不触发 —— 所以它此前
         「从来没在页面上出现过」，根因不是样式没调好。
      2. bottom 由路由 meta 决定（见 router/index.ts 的 backtopBottom）。带吸底输入区的
         页面要把按钮抬到输入区之上，否则会被 .composer（position:sticky; z-index:20）
         压住 —— 看得见也点不到。没有吸底条的普通长页面用默认值即可。
    -->
    <el-backtop target="#app" :right="28" :bottom="route.meta.backtopBottom || 96"/>
  </router-view>
</template>

<script setup lang="ts">

import 'animate.css';
import {onMounted, watch} from 'vue';
import {applyTheme, useTheme} from '@/utils/theme';

const {isLight} = useTheme();

/**
 * 主题在根组件统一应用，而不是放在 Header.vue 里。
 *
 * <p>原先「切换开关」和「应用主题」都写在 Header 组件内，于是<b>只有 Header 挂载了、
 * 主题才会被应用</b>。首页 views/index.vue 没有 Header，所以持久化成暗色后
 * 直接进首页会先闪一下亮色。抽到这里来就跟页面结构无关了。
 *
 * <p>用 onMounted + watch 而不是 watch 的 immediate：immediate 会在挂载前执行，
 * 那一刻 document.getElementById('app') 还是 null，写不上 data-theme。
 */
onMounted(() => applyTheme(isLight()));
watch(isLight, (light) => applyTheme(light));

onMounted(() => {
  console.log("命理乾坤-八字精解")
})
</script>

<style lang="scss">
#app {
  width: 100%;
  height: 100vh;
  overflow: auto;
  // 全站底色/文字色统一走令牌，明亮与暗黑只差一组变量
  background: var(--bg);
  color: var(--text);
  transition: background-color 0.25s ease, color 0.25s ease;
}

/*黑暗*/
#app[data-theme='dark'] {
  /*导航菜单背景颜色*/
  $bgColor: #191919;

  background: var(--bg);
  $darkBgColor: #292a2d;
  $darkColor: #FFF;

  header {
    /*首页导航背景颜色*/
    background-color: $bgColor;

    .header-inner, .el-menu-item, .flex-grow, .el-sub-menu {
      background-color: $bgColor !important;
      --el-menu-text-color: #fff;
    }
  }

  .main-header {
    //background-image: linear-gradient(to top, #6a85b6 0%, #bac8e0 100%);
    background-image: linear-gradient(to top, #09203f 0%, #537895 100%);
  }


  .container{
    background-color: var(--bg);

    .form-container{
      background-color: $bgColor;
    }
  }


}

/* ==================== 回到顶部 ==================== */

/*
  组件默认 z-index 只有 5，而 AI 推理页的吸底输入条是 z-index: 20 ——
  一旦两者重叠，按钮就会被压在输入条的毛玻璃底下，「看得见却点不到」。
  抬到 30 保证任何情况下都点得到。

  正常情况压根不会重叠：按钮距底 208px，输入条最高约 193px（见 router/index.ts
  里 backtopBottom 的算式）。这条只是兜底 —— 真出现重叠，说明输入条长高了，
  该去把 backtopBottom 调大，而不是靠 z-index 硬撑。
*/
.el-backtop {
  z-index: 30;
}
</style>
