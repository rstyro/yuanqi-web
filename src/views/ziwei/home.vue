<template>
  <div class="ziwei-page">
    <Header/>

    <div class="page">
      <div class="page-head">
        <div class="page-title">
          紫微斗数
          <small v-if="ctx.chart.lunarDate">{{ ctx.chart.lunarDate }}</small>
        </div>
        <div class="head-actions">
          <el-button size="small" @click="ctx.showFormBox">
            {{ ctx.showForm ? '收起' : '录入生辰' }}
          </el-button>
          <!-- Z-01 拍的是「紫微与八字分开、由用户自己比对」—— 分开不等于各排各的看不见，
               所以这里给一条带着同一份生辰过去的通道，而不是把两页做成一页混排。 -->
          <el-button v-if="ctx.loaded" size="small" @click="goBazi">八字排盘对照</el-button>
          <el-button
              v-if="ctx.loaded"
              size="small"
              :loading="reportCreating"
              @click="goReport"
          >详细报告</el-button>
          <el-button
              v-if="ctx.loaded"
              size="small"
              @click="router.push({name: 'ziwei-report-list'})"
          >我的紫微报告</el-button>
        </div>
      </div>

      <BaziForm :ctx="ctx"/>

      <!-- 紫微独有的口径，摆在表单下方而不是塞进 BaziForm：
           那个组件是八字页与本页共用的，往里加只有紫微认得的开关，
           八字页就会跟着长出一个它用不上的控件。 -->
      <div v-show="ctx.showForm" class="mode-bar">
        <span class="mode-label">日界</span>
        <el-radio-group v-model="ctx.ziShiMode" size="small" @change="onZiShiChange">
          <el-radio-button v-for="o in ctx.ZI_SHI_OPTIONS" :key="o.value" :value="o.value">
            {{ o.label }}
          </el-radio-button>
        </el-radio-group>
        <span class="mode-hint">只影响 23:00–23:59 出生的盘，其余时辰两种取法排出来一模一样</span>
      </div>

      <el-card v-if="!ctx.loaded" class="empty-card">
        <el-empty :description="ctx.loading ? '正在排盘…' : '点击「录入生辰」并提交，开始排盘'"/>
      </el-card>

      <template v-else>
        <ZiweiChartBoard :ctx="ctx"/>
        <ZiweiPalaceDetail :ctx="ctx"/>
        <ZiweiLimitCard :ctx="ctx"/>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {ElMessage} from 'element-plus';
import Header from '@/components/Header.vue';
import BaziForm from '@/views/shared/components/BaziForm.vue';
import ZiweiChartBoard from './components/ZiweiChartBoard.vue';
import ZiweiPalaceDetail from './components/ZiweiPalaceDetail.vue';
import ZiweiLimitCard from './components/ZiweiLimitCard.vue';
import {useZiweiCtx} from './composables/useZiweiCtx';
import {generateZiweiReport} from '@/api/module/ziwei';
import {useUserInfoStore} from '@/store/userInfo';
import {goLogin} from '@/utils/auth';

const route = useRoute();
const router = useRouter();

/** 整页视图模型：录入状态（复用八字那份）+ 紫微盘面与运限 */
const ctx = useZiweiCtx();

const userInfoStore = useUserInfoStore();
/** 「详细报告」建单中的 loading：建单即返回，但那一两秒该给个反馈 */
const reportCreating = ref(false);

/**
 * 用当前表单口径建一份紫微详细报告，然后进详情页看后台逐章生成。
 *
 * 请求体直接取 `ctx.buildQuery()` —— 与排盘按钮发的是同一份口径，
 * 不在这里另拼一套（经度 / 真太阳时 / 子时口径少一样就会排出另一张盘）。
 * 流年窗口不传，由后端取默认值（10 年）。
 */
const goReport = async () => {
  if (!userInfoStore.isLoggedIn) {
    goLogin('/ziwei');
    return;
  }
  if (!ctx.pillarDto.dateTime) {
    ElMessage.warning('先录入生辰再生成报告');
    return;
  }
  reportCreating.value = true;
  try {
    const res = await generateZiweiReport({chart: ctx.buildQuery()});
    const id = res.data;
    if (id) {
      router.push({name: 'ziwei-report-detail', params: {id}});
    }
  } catch (e) {
    console.error('生成紫微详细报告失败：', e);
  } finally {
    reportCreating.value = false;
  }
};

/** 换日口径改了就重排：它只挪 23 点那批盘，但「改了没反应」比多一次请求糟得多 */
const onZiShiChange = () => {
  if (ctx.loaded) ctx.getChart();
};

/**
 * 带着同一份生辰去八字页。
 *
 * 带的字段与八字页 `applyRouteQuery` 读的字段一一对应（含出生地经度与真太阳时两个开关），
 * 少带一样，那边就会按自己的默认值重排 —— 于是同一个人两张盘的时辰能差一个时辰，
 * 用户对比完得出「两个体系不合」的结论，其实是我们把口径丢了。
 */
const goBazi = () => {
  router.push({
    name: 'bazi',
    query: {
      dateType: ctx.pillarDto.dateType,
      sex: ctx.pillarDto.sex,
      dateTime: ctx.pillarDto.dateTime,
      username: ctx.pillarDto.username || undefined,
      longitude: ctx.pillarDto.longitude ?? undefined,
      birthPlace: ctx.region.picked?.name ?? undefined,
      useTrueSolarTime: ctx.pillarDto.useTrueSolarTime ? '1' : undefined,
      withEquationOfTime: ctx.pillarDto.withEquationOfTime ? '1' : undefined,
      leapMonth: ctx.pillarDto.leapMonth ? '1' : undefined,
    },
  });
};

/** route.query 的值可能是 string | string[] | null，统一成 string */
const q = (v: unknown): string | undefined => {
  if (Array.isArray(v)) return v[0];
  return v == null ? undefined : String(v);
};

/**
 * 把地址栏参数读进表单（与八字页同名的那几个 key，加上紫微自己的目标时刻）。
 *
 * 两个触发点：首次挂载，以及<b>同路由换 query</b> —— 后者 vue-router 会复用组件实例，
 * `onMounted` 不再跑，只 watch query 才不会停在上一张盘上。
 */
const applyRouteQuery = () => {
  const dateType = Number(q(route.query.dateType));
  ctx.pillarDto.dateType = Number.isNaN(dateType) ? 1 : dateType;
  const sex = Number(q(route.query.sex));
  ctx.pillarDto.sex = Number.isNaN(sex) ? 1 : sex;
  ctx.pillarDto.username = q(route.query.username) || '';
  ctx.pillarDto.dateTime = q(route.query.dateTime) || '';
  ctx.pillarDto.useTrueSolarTime = q(route.query.useTrueSolarTime) === '1';
  ctx.pillarDto.withEquationOfTime = q(route.query.withEquationOfTime) === '1';
  ctx.pillarDto.leapMonth = q(route.query.leapMonth) === '1';
  const lng = q(route.query.longitude);
  if (lng !== undefined && lng !== '' && !Number.isNaN(Number(lng))) {
    ctx.pillarDto.longitude = Number(lng);
  }
  const mode = q(route.query.ziShiMode);
  if (mode === 'NEXT_DAY' || mode === 'SAME_DAY') ctx.ziShiMode = mode;
  // 目标时刻缺省就留着现在的「此刻」，不写回 URL 之外再补一个默认值
  const target = q(route.query.targetDate);
  if (target) ctx.targetDate = target;

  if (ctx.pillarDto.dateTime) {
    ctx.getChart();
  } else if (!ctx.loaded) {
    ctx.showForm = true;
  }
};

/** 本页往地址栏上读写的那十个 key（读写必须是同一张表，否则刷新会丢口径） */
const SYNC_KEYS = ['dateType', 'sex', 'dateTime', 'username', 'longitude',
    'useTrueSolarTime', 'withEquationOfTime', 'leapMonth', 'ziShiMode', 'targetDate'] as const;

/** 当前页面状态 → 地址栏该长成的样子；假值和缺值一律留空（vue-router 会丢掉 undefined） */
const stateQuery = (): Record<string, string | undefined> => ({
  dateType: String(ctx.pillarDto.dateType),
  sex: String(ctx.pillarDto.sex),
  dateTime: ctx.pillarDto.dateTime || undefined,
  username: ctx.pillarDto.username || undefined,
  longitude: ctx.pillarDto.longitude == null ? undefined : String(ctx.pillarDto.longitude),
  useTrueSolarTime: ctx.pillarDto.useTrueSolarTime ? '1' : undefined,
  withEquationOfTime: ctx.pillarDto.withEquationOfTime ? '1' : undefined,
  leapMonth: ctx.pillarDto.leapMonth ? '1' : undefined,
  // 日界口径恒写：链接发给别人时「这张盘按几点换日排的」必须看得见，缺键等于让人猜
  ziShiMode: ctx.ziShiMode,
  targetDate: ctx.targetDate || undefined,
});

/**
 * 最近一次由本页自己写进地址栏的那份 query。
 *
 * 下面的 watcher 靠它认出「这次变化是我刚写回去的」还是「外部换了盘」：前者必须直接返回，
 * 否则回写会被读成一次外部换盘 → 再排一次盘 → 再回写，点一次提交页面转两圈。
 * 比对只看 SYNC_KEYS 这十个键（逐个比，不比键序、也不管地址栏上别人挂的额外键），
 * 因为两边都出自 stateQuery 的默认值口径，整串 JSON 相等会因为 undefined 被丢弃而对不上。
 */
let ownQuery: Record<string, string> = {};

const isOwnWrite = () => SYNC_KEYS
    .every(key => (q(route.query[key]) ?? '') === (ownQuery[key] ?? ''));

/** 把盘面口径摊进地址栏：刷新或把链接发给别人，回来的还是同一张盘、同一个目标时刻 */
const syncQuery = () => {
  const query = stateQuery();
  ownQuery = Object.fromEntries(SYNC_KEYS.map(key => [key, query[key] ?? '']));
  // replace 而不是 push：改口径是「重看同一张盘的另一种取法」，不该在历史里堆一屏差不多的链接
  void router.replace({path: route.path, query});
};

onMounted(() => {
  ctx.loadProvinces();
  applyRouteQuery();
});

// 排完盘（含换日界重排）就把口径摊进地址栏：chart 每次都是整体替换，watch 得到的是新对象
watch(() => ctx.chart, () => {
  if (ctx.loaded) syncQuery();
});

// 拖运限那个日期选择器改的只有目标时刻，不必重排原局盘，但地址栏要跟着走
watch(() => ctx.targetDate, () => {
  if (ctx.loaded) syncQuery();
});

watch(() => route.query, () => {
  if (route.name !== 'ziwei' || isOwnWrite()) return;
  applyRouteQuery();
});
</script>

<style scoped lang="scss">
.ziwei-page {
  min-height: 100%;
  background: var(--bg);
  color: var(--text);
}

.page {
  @include main-container($mainPad);
  padding-top: 20px;
  padding-bottom: 64px;
}

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
      font-family: var(--mono);
    }
  }

  .head-actions {
    display: flex;
    gap: 8px;
  }
}

.mode-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 20px;
  margin-bottom: 16px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);

  .mode-label {
    font-size: 13px;
    color: var(--text-dim);
  }

  .mode-hint {
    font-size: 12px;
    color: var(--text-faint);
  }
}

.empty-card :deep(.el-card__body) {
  padding: 24px;
}

@media (max-width: 1000px) {
  .page {
    padding: 16px 12px 48px;
  }
}
</style>
