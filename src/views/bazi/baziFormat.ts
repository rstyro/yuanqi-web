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

export const formatDateTime = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

/**
 * 均时差（分钟）—— 与后端 `TrueSolarTime.equationOfTimeMinutes` 同口径。
 * 前端复刻只为「选完就能预览差多少」，不作为排盘依据。
 */
export const equationOfTimeMinutes = (dtStr?: string) => {
  if (!dtStr) return 0;
  const d = new Date(String(dtStr).replace(/-/g, '/'));
  if (isNaN(d.getTime())) return 0;
  const start = new Date(d.getFullYear(), 0, 0);
  const doy = Math.floor((d.getTime() - start.getTime()) / 86400000);
  // γ 取「当天 12:00」，让同一天任何时刻的均时差为定值（与后端一致）
  const gamma = (2 * Math.PI / 365) * (doy - 1 + 0.5);
  return 229.18 * (0.000075
      + 0.001868 * Math.cos(gamma)
      - 0.032077 * Math.sin(gamma)
      - 0.014615 * Math.cos(2 * gamma)
      - 0.040849 * Math.sin(2 * gamma));
};

/** 把后端的时间串归一成可比较的毫秒数（`2026-10-12T10:00:00` 与带空格的都吃） */
export const timeValue = (v?: string | null) => {
  if (!v) return NaN;
  return new Date(String(v).replace('T', ' ').replace(/-/g, '/')).getTime();
};
