/**
 * 排盘页的纯函数：不读状态、不发请求，输入决定输出。
 *
 * 从 home.vue 抽出来是为了让 composable 只留「与后端数据有关的状态」，
 * 这几个函数谁都能单独调用，不必先拿到一份命盘。
 */

/** 后端返回 "2009-09-15T16:40:22" 或 "... 16:40:22" → 显示到分钟 */
export const fmt = (v?: string | null) => {
  if (!v) return '—';
  return String(v).replace('T', ' ').slice(0, 16);
};

/** 十神简称（时间轴格子窄，只显示一个字） */
export const getShortGod = (god?: string) => {
  const map: Record<string, string> = {
    偏印: '枭', 正印: '印', 食神: '食', 伤官: '伤', 偏财: '财',
    正财: '才', 七杀: '杀', 正官: '官', 比肩: '比', 劫财: '劫',
  };
  return (god && map[god]) || '';
};

export const replaceNewlinesWithBr = (s: string) => s.replace(/\n/g, '<br/>');

/** 把后端的时间串归一成可比较的毫秒数（`2026-10-12T10:00:00` 与带空格的都吃） */
export const timeValue = (v?: string | null) => {
  if (!v) return NaN;
  return new Date(String(v).replace('T', ' ').replace(/-/g, '/')).getTime();
};
