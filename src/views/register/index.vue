<template>
  <AuthShell
      title="注册"
      subtitle="用邮箱注册，注册成功即自动登录，可直接开始 AI 命理推演"
  >
    <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="submit"
    >
      <el-form-item label="邮箱" prop="email">
        <el-input
            v-model="form.email"
            placeholder="用来接收验证码，也作为登录账号"
            size="large"
            clearable
            autocomplete="email"
        />
      </el-form-item>

      <el-form-item label="邮箱验证码" prop="code">
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

      <el-form-item label="密码" prop="password">
        <el-input
            v-model="form.password"
            type="password"
            placeholder="至少 6 位"
            size="large"
            show-password
            autocomplete="new-password"
        />
      </el-form-item>

      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="再输一次"
            size="large"
            show-password
            autocomplete="new-password"
        />
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
        {{ loading ? '注册中…' : '注册' }}
      </el-button>
    </el-form>

    <template #foot>
      已有账号？
      <el-button link type="primary" @click="goLogin">去登录</el-button>
      <span class="auth-sep">·</span>
      <el-button link @click="goHome">返回首页</el-button>
    </template>
  </AuthShell>
</template>

<script setup lang="ts">
/**
 * 注册页。
 *
 * <h3>用的是哪个接口</h3>
 * admin 已有的 `POST /user/register`（与登录页同一个 `MiniRegisterDto`），
 * 在 `security.common.excludes` 白名单里，不需要先登录。
 *
 * <h3>注册即登录</h3>
 * 后端 `UserServiceImpl.register` 建完用户就直接 `StpKit.USER.login(userId)`，
 * 返回的 `MiniUserVo` 里带 token —— 所以注册页**不需要**再让用户去登录一次。
 *
 * <h3>为什么必须有真邮箱</h3>
 * 发验证码走 `POST /user/sendEmail`，后端第一步就是 `Validator.isEmail`，
 * 不是邮箱格式直接拒（`MINI_USER_EMAIL_FORMAT_ERROR`）。
 * 注意这与**登录**页不同：登录页那三个白名单账号（test / admin / …）能免验证码进来，
 * 但注册**没有**白名单，任何人都得走真验证码。
 *
 * <h3>前端的两条额外校验</h3>
 * 后端 `MiniRegisterDto` 上一个校验注解都没有（密码几位、两次是否一致都不管）。
 * 所以密码长度与两次一致这两条<b>只是前端体验保护</b>，不是契约 ——
 * 别因为前端拦了就在后端松掉；将来要收紧得在后端加。
 */
import {computed, onUnmounted, reactive, ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {ElMessage} from 'element-plus';
import type {FormInstance, FormItemRule, FormRules} from 'element-plus';
import AuthShell from '@/components/AuthShell.vue';
import {register, sendEmailCode} from '@/api/module/user';
import type {MiniUserVo} from '@/api/module/user';
import {useUserInfoStore} from '@/store/userInfo';
import {DEFAULT_REDIRECT, LOGIN_PATH, resolveRedirect} from '@/utils/auth';

/** 发码后的冷却秒数。跟后端无关，纯粹防连点 */
const RESEND_SECONDS = 60;

/** 密码最短长度。⚠️ 后端没有这条约束，纯前端保护 */
const MIN_PASSWORD_LENGTH = 6;

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
  code: '',
  password: '',
  confirmPassword: '',
});

/**
 * 两次密码一致。
 *
 * <p>写成 `validator` 而不是 `{repeated: ...}`：Element Plus 的 repeat 规则
 * 是拿**另一个字段名**比对，字段名拼错时不报错、只是那条规则静默失效 ——
 * 这类「看起来配了其实没生效」的坑不好查，不如自己写。
 */
const confirmValidator: FormItemRule['validator'] = (_rule, value, callback) => {
  if (!value) {
    callback(new Error('请再输入一次密码'));
    return;
  }
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'));
    return;
  }
  callback();
};

const rules = computed<FormRules>(() => ({
  email: [
    {required: true, message: '请输入邮箱', trigger: 'blur'},
    // 和后端 Validator.isEmail 一样：发验证码那一步就会被拒，早点告诉用户
    {type: 'email', message: '邮箱格式不正确', trigger: 'blur'},
  ],
  code: [
    {required: true, message: '请输入邮箱验证码', trigger: 'blur'},
  ],
  password: [
    {required: true, message: '请设置密码', trigger: 'blur'},
    {
      min: MIN_PASSWORD_LENGTH,
      message: `密码至少 ${MIN_PASSWORD_LENGTH} 位`,
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    {validator: confirmValidator, trigger: 'blur'},
  ],
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

onUnmounted(stopCountdown);

/**
 * 发验证码。
 *
 * <p>只校验 email 一个字段：用整表 `validate()` 会把还没填的密码、确认密码一起标红，
 * 用户会以为「我就点个发验证码，怎么全红了」。
 *
 * <p>用公开的 `validateField` 而不是 `getField('email').validate()` —— 后者的第一个
 * 参数是 **trigger 字符串**（`(trigger, callback)`），把回调当 trigger 传进去
 * 既不报错也不生效，是个纯粹的静默失效。
 *
 * <p>传了 callback 时 `validateField` 不会 reject（见 element-plus `form2.mjs`，
 * 失败走 `callback(false, invalidFields)`），所以这里不需要 try/catch。
 */
function sendCode(): void {
  error.value = '';
  formRef.value?.validateField('email', (ok: boolean) => {
    if (!ok) return;

    sending.value = true;
    // actionType 必须与后面 register 时一致 —— 后端拿 email + actionType 拼验证码的缓存 key，
    // 两次不一致的症状是「验证码明明收到了却说验证码错误」。
    sendEmailCode({email: form.email.trim(), actionType: 'register'})
        .then(() => {
          ElMessage.success('验证码已发送，请查收邮件');
          startCountdown();
        })
        .catch(() => {
          // 具体错误后端已给中文提示（含「邮件格式不正确」），axios 拦截器也弹过了，
          // 这里只把冷却撤掉让用户能重试
          stopCountdown();
          countdown.value = 0;
        })
        .finally(() => {
          sending.value = false;
        });
  });
}

function submit(): void {
  // 连点/重复提交：第一次已经发出去了就别再发
  if (loading.value) return;

  error.value = '';
  formRef.value?.validate((valid) => {
    if (!valid) return;

    loading.value = true;
    register({
      email: form.email.trim(),
      password: form.password,
      code: form.code.trim(),
      actionType: 'register',
    })
        .then((res: any) => {
          const vo = res?.data as MiniUserVo | undefined;
          if (!vo?.token) {
            // 注册已经写库了，但没拿到登录态 —— 用户会「注册成功却进不去」。
            // 提示他去登录，别让他以为白注册了。
            error.value = '注册已提交但没拿到 token，请改用登录页登录';
            return;
          }
          userInfoStore.setUserInfo({
            token: vo.token,
            uid: String(vo.userId ?? ''),
            nickName: vo.nickName,
          });
          ElMessage.success('注册成功，已自动登录');
          // 与登录页同理：用 replace，别把注册页留在历史里
          void router.replace(resolveRedirect(route.query.redirect, DEFAULT_REDIRECT));
        })
        .catch((e: unknown) => {
          // 「用户已存在，请直接登录」「验证码错误」等都是业务错误，
          // axios 拦截器已弹过 message，这里留一条常驻提示兜底
          error.value = e instanceof Error ? e.message : '注册失败，请稍后重试';
        })
        .finally(() => {
          loading.value = false;
        });
  });
}

/** 去登录页。redirect 一起带走，注册→登录这条路径上落点不丢 */
function goLogin(): void {
  void router.replace({
    path: LOGIN_PATH,
    query: route.query.redirect ? {redirect: route.query.redirect} : {},
  });
}

function goHome(): void {
  void router.replace('/index');
}
</script>
