import {computed, reactive, ref} from 'vue';
import {getRegionChildren} from '@/api/module/bazi';
import type {BaziQuery, RegionVo} from '@/api/module/bazi/types';
import {equationOfTimeMinutes, formatDateTime} from '../baziFormat';

/**
 * 排盘表单的状态：录入项、出生地级联、真太阳时预览。
 *
 * 从 home.vue 搬出来时**一个判断都没改**，只是把「表单」和「排盘结果」两坨状态分开存，
 * 这样每个子组件挂的是同一个视图模型（见 useBaziCtx），而不是各自维护一份副本。
 */
export function useBaziForm() {
  const showForm = ref(false);
  const loading = ref(false);
  const loaded = ref(false);

  const pillarDto = reactive<BaziQuery>({
    dateType: 1,
    sex: 1,
    dateTime: '',
    username: '',
    longitude: null,
    useTrueSolarTime: false,
    withEquationOfTime: false,
    leapMonth: false,
  });

  /* ------------------------------------------------------------------
   * 出生地级联
   * ---------------------------------------------------------------- */

  const region = reactive({
    provinces: [] as RegionVo[],
    cities: [] as RegionVo[],
    districts: [] as RegionVo[],
    province: null as string | null,
    city: null as string | null,
    district: null as string | null,
    picked: null as RegionVo | null,
  });

  /* ------------------------------------------------------------------
   * 真太阳时预览（与后端 TrueSolarTime 同口径，仅用于回显）
   * ---------------------------------------------------------------- */

  const tstActive = computed(() => !!(pillarDto.useTrueSolarTime && pillarDto.longitude));

  const tstOffsetMinutes = computed(() => {
    if (!tstActive.value) return 0;
    const lng = Number(pillarDto.longitude);
    let m = Math.round((lng - 120) * 4);
    if (pillarDto.withEquationOfTime) m += Math.round(equationOfTimeMinutes(pillarDto.dateTime));
    return m;
  });

  const tstOffsetText = computed(() => {
    const m = tstOffsetMinutes.value;
    if (!m) return '±0 分';
    return (m > 0 ? '+' : '') + m + ' 分';
  });

  const tstCorrectedText = computed(() => {
    const dt = pillarDto.dateTime;
    if (!dt) return '—';
    const d = new Date(String(dt).replace(/-/g, '/'));
    if (isNaN(d.getTime())) return '—';
    d.setMinutes(d.getMinutes() + tstOffsetMinutes.value);
    return formatDateTime(d);
  });

  const tstSourceText = computed(() => {
    const s = region.picked?.source;
    if (!s) return '已选出生地';
    if (s === 'adcode') return '官方点位';
    if (s === 'children-avg') return '上级推算';
    if (s.startsWith('parent:')) return '上级回填';
    return s;
  });
  const tstIsApprox = computed(() => !!region.picked?.source && region.picked.source !== 'adcode');

  /* ------------------------------------------------------------------
   * 方法
   * ---------------------------------------------------------------- */

  const disabledFutureDate = (time: Date) => time.getTime() > Date.now();

  const showFormBox = () => {
    showForm.value = !showForm.value;
  };

  const fetchRegions = (parentCode?: string): Promise<RegionVo[]> => {
    return getRegionChildren(parentCode).then((r: any) => {
      if (r?.code === 200) return (r.data || []) as RegionVo[];
      return [];
    }).catch((error: unknown) => {
      console.error('加载行政区失败：', error);
      return [];
    });
  };

  const loadProvinces = () => {
    fetchRegions().then(list => {
      region.provinces = list;
    });
  };

  const onProvinceChange = (code: string | null) => {
    region.province = code;
    region.cities = [];
    region.districts = [];
    region.city = null;
    region.district = null;
    applyPicked(region.provinces.find(x => x.code === code));
    if (!code) return;
    fetchRegions(code).then(list => {
      region.cities = list;
    });
  };

  const onCityChange = (code: string | null) => {
    region.city = code || null;
    region.districts = [];
    region.district = null;
    const c = region.cities.find(x => x.code === code);
    if (c) {
      applyPicked(c);
    } else {
      // 清掉市 → 退回省坐标（不能只传 undefined，那会走「保留原值」分支）
      applyPicked(region.provinces.find(x => x.code === region.province));
    }
    if (!code) return;
    fetchRegions(code).then(list => {
      region.districts = list;
    });
  };

  const onDistrictChange = (code: string | null) => {
    region.district = code || null;
    const d = region.districts.find(x => x.code === code);
    if (d) {
      applyPicked(d);
    } else if (!region.city) {
      applyPicked(region.provinces.find(x => x.code === region.province));
    } else if (!code) {
      applyPicked(region.cities.find(x => x.code === region.city));
    }
  };

  /**
   * 把选中区域的经度写进 pillarDto。
   *
   * 传 undefined 时**不会**清掉已有经度 —— 调用方要「退回上一级」
   * 必须显式传上一级的记录，而不是指望这里兜底。
   */
  const applyPicked = (r?: RegionVo) => {
    region.picked = r || null;
    if (r && r.longitude != null) {
      pillarDto.longitude = Number(r.longitude);
    } else if (r) {
      // 有地区但无坐标（街道级才会出现），置空以免用错坐标
      pillarDto.longitude = null;
    }
  };

  return {
    showForm,
    loading,
    loaded,
    pillarDto,
    region,
    tstActive,
    tstOffsetMinutes,
    tstOffsetText,
    tstCorrectedText,
    tstSourceText,
    tstIsApprox,
    disabledFutureDate,
    showFormBox,
    loadProvinces,
    onProvinceChange,
    onCityChange,
    onDistrictChange,
  };
}

export type BaziForm = ReturnType<typeof useBaziForm>;
