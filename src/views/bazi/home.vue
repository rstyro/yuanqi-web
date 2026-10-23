<template>
  <div class="bazi-page">
    <Header/>

    <div class="page">
      <!-- ================= 页头 ================= -->
      <div class="page-head">
        <div class="page-title">
          生辰八字
          <small v-if="ctx.pillarVo.gregorianDate">{{ ctx.pillarVo.gregorianDate }}</small>
        </div>
        <div class="head-actions">
          <el-button size="small" @click="ctx.showFormBox">
            {{ ctx.showForm ? '收起' : '录入生辰' }}
          </el-button>
          <el-button
              v-if="ctx.loaded"
              size="small"
              type="primary"
              @click="goFortune"
          >AI 推演
          </el-button>
          <el-button
              v-if="ctx.loaded"
              size="small"
              :loading="reportCreating"
              @click="goReport"
          >详细报告
          </el-button>
        </div>
      </div>

      <BaziForm :ctx="ctx"/>

      <!-- ================= 空状态 ================= -->
      <el-card v-if="!ctx.loaded" class="empty-card">
        <el-empty :description="ctx.loading ? '正在排盘…' : '点击「录入生辰」并提交，开始排盘'"/>
      </el-card>

      <template v-else>
        <SummaryBar :ctx="ctx"/>
        <QiYunCard :ctx="ctx"/>
        <SectCompareCard :ctx="ctx"/>
        <PillarTableCard :ctx="ctx"/>
        <YunTimelineCard :ctx="ctx"/>
        <LiuNianTimelineCard :ctx="ctx"/>
        <LiuYueTimelineCard :ctx="ctx"/>
        <PatternCard :ctx="ctx"/>
        <RelationPanel :ctx="ctx"/>
        <KinPanel :ctx="ctx"/>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {ElMessage} from 'element-plus';
import Header from '@/components/Header.vue';
import {generateReport} from '@/api/module/fortune';
import {useUserInfoStore} from '@/store/userInfo';
import {goLogin} from '@/utils/auth';
import {useBaziCtx} from './composables/useBaziCtx';
import BaziForm from '@/views/shared/components/BaziForm.vue';
import SummaryBar from './components/SummaryBar.vue';
import QiYunCard from './components/QiYunCard.vue';
import SectCompareCard from './components/SectCompareCard.vue';
import PillarTableCard from './components/PillarTableCard.vue';
import YunTimelineCard from './components/YunTimelineCard.vue';
import LiuNianTimelineCard from './components/LiuNianTimelineCard.vue';
import LiuYueTimelineCard from './components/LiuYueTimelineCard.vue';
import PatternCard from './components/PatternCard.vue';
import RelationPanel from './components/RelationPanel.vue';
import KinPanel from './components/KinPanel.vue';

const route = useRoute();
const router = useRouter();

/**
 * 整页的视图模型：表单状态 + 排盘结果 + 全部派生视图，合成一个 reactive 对象。
 *
 * 页面本身只负责两件事 —— 编排（挂载时读地址栏、发请求）和「页头 / 空状态」这两个
 * 不属于任何分区的壳；其余每个分区各是一个子组件，绑的都是这同一个 ctx。
 */
const ctx = useBaziCtx();

/* ==========================================================================
 * 跳 AI 推演 / 生成详细报告
 * ========================================================================= */

/**
 * 带着本次排盘的口径跳到 AI 推演页。
 *
 * <p>带过去的东西分两类，缺一不可：
 * <ul>
 *   <li>{@code dateTime} / {@code dateType} / {@code sex} / {@code leapMonth} ——
 *       推演页把它们还原成一句预填的话，AI 从话里抽出来（用户可以直接改那句话）；</li>
 *   <li>{@code birthPlace} / {@code useTrueSolarTime} / {@code withEquationOfTime} ——
 *       推演页用不着「读懂」它们，原样塞进请求体的 {@code birth} 字段，
 *       由后端并进本次会话的口径。这三样是抽取器抽不出来的：
 *       用户不会说「请按真太阳时排盘」这种话，均时差更是只有页面上才有这个开关。</li>
 * </ul>
 *
 * <p>⚠️ {@code birthPlace} 必须带 —— 后端是<b>按地名</b>去 {@code base_region_geo}
 * 查经度的（那边是同一张表，查出来与这里的 {@code longitude} 是同一个数）。
 * 只传经度不传地名的话，AI 侧的上下文就没法说「出生地深圳市（东经 114.06°）」，
 * 报错时也少一个唯一线索。
 *
 * <p>{@code longitude} 仍然要带：推演页刷新/回退到本页时，
 * 表单要靠它把真太阳时那一行的经度回显出来（见 {@code onMounted} 里的 query 还原）。
 */
const goFortune = () => {
  router.push({
    name: 'fortune',
    query: {
      dateType: ctx.pillarDto.dateType,
      sex: ctx.pillarDto.sex,
      dateTime: ctx.pillarDto.dateTime,
      longitude: ctx.pillarDto.longitude ?? undefined,
      birthPlace: ctx.region.picked?.name ?? undefined,
      useTrueSolarTime: ctx.pillarDto.useTrueSolarTime ? '1' : undefined,
      withEquationOfTime: ctx.pillarDto.withEquationOfTime ? '1' : undefined,
      leapMonth: ctx.pillarDto.leapMonth ? '1' : undefined,
    },
  });
};

const userInfoStore = useUserInfoStore();
/** 「详细报告」建单中的 loading。建单即返回，但那一两秒该给个反馈 */
const reportCreating = ref(false);

/**
 * 排盘页一键生成详细报告：拿当前表单口径建单，然后进详情页看后台逐章生成。
 *
 * <p>生辰入参与 {@link BaziQuery} 同口径（含出生地与真太阳时开关）——
 * 后端按它排盘存快照，之后重试/续跑都不重排。
 *
 * <p>⚠️ {@code dateTime} 是 {@code yyyy-MM-dd HH:mm:ss}（el-date-picker 的
 * value-format 定的），与报告接口要的格式一致；别改成 ISO 的 {@code T}。
 *
 * <p>未登录先去登录（登完回 /bazi）—— 否则建单请求会吃一个 401，
 * 拦截器虽然也会跳登录，但那时用户已经白点了一次。
 */
const goReport = async () => {
  if (!userInfoStore.isLoggedIn) {
    goLogin('/bazi');
    return;
  }
  if (!ctx.pillarDto.dateTime) {
    ElMessage.warning('先录入生辰再生成报告');
    return;
  }
  reportCreating.value = true;
  try {
    const res = await generateReport({
      birth: {
        dateType: ctx.pillarDto.dateType,
        sex: ctx.pillarDto.sex,
        dateTime: ctx.pillarDto.dateTime,
        leapMonth: ctx.pillarDto.leapMonth,
        username: ctx.pillarDto.username,
        longitude: ctx.pillarDto.longitude,
        birthPlace: ctx.region.picked?.name,
        useTrueSolarTime: ctx.pillarDto.useTrueSolarTime,
        withEquationOfTime: ctx.pillarDto.withEquationOfTime,
      },
    });
    // 后端 Long 序列化成字符串，这里本来就是 string，直接当路由参数用
    const id = res.data;
    if (id) {
      router.push({name: 'report-detail', params: {id}});
    }
  } catch (e) {
    // 业务错误（排不出盘等）已由 axios 拦截器弹出中文提示，这里只兜底日志
    console.error('生成详细报告失败：', e);
  } finally {
    reportCreating.value = false;
  }
};

/* ==========================================================================
 * 生命周期
 * ========================================================================= */

/** route.query 的值可能是 string | string[] | null，统一成 string */
const q = (v: unknown): string | undefined => {
  if (Array.isArray(v)) return v[0];
  return v == null ? undefined : String(v);
};

/**
 * 把地址栏上的参数读进表单。
 *
 * 抽成函数是因为它有两个触发点：首次挂载，以及<b>同路由换 query</b>
 * （例如用户从首页带着新的生辰再次跳进来）。后者 vue-router 会复用组件实例，
 * `onMounted` 不会再跑，只 watch query 才不会停在上一份命盘上。
 */
const applyRouteQuery = () => {
  ctx.pillarDto.dateType = Number(q(route.query.dateType)) || 1;
  const sex = Number(q(route.query.sex));
  ctx.pillarDto.sex = Number.isNaN(sex) ? 1 : sex;
  ctx.pillarDto.username = q(route.query.username) || '';
  ctx.pillarDto.dateTime = q(route.query.dateTime) || '';

  // 联动参数：真太阳时 / 闰月
  ctx.pillarDto.useTrueSolarTime = q(route.query.useTrueSolarTime) === '1';
  ctx.pillarDto.withEquationOfTime = q(route.query.withEquationOfTime) === '1';
  ctx.pillarDto.leapMonth = q(route.query.leapMonth) === '1';
  const lng = q(route.query.longitude);
  if (lng !== undefined && lng !== '' && !Number.isNaN(Number(lng))) {
    ctx.pillarDto.longitude = Number(lng);
  }

  if (ctx.pillarDto.dateTime) {
    ctx.getPillarInfo();
  } else if (!ctx.loaded) {
    ctx.showForm = true;
  }
};

onMounted(() => {
  ctx.loadProvinces();
  applyRouteQuery();
});

// 同路由换 query → 复用实例，onMounted 不会再跑，这里补一次
watch(() => route.query, () => {
  if (route.name === 'bazi') applyRouteQuery();
});
</script>

<style scoped lang="scss">
/* ==========================================================================
 * 全部颜色走全局设计令牌（assets/css/theme.css），
 * 因此明暗两套主题不需要在本文件里写两遍。
 *
 * 这里只剩页面外壳（.bazi-page / .page / 页头 / 空状态）；
 * 各分区的样式跟着分区一起搬进了 components/ 下的子组件，
 * 跨分区共用的那些类拆成了 styles/ 下的几个片段，由各子组件按需 @use。
 * ========================================================================= */

.bazi-page {
  min-height: 100%;
  background: var(--bg);
  color: var(--text);
}

.page {
  // 主体宽度锁在 $mainWidth，与 Header 内层同轴。
  // 不要再改回固定大值（曾为 1440px）—— 命盘表是按可用宽度流式排布的，
  // 容器一变宽，列也跟着变宽，整页留白与列宽就不可预期了。
  @include main-container($mainPad);
  padding-top: 20px;
  padding-bottom: 64px;
}

/* ============================ 页头 ============================ */

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;

  .page-title {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: 0.5px;

    small {
      font-size: 12px;
      font-weight: 400;
      color: var(--text-faint);
      margin-left: 8px;
      letter-spacing: 0;
    }
  }

  .head-actions {
    display: flex;
    gap: 8px;
  }
}

.empty-card :deep(.el-card__body) {
  padding: 24px;
}

/* ============================ 响应式 ============================ */

@media (max-width: 1000px) {
  .page {
    padding: 16px 12px 48px;
  }
}
</style>
