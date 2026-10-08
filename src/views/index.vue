<template>
  <div class="container">
    <!-- 星空背景 -->
    <StarsBackground :star-count="200"/>
    <!-- 流星背景 -->
    <MeteorBackground :meteor-count="3"/>

    <!-- 主标题 -->
    <h1 class="main-title">探索命运奥秘</h1>
    <p class="subtitle">通过千年易学智慧，解析八字命理，洞悉事业、姻缘与财富</p>

    <div class="btn-container">
      <el-button class="btn-seek" type="success" plain @click="formDialogVisible = true">开始探索</el-button>
    </div>

    <!-- 特性展示 -->
    <div class="features">
      <div v-for="(item, index) in features" :key="index" class="feature-card feature">
        <div v-if="item.icon=='taiji'" class="taiji">
          <Taiji :size="60" primary-color="#fff" secondary-color="#222"
                 :duration="5"/>
        </div>
        <div v-else class="feature-icon" :class="item.icon"></div>
        <div class="feature-text">
          <h3>{{ item.title }}</h3>
          <p>{{ item.desc }}</p>
        </div>
      </div>
    </div>


    <!-- 模态框 -->
    <el-dialog
        v-model="formDialogVisible"
        title="生辰录入"
        width="500"
        draggable
        center
        align-center
    >

      <el-form :model="form" size="large" label-width="auto" style="max-width: 500px">
        <el-form-item label="性别" >
          <el-radio-group v-model="form.sex">
            <el-radio :value="1">男</el-radio>
            <el-radio :value="0">女</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="日历" >
          <el-radio-group v-model="form.dateType">
            <el-radio :value="1">新历</el-radio>
            <el-radio :value="2">农历</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="form.dateType === 2" label="闰月" >
          <el-checkbox v-model="form.leapMonth">按闰月排（该年确有这个闰月时生效）</el-checkbox>
        </el-form-item>

        <el-form-item label="您的生日" >
          <el-date-picker
              v-model="form.dateTime"
              type="datetime"
              placeholder="请选择您的生辰"
              class="hologram-date-picker"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
              :disabled-date="disabledFutureDate"
          />
        </el-form-item>

        <!-- 出生地：只在浅层取经度即可，市级坐标对时辰的影响与区县级差异极小 -->
        <el-form-item label="出生地" >
          <div class="region-picker">
            <el-select v-model="region.province" placeholder="省" filterable clearable
                       @change="onProvinceChange">
              <el-option v-for="p in region.provinces" :key="p.code" :label="p.name" :value="p.code"/>
            </el-select>
            <el-select v-model="region.city" placeholder="市（选填）" filterable clearable
                       :disabled="!region.cities.length" @change="onCityChange">
              <el-option v-for="c in region.cities" :key="c.code" :label="c.name" :value="c.code"/>
            </el-select>
          </div>
        </el-form-item>

        <el-form-item label="真太阳时" >
          <div class="tst-line">
            <el-switch v-model="form.useTrueSolarTime"/>
            <el-checkbox v-if="form.useTrueSolarTime" v-model="form.withEquationOfTime">含均时差</el-checkbox>
            <span v-if="tstActive" class="tst-preview">{{ tstCorrectedText }}<em>{{ tstOffsetText }}</em></span>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="formDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="submitForm" :disabled="!formValid">
            开始探索
          </el-button>
        </div>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import {ref, reactive, computed, onMounted} from 'vue';
import {useRouter} from 'vue-router';
import StarsBackground from "@/components/StartBackground.vue";
import MeteorBackground from "@/components/MeteorBackground.vue";
import Taiji from "@/components/Taiji.vue";
import {getRegionChildren} from "@/api/module/bazi";
import type {BaziQuery, RegionVo} from "@/api/module/bazi/types";

const router = useRouter();
const formDialogVisible = ref(false);

const form = reactive<BaziQuery>({
  dateType: 2,
  sex: 1,
  dateTime: '',
  username: '',
  // 真太阳时默认关（与后端 PillarDto 默认值一致，保历史行为）
  longitude: null,
  useTrueSolarTime: false,
  withEquationOfTime: false,
  leapMonth: false,
});

const formValid = computed(() => form.dateTime !== null && form.dateTime != '');

/* ---- 出生地（省 / 市 两级，只要经度） ---- */
const region = reactive({
  provinces: [] as RegionVo[],
  cities: [] as RegionVo[],
  province: null as string | null,
  city: null as string | null,
  picked: null as RegionVo | null,
});

const fetchRegions = (parentCode?: string): Promise<RegionVo[]> =>
    getRegionChildren(parentCode)
        .then((r: any) => (r?.code === 200 ? ((r.data || []) as RegionVo[]) : []))
        .catch((error: unknown) => {
          console.error('加载行政区失败：', error);
          return [];
        });

const applyPicked = (r?: RegionVo) => {
  region.picked = r || null;
  if (r && r.longitude != null) {
    form.longitude = Number(r.longitude);
  } else if (r) {
    form.longitude = null;
  }
};

const onProvinceChange = (code: string | null) => {
  region.province = code;
  region.cities = [];
  region.city = null;
  applyPicked(region.provinces.find(x => x.code === code));
  if (!code) return;
  fetchRegions(code).then(list => {
    region.cities = list;
  });
};

const onCityChange = (code: string | null) => {
  region.city = code || null;
  const c = region.cities.find(x => x.code === code);
  if (c) {
    applyPicked(c);
  } else {
    // 清掉市 → 退回省坐标（不能只传 undefined，那会保留已清掉那个市的经度）
    applyPicked(region.provinces.find(x => x.code === region.province));
  }
};

/* ---- 真太阳时预览（与后端同口径，仅用于回显；真正排盘由后端算） ---- */
const tstActive = computed(() => !!(form.useTrueSolarTime && form.longitude));

const tstOffsetMinutes = computed(() => {
  if (!tstActive.value) return 0;
  let m = Math.round((Number(form.longitude) - 120) * 4);
  if (form.withEquationOfTime) m += Math.round(equationOfTimeMinutes(form.dateTime));
  return m;
});

const tstOffsetText = computed(() => {
  const m = tstOffsetMinutes.value;
  if (!m) return '±0 分';
  return (m > 0 ? '+' : '') + m + ' 分';
});

const tstCorrectedText = computed(() => {
  const dt = form.dateTime;
  if (!dt) return '—';
  const d = new Date(String(dt).replace(/-/g, '/'));
  if (isNaN(d.getTime())) return '—';
  d.setMinutes(d.getMinutes() + tstOffsetMinutes.value);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
});

/** 均时差（分钟）—— 与后端 TrueSolarTime.equationOfTimeMinutes 同口径 */
const equationOfTimeMinutes = (dtStr?: string) => {
  if (!dtStr) return 0;
  const d = new Date(String(dtStr).replace(/-/g, '/'));
  if (isNaN(d.getTime())) return 0;
  const start = new Date(d.getFullYear(), 0, 0);
  const doy = Math.floor((d.getTime() - start.getTime()) / 86400000);
  const gamma = (2 * Math.PI / 365) * (doy - 1 + 0.5);
  return 229.18 * (0.000075
      + 0.001868 * Math.cos(gamma)
      - 0.032077 * Math.sin(gamma)
      - 0.014615 * Math.cos(2 * gamma)
      - 0.040849 * Math.sin(2 * gamma));
};

const disabledFutureDate = (time: Date) => time.getTime() > Date.now();

onMounted(() => {
  fetchRegions().then(list => {
    region.provinces = list;
  });
});

const submitForm = () => {
  if (!formValid.value) return;
  formDialogVisible.value = false;
  router.push({
    name: 'bazi',
    query: {
      dateType: form.dateType,
      sex: form.sex,
      dateTime: form.dateTime,
      username: form.username || undefined,
      // 联动参数：只在有意义时带上，避免 query 里出现一堆 undefined
      longitude: form.longitude ?? undefined,
      useTrueSolarTime: form.useTrueSolarTime ? '1' : undefined,
      withEquationOfTime: form.withEquationOfTime ? '1' : undefined,
      leapMonth: form.dateType === 2 && form.leapMonth ? '1' : undefined,
    }
  });
};

const features = [
  {icon: 'taiji', title: '命理乾坤', desc: '八字精解，融合千年易学智慧，深入剖析人生轨迹'},
  {icon: 'quantum', title: '大运流转', desc: '阴阳五行流转，揭示大运起伏，把握命运转折点'},
  {icon: 'ai', title: '智能解析', desc: '解锁专属命盘解析，洞悉事业、姻缘、财富的天地玄机'}
];
</script>

<style scoped lang="scss">

$cyber-blue: #00f3ff;
$neon-purple: #bc13fe;
$hologram-teal: #00ff9d;
$deep-space: #020617;


.container {
  min-height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  background: #0a0e17;
  font-family: 'Helvetica Neue', sans-serif;

  /* 主标题样式 */
  .main-title {
    font-size: 3.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    text-align: center;
    background: linear-gradient(45deg, #6a93cb, #a4bfef, #c2e9fb);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 0 20px rgba(164, 191, 239, 0.5);
  }

  .subtitle {
    font-size: 1.2rem;
    margin-bottom: 3rem;
    color: #a4bfef;
    text-align: center;
    max-width: 600px;
  }

}

/*按钮特效*/
.btn-container {
  text-align: center;
  margin: 2rem 0;
  position: relative;
  z-index: 10;

  // 添加装饰性光点元素
  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 8px;
    height: 8px;
    background: $hologram-teal;
    border-radius: 50%;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0.6;
    animation: float 3s ease-in-out infinite;
  }

  &::before {
    left: -20px;
    animation-delay: 0.5s;
  }

  &::after {
    right: -20px;
    animation-delay: 1s;
  }

  @keyframes float {
    0%, 100% { transform: translateY(-50%) scale(1); }
    50% { transform: translateY(-60%) scale(1.2); }
  }
}

.btn-seek {
  // 基础样式重置与增强
  position: relative;
  background: transparent !important;
  border: 2px solid $hologram-teal !important;
  color: $hologram-teal !important;
  padding: 12px 36px !important;
  font-size: 1.2rem !important;
  font-weight: 600;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.4s ease !important;

  // 霓虹光晕效果
  box-shadow:
      0 0 10px rgba(0, 255, 157, 0.5),
      0 0 20px rgba(0, 255, 157, 0.3),
      inset 0 0 15px rgba(0, 255, 157, 0.1);

  // 流光动画效果
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
            90deg,
            transparent,
            rgba(0, 255, 157, 0.4),
            transparent
    );
    transition: left 0.6s ease;
  }

  // 悬停特效
  &:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow:
        0 0 20px rgba(0, 255, 157, 0.8),
        0 0 40px rgba(0, 255, 157, 0.5),
        0 5px 15px rgba(0, 0, 0, 0.3),
        inset 0 0 20px rgba(0, 255, 157, 0.2);

    &::before {
      left: 100%;
    }

    &::after {
      width: 120%;
      height: 120%;
      opacity: 0;
    }
  }

  // 点击特效
  &:active {
    transform: translateY(1px) scale(0.98);
    transition-duration: 0.1s;
    box-shadow:
        0 0 10px rgba(0, 255, 157, 0.9),
        0 0 20px rgba(0, 255, 157, 0.6),
        inset 0 0 10px rgba(0, 255, 157, 0.3);
  }

  // 脉动吸引动画
  animation: subtle-pulse 3s ease-in-out infinite;
}

@keyframes subtle-pulse {
  0%, 100% {
    box-shadow:
        0 0 10px rgba(0, 255, 157, 0.5),
        0 0 20px rgba(0, 255, 157, 0.3),
        inset 0 0 15px rgba(0, 255, 157, 0.1);
  }
  50% {
    box-shadow:
        0 0 15px rgba(0, 255, 157, 0.7),
        0 0 30px rgba(0, 255, 157, 0.4),
        inset 0 0 20px rgba(0, 255, 157, 0.15);
  }
}

/* ==========================================================================
 * 生辰录入对话框里的补充参数（出生地 / 真太阳时）
 * ========================================================================= */
.region-picker {
  display: flex;
  gap: 10px;
  width: 100%;

  .el-select {
    flex: 1;
  }
}

.tst-line {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  line-height: 1.4;
}

/* 校正后的时刻预览，让人一眼看到「差了多少」 */
.tst-preview {
  font-size: 12px;
  color: var(--text-faint);
  font-family: var(--mono);

  em {
    font-style: normal;
    margin-left: 6px;
    padding: 0 5px;
    border-radius: 3px;
    background: var(--gold-wash);
    border: 1px solid var(--gold-soft);
    color: var(--gold);
    font-size: 11px;
  }
}


// 特性展示
.features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-top: 3rem;

  .feature {
    padding: 1.5rem;
    background: rgba(black, 0.3);
    border-radius: 12px;
    border: 1px solid rgba($cyber-blue, 0.1);
    transition: all 0.3s;

    &:hover {
      transform: translateY(-5px);
      border-color: $cyber-blue;
    }
  }

  .feature-icon {
    width: 60px;
    height: 60px;
    margin: 0 auto 1rem;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba($cyber-blue, 0.1);
      border-radius: 50%;
    }

    &.neural::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 30px;
      height: 30px;
      background: linear-gradient(45deg, transparent 45%, $cyber-blue 50%, transparent 55%),
      linear-gradient(-45deg, transparent 45%, $cyber-blue 50%, transparent 55%);
      transform: translate(-50%, -50%);
    }

    &.quantum::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 30px;
      height: 30px;
      background: radial-gradient(circle at 30% 30%, $cyber-blue 10%, transparent 11%),
      radial-gradient(circle at 70% 70%, $neon-purple 10%, transparent 11%);
      transform: translate(-50%, -50%);
      animation: orbit 4s linear infinite;
    }

    &.ai::after {
      content: 'AI';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: $hologram-teal;
      font-weight: bold;
      font-size: 1.2rem;
    }
  }

  @keyframes orbit {
    from {
      transform: translate(-50%, -50%) rotate(0deg);
    }
    to {
      transform: translate(-50%, -50%) rotate(360deg);
    }
  }

  /*太极组件图片大小*/
  .taiji {
    width: 60px;
    height: 60px;
    margin: 0 auto 1em;
  }


  .feature-text {
    color: white;
    text-align: center;

    h3 {
      color: $hologram-teal;
      margin-bottom: 0.5rem;
    }

    p {
      color: rgba(white, 0.7);
      font-size: 0.9rem;
    }
  }

}


</style>
