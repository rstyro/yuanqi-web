<template>
  <router-view #default="{route,Component}">
    <transition :enter-active-class="`animate__animated  ${route.meta.transition}`">
      <component :is="Component"></component>
    </transition>
    <el-backtop :right="100" :bottom="100"/>
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
</style>
