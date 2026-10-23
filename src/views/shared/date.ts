/**
 * 日期小工具 —— 从 `views/bazi/baziFormat.ts` 搬到中立目录。
 *
 * 录入表单与紫微页的运限目标日都要用这两个函数，它们不含任何八字语义；
 * 留在 bazi 目录里会让 `views/shared/` 反向依赖八字页，各抄一份又会漂。
 */

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
