<template>
  <AuthShell
      title="登录"
      subtitle="AI 命理推演需登录后使用；排盘与生辰八字不用登录，随时可看"
  >
    <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="submit"
    >
      <el-form-item label="邮箱 / 账号" prop="email">
        <el-input
            v-model="form.email"
            placeholder="邮箱，或 admin / test"
            size="large"
            clearable
            autocomplete="username"
        />
      </el-form-item>

      <el-form-item label="密码" prop="password">
        <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            size="large"
            show-password
            autocomplete="current-password"
        />
      </el-form-item>

      <!--
        只有白名单之外的账号才显示验证码 —— 后端对 test / admin / 1006059906@qq.com
        跳过校验（见 UserServiceImpl.login），给他们显示一个「随便填都行」的框只是干扰。
      -->
      <el-form-item v-if="needCode" label="邮箱验证码" prop="code">
        <div class="auth-code-row">
          <el-input
              v-model="form.code"
              placeholder="6 位验证码"
              size="large"
              maxlength="6"
              autocomplete="one-time-code"
          />
          <el-button
              class="auth-ghost"
              size="large"
              :loading="sending"
              :disabled="countdown > 0"
              @click="sendCode"
          >
            {{ countdown > 0 ? `${countdown}s 后重发` : '发送验证码' }}
          </el-button>
        </div>
      </el-form-item>

      <el-alert
          v-if="error"
          class="auth-error"
          :title="error"
          type="error"
          :closable="false"
          show-icon
      />

      <el-button
          class="auth-submit"
          type="primary"
          size="large"
          :loading="loading"
          native-type="submit"
      >
        {{ loading ? '登录中…' : '登录' }}
      </el-button>
    </el-form>

    <template #foot>
      还没有账号？
      <el-button link type="primary" @click="goRegister">去注册</el-button>
      <span class="auth-sep">·</span>
      <el-button link @click="goHome">返回首页</el-button>
    </template>
  </AuthShell>
</template>

<script setup lang="ts">
/**
 * 登录页。
 *
 * <h3>为什么存在</h3>
 * 后端 `/graph/**`（AI 命理推演）改成必须登录后，前端需要一个落点：
 * 路由守卫、axios 拦截器、SSE 客户端三处在发现「未登录」时都会把用户送到这里，
 * 并带上 `?redirect=<原来想去的页>`。
 *
 * <h3>用的是哪个登录接口</h3>
 * admin 已有的 `POST /user/login`（用户体系 StpKit.USER，H5 那套），
 * 不是后台管理的登录 —— 后台那套会把未登录请求 302 到服务端渲染的 /toLogin 页，
 * 对单页应用毫无意义。这个接口在 `security.common.excludes` 白名单里，不需要先登录。
 *
 * <h3>验证码为什么是按账号条件显示的</h3>
 * 后端在部分账号上跳过邮箱验证码校验（见下 `CODE_FREE_ACCOUNTS`）。
 * 统一要求填只会让人对着 `admin` 账号胡乱编 6 位数字。
 *
 * <h3>版式</h3>
 * 全屏星空外壳在 {@code components/AuthShell.vue}，与注册页共用；
 * 本页只负责表单字段与提交逻辑。
 */
import {computed, onUnmounted, reactive, ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {ElMessage} from 'element-plus';
import type {FormInstance, FormRules} from 'element-plus';
import AuthShell from '@/components/AuthShell.vue';
import {login, sendEmailCode} from '@/api/module/user';
import type {MiniUserVo} from '@/api/module/user';
import {CODE_FREE_ACCOUNTS} from '@/api/module/user';
import {useUserInfoStore} from '@/store/userInfo';
import {toUserInfo} from '@/utils/user';
import {DEFAULT_REDIRECT, resolveRedirect} from '@/utils/auth';

/** 发码后的冷却秒数。跟后端无关，纯粹防连点 */
const RESEND_SECONDS = 60;

const route = useRoute();
const router = useRouter();
const userInfoStore = useUserInfoStore();

const formRef = ref<FormInstance>();
const loading = ref(false);
const sending = ref(false);
const error = ref('');
const countdown = ref(0);

const form = reactive({
  email: '',
  password: '',
  code: '',
});

/**
 * 这个账号要不要验证码。
 *
 * <p>判据与后端 `UserServiceImpl.login` 的白名单一致（那边是
 * `StrUtil.equalsAnyIgnoreCase(email, "test", "admin", "1006059906@qq.com")`）。
 * 前端用它只是为了决定显不显示输入框，不是安全边界。
 */
const needCode = computed(() => {
  const email = form.email.trim().toLowerCase();
  return !CODE_FREE_ACCOUNTS.some((account) => account.toLowerCase() === email);
});

const rules = computed<FormRules>(() => ({
  email: [
    {required: true, message: '请输入邮箱或账号', trigger: 'blur'},
  ],
  password: [
    {required: true, message: '请输入密码', trigger: 'blur'},
  ],
  code: needCode.value
      ? [{required: true, message: '请输入邮箱验证码', trigger: 'blur'}]
      : [],
}));

let timer: number | undefined;

function startCountdown(): void {
  countdown.value = RESEND_SECONDS;
  timer = window.setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) stopCountdown();
  }, 1000);
}

function stopCountdown(): void {
  if (timer !== undefined) {
    window.clearInterval(timer);
    timer = undefined;
  }
}

// 组件被切走时记得清掉定时器，否则（配合 keep-alive 或反复进出）会留下孤儿 interval
onUnmounted(stopCountdown);

function sendCode(): void {
  error.value = '';
  if (!form.email.trim()) {
    error.value = '先填邮箱，再点发送验证码';
    return;
  }
  sending.value = true;
  // actionType 必须与后面登录时一致 —— 后端拿 email + actionType 拼验证码的缓存 key
  sendEmailCode({email: form.email.trim(), actionType: 'login'})
      .then(() => {
        ElMessage.success('验证码已发送，请查收邮件');
        startCountdown();
      })
      .catch(() => {
        // 具体错误（邮箱格式不对 / 发信失败）后端已给中文提示，axios 拦截器也弹过了，
        // 这里不重复报，只把冷却撤掉让用户能重试
        stopCountdown();
        countdown.value = 0;
      })
      .finally(() => {
        sending.value = false;
      });
}

/**
 * 提交登录。
 *
 * <p>Enter 提交走的是**表单原生提交**（`el-form` 的根元素就是 `<form>`，
 * 登录按钮 `native-type="submit"`），所以输入框上<b>不要</b>再挂 `@keyup.enter` ——
 * 那样一次回车会同时触发原生提交和 keyup，`submit` 跑两遍、登录请求发两遍。
 * 底下的 `loading` 早退是第二道保险。
 */
function submit(): void {
  // 连点/重复提交：第一次已经发出去了就别再发
  if (loading.value) return;

  error.value = '';
  formRef.value?.validate((valid) => {
    if (!valid) return;

    loading.value = true;
    login({
      email: form.email.trim(),
      password: form.password,
      code: form.code.trim() || undefined,
      actionType: 'login',
    })
        .then((res: any) => {
          const vo = res?.data as MiniUserVo | undefined;
          if (!vo?.token) {
            // 200 但没 token —— 契约被改了，或者后端把登录态塞到了别处。
            // 静默放行会让用户「登录成功却还是没权限」，不如当场说清楚。
            error.value = '登录成功但没拿到 token，请检查后端 /user/login 的返回结构';
            return;
          }
          userInfoStore.setUserInfo(toUserInfo(vo));
          ElMessage.success('登录成功');
          // 用 replace：登录页不该留在历史里，否则用户按返回又回到登录页
          void router.replace(resolveRedirect(route.query.redirect, DEFAULT_REDIRECT));
        })
        .catch((e: unknown) => {
          // 业务错误（账号密码错、验证码错）已由 axios 拦截器弹过 message，
          // 这里只在卡片里留一条常驻提示，避免 toast 一闪而过就没了线索
          error.value = e instanceof Error ? e.message : '登录失败，请稍后重试';
        })
        .finally(() => {
          loading.value = false;
        });
  });
}

function goHome(): void {
  void router.replace('/index');
}

/** 去注册页。`redirect` 要一起带过去 —— 否则「被拦下来 → 去注册 → 注册成功」会丢落点 */
function goRegister(): void {
  void router.push({
    name: 'register',
    query: route.query.redirect ? {redirect: route.query.redirect} : {},
  });
}
</script>
