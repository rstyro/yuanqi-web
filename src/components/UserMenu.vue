<template>
  <!--
    已登录时挂到 Header 上的「头像 + 昵称 + 下拉」。

    为什么用 el-dropdown 而不是 el-sub-menu：
    导航那个 el-menu 开了 `:router="true"`，菜单项的 index 会被当成路由去 push，
    「退出登录」这种**动作**进了菜单就会变成一条不存在的路由
    （历史上就留过一条 No match found 的警告）。下拉菜单点的是 command，不是路由。

    为什么 nickname 也放在触发区（而不是只给一个齿轮图标）：
    昵称本身就是「我是谁 / 现在登的是哪个号」的可见答案，多账号调试时一眼能看出来。
  -->
  <el-dropdown
      class="user-menu"
      trigger="click"
      placement="bottom-end"
      :show-timeout="80"
      :hide-timeout="120"
      @command="onCommand"
  >
    <span class="user-trigger">
      <el-avatar :size="34" :src="avatarSrc" class="user-avatar">
        <!-- src 为空或加载失败时 el-avatar 会渲染这个插槽 -->
        <span class="user-avatar-fallback">{{ initial }}</span>
      </el-avatar>
      <span class="user-name">{{ nickName }}</span>
      <el-icon class="user-caret"><ArrowDown/></el-icon>
    </span>

    <template #dropdown>
      <el-dropdown-menu>
        <!-- 菜单头：昵称可能被触发区截断，这里给完整的一份 -->
        <li class="menu-head">
          <el-avatar :size="40" :src="avatarSrc" class="menu-head-avatar">
            <span class="user-avatar-fallback">{{ initial }}</span>
          </el-avatar>
          <div class="menu-head-text">
            <div class="menu-head-name">{{ nickName }}</div>
            <div class="menu-head-sub">{{ email || '未绑定邮箱' }}</div>
          </div>
        </li>
        <el-dropdown-item command="profile" :icon="User">个人资料</el-dropdown-item>
        <el-dropdown-item command="logout" :icon="SwitchButton" divided>退出登录</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
/**
 * 用户菜单（头像 + 昵称 + 下拉：个人资料 / 退出登录）。
 *
 * <h3>昵称与头像从哪来</h3>
 * 1. 登录成功时 `views/login` 只往 store 写了 token/uid/nickName；
 * 2. 本组件挂载时再调一次 `/user/getUserInfo` 把头像等字段补齐
 *    （{@code utils/user.ts#refreshUserInfo}，失败静默）。
 * 所以**初次登录会先显示昵称、头像稍后出现**，这是刻意的：不为了头像把整页卡住。
 *
 * <h3>头像地址必须拼前缀</h3>
 * 后端存的是 `/show/avatar/xxx.png` 这种相对路径，直接塞 `<img>` 会去前端站点找图。
 * 统一走 {@code utils/asset.ts#resolveFileUrl}；拼不出 / 没头像时回落本地默认图。
 */
import {computed, onMounted} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {ElMessage} from 'element-plus';
import {ArrowDown, SwitchButton, User} from '@element-plus/icons-vue';
import {useUserInfoStore} from '@/store/userInfo';
import {logout} from '@/api/module/user';
import {resolveFileUrl} from '@/utils/asset';
import {refreshUserInfo} from '@/utils/user';
import {LOGIN_PATH} from '@/utils/auth';
import defaultAvatar from '@/assets/images/avatar.jpg';

const route = useRoute();
const router = useRouter();
const userInfoStore = useUserInfoStore();

/** 昵称兜底：老用户存的登录态里没有 nickName（见 store/userInfo.ts 的说明） */
const nickName = computed(() => userInfoStore.getNickName || '已登录');

const email = computed(() => userInfoStore.userInfo?.email || '');

/** 头像加载失败 / 没头像时用本地默认图；el-avatar 还有一层插槽兜底 */
const avatarSrc = computed(() => resolveFileUrl(userInfoStore.getAvatarUrl) || defaultAvatar);

/** 连默认图都加载不出来时的兜底：昵称首字 */
const initial = computed(() => nickName.value.slice(0, 1).toUpperCase());

// 登录后刷一次完整资料（头像 / 邮箱）。静默失败，不影响 Header 渲染。
onMounted(() => {
  void refreshUserInfo();
});

function onCommand(command: string): void {
  if (command === 'profile') {
    void router.push({name: 'profile'});
    return;
  }
  if (command === 'logout') {
    handleLogout();
  }
}

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
function handleLogout(): void {
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
</script>

<style scoped lang="scss">
/* 与主题开关同高，靠 height + 居中与菜单文字对齐 */
.user-menu {
  flex: none;
  height: $headerH;
  display: inline-flex;
  align-items: center;

  .user-trigger {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    height: 40px;
    padding: 0 12px;
    border-radius: 999px;
    cursor: pointer;
    color: var(--text-dim);
    // 导航菜单是 24px 字号，账户区比它小一档（15px）才有「次级控件」的层次，
    // 但又不能太小 —— 太小在 90px 高的导航里没有存在感。
    font-size: 15px;
    transition: background-color 0.18s ease, color 0.18s ease;
    // el-dropdown 的触发元素默认带 outline，点完会留一圈虚线
    outline: none;

    &:hover,
    &:focus-visible {
      background: var(--gold-wash);
      color: var(--text);
    }

    .user-avatar {
      flex: none;
      background: var(--panel-2);
      border: 1px solid var(--line);
    }

    .user-avatar-fallback {
      color: var(--gold);
      font-weight: 600;
    }

    .user-name {
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-caret {
      font-size: 12px;
      color: var(--text-faint);
      transition: transform 0.18s ease;
    }
  }
}

/* 下拉面板里的 el-dropdown-item 是 Element Plus 的内部结构，scoped 下要 :deep */
:deep(.el-dropdown-menu__item) {
  font-size: 13px;
}

/* 菜单头是自定义 <li>，不在 el-dropdown-item 的样式范围内 */
.menu-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px 8px;
  list-style: none;

  .menu-head-avatar {
    flex: none;
    background: var(--panel-2);
    border: 1px solid var(--line);
  }

  .menu-head-text {
    min-width: 0;
    line-height: 1.4;
  }

  .menu-head-name {
    font-size: 14px;
    color: var(--text);
    font-weight: 500;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .menu-head-sub {
    font-size: 12px;
    color: var(--text-faint);
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .user-avatar-fallback {
    color: var(--gold);
    font-weight: 600;
  }
}
</style>
