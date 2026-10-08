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
