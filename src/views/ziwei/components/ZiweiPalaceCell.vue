<template>
  <div class="cell" :class="cellClass" role="button" tabindex="0"
       :aria-pressed="selected" @click="emit('select', palace.index)"
       @keyup.enter="emit('select', palace.index)" @keyup.space.prevent="emit('select', palace.index)">
    <!-- 宫名 + 身宫 + 大限区间：一行里把「这是哪一宫」「这一宫管到哪几步岁数」说清
         左上角的关系角标只在点了别的宫之后出现（对 / 合 / 夹），没点时盘面一个字不多 -->
    <div class="cell-head">
      <span v-if="mark" class="mark">{{ mark }}</span>
      <span class="palace">{{ palace.palace }}</span>
      <span v-if="palace.bodyPalace" class="shen">身</span>
      <span v-if="palace.decadalStartAge != null" class="ages">
        {{ palace.decadalStartAge }}–{{ palace.decadalEndAge }}
      </span>
    </div>

    <!-- 主星：名 + 亮度 + 四化角标 -->
    <div class="stars">
      <span v-for="s in palace.stars" :key="s.name" class="star" :class="brClass(s.brightness)">
        <b>{{ s.name }}</b>
        <i v-if="s.brightness">{{ s.brightness }}</i>
        <em v-if="s.transform" :class="huaClass(s.transform)">{{ huaShort(s.transform) }}</em>
      </span>
      <span v-if="!palace.stars.length" class="empty">无主星</span>
    </div>

    <!-- 杂曜与十二神：字号压到最小，只在想看的时候看 -->
    <div v-if="palace.minorStars?.length" class="minor">
      {{ palace.minorStars.map(s => s.name).join(' ') }}
    </div>
    <div v-if="palace.twelveGods?.length" class="god">
      {{ palace.twelveGods.map(s => s.name).join(' ') }}
    </div>

    <!-- 宫干支 + 运限叠宫：叠的那两格只有取到运限才出现 -->
    <div class="cell-foot">
      <span class="gz">{{ palace.gan }}{{ palace.zhi }}</span>
      <span v-if="decadalName" class="lim dec">大·{{ decadalName }}</span>
      <span v-if="yearlyName" class="lim ynr">流·{{ yearlyName }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import type {ZiweiPalaceVo} from '@/api/module/ziwei/types';

const props = defineProps<{
  palace: ZiweiPalaceVo;
  /** 该格在大限盘上的宫名（后端 palaceNames 按本命地支下标给） */
  decadalName?: string;
  /** 该格在流年盘上的宫名 */
  yearlyName?: string;
  /** 这一格是不是当前展开详情的那一格 */
  selected?: boolean;
  /** 相对当前选中宫的关系角标：对 / 合 / 夹，空串表示不标 */
  mark?: string;
}>();

const emit = defineEmits<{ select: [index: number] }>();

const isMing = computed(() => props.palace.palace === '命宫');

const cellClass = computed(() => ({
  'is-ming': isMing.value,
  'is-selected': props.selected,
  'is-related': !props.selected && !!props.mark,
}));

/**
 * 亮度分档上色：庙旺是最强的一档，不/陷是最弱的一档，中间三档合成中性。
 * 取的是引擎 StarBrightness 的七档，不做二次判断 —— 哪颗星在哪一宫是什么亮度，
 * 是数据表说了算（本页只展示，且酉宫三格的庙旺表还没拍板，见 docs/ziwei-module-plan §11）。
 */
const brClass = (b?: string | null) => {
  if (!b) return '';
  if (b === '庙' || b === '旺') return 'is-strong';
  if (b === '不' || b === '陷') return 'is-weak';
  return 'is-mid';
};

/** 化名可能是「化禄」这种全名，盘面窄，落单字 */
const huaShort = (t?: string | null) => (t ? t.replace(/^化/, '') : '');

const huaClass = (t?: string | null) => {
  const key = huaShort(t);
  return key === '忌' ? 'hua-ji' : (key === '禄' ? 'hua-lu' : (key === '权' ? 'hua-quan' : 'hua-ke'));
};
</script>

<style scoped lang="scss">
.cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 6px 7px;
  background: var(--panel);
  border: 1px solid var(--line);
  // 内嵌一圈细边：12 格拼起来后每格各自成格，而不是糊成一片面板
  box-shadow: inset 0 0 0 1px var(--panel-2);

  &.is-ming {
    background: var(--gold-wash);
    border-color: var(--gold-soft);
  }

  // 一格 = 一个地支位，点它就把这一格的完整读法展开在下面（再点一次收回）
  cursor: pointer;

  &:hover {
    border-color: var(--line-strong);
  }

  &:focus-visible {
    outline: 2px solid var(--blue);
    outline-offset: -2px;
  }

  &.is-selected {
    border-color: var(--gold);
    box-shadow: inset 0 0 0 2px var(--gold);
  }

  &.is-related {
    border-color: var(--gold-soft);
    background: var(--bg-soft);
  }
}

.cell-head {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-dim);

  // 关系角标刻意不用「身」那种实心色块：两者同排出现时不能看着像同一类标记
  .mark {
    padding: 0 3px;
    border: 1px solid var(--blue);
    border-radius: 2px;
    color: var(--blue);
    font-size: 10px;
    line-height: 14px;
  }

  .palace {
    font-weight: 600;
    color: var(--text);
  }

  .shen {
    padding: 0 3px;
    border-radius: 2px;
    background: var(--blue);
    color: #fff;
    font-size: 10px;
    line-height: 14px;
  }

  .ages {
    margin-left: auto;
    font-size: 10px;
    color: var(--text-faint);
    font-family: var(--mono);
  }
}

.stars {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 6px;
  min-height: 34px;

  .star {
    display: inline-flex;
    align-items: baseline;
    gap: 1px;
    font-size: 13px;

    b {
      font-weight: 600;
      color: var(--text);
    }

    i {
      font-style: normal;
      font-size: 10px;
      color: var(--text-faint);
    }

    em {
      font-style: normal;
      padding: 0 2px;
      border-radius: 2px;
      font-size: 10px;
      line-height: 13px;
    }

    &.is-strong b {
      color: var(--gold);
    }

    &.is-weak b {
      color: var(--text-faint);
    }
  }

  .empty {
    font-size: 12px;
    color: var(--text-faint);
  }
}

.hua-lu {
  background: var(--green);
  color: #fff;
}

.hua-quan {
  background: var(--blue);
  color: #fff;
}

.hua-ke {
  background: var(--gold);
  color: #1a1a1a;
}

.hua-ji {
  background: var(--red);
  color: #fff;
}

.minor,
.god {
  font-size: 10px;
  line-height: 1.5;
  color: var(--text-faint);
  word-break: break-all;
}

.god {
  color: var(--text-dim);
  opacity: .75;
}

.cell-foot {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  font-size: 10px;

  .gz {
    font-family: var(--mono);
    color: var(--text-dim);
  }

  .lim {
    padding: 0 3px;
    border-radius: 2px;
    border: 1px solid var(--line);
    color: var(--text-dim);

    &.dec {
      border-color: var(--gold-soft);
      color: var(--gold);
    }
  }
}
</style>
