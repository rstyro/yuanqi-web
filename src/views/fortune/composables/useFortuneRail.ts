/**
 * 左栏的收起 / 覆盖层状态。
 *
 * <p>拆成三档是有原因的：{@code railManual}（用户手动收起，落 localStorage）、
 * {@code railForced}（窄屏强制）、{@code overlayOpen}（窄屏下临时摊开的覆盖层）。
 * 前两者分开记，视口变宽时才恢复得回用户自己的选择；
 * 覆盖层只在不宽不窄的 mobile 档存在，变宽时必须清掉，否则主区会莫名全宽。
 */
import {computed, onMounted, onUnmounted, ref, watch} from 'vue';

export function useFortuneRail() {
  /** 侧栏收起偏好存在这里。前缀跟项目的 {@code yuanqi-theme} 保持一致 */
  const RAIL_KEY = 'yuanqi-fortune-rail';

  /** 窄于此宽度就把侧栏收成图标栏 —— 150px 的常驻栏在手机上会把报告区挤没 */
  const NARROW_QUERY = '(max-width: 899px)';
  /** 用户手动收起。与「窄屏强制收起」分开记，视口变宽时才恢复得回来 */
  const railManual = ref(readRailPref());
  /** 窄屏强制收成图标栏。setup 阶段就定好，避免移动端先闪一下展开态 */
  const railForced = ref(typeof window !== 'undefined' && window.matchMedia(NARROW_QUERY).matches);
  /** 窄屏下把左栏当覆盖层展开，而不是继续挤压报告区 */
  const overlayOpen = ref(false);

  const rail = computed(() => railManual.value || railForced.value);
  /** 图标栏下只留状态点 + 「新对话」图标，文字全隐 */
  const showText = computed(() => !rail.value || overlayOpen.value);

  /** 收起偏好落 localStorage：每次进页面都被重置回展开态会让人烦 */
  function readRailPref(): boolean {
    try {
      return localStorage.getItem(RAIL_KEY) === '1';
    } catch {
      // 隐私模式下 localStorage 可能直接抛，读不到就按展开算
      return false;
    }
  }

  watch(railManual, (next) => {
    try {
      localStorage.setItem(RAIL_KEY, next ? '1' : '0');
    } catch {
      // 写不进去不影响使用，只是下次进来恢复不了
    }
  });
  /** 收起 / 展开左栏。窄屏下展开的是覆盖层 —— 不能再挤压本来就不够的报告区 */
  function toggleRail(): void {
    if (railForced.value) {
      overlayOpen.value = !overlayOpen.value;
      return;
    }
    railManual.value = !railManual.value;
  }
  let mq: MediaQueryList | null = null;
  /** 视口在宽窄之间切换时，只改「强制收起」这一档；用户手动收起的选择一直保留 */
  function onViewportChange(): void {
    railForced.value = !!mq?.matches;
    if (!railForced.value) {
      // 变宽了，覆盖层就没有存在意义了 —— 留着它会让主区莫名其妙地全宽
      overlayOpen.value = false;
    }
  }

  onMounted(() => {
    mq = window.matchMedia(NARROW_QUERY);
    onViewportChange();
    mq.addEventListener('change', onViewportChange);
  });

  onUnmounted(() => {
    mq?.removeEventListener('change', onViewportChange);
  });

  return {
    rail,
    showText,
    overlayOpen,
    toggleRail,
  };
}

export type FortuneRail = ReturnType<typeof useFortuneRail>;
