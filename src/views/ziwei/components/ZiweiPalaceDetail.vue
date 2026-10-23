<template>
  <el-card v-if="d" class="block detail">
    <template #header>
      <div class="card-head">
        <div class="card-title">
          {{ d.palace.palace }}详情
          <small class="hint">{{ d.palace.gan }}{{ d.palace.zhi }} · 地支第 {{ d.palace.index + 1 }} 位
            <template v-if="d.palace.bodyPalace"> · 身宫所在</template>
            <template v-if="d.palace.decadalStartAge != null"> · 大限 {{ d.palace.decadalStartAge }}–{{ d.palace.decadalEndAge }}</template>
          </small>
        </div>
        <el-button size="small" text @click="close">收起</el-button>
      </div>
    </template>

    <div class="grid">
      <section>
        <h4>本宫星曜</h4>
        <p v-if="!d.palace.stars.length" class="none">本宫无主星，对宫的星曜见下方「三方四正」那一表</p>
        <ul v-else class="star-list">
          <li v-for="s in d.palace.stars" :key="s.name">
            <b>{{ s.name }}</b>
            <i v-if="s.brightness">{{ s.brightness }}</i>
            <em v-if="s.transform" :class="huaClass(s.transform)">{{ s.transform }}</em>
          </li>
        </ul>
        <div v-for="g in d.minorGroups" :key="g.name" class="group">
          <span class="group-name">{{ g.name }}</span>
          <span class="group-stars">{{ g.stars.map(s => s.name).join(' ') }}</span>
        </div>
        <div v-if="d.palace.twelveGods.length" class="group">
          <span class="group-name">十二神</span>
          <span class="group-stars">{{ d.palace.twelveGods.map(s => s.name).join(' ') }}</span>
        </div>
      </section>

      <section>
        <h4>三方四正与夹宫</h4>
        <table class="rel-table">
          <tbody>
          <tr v-for="r in d.related" :key="r.label">
            <td class="rel-label" :title="r.note">{{ r.label }}</td>
            <td class="rel-palace">{{ palaceName(r.index) }}</td>
            <td class="rel-gz">{{ palaceGz(r.index) }}</td>
            <td class="rel-stars">{{ starsOf(r.index) }}</td>
          </tr>
          </tbody>
        </table>
        <p class="mini-note">
          「三合位」两名只在把本宫当命宫看时才是官禄位 / 财帛位，所以这里不写宫职名，只写它在本命盘上的实际宫名。
        </p>
      </section>

      <section>
        <h4>运限落本宫</h4>
        <p v-if="!d.limits.length" class="none">当前目标时刻没有任何限落到这一宫</p>
        <table v-else class="limit-table">
          <tbody>
          <tr v-for="l in d.limits" :key="l.name">
            <td class="scope">{{ l.name }}</td>
            <td class="lim-palace">{{ l.palaceName || '—' }}</td>
            <td class="lim-stars">{{ l.stars.map(s => s.name + '·' + s.zhi).join('　') || '—' }}</td>
          </tr>
          </tbody>
        </table>
        <div v-if="d.minorLimitAges.length" class="strip">
          <span class="group-name">小限虚岁</span>
          <span class="ages">{{ d.minorLimitAges.join('、') }}</span>
        </div>
      </section>
    </div>

    <p class="note">
      这一格只摊开盘面已有的数据：星曜、宫位、干支、大限小限与六个限的落宫，
      以及由地支序号加减推出的位置关系。格局与断语的审核口径还没定，这里一个字都不补。
    </p>
  </el-card>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import type {ZiweiCtx} from '../composables/useZiweiCtx';

const props = defineProps<{ctx: ZiweiCtx}>();
const ctx = props.ctx;

const d = computed(() => ctx.detail);
const close = () => ctx.selectPalace(d.value!.palace.index);

/** 关系表里那一格的盘面读数：宫名 / 干支 / 主星，全部从原局盘取，不在这里二次加工 */
const palaceAt = (index: number) => ctx.palaces[index];
const palaceName = (index: number) => palaceAt(index)?.palace || '—';
const palaceGz = (index: number) => {
  const p = palaceAt(index);
  return p ? p.gan + p.zhi : '—';
};
const starsOf = (index: number) => {
  const p = palaceAt(index);
  if (!p) return '—';
  return p.stars.map(s => s.name + (s.brightness || '')).join(' ') || '无主星';
};

const huaClass = (t?: string | null) => {
  const key = (t || '').replace(/^化/, '');
  return key === '忌' ? 'hua-ji' : (key === '禄' ? 'hua-lu' : (key === '权' ? 'hua-quan' : 'hua-ke'));
};
</script>

<style scoped lang="scss">
@use '@/views/shared/styles/card-chrome';

.detail {
  margin-top: 16px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px 20px;
}

section {
  min-width: 0;
}

h4 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-dim);
}

.none {
  margin: 0;
  font-size: 12px;
  color: var(--text-faint);
}

.star-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;

  li {
    display: inline-flex;
    align-items: baseline;
    gap: 3px;
  }

  b {
    color: var(--text);
  }

  i {
    font-style: normal;
    font-size: 11px;
    color: var(--text-faint);
  }

  em {
    font-style: normal;
    padding: 0 3px;
    border-radius: 2px;
    font-size: 11px;
    color: #fff;
  }
}

.group,
.strip {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
}

.group-name {
  color: var(--text-faint);
  white-space: nowrap;
}

.group-stars,
.ages {
  color: var(--text-dim);
  font-family: var(--mono);
  word-break: break-all;
}

.rel-table,
.limit-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  td {
    padding: 4px 6px;
    border-bottom: 1px solid var(--line);
    text-align: left;
    vertical-align: top;
  }
}

.rel-label {
  color: var(--text-faint);
  white-space: nowrap;
}

.rel-palace {
  color: var(--gold);
  white-space: nowrap;
}

.rel-gz {
  font-family: var(--mono);
  color: var(--text-dim);
  white-space: nowrap;
}

.rel-stars {
  color: var(--text);
  word-break: break-all;
}

.scope {
  color: var(--text);
  font-weight: 600;
  white-space: nowrap;
}

.lim-palace {
  color: var(--gold);
  white-space: nowrap;
}

.lim-stars {
  color: var(--text-dim);
  word-break: break-all;
}

.hua-lu {
  background: var(--green);
}

.hua-quan {
  background: var(--blue);
}

.hua-ke {
  background: var(--gold);
  color: #1a1a1a;
}

.hua-ji {
  background: var(--red);
}

.mini-note,
.note {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-faint);
}

.note {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}
</style>
