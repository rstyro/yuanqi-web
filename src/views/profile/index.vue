<template>
  <div class="container">
    <Header/>
    <div class="main">
      <el-card class="profile-card" shadow="never">
        <template #header>
          <div class="card-head">
            <span class="card-title">个人资料</span>
            <span class="card-sub">修改后立即生效，重新登录也会保留</span>
          </div>
        </template>

        <!-- ==================== 头像 ==================== -->
        <div class="avatar-row">
          <!--
            用 el-upload 只是为了它那套「选择文件 + 拖拽 + 键盘可达」，
            上传动作自己发（:auto-upload="false" + on-change 里手动调接口）——
            这样能复用 axios 实例（带 token、统一错误提示），
            也不用管它的 action / headers / 响应体约定。
          -->
          <el-upload
              class="avatar-upload"
              :auto-upload="false"
              :show-file-list="false"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              :on-change="onAvatarChange"
          >
            <div class="avatar-box" :class="{loading: avatarUploading}">
              <el-avatar :size="88" :src="avatarSrc">
                <span class="avatar-fallback">{{ initial }}</span>
              </el-avatar>
              <div class="avatar-mask">
                <el-icon>
                  <Loading v-if="avatarUploading"/>
                  <Camera v-else/>
                </el-icon>
                <span>{{ avatarUploading ? '上传中' : '更换头像' }}</span>
              </div>
            </div>
          </el-upload>
          <div class="avatar-tip">
            <div class="avatar-nick">{{ nickName }}</div>
            <div class="avatar-hint">支持 png / jpg / webp，建议 200×200 以上，不超过 {{ MAX_AVATAR_MB }}MB</div>
          </div>
        </div>

        <el-divider/>

        <!-- ==================== 资料表单 ==================== -->
        <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-width="88px"
            label-position="left"
            @submit.prevent="submit"
        >
          <el-form-item label="昵称" prop="nickName">
            <el-input v-model="form.nickName" placeholder="对外展示的名字" maxlength="20" show-word-limit clearable/>
          </el-form-item>

          <el-form-item label="性别" prop="sex">
            <el-radio-group v-model="form.sex">
              <el-radio :value="1">男</el-radio>
              <el-radio :value="2">女</el-radio>
              <el-radio :value="0">保密</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="生日" prop="birthday">
            <!--
              value-format 必须是 "YYYY-MM-DD HH:mm:ss"：后端 JacksonConfig 给
              LocalDateTime 挂的就是这个 pattern，传纯日期 "1992-06-20" 会反序列化失败。
            -->
            <el-date-picker
                v-model="form.birthday"
                type="date"
                placeholder="选择日期"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
            />
          </el-form-item>

          <el-form-item label="手机号" prop="phone">
            <el-input v-model="form.phone" placeholder="选填" maxlength="11" clearable/>
          </el-form-item>

          <el-form-item label="邮箱">
            <!--
              邮箱是登录账号（后端拿它当用户名），改它等于换账号 ——
              刻意做成只读，避免用户在这里改了之后登不进来。
            -->
            <el-input :model-value="form.email" disabled placeholder="未绑定"/>
            <div class="field-tip">邮箱是登录账号，暂不支持在这里修改</div>
          </el-form-item>

          <el-form-item label="个性签名" prop="signature">
            <el-input
                v-model="form.signature"
                type="textarea"
                :rows="3"
                maxlength="60"
                show-word-limit
                placeholder="写一句话介绍自己"
            />
          </el-form-item>

          <el-alert
              class="empty-tip"
              type="info"
              :closable="false"
              show-icon
              title="清空后保存不会生效"
              description="后端逐字段判空落库，空字符串会被跳过。想清掉签名/手机号，目前只能填一个别的值。"
          />

          <div class="actions">
            <el-button type="primary" :loading="saving" native-type="submit">保存</el-button>
            <el-button :disabled="saving" @click="resetForm">重置</el-button>
          </div>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 个人资料页（路由 `/profile`，`meta.requiresLogin = true`）。
 *
 * <h3>数据从哪来</h3>
 * 先用 store 里的登录态**立即渲染**（避免白屏），再调 `/user/getUserInfo` 拉全量回灌。
 * 不这么做的话，从 Header 点进来会先空一屏（`getUserInfo` 是网络请求）。
 *
 * <h3>保存怎么做</h3>
 * 只提交**改动过的字段**（见 `diff()`）—— 后端 {@code setIfNotNull} 是逐字段判空写入，
 * 全量提交会把没填的字段一起「跳过」，本来无害；但 nickName 一提交就要走一次查重，
 * 无谓地把「重名」错误引到「我只想改签名」的场景里。只传脏字段最省事也最不容易误伤。
 *
 * <h3>为什么保存后要重新拉一次</h3>
 * 后端会回写 Sa-Token session，但**不会告诉前端它到底存成了什么**
 * （昵称首尾空格、生日精度等都有被规整的可能）。重新拉一次是「以后端为准」，
 * 比在前端猜要靠谱。顺带也把头像等字段一起刷新了。
 */
import {computed, onMounted, reactive, ref} from 'vue';
import {ElMessage} from 'element-plus';
import type {FormInstance, FormRules, UploadFile, UploadFiles} from 'element-plus';
import {Camera, Loading} from '@element-plus/icons-vue';
import Header from '@/components/Header.vue';
import {updateUserAvatar, updateUserInfo} from '@/api/module/user';
import type {UserInfoDto} from '@/api/module/user';
import {useUserInfoStore} from '@/store/userInfo';
import {refreshUserInfo} from '@/utils/user';
import {resolveFileUrl} from '@/utils/asset';
import defaultAvatar from '@/assets/images/avatar.jpg';

/** 头像大小上限（后端没限制，这是纯前端约定，防止把 20MB 的原图直接传上去） */
const MAX_AVATAR_MB = 2;

const userInfoStore = useUserInfoStore();

const formRef = ref<FormInstance>();
const saving = ref(false);
const avatarUploading = ref(false);

interface ProfileForm {
  nickName: string;
  sex: number;
  birthday: string;
  phone: string;
  email: string;
  signature: string;
}

/** 空表单。`sex` 默认 0=未知，与后端 MiniUserVo 的语义一致 */
function blankForm(): ProfileForm {
  return {nickName: '', sex: 0, birthday: '', phone: '', email: '', signature: ''};
}

const form = reactive<ProfileForm>(blankForm());

/**
 * 用 store 里的值填表。
 *
 * <p>`birthday` 后端格式是 `yyyy-MM-dd HH:mm:ss`，而 `el-date-picker` 在
 * `value-format` 同格式时能直接吃这个字符串，不需要再转 Date ——
 * 转来转去反而会引入时区偏移（后端存的是「本地无时区时间」）。
 */
function fillFromStore(): void {
  const info = userInfoStore.userInfo;
  if (!info) return;
  form.nickName = info.nickName ?? '';
  form.sex = info.sex ?? 0;
  form.birthday = info.birthday ?? '';
  form.phone = info.phone ?? '';
  form.email = info.email ?? '';
  form.signature = info.signature ?? '';
}

const nickName = computed(() => userInfoStore.getNickName || '已登录');
const avatarSrc = computed(() => resolveFileUrl(userInfoStore.getAvatarUrl) || defaultAvatar);
const initial = computed(() => nickName.value.slice(0, 1).toUpperCase());

const rules: FormRules = {
  nickName: [
    {required: true, message: '昵称不能为空', trigger: 'blur'},
    {min: 1, max: 20, message: '昵称长度 1~20 个字符', trigger: 'blur'},
  ],
  phone: [
    {
      // 选填：只有填了才校验。空字符串直接放行
      validator: (_rule, value: string, callback) => {
        if (!value) return callback();
        if (!/^1[3-9]\d{9}$/.test(value)) return callback(new Error('手机号格式不正确'));
        return callback();
      },
      trigger: 'blur',
    },
  ],
};

// 先渲染缓存值，再异步拉全量 —— 顺序不能反，否则页面会先白一下
fillFromStore();
onMounted(async () => {
  const fresh = await refreshUserInfo();
  // 只有拉到了东西才覆盖：没拉到就保持用户已看到的表单，别把它清空
  if (fresh) fillFromStore();
});

/**
 * 只挑出**改动过的字段**。
 *
 * <p>空值不参与比较 —— 用户把签名删干净时它等于「没改」，提交上去后端也会跳过，
 * 不如不传，省一次无意义的写入与会话刷新。
 */
function diff(): UserInfoDto {
  const info = userInfoStore.userInfo;
  const dto: UserInfoDto = {};
  const nextNick = form.nickName.trim();
  const nextSign = form.signature.trim();
  const nextPhone = form.phone.trim();

  if (nextNick && nextNick !== (info?.nickName ?? '')) dto.nickName = nextNick;
  if (nextSign && nextSign !== (info?.signature ?? '')) dto.signature = nextSign;
  if (nextPhone && nextPhone !== (info?.phone ?? '')) dto.phone = nextPhone;
  if (form.sex !== (info?.sex ?? 0)) dto.sex = form.sex;
  if (form.birthday && form.birthday !== (info?.birthday ?? '')) dto.birthday = form.birthday;

  return dto;
}

function submit(): void {
  if (saving.value) return;
  formRef.value?.validate((valid) => {
    if (!valid) return;
    const dto = diff();
    if (Object.keys(dto).length === 0) {
      ElMessage.info('没有需要保存的修改');
      return;
    }
    saving.value = true;
    updateUserInfo(dto)
        .then(async (res) => {
          // ⚠️ 这里必须判 data，不能只看 code === 200：
          // 后端 updateUserInfo 认不出身份时是 `return false` → `R.ok(false)`，
          // 也就是 **HTTP 200 + code 200 + data=false**，axios 拦截器当成功放过去。
          // 后端取身份用的是请求头 uid（SecurityContextHolder.getUserId），
          // 而 uid 来自 store —— 万一 store 里的 uid 丢了 / 与 token 不是同一个人，
          // 就会命中这条「静默不生效」：接口全绿、库里没变、界面还弹「保存成功」。
          if (res?.data !== true) {
            ElMessage.error('保存没有生效：登录身份与账号不匹配，请退出后重新登录');
            await refreshUserInfo();
            fillFromStore();
            return;
          }
          await refreshUserInfo();
          fillFromStore();
          ElMessage.success('保存成功');
        })
        .catch(() => {
          // 具体原因（昵称已存在 / 参数不合法）axios 拦截器已经弹过中文提示，
          // 这里不再重复报，只把 loading 收掉
        })
        .finally(() => {
          saving.value = false;
        });
  });
}

function resetForm(): void {
  fillFromStore();
  formRef.value?.clearValidate();
}

/**
 * 选完文件立刻上传。
 *
 * <p>{@code :auto-upload="false"} 时 {@code before-upload} 不会被调用，
 * 所以大小 / 类型的校验必须写在这里 —— 否则用户能选中一个 50MB 的 PSD
 * 然后一路传到超时。
 */
async function onAvatarChange(file: UploadFile, _files: UploadFiles): Promise<void> {
  const raw = file.raw;
  if (!raw) return;
  if (!raw.type.startsWith('image/')) {
    ElMessage.error('只能上传图片文件');
    return;
  }
  if (raw.size > MAX_AVATAR_MB * 1024 * 1024) {
    ElMessage.error(`图片不能超过 ${MAX_AVATAR_MB}MB`);
    return;
  }

  avatarUploading.value = true;
  try {
    const res = await updateUserAvatar(raw);
    const newUrl = res?.data;
    if (newUrl) userInfoStore.patchUserInfo({avatarUrl: newUrl});
    const fresh = await refreshUserInfo();
    if (newUrl && fresh && fresh.avatarUrl !== newUrl) {
      // 与 submit 里同一个陷阱：后端 updateUserAvatar 也是拿 uid 头认人，
      // 认不出来时它照样把文件写到磁盘、也照样返回新地址，只是 **库里没改**。
      // 所以「返回成功」不等于「生效」，要用回读的结果当裁判。
      ElMessage.error('头像没有保存到账号上，请退出后重新登录再试');
      fillFromStore();
      return;
    }
    ElMessage.success('头像已更新');
  } catch {
    /* 错误提示已由拦截器弹出 */
  } finally {
    avatarUploading.value = false;
  }
}
</script>

<style scoped lang="scss">
.container {
  width: 100%;
  height: 100%;
}

.main {
  // 与 Header 内层同轴（$mainWidth / $mainPad，见 style.scss）
  @include main-container($mainPad);
  padding-top: 24px;
  padding-bottom: 48px;
}

.profile-card {
  max-width: 720px;
  margin: 0 auto;

  :deep(.el-card__header) {
    padding: 16px 20px;
  }
}

.card-head {
  display: flex;
  align-items: baseline;
  gap: 10px;

  .card-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--text);
  }

  .card-sub {
    font-size: 12px;
    color: var(--text-faint);
  }
}

/* ==================== 头像 ==================== */

.avatar-row {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 4px 0 8px;
}

.avatar-upload {
  flex: none;

  // el-upload 会给内部包一层 div，去掉它默认的 display:block 干扰
  :deep(.el-upload) {
    display: block;
    border-radius: 50%;
  }
}

.avatar-box {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  background: var(--panel-2);
  border: 1px solid var(--line);
  transition: border-color 0.18s ease;

  &:hover {
    border-color: var(--gold-2);
  }

  .avatar-fallback {
    color: var(--gold);
    font-size: 30px;
    font-weight: 600;
  }

  .avatar-mask {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: 11px;
    color: #fff;
    background: rgba(0, 0, 0, 0.42);
    opacity: 0;
    transition: opacity 0.18s ease;

    .el-icon {
      font-size: 18px;
    }
  }

  &:hover .avatar-mask,
  &.loading .avatar-mask {
    opacity: 1;
  }
}

.avatar-tip {
  min-width: 0;

  .avatar-nick {
    font-size: 16px;
    font-weight: 500;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .avatar-hint {
    margin-top: 4px;
    font-size: 12px;
    color: var(--text-faint);
    line-height: 1.5;
  }
}

/* ==================== 表单 ==================== */

.field-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-faint);
  line-height: 1.5;
}

.empty-tip {
  margin: 4px 0 18px;
}

.actions {
  display: flex;
  gap: 10px;
}
</style>
