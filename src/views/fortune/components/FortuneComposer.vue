<template>
      <!-- ==================== 输入区（吸底） ==================== -->
      <div class="composer">
        <div class="composer-inner">
          <div v-if="ctx.rounds.length" class="chips">
            <el-button
                v-for="s in FOLLOW_SAMPLES"
                :key="s"
                size="small"
                round
                plain
                :disabled="ctx.busy"
                @click="ctx.send(s)"
            >{{ s }}</el-button>
          </div>

          <div class="input-box" :class="{ 'is-disabled': ctx.busy }">
            <el-input
                v-model="ctx.question"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 8 }"
                resize="none"
                :disabled="ctx.busy"
                placeholder="说出生辰八字，或直接追问…"
                @keydown.enter.exact.prevent="ctx.send()"
            />
            <div class="input-bar">
              <span class="input-tip">Enter 发送 · Shift + Enter 换行</span>
              <span class="bar-spacer"></span>
              <!-- 按钮被 disabled 时自身不派发鼠标事件，tooltip 会失效；
                   套一层 span 让 tooltip 有可命中的宿主，也顺便定住尺寸 -->
              <el-tooltip :content="ctx.sendTip" placement="top">
                <span class="send-wrap">
                  <el-button
                      type="primary"
                      circle
                      class="send-btn"
                      :icon="Promotion"
                      :loading="ctx.busy"
                      :disabled="!ctx.busy && !ctx.question.trim()"
                      @click="ctx.send()"
                  />
                </span>
              </el-tooltip>
            </div>
          </div>

          <p class="composer-hint">
            {{ ctx.busy
                ? '生成期间输入框会锁住 —— 同一会话并发会损坏对话记忆，后端也会直接拒绝。'
                : '追问会自动带上当前会话的命盘与生辰，不必重复生日。' }}
          </p>
        </div>
      </div>
</template>

<script setup lang="ts">
/**
 * 吸底输入区：示例追问 + 文本域 + 发送。
 */
import {Promotion} from '@element-plus/icons-vue';
import {FOLLOW_SAMPLES} from '../fortuneFormat';
import type {FortuneCtx} from '../composables/useFortuneCtx';

const props = defineProps<{ctx: FortuneCtx}>();
const ctx = props.ctx;
</script>

<style scoped lang="scss">
/* ==================== 输入区 ==================== */

.composer {
  position: sticky;
  bottom: 0;
  z-index: 20;
  // 左右内边距挪到 .composer-inner —— 内外层各管一半的话，
  // 输入框与上方正文的左边界会差一个 padding，看着是歪的。
  padding: 12px 0 18px;
  border-top: 1px solid var(--line);
  background: var(--bg-blur);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  // ⚠️ 这一条是常驻吸底条，「回到顶部」按钮必须浮在它上面：
  //    z-index 见 App.vue 的 .el-backtop（30），高度见 router/index.ts 里
  //    /fortune 的 backtopBottom（208）。改了本块高度，那两处要跟着核。
}

.composer-inner {
  // 与 .content 用同一套容器规则，输入框才会和正文对齐
  @include main-container($mainPad);
}

.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

/**
 * 输入区做成一个「盒子」：文本域在上、工具条在下。
 *
 * <p>为什么不是文本域 + 右侧按钮两列：按钮竖在右边会把文本域的可用宽度吃掉一截，
 * 而且长文换行时按钮高度会跟着撑开，看着很怪。收到盒内右下角之后，
 * 文本域能占满整行，输入区高度只随内容长。
 */
.input-box {
  position: relative;
  padding: 10px 10px 8px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--bg-soft);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    border-color: var(--line-strong);
  }

  &:focus-within {
    border-color: var(--gold-2);
    box-shadow: 0 0 0 4px var(--gold-wash);
  }

  &.is-disabled {
    opacity: 0.72;
  }

  // 焦点环画在整个盒子上，所以要把 textarea 自带的那圈描边关掉。
  // theme.css 给 .el-textarea__inner 上了 box-shadow 描边 + 白底，
  // 不关掉的话盒子里会再套一个更小的方框，边框会「双线」。
  :deep(.el-textarea__inner) {
    padding: 0 4px 6px 0;
    background: transparent;
    box-shadow: none;
    font-size: 14px;
    line-height: 1.75;

    &:hover,
    &:focus {
      box-shadow: none;
    }
  }

  // 禁用态 Element Plus 会给灰底，同样要在盒子里抹掉
  :deep(.el-textarea.is-disabled .el-textarea__inner) {
    background: transparent;
    color: var(--text-dim);
  }
}

.input-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 32px;
}

.input-tip {
  padding-left: 2px;
  font-size: 11px;
  color: var(--text-faint);
  user-select: none;
}

.bar-spacer {
  flex: 1;
}

.send-wrap {
  display: inline-flex;
}

.send-btn {
  width: 34px;
  height: 34px;
  padding: 0;
  font-size: 16px;
}

.composer-hint {
  margin: 8px 2px 0;
  font-size: 11px;
  color: var(--text-faint);
}

@media (max-width: 720px) {
  .composer {
    padding: 10px 0 14px;
  }

  .composer-inner {
    padding-left: 14px;
    padding-right: 14px;
  }

  .input-box {
    padding: 8px 8px 6px 12px;
  }

  // 窄屏没有 Shift+Enter 这个概念，提示语省掉，给文本域让宽度
  .input-tip {
    display: none;
  }
}
</style>
