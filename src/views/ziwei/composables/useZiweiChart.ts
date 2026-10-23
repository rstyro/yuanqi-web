import {computed, ref} from 'vue';
import {getZiweiChart, getZiweiHoroscope} from '@/api/module/ziwei';
import type {
    ZiweiChartVo,
    ZiweiHoroscopeVo,
    ZiweiLimitVo,
    ZiweiPalaceVo,
    ZiweiQuery,
    ZiweiStarVo,
    ZiShiModeName,
} from '@/api/module/ziwei/types';
import type {BaziForm} from '@/views/shared/composables/useBaziForm';
import {formatDateTime} from '@/views/shared/date';

/** 后端当前的盘面形状版本；对不上就说明前端类型与引擎脱节了，要显式说出来 */
const CHART_SCHEMA = 'zv11';
const HOROSCOPE_SCHEMA = 'zh1';

/**
 * 紫微的排盘结果与派生视图（录入状态在 useBaziForm 那边，两边合成 ctx）。
 *
 * 一次提交发两个请求：原局盘 + 「此刻」的运限。分开发是因为它们的变化节奏不同 ——
 * 换生辰两个都要重算，而只拖运限那一格的日期选择器时不必重排原局盘。
 */
export function useZiweiChart(form: BaziForm) {
    const chart = ref<Partial<ZiweiChartVo>>({});
    const horoscope = ref<ZiweiHoroscopeVo | null>(null);
    const limitLoading = ref(false);

    /** 子时口径（一天从几点换日）。只对 23 点出生的盘有效，其余时辰两种取法盘面相同 */
    const ziShiMode = ref<ZiShiModeName>('SAME_DAY');
    const ZI_SHI_OPTIONS: Array<{ value: ZiShiModeName; label: string }> = [
        {value: 'SAME_DAY', label: '0 点换日（23 点归当日）'},
        {value: 'NEXT_DAY', label: '23 点换日（23 点归次日）'},
    ];

    /** 运限的目标时刻，默认「现在」；留空时后端也按现在算 */
    const targetDate = ref(formatDateTime(new Date()));

    /**
     * 请求序号。连续改口径时后发的那次可能先到，
     * 不挡掉旧响应会把上一张盘盖到新图上（看不出错，只能靠对账发现）。
     */
    let chartToken = 0;
    let limitToken = 0;

    /** 拼请求体：八字那套生辰口径 + 紫微多出来的两格 */
    const buildQuery = (): ZiweiQuery => ({
        dateTime: form.pillarDto.dateTime,
        dateType: form.pillarDto.dateType,
        sex: form.pillarDto.sex,
        username: form.pillarDto.username,
        leapMonth: form.pillarDto.leapMonth,
        longitude: form.pillarDto.longitude,
        useTrueSolarTime: form.pillarDto.useTrueSolarTime,
        withEquationOfTime: form.pillarDto.withEquationOfTime,
        ziShiMode: ziShiMode.value,
    });

    const schemaWarn = computed(() => {
        const got = chart.value.schemaVersion;
        if (!got) return '';
        return got === CHART_SCHEMA ? '' : `盘面版本 ${got}，与本页适配的 ${CHART_SCHEMA} 不同，可能有字段没显示全`;
    });

    /** 十二宫按地支序（0=子 … 11=亥），后端已经是这个序，这里只补一层「下标即地支」的读法 */
    const palaces = computed<ZiweiPalaceVo[]>(() => chart.value.palaces ?? []);

    /** 中心格：把引擎实际采用的口径一次性摊开，不让用户猜自己排的是哪套盘 */
    const meta = computed(() => {
        const c = chart.value;
        return [
            {label: '公历', value: c.gregorianDate || '—'},
            {label: '农历', value: c.lunarDate ? c.lunarDate.slice(0, 10) + (c.leapMonth ? '（闰月）' : '') : '—'},
            {label: '性别', value: c.gender || '—'},
            {label: '时辰', value: c.hourZhi || '—'},
            {label: '生年', value: c.yearGanZhi || '—'},
            {label: '命宫', value: c.mingGongGanZhi || '—'},
            {label: '五行局', value: c.bureau || '—'},
            // 命主看命宫支、身主看生年支，是引擎查表算出的两颗星，不是前端推的
            {label: '命主', value: c.mingZhu || '—'},
            {label: '身主', value: c.shenZhu || '—'},
            {label: '日界', value: c.ziShiMode || '—'},
            {label: '四化表', value: c.siHuaVariant || '—'},
        ];
    });

    /** 大限十步：把十二宫按起运虚岁排出来，一眼看到每一步落哪一宫 */
    const decadalSteps = computed(() => palaces.value
        .filter(p => p.decadalStartAge != null && p.decadalEndAge != null)
        .sort((a, b) => (a.decadalStartAge ?? 0) - (b.decadalStartAge ?? 0))
        .map(p => ({
            key: p.index,
            range: `${p.decadalStartAge}—${p.decadalEndAge}`,
            ganZhi: p.gan + p.zhi,
            palace: p.palace,
        })));

    /** 小限表：虚岁 → 落宫（引擎在每宫上挂了一份虚岁清单，这里摊平成表） */
    const minorLimitRows = computed(() => {
        const rows = palaces.value
            .flatMap(p => (p.minorLimitAges ?? []).map(age => ({
                age,
                key: `${age}-${p.index}`,
                ganZhi: p.gan + p.zhi,
                palace: p.palace,
            })));
        return rows.sort((a, b) => a.age - b.age);
    });

    /** 六限的展示序（后端是按字段给的，这里定序并把「未起运」那种空档如实标出来） */
    const LIMIT_ORDER: Array<{ key: keyof ZiweiHoroscopeVo; name: string }> = [
        {key: 'decadal', name: '大限'},
        {key: 'age', name: '小限'},
        {key: 'yearly', name: '流年'},
        {key: 'monthly', name: '流月'},
        {key: 'daily', name: '流日'},
        {key: 'hourly', name: '流时'},
    ];

    const limits = computed(() => LIMIT_ORDER
        .map(item => ({name: item.name, limit: horoscope.value?.[item.key] as ZiweiLimitVo | null | undefined}))
        .filter(item => !!item.limit));

    /**
     * 当前展开详情的宫（地支序号 0—11），null = 没点。
     *
     * 换盘必须清掉：序号是**地支的**，不是宫位的 —— 上一张盘选的是「子宫·财帛」，
     * 新盘的子宫可能叫「官禄」，留着不清就会把新盘的宫名挂在旧盘的读法上。
     */
    const selected = ref<number | null>(null);
    const selectPalace = (index: number) => {
        selected.value = selected.value === index ? null : index;
    };

    /**
     * 三方四正与夹宫：对宫 +6、三合 +4/+8、邻宫 ±1（全部按 12 取模）。
     *
     * 这里只有地支序号的加减，与引擎 `PalaceUtil` 的算式一一对应，
     * 不涉及庙旺表、四化表或任何断语口径 —— 所以前端算得，不算「造口径」。
     * 注意「官禄位 / 财帛位」这两个名字只在**把本宫临时当命宫看**时成立（引擎 javadoc 同款提醒），
     * 所以下面一律写成「三合位」并把这个前提标出来，不冒充它就是十二宫里的官禄宫。
     */
    const RELATIONS: Array<{ offset: number; label: string; short: string; note: string }> = [
        {offset: 6, label: '对宫（迁移位）', short: '对', note: '本宫的正对面，永远相隔六位'},
        {offset: 4, label: '三合位·甲', short: '合', note: '把本宫当命宫看时，这一格是官禄位'},
        {offset: 8, label: '三合位·乙', short: '合', note: '把本宫当命宫看时，这一格是财帛位'},
        {offset: 11, label: '夹宫·前一位', short: '夹', note: '左右两邻宫一起作用，即口诀里的「夹」'},
        {offset: 1, label: '夹宫·后一位', short: '夹', note: '左右两邻宫一起作用，即口诀里的「夹」'},
    ];

    /** 本宫 → 与它有关的那五格（去重后按地支序） */
    const relatedOf = (index: number) => RELATIONS
        .map(r => ({...r, index: (index + r.offset) % 12}))
        .sort((a, b) => a.index - b.index);

    /** 宫格上的关系角标：选中的宫自己不标，其余按「对 / 合 / 夹」标 */
    const relationMark = (index: number) => {
        if (selected.value == null || selected.value === index) return '';
        return RELATIONS.find(r => (selected.value! + r.offset) % 12 === index)?.short ?? '';
    };

    /**
     * 选中宫的展示名，没选时给空串。
     *
     * 组件里一律用这个和下面两个函数读选中态，不直接判 `ctx.selected == null`：
     * `reactive` 会把 ref 解包，`number | null` 到了模板上类型会变成 `number | undefined`，
     * 在模板里做算术或下标就过不了 vue-tsc —— 而错的那一步在浏览器里看不出来。
     */
    const selectedLabel = computed(() => {
        const index = selected.value;
        if (index == null) return '';
        const p = palaces.value.find(item => item.index === index);
        return p ? `${p.palace}（${p.gan}${p.zhi}）` : '';
    });

    const isSelected = (index: number) => selected.value === index;

    /** 展开那一格的完整读法：星曜分组 + 大小限落宫 + 六个限各自落在哪一宫、带哪几颗流耀 */
    const detail = computed(() => {
        const index = selected.value;
        if (index == null) return null;
        const palace = palaces.value.find(p => p.index === index);
        if (!palace) return null;
        // minorStars 按引擎给的类别分组（辅星 / 煞星 / 杂曜…），没有类别的归「杂曜」
        const byCategory = new Map<string, ZiweiStarVo[]>();
        (palace.minorStars ?? []).forEach(s => {
            const key = s.category || '杂曜';
            byCategory.set(key, [...(byCategory.get(key) ?? []), s]);
        });
        return {
            palace,
            related: relatedOf(index),
            minorGroups: [...byCategory.entries()].map(([name, stars]) => ({name, stars})),
            minorLimitAges: palace.minorLimitAges ?? [],
            limits: LIMIT_ORDER.map(item => {
                const limit = horoscope.value?.[item.key] as ZiweiLimitVo | null | undefined;
                return {
                    name: item.name,
                    palaceName: limit?.palaceNames?.[index] ?? '',
                    stars: (limit?.stars ?? []).filter(s => s.index === index),
                };
            }).filter(item => !!item.palaceName || item.stars.length > 0),
        };
    });

    const loadHoroscope = () => {
        if (!form.pillarDto.dateTime) return;
        const token = ++limitToken;
        limitLoading.value = true;
        getZiweiHoroscope({...buildQuery(), targetDate: targetDate.value})
            .then((r: any) => {
                if (token !== limitToken) return;
                horoscope.value = r?.data ?? null;
            })
            .catch((error: unknown) => {
                // 业务错误已由 axios 拦截器弹中文提示，这里只兜底日志
                if (token === limitToken) horoscope.value = null;
                console.error('紫微运限请求失败：', error);
            })
            .finally(() => {
                if (token === limitToken) limitLoading.value = false;
            });
    };

    const getChart = () => {
        if (!form.pillarDto.dateTime) return;
        const token = ++chartToken;
        form.loading.value = true;
        getZiweiChart(buildQuery())
            .then((r: any) => {
                if (token !== chartToken) return;
                chart.value = r?.data ?? {};
                form.loaded.value = !!chart.value.palaces?.length;
                // 换盘之后旧盘的运限必须清掉：同一句「今年」在两张盘上落的是不同的宫
                horoscope.value = null;
                selected.value = null;
                loadHoroscope();
            })
            .catch((error: unknown) => {
                if (token === chartToken) {
                    chart.value = {};
                    form.loaded.value = false;
                }
                console.error('紫微排盘请求失败：', error);
            })
            .finally(() => {
                if (token === chartToken) form.loading.value = false;
            });
    };

    const submitData = () => {
        form.showForm.value = false;
        getChart();
    };

    return {
        chart,
        horoscope,
        limitLoading,
        ziShiMode,
        ZI_SHI_OPTIONS,
        targetDate,
        schemaWarn,
        palaces,
        meta,
        decadalSteps,
        minorLimitRows,
        limits,
        selected,
        selectedLabel,
        isSelected,
        selectPalace,
        relationMark,
        detail,
        getChart,
        loadHoroscope,
        submitData,
        /** 当前表单口径的请求体；建报告单也要同一份，避免两处各拼一套 */
        buildQuery,
    };
}

export type ZiweiChart = ReturnType<typeof useZiweiChart>;
