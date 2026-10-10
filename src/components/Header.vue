<template>
  <header>
    <div class="header-inner">
      <el-menu
          :default-active="activeIndex"
          class="el-menus"
          mode="horizontal"
          :ellipsis="false"
          :router="true"
          @select="handleSelect"
      >
        <el-menu-item index="index">
          <el-image
              style="height: 90%;"
              :src="logoImg"
              fit="cover"
              class="logo-shiny"
          />
        </el-menu-item>
        <div class="flex-grow"></div>
<!--        <el-menu-item index="search">首页</el-menu-item>-->
<!--        <el-menu-item index="works">表白模板</el-menu-item>-->
        <el-menu-item index="bazi">生辰八字</el-menu-item>
        <el-menu-item index="fortune">AI 推演</el-menu-item>
        <el-menu-item index="about">关于</el-menu-item>
        <!-- 已在登录页就不再显示「登录」—— 那个入口点不点都是原地不动 -->
        <el-menu-item v-if="!userInfoStore.isLoggedIn && route.name !== 'login'" index="login">
          登录
        </el-menu-item>
      </el-menu>
      <!--
        已登录时的「头像 + 昵称 + 下拉（个人资料 / 退出登录）」。

        刻意**不放**在 el-menu 里：那个菜单开了 :router，菜单项的 index 会被当成路由
        push 出去，「退出登录」是个动作不是一条路由（历史上就因此留过
        No match found 的警告）。整个用户区的逻辑收在 components/UserMenu.vue。
      -->
      <UserMenu v-if="userInfoStore.isLoggedIn" class="user-area"/>
      <el-switch
          v-model="data.theme"
          class="theme-switch"
          inline-prompt
          :active-icon="Sunny"
          :inactive-icon="Moon"
      />
    </div>
  </header>


</template>

<script setup lang="ts">
import {ref, computed, watch, reactive, onMounted} from 'vue';
import {useRoute} from "vue-router";
import logoImg from '@/assets/images/logo.png';
import { Sunny, Moon } from '@element-plus/icons-vue';
import {useMainStore} from "@/store/index.js"
import {useUserInfoStore} from "@/store/userInfo";
import UserMenu from "@/components/UserMenu.vue";
import {applyTheme} from "@/utils/theme";

const route = useRoute();
const store = useMainStore();
const userInfoStore = useUserInfoStore();
const activeIndex = ref(computed(() => route.name));
const handleSelect = (key: string, keyPath: string[]) => {
  // console.log(key, keyPath);
}

const data = reactive<any>({
  theme : store.theme,
});

// 监听一下主题变化。
// 「应用主题」的三处落点（html.dark / #app[data-theme] / localStorage）统一由
// App.vue 调 utils/theme.ts 的 applyTheme 处理 —— 放在根组件才能覆盖没有 Header
// 的页面（如首页）。这里只负责把用户的选择写回 store。
watch(() => data.theme, (newVal: boolean) => {
  store.theme = newVal;
});

// 首次进入时把 store 里的偏好落到 DOM 上。
// App.vue 已经做过一次，这里是幂等的兜底 —— 防止将来有人把 Header 单独挂到别处。
onMounted(() => {
  applyTheme(data.theme);
})

</script>

<style scoped lang="scss">


header {
  /*首页导航背景颜色*/
  //$bgColor: #f5f5f5;
  //$headerH: 90px;

  height: $headerH;
  width: 100%;
  background-color: $bgColor;
  color: #555;

  .header-inner {
    //background: rgba(43, 72, 101, 0.6);
    // 与下方页面内容共用同一个轴心与内边距（见 style.scss 的 main-container）。
    // 若这里不加 $mainPad，logo 会贴在 1100 的外沿，
    // 而页面卡片内缩 24px，两者左边界差一截。
    @include main-container($mainPad);
    display: flex;

    .el-menus{
      flex-grow: 1;
    }
    .theme-switch{
      display: inline-block;
      vertical-align: middle;
      height: $headerH;
      line-height: $headerH;
      // width 原来是 100px + 无右边距，结果是「可见控件靠左、右边 60px 是死区」，
      // 而这块死区正好压在 index.html 里那个
      // `position:absolute; top:0; right:0; 80×80` 的 GitHub 角标下面。
      // 用自动化点击 .theme-switch 会随机失败（点的是元素中心，落到了角标上），
      // 真人用鼠标点右半边同样点不动。改成贴合控件宽度 + 右侧留出角标的位置。
      width: auto;
      margin-left: 16px;
      margin-right: 96px;
    }

    /* 「头像 + 昵称 + 下拉」的用户区（整个组件是 components/UserMenu.vue）。
       这里只负责它在 Header 这条 flex 轴上的占位，内部样式都在那个组件里。 */
    .user-area {
      flex: none;
      margin-left: 28px;
    }

    .logo {
      width: 130px;
      height: 40px;
      color: #fff;
      border-radius: 5px;
      padding: 10px 25px;
      font-family: 'Lato', sans-serif;
      font-weight: 500;
      background: transparent;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      display: inline-block;
      box-shadow: inset 2px 2px 2px 0px rgba(255, 255, 255, .5),
      7px 7px 20px 0px rgba(0, 0, 0, .1),
      4px 4px 5px 0px rgba(0, 0, 0, .1);
      outline: none;
    }

    /* logo 闪亮特效 */
    .logo-shiny {

      &:before {
        position: absolute;
        content: '';
        display: inline-block;
        top: -180px;
        left: 0;
        width: 30px;
        height: 100%;
        background-color: #fff;
        animation: shiny 2s ease-in-out infinite;

        @-webkit-keyframes shiny {
          0% {
            -webkit-transform: scale(0) rotate(45deg);
            opacity: 0;
          }
          80% {
            -webkit-transform: scale(0) rotate(45deg);
            opacity: 0.5;
          }
          81% {
            -webkit-transform: scale(4) rotate(45deg);
            opacity: 1;
          }
          100% {
            -webkit-transform: scale(50) rotate(45deg);
            opacity: 0;
          }
        }
      }
    }

    .el-menus {
      background: $bgColor;
      border: 0px;
      height: $headerH;
      font-size: 24px;
    }

    .flex-grow {
      flex-grow: 1;
    }

  }
}
</style>
