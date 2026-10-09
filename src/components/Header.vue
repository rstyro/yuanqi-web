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
<!--        <el-sub-menu index="user">-->
<!--          <template #title>我的</template>-->
<!--          <el-menu-item index="edit">编辑</el-menu-item>-->
<!--          <el-menu-item index="logout">退出</el-menu-item>-->
<!--        </el-sub-menu>-->
      </el-menu>
      <!--
        已登录时在主题开关左边挂一个「用户名 + 退出」。
        刻意不用 el-menu-item 做退出：那个菜单开了 :router，选中就会 push('/logout')，
        而 /logout 并不存在 —— 会留一条「No match found」的路由警告。退出是个动作，不是一条路由。
      -->
      <div v-if="userInfoStore.isLoggedIn" class="user-area">
        <el-tooltip :content="nickName" placement="bottom">
          <span class="user-name">{{ nickName }}</span>
        </el-tooltip>
        <el-button link class="logout" @click="handleLogout">退出</el-button>
      </div>
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
import {Ref, ref, computed, watch, reactive, onMounted} from 'vue';
import {useRoute, useRouter} from "vue-router";
import logoImg from '@/assets/images/logo.png';
import { Sunny, Moon } from '@element-plus/icons-vue';
import {ElMessage} from "element-plus";
import {useMainStore} from "@/store/index.js"
import {useUserInfoStore} from "@/store/userInfo";
import {logout} from "@/api/module/user";
import {applyTheme} from "@/utils/theme";
import {LOGIN_PATH} from "@/utils/auth";

const route = useRoute();
const router = useRouter();
const store = useMainStore();
const userInfoStore = useUserInfoStore();
const activeIndex = ref(computed(() => route.name));
const handleSelect = (key: string, keyPath: string[]) => {
  // console.log(key, keyPath);
}

/** 昵称兜底：老用户存的登录态里没有 nickName（见 store/userInfo.ts 的说明） */
const nickName = computed(() => userInfoStore.getNickName || '已登录');

/**
 * 退出登录。
 *
 * <p>顺序很关键：**先请求、后清本地**。axios 的请求拦截器是在发请求那一刻
 * 从 store 里取 token 的，先清就等于把这次 logout 也发成了未携带 token 的请求，
 * 换个 401 + 一次多余的跳登录。
 *
 * <p>服务端清不掉（网络断了 / token 已过期）也必须把本地清了 ——
 * 否则界面显示「已登录」、接口却全 401，用户只能靠清浏览器缓存自救。
 */
function handleLogout() {
  logout()
      .catch(() => {
        /* 忽略：本地照样清 */
      })
      .finally(() => {
        userInfoStore.clearUserInfo();
        ElMessage.success('已退出登录');
        // 当前页需要登录的话，光清 store 会卡在一个只会报 401 的页面上
        if (route.meta.requiresLogin) {
          void router.replace(LOGIN_PATH);
        }
      });
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
      margin-left: 24px;
      margin-right: 96px;
    }

    /* 用户名 + 退出。与主题开关同高，靠 line-height 对齐菜单文字 */
    .user-area {
      display: flex;
      align-items: center;
      flex: none;
      height: $headerH;
      font-size: 14px;
      color: var(--text-dim);

      .user-name {
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        cursor: default;
      }

      .logout {
        margin-left: 8px;
        color: var(--text-faint);

        &:hover {
          color: var(--gold);
        }
      }
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
