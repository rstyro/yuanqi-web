import http from "../../index";
import {ZiweiQuery} from "./types";

/**
 * 紫微斗数排盘（原局盘）。
 *
 * 返回 `R<ZiweiChartVo>`，字段形状见 `./types.ts`（后端正本 `ZiweiVo`，盘面版本 zv11）。
 *
 * 路径第一段是 `home`，与八字排盘同一个前缀 —— 后端 `security.common.excludes` 里
 * `/home/**` 免登录，vite 开发态代理也已经认这个前缀，所以这两个接口**不需要**
 * 再动 `vite.config.ts`（新增接口若换第一路径段而忘了加代理，症状是 404 而不是报错）。
 */
export const getZiweiChart = (dto: ZiweiQuery) => {
    return http.post('home/ziwei/chart', dto, {})
}

/**
 * 紫微斗数运限六限（大限 / 小限 / 流年 / 流月 / 流日 / 流时）。
 *
 * 返回 `R<ZiweiHoroscopeVo>`（后端正本 `ZiweiHoroscopeVo`，运限版本 zh1）。
 *
 * 入参与 {@link getZiweiChart} 同一份，只是多读 `targetDate`；
 * **不需要把整张盘回传** —— 后端按同一套生辰重排一次原局只要 0.2ms 级，
 * 而让前端回传盘面等于多维护一份会被篡改的中间态。
 * `targetDate` 留空时后端按当前时间算。
 */
export const getZiweiHoroscope = (dto: ZiweiQuery) => {
    return http.post('home/ziwei/horoscope', dto, {})
}

// 详细报告：逐名导出，避免与上面的排盘函数混在星号里分不清来源
export {
    generateZiweiReport,
    listZiweiReports,
    getZiweiReportDetail,
    getZiweiReportStatus,
    retryZiweiReport,
    downloadZiweiReportPdfById,
} from './report';
export type {
    ZiweiPageVo,
    ZiweiReportVo,
    ZiweiReportSectionVo,
    ZiweiReportDetailVo,
    ZiweiReportStatusVo,
    ZiweiReportGenerateParams,
} from './types';
export {ZIWEI_REPORT_STATUS, ZIWEI_SECTION_STATUS} from './types';
