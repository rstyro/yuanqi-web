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
import {onMounted, reactive} from 'vue';

const data = reactive({
  params: null,
});
onMounted(() => {
  console.log("命理乾坤-八字精解")
})
</script>

<style lang="scss">
#app {
  width: 100%;
  height: 100vh;
  overflow: auto;
}

/*高亮*/
#app[data-theme='light'] {
  background: #fff;
}

/*黑暗*/
#app[data-theme='dark'] {
  /*导航菜单背景颜色*/
  $bgColor: #191919;

  background: #292a2d;
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
    background-color: #292a2d;

    .form-container{
      background-color: #191919;
    }
  }



}
</style>
