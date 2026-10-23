<template>
  <!-- ================= 起运 ================= -->
  <el-card class="block">
    <template #header>
      <div class="card-head">
        <div class="card-title">
          起运
          <span class="hint">从出生时刻推算到交运时刻的完整链条</span>
        </div>
        <el-radio-group v-if="ctx.sectCount > 1" v-model="ctx.sect" size="small">
          <el-radio-button v-for="opt in ctx.availableSectOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </el-radio-button>
        </el-radio-group>
      </div>
    </template>

    <div class="chain">
      <div class="chain-node">
        <div class="cn-label">① 出生时刻</div>
        <div class="cn-value">{{ ctx.fmt(ctx.qiYun.birthday) }}</div>
      </div>
      <div class="chain-node">
        <div class="cn-label">② 参照节令（{{ ctx.qiYun.contrary ? '逆推·上一个节' : '顺推·下一个节' }}）</div>
        <div class="cn-value">{{ ctx.fmt(ctx.qiYun.solarTermDateTime) }}</div>
      </div>
      <div class="chain-node">
        <div class="cn-label">③ 换算方式</div>
        <div class="cn-value">{{ ctx.sectLabel }}</div>
      </div>
      <div class="chain-node is-key">
        <div class="cn-label">④ 起运读数</div>
        <div class="cn-value">{{ ctx.startYunText }}</div>
      </div>
      <div class="chain-node is-key">
        <div class="cn-label">⑤ 交运时刻</div>
        <div class="cn-value">{{ ctx.fmt(ctx.qiYun.startYunDateTime) }}</div>
      </div>
    </div>

    <div class="qiyun-grid">
      <div class="qiyun-item is-key">
        <div class="label">起运时刻</div>
        <div class="value mono">{{ ctx.fmt(ctx.qiYun.startYunDateTime) }}</div>
      </div>
      <div class="qiyun-item">
        <div class="label">顺推 / 逆推</div>
        <div class="value">
          {{ ctx.qiYun.contrary ? '逆推' : '顺推' }}
          <span class="sub">（{{ ctx.qiYun.contrary ? '阴年男 / 阳年女' : '阳年男 / 阴年女' }}）</span>
        </div>
      </div>
      <div class="qiyun-item">
        <div class="label">第一步大运</div>
        <div class="value">{{ ctx.firstYunText }}</div>
      </div>
      <div class="qiyun-item">
        <div class="label">当前所处</div>
        <div class="value">{{ ctx.currentYunText }}</div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import type {BaziCtx} from '../composables/useBaziCtx';

const props = defineProps<{ctx: BaziCtx}>();
const ctx = props.ctx;
</script>

<style scoped lang="scss">
@use '@/views/shared/styles/card-chrome';

/* ============================ 起运推算链 ============================ */

.chain {
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: 14px;
}

.chain-node {
  flex: 1 1 0;
  min-width: 132px;
  padding: 10px 14px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-right: none;
  position: relative;

  &:first-child {
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  }

  &:last-child {
    border-right: 1px solid var(--line);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }

  &.is-key {
    background: var(--gold-wash);
    border-color: var(--gold-soft);
  }

  /* 节点之间的箭头 */
  &:not(:last-child)::after {
    content: '›';
    position: absolute;
    right: -7px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-faint);
    font-size: 16px;
    line-height: 1;
    z-index: 1;
  }

  .cn-label {
    font-size: 11px;
    color: var(--text-faint);
    letter-spacing: 0.5px;
  }

  .cn-value {
    font-size: 13px;
    font-weight: 500;
    margin-top: 2px;
    font-family: var(--mono);
    color: var(--text);
  }
}

.qiyun-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
}

.qiyun-item {
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 10px 12px;

  &.is-key {
    background: var(--gold-wash);
    border-color: var(--gold-soft);
  }

  .label {
    font-size: 12px;
    color: var(--text-faint);
    margin-bottom: 4px;
  }

  .value {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
    word-break: break-all;

    &.mono {
      font-family: var(--mono);
      font-size: 13px;
    }

    .sub {
      font-size: 12px;
      color: var(--text-faint);
      font-weight: 400;
    }
  }
}
</style>
