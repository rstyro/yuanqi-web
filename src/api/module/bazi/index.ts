import http from "../../index";
import {BaziQuery} from "./types";

/**
 * 获取八字信息（排盘）。
 *
 * 返回 `R<BaziResult>`，其中 `data.pillarVo` 是命盘本体，
 * 结构见 `./types.ts`（对应后端契约 v7）。
 */
export const getBaziInfo = (dto: BaziQuery) => {
    return http.post('home/pillarData', dto, {})
}

/**
 * 取某个流年的 12 个流月（**节气月**，寅月在前）。
 *
 * 为什么单独一个请求：整包会把「10 步大运 × 10 流年 × 12 流月 = 1200 根柱子」
 * 一起返回（几十 KB → 几百 KB），而页面上同时只看得到一个流年的 12 个月。
 * 所以点开哪一年取哪一年，`dto` 与排盘时提交的**完全一致**即可。
 *
 * 返回 `R<LiuYue[]>`；`year` 用 `LiuNian.year`（以立春为界的干支年）。
 */
export const getLiuYueList = (dto: BaziQuery, year: number) => {
    return http.post('home/liuYue', dto, {params: {year}})
}

/**
 * 查子级行政区（出生地级联：省 → 市 → 区县）。
 *
 * `parentCode` 留空则返回顶级（省 / 直辖市 / 特别行政区）。
 * 返回项的 `longitude` 是**字符串**，用前要 `Number()`。
 */
export const getRegionChildren = (parentCode?: string) => {
    return http.get('region/children', {
        params: parentCode ? {parentCode} : {}
    })
}
