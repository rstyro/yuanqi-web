import {reactive} from 'vue';
import {useFortuneRail} from './useFortuneRail';
import {useFortuneState} from './useFortuneState';

/**
 * 整页状态合成一个响应式对象，作为单个 prop 传给各子组件。
 *
 * <p>包一层 {@code reactive()} 有两个必要：模板里写 {@code ctx.busy} 时 ref 自动解包，
 * 子组件不必到处 {@code .value}；而 {@code v-model="ctx.question"}、
 * {@code ctx.overlayOpen = false} 这类写入会穿透到对应的 ref 上，
 * 所以「一个 prop 走天下」不需要 emit 回传。
 *
 * <p>先建侧栏再建状态：开历史会话 / 开新对话时要收起窄屏覆盖层，依赖是单向的。
 * 与排盘页同一套路（见 views/bazi/composables/useBaziCtx.ts）。
 */
export function useFortuneCtx() {
  const rail = useFortuneRail();
  const state = useFortuneState(rail);
  return reactive({...state, ...rail});
}

export type FortuneCtx = ReturnType<typeof useFortuneCtx>;
