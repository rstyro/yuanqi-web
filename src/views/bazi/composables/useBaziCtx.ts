import {reactive} from 'vue';
import {useBaziForm} from '@/views/shared/composables/useBaziForm';
import {useBaziChart} from './useBaziChart';

/**
 * 把表单状态与排盘结果合成一个**视图模型**，作为单个 prop 传给各分区子组件。
 *
 * 为什么用 `reactive` 包一层：子组件模板里要写 `ctx.qiYun.birthday`、`ctx.sect`，
 * 而 composable 返回的是一堆 ref —— 普通对象里的 ref 在模板中不会自动脱 .value，
 * 包成 reactive 后访问即取值、赋值即写回（`ctx.sect = '1'` 能直接驱动 watch）。
 *
 * 刻意不做的事：不改成 pinia、不拆成逐 prop 传递 —— 这张盘的状态本来就是一整块，
 * 拆成 40 个 prop 只会让每个子组件的签名比原来更难读。
 */
export function useBaziCtx() {
  const form = useBaziForm();
  const chart = useBaziChart(form);
  return reactive({...form, ...chart});
}

export type BaziCtx = ReturnType<typeof useBaziCtx>;
