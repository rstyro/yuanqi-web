<template>
  <el-card class="block">
    <template #header>
      <div class="card-head">
        <div class="card-title">
          运限
          <small class="hint">
            {{ horoscope?.targetDate || '—' }} · {{ horoscope?.targetLunarDate || '—' }}
            · 虚岁 {{ horoscope?.nominalAge ?? '—' }}
          </small>
        </div>
        <el-date-picker
            v-model="ctx.targetDate"
            type="datetime"
            placeholder="目标日期"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            size="small"
            style="width: 210px"
            @change="loadHoroscope"
        />
      </div>
    </template>

    <el-empty v-if="!horoscope" :description="limitLoading ? '正在取运限…' : '暂无运限数据'"/>

    <template v-else>
      <!-- 六个限一张表：每一限问的都是同四件事 —— 干支、落在哪一宫、虚岁、这个限自己带什么耀 -->
      <table class="limit-table">
        <thead>
        <tr>
          <th>限</th>
          <th>干支</th>
          <th>本命落宫</th>
          <th>岁数</th>
          <th>该限四化</th>
          <th>流耀</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="row in limits" :key="row.name">
          <td class="scope">{{ row.name }}</td>
          <td class="gz">{{ row.limit?.ganZhi }}</td>
          <td>
            <span class="zhi">{{ row.limit?.zhi }}</span>
            <span class="palace">{{ nativePalaceAt(row.limit) }}</span>
          </td>
          <td class="age">{{ ageText(row.limit) }}</td>
          <td>
            <span v-for="(star, hua) in row.limit?.fourTransforms" :key="hua" class="hua" :class="huaClass(hua)">
              {{ huaShort(hua) }}{{ star }}
            </span>
          </td>
          <td class="stars">
            {{ (row.limit?.stars ?? []).map(s => s.name + '·' + s.zhi).join('　') || '—' }}
          </td>
        </tr>
        </tbody>
      </table>

      <div class="strip">
        <span class="strip-label">大限十步</span>
        <span v-for="s in decadalSteps" :key="s.key" class="chip">
          {{ s.range }} {{ s.ganZhi }} · {{ s.palace }}
        </span>
      </div>

      <!-- 引擎给的是 1—125 虚岁全表，一百二十五枚 chip 平铺会把这张卡冲垮，所以放进定高滚框里 -->
      <div class="strip">
        <span class="strip-label">小限（1—125 虚岁）</span>
        <div class="chip-box">
          <span v-for="r in minorLimitRows" :key="r.key" class="chip">
            {{ r.age }}岁 {{ r.ganZhi }} · {{ r.palace }}
          </span>
        </div>
      </div>

      <p class="note">
        上表是「此刻走到哪一步」的坐标，星曜落宫与干支都来自原局盘同一套排法；
        方盘里每格右下角那两个角标，就是这张表的<b>大限</b>与<b>流年</b>两行摊回十二宫的样子。
      </p>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import type {ZiweiLimitVo} from '@/api/module/ziwei/types';
import type {ZiweiCtx} from '../composables/useZiweiCtx';

const props = defineProps<{ctx: ZiweiCtx}>();
const ctx = props.ctx;

const horoscope = computed(() => ctx.horoscope);
const limits = computed(() => ctx.limits);
const limitLoading = computed(() => ctx.limitLoading);
const loadHoroscope = () => ctx.loadHoroscope();
const decadalSteps = computed(() => ctx.decadalSteps);
const minorLimitRows = computed(() => ctx.minorLimitRows);

/**
 * 「落宫」那一列读的是<b>本命盘</b>上那一格的宫名 —— 即「这一限的命宫落在本命的哪一宫」。
 *
 * 不取限盘自己的宫名：`palaceNames[limit.index]` 恒等于「命宫」（限盘的命宫当然是命宫），
 * 摆出来是一列没有信息量的字。限盘宫名要看的是别的宫，那是方盘角标在做的事。
 */
const nativePalaceAt = (limit?: ZiweiLimitVo | null) => {
  const index = limit?.index;
  if (index == null) return '';
  return ctx.palaces[index]?.palace || '';
};

/**
 * 岁数一列：大限给区间，小限给当年虚岁；
 * 「童限」是未起运那一档，后端把 childhood 标出来，这里如实写「童限（未起运）」而不是留空。
 * 流年 / 流月 / 流日 / 流时四个限自己不带岁数（它们就是「此刻」），取整份运限的虚岁。
 */
const ageText = (limit?: ZiweiLimitVo | null) => {
  if (!limit) return '—';
  if (limit.childhood) return '童限（未起运）';
  if (limit.decadalStartAge != null && limit.decadalEndAge != null) {
    return `${limit.decadalStartAge}–${limit.decadalEndAge}`;
  }
  const age = limit.nominalAge ?? horoscope.value?.nominalAge;
  return age != null ? String(age) : '—';
};

const huaShort = (hua: string) => hua.replace(/^化/, '');
const huaClass = (hua: string) => {
  const key = huaShort(hua);
  return key === '忌' ? 'hua-ji' : (key === '禄' ? 'hua-lu' : (key === '权' ? 'hua-quan' : 'hua-ke'));
};
</script>

<style scoped lang="scss">
@use '@/views/shared/styles/card-chrome';

.limit-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  th,
  td {
    padding: 6px 8px;
    border-bottom: 1px solid var(--line);
    text-align: left;
    vertical-align: top;
  }

  th {
    color: var(--text-faint);
    font-weight: 400;
    white-space: nowrap;
  }

  .scope {
    color: var(--text);
    font-weight: 600;
    white-space: nowrap;
  }

  .gz,
  .zhi,
  .age {
    font-family: var(--mono);
    white-space: nowrap;
  }

  .palace {
    margin-left: 4px;
    color: var(--gold);
  }

  .stars {
    color: var(--text-dim);
    word-break: break-all;
  }
}

.hua {
  display: inline-block;
  margin: 0 4px 2px 0;
  padding: 0 4px;
  border-radius: 2px;
  font-size: 11px;
  line-height: 16px;
  color: #fff;
  white-space: nowrap;

  &.hua-lu {
    background: var(--green);
  }

  &.hua-quan {
    background: var(--blue);
  }

  &.hua-ke {
    background: var(--gold);
    color: #1a1a1a;
  }

  &.hua-ji {
    background: var(--red);
  }
}

.strip {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;

  .strip-label {
    font-size: 12px;
    color: var(--text-faint);
    white-space: nowrap;
  }

  .chip-box {
    flex: 1 1 100%;
    max-height: 112px;
    overflow-y: auto;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 6px;
  }

  .chip {
    padding: 1px 6px;
    border: 1px solid var(--line);
    border-radius: 10px;
    font-size: 11px;
    font-family: var(--mono);
    color: var(--text-dim);
    background: var(--panel-2);
  }
}

.note {
  margin: 14px 0 0;
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-faint);
}
</style>
