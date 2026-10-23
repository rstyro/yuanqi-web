import {reactive} from 'vue';
import {useBaziForm} from '@/views/shared/composables/useBaziForm';
import {useZiweiChart} from './useZiweiChart';

/**
 * 紫微页的视图模型：录入状态 + 盘面与运限，合成一个 reactive 对象传给各分区子组件。
 *
 * 录入那一半直接复用八字页的 `useBaziForm`（含出生地级联与真太阳时预览），
 * 不是图省事：**同一句生辰在两个体系里必须落成同一个时刻**。
 * 各写一份的话，农历折算、真太阳时、缺时辰补午时这些口径就会在两边各自演化，
 * 而两边的结论一旦打架，用户看到的是「这个网站自己矛盾」。
 *
 * 与八字页一样用 `reactive` 包一层：composable 返回的是 ref，
 * 模板里要写 `ctx.chart.yearGanZhi` 这种短路径（见 useBaziCtx 的同款说明）。
 */
export function useZiweiCtx() {
    const form = useBaziForm();
    const chart = useZiweiChart(form);
    return reactive({...form, ...chart});
}

export type ZiweiCtx = ReturnType<typeof useZiweiCtx>;
