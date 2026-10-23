import {computed, ref, watch} from 'vue';
import {getBaziInfo, getLiuYueList} from '@/api/module/bazi';
import type {
  Caput,
  DaYun,
  GanZhi,
  GanZhiDict,
  KinVo,
  LifeTime,
  LiuNian,
  LiuYue,
  LunarExtend,
  MergeVo,
  PatternVo,
  Pillar,
  PillarVo,
  QiYun,
  QiYunView,
  StructureView,
} from '@/api/module/bazi/types';
import {fmt, getShortGod, replaceNewlinesWithBr, timeValue} from '../baziFormat';
import type {BaziForm} from '@/views/shared/composables/useBaziForm';

/* ==========================================================================
 * 视图形状（后端字段 → 页面用的结构）
 * ========================================================================= */

export type RelationTone = 'he' | 'chong' | 'harm' | 'neutral';

export interface RelationItem {
  text: string;
  tone: RelationTone;
}

export interface HideStem {
  char: string;
  god: string;
  /** 是否本气（藏干列表第一位） */
  isMain: boolean;
  /** 是否透出于四柱天干 */
  exposed: boolean;
  color?: string;
}

export interface TouGanRow {
  branch: string;
  pos: string;
  stems: HideStem[];
}

export interface RootRef {
  branch: string;
  pos: string;
  /** 本气 / 藏干 */
  via: string;
  /** 是否「同名之根」（乙见卯），比异名同五行更实 */
  same: boolean;
}

export interface TongGenRow {
  stem: string;
  pos: string;
  god: string;
  color?: string;
  roots: RootRef[];
}

/** 依据角色的样式后缀（相神 / 破格 / 救应） */
export const ROLE_CLASS: Record<string, string> = {相神: 'support', 破格: 'break', 救应: 'rescue'};

/** 六亲星明暗档位的样式后缀 */
export const STAR_CLASS: Record<string, string> = {
  透干通根: 'both', 透干: 'gan', 通根: 'zhi', 不见: 'absent',
};

/**
 * 宫位的样式后缀：有扰动优先（最该被看见），其次牵绊，最后安静。
 *
 * ⚠️ 顺序不能反 —— 宫殿**同时**被冲与被合时（很常见），底色应当表示「动荡」而不是「牵连」。
 */
export function palaceClass(p: { disrupt?: string[]; bond?: string[] }) {
  if ((p.disrupt || []).length) {
    return 'is-disrupt';
  }
  return (p.bond || []).length ? 'is-bond' : 'is-quiet';
}

/**
 * 排盘结果的状态与全部派生视图。
 *
 * 从 home.vue 整段搬出，逻辑一字未改；表单状态由 {@link BaziForm} 传入，
 * 因为「请求要吃什么参数」「服务端实际校正了多少」本来就分属两侧。
 */
export function useBaziChart(form: BaziForm) {
  const pillarVo = ref<Partial<PillarVo>>({});
  /** 四柱（已补 title） */
  const fourPillars = ref<Pillar[]>([]);
  /**
   * 命盘表右端平铺的三根柱子：大运 + 选中流年 + 选中流月。
   *
   * 长度恒为 3，模板里的下标访问不会炸（大运格对应 [0]，`first-yun` 靠它画左侧分隔线）。
   */
  const yunPillars = ref<Partial<Pillar>[]>([{}, {}, {}]);

  /** 柱子里的干支只存中文名，完整属性在这里查 */
  const ganZhiDict = ref<GanZhiDict>({tianGan: {}, diZhi: {}});
  /** 起运 / 大运按流派分组 */
  const qiYunMap = ref<Record<string, QiYun>>({});
  const daYunListMap = ref<Record<string, DaYun[]>>({});
  const qiYunView = ref<QiYunView | null>(null);
  const lifeTime = ref<LifeTime | null>(null);
  const caput = ref<Caput | null>(null);
  /** 结构视图：取格依据 + 透干 + 通根（后端算，前端只展示） */
  const structureView = ref<StructureView | null>(null);
  /** 格局成败与救应：相神 / 破格 / 救应（后端算，前端只展示） */
  const pattern = ref<PatternVo | null>(null);
  /** 宫位六亲：四宫 + 六亲星 + 宫星合参（后端算，前端只展示） */
  const kin = ref<KinVo | null>(null);
  const mergeVo = ref<MergeVo | null>(null);
  const lunarExtendMap = ref<Record<string, LunarExtend>>({});

  /** 当前展示的流派编码 */
  const sect = ref('2');
  const SECT_OPTIONS = [
    {value: '2', label: '流派2'},
    {value: '1', label: '流派1'},
  ];

  const yunActiveIndex = ref(0);
  const fleetActiveIndex = ref(0);
  const monthActiveIndex = ref(0);

  /**
   * 当前选中流年的 12 个流月（节气月）。
   *
   * 单独一个请求、**不随排盘一起返回**：10 步大运 × 10 流年 × 12 月 = 1200 根柱子，
   * 一起塞进排盘响应会让整包从几十 KB 涨到几百 KB，而页面上同时只看得到一个流年的 12 个月。
   */
  const liuYueList = ref<LiuYue[]>([]);
  const liuYueLoading = ref(false);
  /**
   * 流月按「流年」缓存：在大运/流年之间来回点不必重复请求。
   *
   * key 还要带上流派吗？**不用** —— 流月与起运流派无关（四柱、神煞都不看流派），
   * 换流派时同一年的 12 个月是完全相同的。带上反而会白白多请求一遍。
   */
  const liuYueCache = new Map<number, LiuYue[]>();

  /** 服务端记录的实际校正情况（「开关开了」≠「真的校正了」） */
  const tstApplied = ref(false);
  const tstAppliedMinutes = ref(0);

  /* ======================================================================
   * 计算属性
   * ==================================================================== */

  /** 当前流派的起运 */
  const qiYun = computed<Partial<QiYun>>(() => qiYunMap.value[sect.value] || {});

  /** 当前流派的大运序列。恒为数组，模板里的下标访问不会炸 */
  const daYunList = computed<DaYun[]>(() => daYunListMap.value[sect.value] || []);

  const activeYun = computed<DaYun | null>(() => daYunList.value[yunActiveIndex.value] || null);

  /** 当前选中的流年（流月时间轴的标题要用它的年份） */
  const activeLiuNian = computed<LiuNian | null>(
      () => activeYun.value?.liuNianList?.[fleetActiveIndex.value] || null);

  /** 当前选中的流月（说明行要用它的区间） */
  const monthActive = computed<LiuYue | null>(() => liuYueList.value[monthActiveIndex.value] || null);

  /** 实际算出来的流派数（只有 1 个时不展示「对照」） */
  const sectCount = computed(() => Object.keys(qiYunMap.value).length);

  const sectLabel = computed(() => {
    const opt = SECT_OPTIONS.find(o => o.value === sect.value);
    return opt ? opt.label : sect.value;
  });

  /** 对照卡片只列「实际算出来且摘要存在」的流派 */
  const availableSectOptions = computed(() => {
    const s = qiYunView.value?.sectSummaryMap;
    if (!s) return [];
    return SECT_OPTIONS.filter(o => s[o.value]);
  });

  /** 起运读数：优先后端拼好的，退化到前端拼 */
  const startYunText = computed(() => {
    const s = qiYunView.value?.sectSummaryMap?.[sect.value];
    if (s?.startYunText) return s.startYunText;
    const q = qiYun.value;
    if (q.years === undefined) return '—';
    return `出生后 ${q.years || 0} 年 ${q.months || 0} 月 ${q.days || 0} 天 ${q.hours || 0} 时起运`;
  });

  const firstYunText = computed(() => {
    const first = daYunList.value[0];
    if (!first) return '—';
    return `${first.startYear} 年（${first.age} 岁）· ${first.pillar?.ganZhi || ''}`;
  });

  /**
   * 「当前所处」文案 —— 直接用后端算好的索引，**不在前端比年份**。
   * `0` = 未起运，`-1` = 已超出全部大运，都不能当第 1 步处理。
   */
  const currentYunText = computed(() => {
    const v = qiYunView.value;
    if (!v) return '—';
    if (v.currentDaYunIndex === 0) return `未起运（距起运 ${v.daysToNextYun} 天）`;
    if (v.currentDaYunIndex < 0) return '已超出全部大运';
    const dy = daYunList.value[v.currentDaYunIndex - 1];
    const gz = dy?.pillar?.ganZhi || '';
    return `第 ${v.currentDaYunIndex} 步 · ${gz} 运（${v.currentDaYunStartYear} 起）`;
  });

  /** 选中大运的真实区间是否横跨 11 个公历年 */
  const activeYunSpansEleven = computed(() => {
    const dy = activeYun.value;
    if (!dy?.startDateTime) return false;
    return new Date(String(dy.startDateTime).replace(/-/g, '/')).getFullYear() !== dy.startYear;
  });

  /* ======================================================================
   * 命理派生信息（关系 / 格局取法 / 透干 / 通根）
   *
   * 这些**全部由后端算好**（v7 起），页面只做两件事：把后端字段搬成视图形状、
   * 按 `ganZhiDict` 给干支配五行色。
   *
   * 曾有一版把「半合 / 天干相冲 / 透干 / 通根 / 取格依据」放在前端推导 —— 已全部删除：
   *   ① 「同一套知识写两份」：前端这份与后端 `Caput` 那张规则表迟早漂移，且没人会发现漂了；
   *   ② **「页面的盘」≠「AI 的盘」**：AI 只读后端字段，前端自算的部分它根本看不到，
   *      于是同一张盘两处说法不一样。
   * 现在数据源只有后端：`structureView`（取格依据 + 透干 + 通根）与
   * `mergeVo`（合冲刑害，含 v7 新增的 `tianGanChongList` / `diZhiHalfMergeList`）。
   * ==================================================================== */

  /* ---------------- 关系 ---------------- */

  /**
   * 天干关系：五合（`tianGanMergeList`）+ 相冲（`tianGanChongList`）。
   * 两项都由后端出；相冲只有 甲庚 / 乙辛 / 丙壬 / 丁癸 四组（戊己居中不冲）。
   */
  const tianGanRelations = computed<RelationItem[]>(() => [
    ...(mergeVo.value?.tianGanMergeList || []).map(t => ({text: t, tone: 'he' as RelationTone})),
    ...(mergeVo.value?.tianGanChongList || []).map(t => ({text: t, tone: 'chong' as RelationTone})),
  ]);

  /** 地支关系分组：按「先聚后散」排序，空组不渲染 */
  const branchRelationGroups = computed<
      { key: string; label: string; tone: RelationTone; list: string[] }[]>(() => {
    const m = mergeVo.value;
    const groups = [
      {key: 'he3', label: '三合局（成局）', tone: 'he' as RelationTone, list: m?.diZhi3MergeList || []},
      // 半合由后端给（`diZhiHalfMergeList`）。它与上面的三合局**互斥**：三支齐全时
      // 后端只报三合局，不会再冒出两条半合 —— 这个判断前端不再自己做。
      {key: 'banhe', label: '半合', tone: 'he' as RelationTone, list: m?.diZhiHalfMergeList || []},
      {key: 'meet3', label: '三会方', tone: 'he' as RelationTone, list: m?.diZhi3MeetList || []},
      {key: 'he6', label: '六合', tone: 'he' as RelationTone, list: m?.diZhi6MergeList || []},
      {key: 'hide', label: '暗合', tone: 'neutral' as RelationTone, list: m?.diZhiHideMergeList || []},
      {key: 'chong', label: '六冲', tone: 'chong' as RelationTone, list: m?.diZhi6ConflictList || []},
      {key: 'harm', label: '六害', tone: 'harm' as RelationTone, list: m?.diZhi6HarmList || []},
      {key: 'xing', label: '三刑', tone: 'harm' as RelationTone, list: m?.diZhi3HarmList || []},
    ];
    return groups.filter(g => g.list.length);
  });

  const hasBranchRelation = computed(() => branchRelationGroups.value.length > 0);

  const relationTotal = computed(
      () => tianGanRelations.value.length
          + branchRelationGroups.value.reduce((n, g) => n + g.list.length, 0));

  /* ---------------- 格局取法 ---------------- */

  /** 月令（月支）的藏干：带十神、本气标记与「是否透出」—— 全部取自后端 structureView */
  const monthHideStems = computed<HideStem[]>(() => {
    // structureView.touGan 的顺序恒为 年 → 月 → 日 → 时，第 2 项就是月令。
    const month = structureView.value?.touGan?.[1];
    if (!month?.stems?.length) return [];
    return month.stems.map((s, i) => ({
      char: s.name,
      god: s.god,
      // 后端不单独给「本气」标记，但藏干恒按 本气→中气→余气 排，第一位就是本气
      isMain: i === 0,
      exposed: s.exposed,
      // 藏干本身是天干，五行色从 ganZhiDict 的 tianGan 字典取（同一份字典，别再塞一份）
      color: tianGan(s.name).element?.color,
    }));
  });

  const monthBranch = computed(() => fourPillars.value[1]?.diZhi || '');

  const caputName = computed(() => caput.value?.name || '');

  /**
   * 格局成败的样式钩子：把后端的 `grade.code` 映射成一个 CSS 类后缀。
   *
   * **认 `code` 而不是中文名** —— 中文名是给人看的措辞（可能微调），
   * `code` 是稳定标识。认不出的档位退回 `unknown`，会显示成一个中性灰块，
   * 而不是悄悄套上「成格」的绿色。
   */
  const gradeClass = computed(() => {
    const code = pattern.value?.grade?.code;
    return code === 'CHENG' || code === 'DAI_FU' || code === 'PO_WITH_RESCUE'
    || code === 'PO' || code === 'NOT_APPLICABLE' ? code.toLowerCase() : 'unknown';
  });

  /**
   * 是否八格（正格）。
   *
   * **认后端的 `structureView.standardPattern`**，不在前端维护一份八格清单 ——
   * 后端将来加一个格，前端不会漏改。`structureView` 缺失时退回「非八格」，
   * 配合下面 `caputBasis` 的中性文案，不会误导。
   */
  const isBaGe = computed(() => structureView.value?.standardPattern ?? false);

  /**
   * 取格依据：**直接展示后端 `basisText`**。
   *
   * 这句话依赖候选表与藏干层级，服务端拼得出来、前端拼不出来；各端各拼一遍必然与
   * `caput.name` 漂移。这里只把后端的三种 `basis` 映射成原有的三个 CSS 类名
   * （`is-exposed` / `is-multi` / `is-fallback` / `is-other`），不再自己讲一套因果。
   */
  const caputBasis = computed<{ kind: 'exposed' | 'multi' | 'fallback' | 'other' | 'none'; text: string }>(() => {
    const sv = structureView.value;
    if (!sv) {
      // 只有旧缓存 / 手搓对象才会走到这（CACHE_VERSION 已抬到 v7）。
      // 给中性提示，而不是在前端把推导重来一遍 —— 那正是这次要删掉的东西。
      return {kind: 'none', text: '接口未返回取格依据（structureView 缺失）'};
    }
    const kind = sv.basis === 'OUTER' ? 'other'
        : sv.basis === 'NONE_EXPOSED' ? 'fallback'
            : (sv.caputCandidates?.length || 0) > 1 ? 'multi' : 'exposed';
    return {kind, text: sv.basisText || '—'};
  });

  /* ---------------- 透干 / 通根 ---------------- */

  /**
   * 透干：逐支列出藏干，标出哪些透到了四柱天干。
   *
   * 数据来自后端 `structureView.touGan`（顺序恒为 年→月→日→时）。
   * 「透」的判定在服务端做（「出现在四柱任一天干位」），前端**不再**用
   * 「十二字串里找得到」这种错口径重算。
   */
  const touGanRows = computed<TouGanRow[]>(() =>
      (structureView.value?.touGan || []).map(b => ({
        branch: b.branch,
        pos: b.position,
        stems: (b.stems || []).map((s, i) => ({
          char: s.name,
          god: s.god,
          isMain: i === 0,
          exposed: s.exposed,
          color: tianGan(s.name).element?.color,
        })),
      })),
  );

  /** 透出的藏干个数，用于空态提示 */
  const touGanCount = computed(
      () => touGanRows.value.reduce((n, r) => n + r.stems.filter(s => s.exposed).length, 0));

  /**
   * 通根：天干在四支上得到的根（后端 `structureView.tongGen`，顺序恒为 年→月→日→时）。
   *
   * 口径（只比五行、不比阴阳；同名之根更强）由服务端统一实现，前端不再自己算。
   * `depth === 0` 即本气之根，展示成「本气」，其余是「藏干」。
   */
  const tongGenRows = computed<TongGenRow[]>(() =>
      (structureView.value?.tongGen || []).map(r => ({
        stem: r.stem,
        pos: r.position,
        god: r.god,
        color: tianGan(r.stem).element?.color,
        roots: (r.roots || []).map(x => ({
          branch: x.branch,
          pos: x.position,
          via: x.depth === 0 ? '本气' : '藏干',
          same: x.same,
        })),
      })),
  );

  /** 无根之干（虚浮） */
  const rootlessStems = computed(() => tongGenRows.value.filter(r => !r.roots.length));

  /**
   * 计数文案：拿不到结构视图时给 `—` 而不是 `0` ——
   * 「0 个透干」和「压根没拿到数据」是两回事，后者显示 0 会被读成「这张盘没有透干」。
   */
  const touGanCountText = computed(() => (structureView.value ? String(touGanCount.value) : '—'));
  const tongGenCountText = computed(() => (structureView.value
      ? `${tongGenRows.value.length - rootlessStems.value.length}/${tongGenRows.value.length}`
      : '—'));

  /*
   * ---------------- 身强弱量尺 ----------------
   *
   * score 的量程是 −100 ~ +100（后端按「得令/得地/得势得生」三层加权，再看藏干分层、
   * 虚实、合化、刑冲修正；月支得令 ±40 是大头）。
   * 判强弱的阈值**不是固定值**：后端 2026-10-10 起改用「相对同类型盘的基准分」
   * （取该日主 score 分布的中位数：木/火 −33、水 −30、金 −14、土 −19），
   * 基准随日主五行变，所以**不能在前端写死百分比** ——
   * 这里直接用后端下发的 `lifeTime.strongBaseline` 换算阈值线的位置。
   *
   * ⚠️ 别退回「阈值 50 / 75%」：那个口径 5000 张随机盘实测 89.5% 判身弱，
   * 已废弃（详见 metaphysics 仓库 commons/common-ganzhi/docs/strong-weak-calibration-2026-10-10.md）。
   */
  const scorePct = computed(() => {
    const s = Number(lifeTime.value?.score ?? 0);
    return Math.max(0, Math.min(100, (s + 100) / 2));
  });

  /** 阈值线在量尺上的位置（%）：把 −100~+100 线性映射到 0~100。 */
  const STRONG_THRESHOLD_PCT = computed(() => {
    const base = Number(lifeTime.value?.strongBaseline ?? 0);
    return Math.max(0, Math.min(100, (base + 100) / 2));
  });

  /** 两流派差异摘要 */
  const sectDiff = computed(() => {
    const keys = Object.keys(qiYunMap.value);
    if (keys.length < 2) return {hasDiff: false, text: ''};
    const [k1, k2] = keys;
    const t1 = qiYunMap.value[k1]?.startYunDateTime;
    const t2 = qiYunMap.value[k2]?.startYunDateTime;
    if (!t1 || !t2) return {hasDiff: false, text: ''};
    const ms = Math.abs(
        new Date(t1.replace(/-/g, '/')).getTime() - new Date(t2.replace(/-/g, '/')).getTime(),
    );
    const days = Math.round(ms / 86400000);
    const n1 = SECT_OPTIONS.find(o => o.value === k1)?.label || k1;
    const n2 = SECT_OPTIONS.find(o => o.value === k2)?.label || k2;
    if (days === 0) return {hasDiff: false, text: ''};
    return {hasDiff: true, text: `${n1} 与 ${n2} 的起运时刻相差约 ${days} 天`};
  });

  /** 概要条里的实际校正量（服务端给的，不是前端预览值） */
  const tstAppliedText = computed(() => {
    const m = tstAppliedMinutes.value;
    if (!m) return '已校正';
    return `已校正 ${m > 0 ? '+' : ''}${m} 分`;
  });

  /* ======================================================================
   * 方法
   * ==================================================================== */

  /** 干支查表：柱子里的 tianGan/diZhi 只有名字，属性从字典取（查不到给空对象，模板不会炸） */
  const tianGan = (name?: string): Partial<GanZhi> => (name ? ganZhiDict.value.tianGan[name] ?? {} : {});
  const diZhi = (name?: string): Partial<GanZhi> => (name ? ganZhiDict.value.diZhi[name] ?? {} : {});

  const getDetail = (key?: string) => {
    if (!key) return '';
    let k = key;
    if (k === '天罗' || k === '地网') k = '天罗地网';
    const entry = lunarExtendMap.value[k];
    if (!entry) return '';
    return replaceNewlinesWithBr(entry.summary || '') + '<br/><br/>' + replaceNewlinesWithBr(entry.description || '');
  };

  /** 同步命盘表右端的三根柱子（大运 / 流年 / 流月） */
  const syncYunPillars = (list: DaYun[]) => {
    const first = list[0];
    yunPillars.value = [
      first?.pillar ? {...first.pillar, title: '大运'} : {title: '大运'},
      first?.liuNianList?.[0]?.pillar
          ? {...first.liuNianList[0].pillar, title: '流年'}
          : {title: '流年'},
      // 流月是异步取的，先占位：这一列的存在保证表里 7 列宽度稳定，
      // 不会因为「流月来得慢」先渲染 6 列、回来再挤成 7 列而跳一下。
      {title: '流月'},
    ];
  };

  const getPillarInfo = () => {
    form.loading.value = true;
    getBaziInfo(form.pillarDto).then((r: any) => {
      const payload = r?.data || {};
      const data: Partial<PillarVo> = payload.pillarVo || {};

      lunarExtendMap.value = payload.lunarExtendMap || {};
      pillarVo.value = data;
      ganZhiDict.value = data.ganZhiDict || {tianGan: {}, diZhi: {}};
      qiYunMap.value = data.qiYunMap || {};
      daYunListMap.value = data.daYunListMap || {};
      qiYunView.value = data.qiYunView || null;
      lifeTime.value = data.lifeTime || null;
      caput.value = data.caput || null;
      structureView.value = data.structureView || null;
      pattern.value = data.pattern || null;
      kin.value = data.kin || null;
      mergeVo.value = data.mergeVo || null;
      tstApplied.value = !!payload.useTrueSolarTime;
      tstAppliedMinutes.value = Number(payload.solarTimeOffsetMinutes) || 0;

      fourPillars.value = [
        {...(data.yearPillar as Pillar), title: '年柱'},
        {...(data.monthPillar as Pillar), title: '月柱'},
        {...(data.dayPillar as Pillar), title: '日柱'},
        {...(data.hourPillar as Pillar), title: '时柱'},
      ];

      // 后端建议的默认流派；不在返回的 Map 里就退回任意一个可用 key
      sect.value = data.sect || '2';
      if (!qiYunMap.value[sect.value]) {
        const keys = Object.keys(qiYunMap.value);
        if (keys.length) sect.value = keys[0];
      }

      syncYunPillars(daYunListMap.value[sect.value] || []);
      yunActiveIndex.value = 0;
      // 换了一张盘，旧盘的流月必须清掉：同一个流年号在不同出生盘上神煞/十神都不同，
      // 缓存留着会把上一张盘的流月显示到这一张盘上（而且看不出错）。
      liuYueCache.clear();
      liuYueList.value = [];
      monthActiveIndex.value = 0;
      form.loaded.value = true;
      // 走同一条联动入口，把右端「流年 / 流月」两列一并落到本盘第 1 步大运的第 1 个流年
      checkFleetYear(0);
    }).catch((error: unknown) => {
      // 业务错误（如「农历该月没有这一天」）已由 axios 拦截器弹出中文提示，这里只兜底日志
      console.error('排盘请求失败：', error);
    }).finally(() => {
      form.loading.value = false;
    });
  };

  const submitData = () => {
    form.showForm.value = false;
    getPillarInfo();
  };

  /* ---- 大运 / 流年 / 流月 联动 ---- */

  const checkYun = (index: number) => {
    yunActiveIndex.value = index;
    const dy = daYunList.value[index];
    if (dy?.pillar) yunPillars.value[0] = {...dy.pillar, title: '大运'};
    checkFleetYear(0);
  };

  const checkFleetYear = (index: number) => {
    fleetActiveIndex.value = index;
    const ln = activeYun.value?.liuNianList?.[index];
    if (ln?.pillar) yunPillars.value[1] = {...ln.pillar, title: '流年'};
    // 换了流年 → 右端流月列与流月时间轴都要跟着换。先清空再取：
    // 留着上一年 12 个月会让「选中 2026 年却显示 2025 年的月」这种错短暂可见。
    monthActiveIndex.value = 0;
    liuYueList.value = [];
    yunPillars.value[2] = {title: '流月'};
    if (ln) loadLiuYue(ln.year);
  };

  /**
   * 取某流年的 12 个流月（节气月）。带缓存，同一流年不重复请求。
   *
   * **流月与起运流派无关**，所以缓存 key 只用年份，换流派不会失效 —— 这一点与
   * `daYunListMap`（按流派分组）不同，别顺手也给它加一层流派维度，那只会白多一遍请求。
   */
  const loadLiuYue = (year: number) => {
    const cached = liuYueCache.get(year);
    if (cached) {
      liuYueList.value = cached;
      yunPillars.value[2] = {...cached[0].pillar, title: '流月'};
      return;
    }
    liuYueLoading.value = true;
    getLiuYueList(form.pillarDto, year).then((r: any) => {
      // 迟到的响应别覆盖已经切走的流年：以「当前选中的流年」为准再决定要不要落盘
      const now = activeYun.value?.liuNianList?.[fleetActiveIndex.value];
      if (now?.year !== year) return;
      const list = (r?.data || []) as LiuYue[];
      liuYueCache.set(year, list);
      liuYueList.value = list;
      if (list.length) yunPillars.value[2] = {...list[0].pillar, title: '流月'};
    }).catch((error: unknown) => {
      // 业务错误已由 axios 拦截器弹出中文提示，这里只兜底日志
      console.error('流月请求失败：', error);
    }).finally(() => {
      liuYueLoading.value = false;
    });
  };

  const checkMonth = (index: number) => {
    monthActiveIndex.value = index;
    const m = liuYueList.value[index];
    if (m?.pillar) yunPillars.value[2] = {...m.pillar, title: '流月'};
  };

  /** 某步大运是否「当前所处」—— 用后端算好的索引，前端不重算 */
  const isNowYun = (dy: DaYun) => {
    const v = qiYunView.value;
    return !!(v && dy && v.currentDaYunIndex > 0 && dy.index === v.currentDaYunIndex);
  };

  /** 流年里的「今年」：流年本身就是年份粒度，可以比年份 */
  const isNowLiuNian = (ln: LiuNian) => {
    const v = qiYunView.value;
    if (!v?.now) return false;
    return Number(String(v.now).slice(0, 4)) === ln.year;
  };

  /**
   * 流月里的「今」。
   *
   * **必须比时刻，不能比「年月」**：一个流月横跨两个公历月（戌月 10/08 → 11/07），
   * 11/01 那天的交节月仍是 10 月 —— 拿 `now` 的年月去比会错误地高亮亥月。
   * （流年的「今年」可以比年份，因为流年就是年份粒度；流月不行。）
   */
  const isNowLiuYue = (m: LiuYue) => {
    const now = timeValue(qiYunView.value?.now);
    if (isNaN(now)) return false;
    return now >= timeValue(m.startDateTime) && now < timeValue(m.nextTermDateTime);
  };

  const isYearDiff = (sectKey: string, year: number) => {
    const map = qiYunView.value?.sectSummaryMap;
    if (!map) return false;
    const others = Object.keys(map).filter(k => k !== sectKey);
    return others.some(k => (map[k]?.startYears || []).includes(year) === false);
  };

  // 切流派：大运/起运是 computed 自动换；yunPillars 是平铺数组，需手动同步一次。
  // 流月**不需要**跟着换流派（它与起运流派无关，同一年 12 个月完全相同），
  // 所以这里不碰 liuYueCache —— 缓存跨流派继续有效。
  watch(sect, (s) => {
    yunActiveIndex.value = 0;
    syncYunPillars(daYunListMap.value[s] || []);
    checkFleetYear(0);
  });

  return {
    pillarVo,
    fourPillars,
    yunPillars,
    qiYunMap,
    qiYunView,
    lifeTime,
    structureView,
    pattern,
    kin,
    sect,
    yunActiveIndex,
    fleetActiveIndex,
    monthActiveIndex,
    liuYueList,
    liuYueLoading,
    tstApplied,
    tstAppliedMinutes,
    qiYun,
    daYunList,
    activeYun,
    activeLiuNian,
    monthActive,
    sectCount,
    sectLabel,
    availableSectOptions,
    startYunText,
    firstYunText,
    currentYunText,
    activeYunSpansEleven,
    tianGanRelations,
    branchRelationGroups,
    hasBranchRelation,
    relationTotal,
    monthHideStems,
    monthBranch,
    caputName,
    gradeClass,
    isBaGe,
    caputBasis,
    touGanRows,
    touGanCount,
    tongGenRows,
    rootlessStems,
    touGanCountText,
    tongGenCountText,
    scorePct,
    STRONG_THRESHOLD_PCT,
    sectDiff,
    tstAppliedText,
    fmt,
    getShortGod,
    tianGan,
    diZhi,
    getDetail,
    ROLE_CLASS,
    STAR_CLASS,
    palaceClass,
    getPillarInfo,
    submitData,
    checkYun,
    checkFleetYear,
    checkMonth,
    isNowYun,
    isNowLiuNian,
    isNowLiuYue,
    isYearDiff,
  };
}

export type BaziChart = ReturnType<typeof useBaziChart>;
