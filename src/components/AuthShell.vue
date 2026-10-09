<template>
  <!--
    登录 / 注册两个页面的共同外壳：全屏星空 + 流星 + 居中的暗色玻璃卡。

    <h3>为什么抽出来</h3>
    两个页面除了表单字段不同，版式、背景、卡片皮肤、底部链接区完全一样。
    各写一份的后果是「改了一页忘了另一页」—— 这套视觉来回调的时候必然发生。

    <h3>它是全屏的，和首页 views/index.vue 一个路子</h3>
    首页不放 Header、自己铺满 100vh、用深色星空底；
    登录/注册照做（原先那版挂着 Header + 1100px 浅色容器，从首页点进登录会明显换了个站）。
  -->
  <div class="auth-shell">
    <!-- 与首页同一套背景组件，两页之间切换不会有割裂感 -->
    <StarsBackground :star-count="200"/>
    <MeteorBackground :meteor-count="3"/>

    <div class="auth-body">
      <div class="auth-brand">
        <h1 class="auth-title">{{ title }}</h1>
        <p v-if="subtitle" class="auth-subtitle">{{ subtitle }}</p>
      </div>

      <div class="auth-card">
        <slot/>
      </div>

      <div class="auth-foot">
        <slot name="foot"/>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import StarsBackground from '@/components/StartBackground.vue';
import MeteorBackground from '@/components/MeteorBackground.vue';

defineProps<{
  /** 主标题，跟首页一样走渐变字 */
  title: string;
  /** 副标题。不传则不占位 */
  subtitle?: string;
}>();
</script>

<style scoped lang="scss">
/* 首页的配色，抄同一组，别各写各的 */
$cyber-blue: #00f3ff;
$neon-purple: #bc13fe;
$hologram-teal: #00ff9d;
$star-blue: #a4bfef;
$deep-space: #0a0e17;

.auth-shell {
  position: relative;
  width: 100%;
  // min-height 而不是 height：注册表单在窄屏上会超过一屏，得让它长高、
  // 由 #app（overflow:auto）去滚。写成 height 会把超出的部分直接切掉。
  min-height: 100vh;
  // 流星的位移是 translateX(100vw)/translateY(100vh)，必然溢出；
  // 不裁掉会凭空多出一个横向滚动条。裁的是背景，不是内容（见上一条）。
  overflow: hidden;
  background:
      radial-gradient(900px 520px at 50% -12%, rgba($cyber-blue, 0.10), transparent 72%),
      radial-gradient(760px 560px at 88% 112%, rgba($neon-purple, 0.10), transparent 74%),
      $deep-space;
}

.auth-body {
  position: relative;
  z-index: 2; // 压在星空/流星之上（流星 z-index 是 1）
  box-sizing: border-box;
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 20px 40px;
}

.auth-brand {
  text-align: center;
  margin-bottom: 30px;
}

/* 与首页 .main-title 同一条渐变、同一层辉光 */
.auth-title {
  margin: 0;
  font-size: clamp(2rem, 6vw, 3rem);
  font-weight: 700;
  letter-spacing: 0.08em;
  background: linear-gradient(45deg, #6a93cb, #a4bfef, #c2e9fb);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 20px rgba($star-blue, 0.5);
}

.auth-subtitle {
  margin: 12px auto 0;
  max-width: 460px;
  font-size: 0.95rem;
  line-height: 1.6;
  color: $star-blue;
}

/* ==========================================================================
 * 卡片：自带暗色皮肤，不跟随全站明/暗主题
 *
 * 卡片底是固定的深色（和首页一致），所以里面所有表单控件都必须是暗色皮肤 ——
 * 否则用户在「明亮」主题下会看到「白输入框贴在黑卡片上」。
 * 这里就地覆盖 Element Plus 的令牌，只作用于本卡片及其后代；
 * 别忘了 :deep() 那段里还有一层控件级的覆盖，两者配合才完整。
 * ========================================================================= */
.auth-card {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: 400px;
  padding: 30px 28px 26px;
  border-radius: 18px;
  background: rgba(12, 20, 34, 0.74);
  border: 1px solid rgba($cyber-blue, 0.18);
  box-shadow:
      0 0 30px rgba($cyber-blue, 0.10),
      0 18px 50px rgba(0, 0, 0, 0.55),
      inset 0 0 40px rgba($cyber-blue, 0.04);
  backdrop-filter: blur(10px);

  /* Element Plus 变量：会被后代控件继承，所以写在卡片上就够 */
  --el-text-color-primary: #eaf1ff;
  --el-text-color-regular: #d6e2f5;
  --el-text-color-placeholder: #{rgba($star-blue, 0.45)};
  --el-border-color: #{rgba($cyber-blue, 0.22)};
  --el-border-color-light: #{rgba($cyber-blue, 0.16)};
  --el-border-color-hover: #{rgba($cyber-blue, 0.45)};
  --el-fill-color-blank: #{rgba(10, 20, 35, 0.85)};
  --el-bg-color: #{rgba(10, 20, 35, 0.85)};

  :deep(.el-form-item__label) {
    font-size: 13px;
    color: rgba($star-blue, 0.85);
  }

  :deep(.el-form-item__error) {
    color: #ff9b9b;
  }

  :deep(.el-input__wrapper) {
    border-radius: 8px;
    background-color: rgba(255, 255, 255, 0.045);
    box-shadow: 0 0 0 1px rgba($cyber-blue, 0.20) inset;
    transition: box-shadow 0.2s ease;

    &:hover {
      box-shadow: 0 0 0 1px rgba($cyber-blue, 0.40) inset;
    }

    &.is-focus {
      box-shadow:
          0 0 0 1px $cyber-blue inset,
          0 0 12px rgba($cyber-blue, 0.25);
    }
  }

  :deep(.el-input__inner) {
    color: #eaf1ff;

    &::placeholder {
      color: rgba($star-blue, 0.45);
    }
  }

  :deep(.el-input__prefix),
  :deep(.el-input__suffix) {
    color: rgba($star-blue, 0.6);
  }

  /* 表单级错误提示（后端返回的业务错误）。默认那套是浅色底的，压在暗卡片上太扎眼 */
  :deep(.auth-error.el-alert) {
    margin-bottom: 16px;
    padding: 9px 12px;
    border-radius: 8px;
    background: rgba(245, 108, 108, 0.12);
    border: 1px solid rgba(245, 108, 108, 0.4);

    .el-alert__title {
      font-size: 13px;
      line-height: 1.5;
      color: #ffb4b4;
    }

    .el-alert__icon {
      color: #f56c6c;
    }
  }

  /* 主按钮：与首页「开始探索」同款霓虹描边 + 脉动光晕 */
  :deep(.auth-submit.el-button) {
    width: 100%;
    height: 46px;
    margin-top: 4px;
    border: 2px solid $hologram-teal;
    border-radius: 10px;
    background: rgba($hologram-teal, 0.06);
    color: $hologram-teal;
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 0.3em;
    // letter-spacing 会在末字右侧也留白，靠缩进补回来才视觉居中
    text-indent: 0.3em;
    box-shadow:
        0 0 10px rgba($hologram-teal, 0.35),
        inset 0 0 14px rgba($hologram-teal, 0.08);
    transition: all 0.3s ease;

    &:hover,
    &:focus-visible {
      border-color: $hologram-teal;
      background: rgba($hologram-teal, 0.14);
      color: #b9ffe4;
      transform: translateY(-2px);
      box-shadow:
          0 0 20px rgba($hologram-teal, 0.6),
          0 0 38px rgba($hologram-teal, 0.3),
          inset 0 0 18px rgba($hologram-teal, 0.15);
    }

    // 加载 / 禁用时把位移和辉光收掉，否则「转圈中」的按钮还在一跳一跳
    &.is-loading,
    &.is-disabled {
      transform: none;
      opacity: 0.6;
    }
  }

  /* 次级按钮（发送验证码） */
  :deep(.auth-ghost.el-button) {
    border: 1px solid rgba($cyber-blue, 0.3);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    color: $star-blue;

    &:hover,
    &:focus-visible {
      border-color: rgba($cyber-blue, 0.6);
      background: rgba($cyber-blue, 0.1);
      color: #eaf1ff;
    }
  }

  /* 验证码一行：输入框吃掉剩余宽度，按钮固定宽 */
  :deep(.auth-code-row) {
    display: flex;
    gap: 10px;
    width: 100%;

    .el-input {
      flex: 1;
      min-width: 0;
    }

    .el-button {
      flex: none;
    }
  }
}

.auth-foot {
  margin-top: 18px;
  font-size: 13px;
  color: rgba($star-blue, 0.75);
  text-align: center;

  :deep(.el-button.is-link) {
    height: auto;
    padding: 0 2px;
    font-size: 13px;
    color: $hologram-teal;

    &:hover,
    &:focus-visible {
      color: #b9ffe4;
    }
  }

  :deep(.auth-sep) {
    margin: 0 4px;
    color: rgba($star-blue, 0.4);
  }
}

@media (max-width: 480px) {
  .auth-card {
    padding: 24px 18px 20px;

    /* 窄屏上「输入框 + 发送按钮」挤一行会把输入框压得只剩几个字宽 */
    :deep(.auth-code-row) {
      flex-direction: column;
      gap: 8px;
    }
  }
}
</style>
