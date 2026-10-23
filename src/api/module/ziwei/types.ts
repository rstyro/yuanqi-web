/**
 * 紫微斗数接口的返回结构 —— 与后端 `common-ziwei` 的 VO 逐字段对齐。
 *
 * 正本在 `commons/common-ziwei/src/main/java/top/lrshuai/common/ziwei/vo/`，
 * 盘面版本 `ZiweiVo.SCHEMA_VERSION = zv11`、运限版本 `ZiweiHoroscopeVo.SCHEMA_VERSION = zh1`。
 * 后端那两个版本串是「字段形状」的指纹：加字段/改语义会抬它，
 * 所以线上拿到 `schemaVersion` 不是 `zv11` 时，本文件就已经和后端脱节了 ——
 * 页面会在 `ZiweiChartBoard` 里显式提示，而不是安静地少画几颗星。
 *
 * 三条对齐要点（都是这次接线实测出来的，别按直觉改）：
 * - `palaces` 按**地支序**给出，`palaces[i].index === i`，0=子 … 11=亥（不是从命宫起）。
 * - 各限的 `palaceNames` 也是**按地支下标**索引的：`palaceNames[i]` = 该限盘上落在本命地支 i 的宫名。
 * - 枚举字段一律是**中文字符串**（`ziShiMode` 是「0点换日（23点归当日）」这种显示名，
 *   不是枚举名 `SAME_DAY`）；请求侧反过来，传枚举名。
 */

/** 子时口径的枚举名（请求侧用；响应侧回的是 `ziShiModeLabel` 那种中文显示名） */
export type ZiShiModeName = 'SAME_DAY' | 'NEXT_DAY';

/**
 * 排盘 / 运限两个接口的共用入参。
 *
 * 前八个字段与八字排盘同口径（后端走同一个 `BirthDateResolver`），
 * 紫微只多两格：`ziShiMode`（一天从几点换日）与 `targetDate`（算运限的那一天，`/chart` 忽略）。
 */
export interface ZiweiQuery {
    dateTime: string;
    dateType: number;
    leapMonth?: boolean;
    sex: number;
    username?: string;
    longitude?: number | null;
    useTrueSolarTime?: boolean;
    withEquationOfTime?: boolean;
    ziShiMode?: ZiShiModeName;
    targetDate?: string;
}

/** 一颗星（主星 / 杂曜 / 十二神共用这一个形状，靠 `category` 区分） */
export interface ZiweiStarVo {
    name: string;
    /** 主星 / 吉星 / 煞星 / 禄马，杂曜与十二神各有自己的类别名 */
    category?: string | null;
    /** 庙旺得利平不陷，只有主星带亮度 */
    brightness?: string | null;
    /** 化禄 / 化权 / 化科 / 化忌的简称（禄权科忌），未化则空 */
    transform?: string | null;
}

/** 一宫（= 一个地支位） */
export interface ZiweiPalaceVo {
    /** 地支序号，0=子 … 11=亥，与数组下标一致 */
    index: number;
    zhi: string;
    /** 宫干（五虎遁由生年干起） */
    gan: string;
    /** 宫名，如「命宫」「财帛宫」 */
    palace: string;
    /** 身宫所在那一格为真 */
    bodyPalace: boolean;
    /** 主星 + 辅曜（带亮度与本宫四化） */
    stars: ZiweiStarVo[];
    /** 杂曜 */
    minorStars: ZiweiStarVo[];
    /** 十二神，恒 4 颗 */
    twelveGods: ZiweiStarVo[];
    decadalStartAge?: number | null;
    decadalEndAge?: number | null;
    /** 小限落本宫的虚岁：等差 12，全表铺 1—125，故本宫是 10 个或 11 个 */
    minorLimitAges: number[];
}

/** 原局盘 */
export interface ZiweiChartVo {
    schemaVersion?: string;
    gregorianDate?: string;
    lunarDate?: string;
    leapMonth?: boolean;
    hourZhi?: string;
    gender?: string;
    yearGanZhi?: string;
    mingGongGanZhi?: string;
    /** 五行局名，如「木三局」 */
    bureau?: string;
    bureauNumber?: number;
    /** 命主星（按命宫地支查表） */
    mingZhu?: string;
    /** 身主星（按生年地支查表） */
    shenZhu?: string;
    /** 实际用的四化表版本名（页面据此标注，不让前端猜口径） */
    siHuaVariant?: string;
    /** 实际用的子时口径显示名 */
    ziShiMode?: string;
    lunarYear?: number;
    lunarMonth?: number;
    lunarDay?: number;
    hourZhiIndex?: number;
    mingGongIndex?: number;
    palaces: ZiweiPalaceVo[];
    /**
     * 格局与十二宫断语：引擎算得出，但**页面刻意不渲染**。
     *
     * 盘面里只有星曜、宫位、干支、运限那几块是对拍过的（与 iztro 3000/2000 盘零差异），
     * 格局 18 格与断语的审核口径还没定，所以接口照原样回、页面上一个字都不显示。
     */
    patterns?: unknown[];
    verdict?: unknown;
}

/** 一个限里的流耀 */
export interface ZiweiLimitStarVo {
    name: string;
    /** 落宫地支序号 */
    index: number;
    zhi: string;
}

/** 一个限（大限 / 小限 / 流年 / 流月 / 流日 / 流时） */
export interface ZiweiLimitVo {
    /** 中文限名，直接用后端 LimitScope 的 name */
    scope: string;
    /** 限命宫落的地支序号 */
    index: number;
    zhi: string;
    ganZhi: string;
    nominalAge?: number | null;
    decadalStartAge?: number | null;
    decadalEndAge?: number | null;
    /** 还没起运（虚岁小于局数）时为真，此时大限那格论「童限」 */
    childhood?: boolean | null;
    /** 化名 → 星名，顺序恒为 禄、权、科、忌 */
    fourTransforms: Record<string, string>;
    /** 12 项，**按本命地支下标**索引：该限盘上落在地支 i 的宫名 */
    palaceNames: string[];
    stars: ZiweiLimitStarVo[];
}

/** 某个目标时刻的六限 */
export interface ZiweiHoroscopeVo {
    schemaVersion?: string;
    /** 目标公历时刻（后端补的完整 `yyyy-MM-dd HH:mm:ss`） */
    targetDate?: string;
    targetLunarDate?: string;
    /** 目标那一年的虚岁 */
    nominalAge?: number;
    decadal?: ZiweiLimitVo | null;
    age?: ZiweiLimitVo | null;
    yearly?: ZiweiLimitVo | null;
    monthly?: ZiweiLimitVo | null;
    daily?: ZiweiLimitVo | null;
    hourly?: ZiweiLimitVo | null;
}

// ==================== 详细报告（/chat/ziwei/report/**） ====================

/**
 * 报告主单状态：0=生成中，1=已完成，2=失败。
 *
 * 与后端 `ZiweiReport.ReportStatus` 同口径；章节失败是另一个号（见下）。
 */
export const ZIWEI_REPORT_STATUS = {
    DOING: 0,
    END: 1,
    ERR: 2,
} as const;

/** 章节状态：0=待生成，1=生成中，2=已完成，3=失败。注意失败是 3，不是主单的 2 */
export const ZIWEI_SECTION_STATUS = {
    TODO: 0,
    DOING: 1,
    END: 2,
    ERR: 3,
} as const;

/** 分页信封，与后端 MyBatis-Plus Page 的字段一一对应 */
export interface ZiweiPageVo<T> {
    records: T[];
    total: number;
    size: number;
    current: number;
    pages: number;
}

/**
 * 报告主单，对应后端 `ZiweiReport`。
 *
 * `birthJson` / `chartJson` 被 `@JsonIgnore` 挡掉，前端拿到的只有这些轻字段；
 * `id` / `userId` 因全局 JacksonConfig 把 Long 序列化成字符串，别当 number 用。
 */
export interface ZiweiReportVo {
    id: string;
    userId: string;
    title: string;
    /** 命宫干支，如「辛酉」 */
    mingGongGanZhi: string | null;
    /** 五行局名，如「木三局」 */
    bureau: string | null;
    /** 1=男，0=女 */
    sex: number | null;
    /** `yyyy-MM-dd HH:mm:ss` */
    birthTime: string | null;
    /** 1=公历，2=农历 */
    dateType: number | null;
    leapMonth: number | null;
    username: string | null;
    /** 建单时的盘面版本，如 zv11 */
    chartVersion: string | null;
    status: number;
    totalSections: number | null;
    doneSections: number | null;
    errorMsg: string | null;
    createTime: string | null;
    updateTime: string | null;
}

/** 报告的一章，对应后端 `ZiweiReportSection` */
export interface ZiweiReportSectionVo {
    id: string;
    reportId: string;
    /** 报告内从 1 递增，决定渲染与导出顺序 */
    seq: number;
    /**
     * 正文 11 键：read_me / personality / strengths / career / wealth / love_family /
     * wellbeing / current_decade / next_years / decade_map / advice；
     * 附录 3 键：appendix / pro_palaces / pro_sanfang。
     * 旧版报告的键（overview / ming_shen / twelve_palaces / sanfang / decadal /
     * liunian_YYYY）只会出现在历史单里，页面按普通章节平铺。
     */
    sectionKey: string;
    title: string;
    status: number;
    /** 章节正文（markdown）。失败/待生成时为 null */
    content: string | null;
    retryCount: number | null;
    errorMsg: string | null;
    elapsedMs: number | null;
}

/**
 * 报告详情 —— 主单 + 全部章节（按 seq 升序）+ 命盘快照。
 *
 * 未生成完也返回；`chart` 可能为 null（快照损坏且生辰还原不出），
 * 一期报告页不依赖它渲染，只把它当作后备展示材料。
 */
export interface ZiweiReportDetailVo {
    report: ZiweiReportVo;
    sections: ZiweiReportSectionVo[];
    chart: ZiweiChartVo | null;
}

/** 轻量轮询结果（2~3 秒一次），刻意不带章节正文 */
export interface ZiweiReportStatusVo {
    id: string;
    title: string;
    mingGongGanZhi: string | null;
    bureau: string | null;
    status: number;
    totalSections: number | null;
    doneSections: number | null;
    /** 当前正在生成的章节标题；全部终态时为 null */
    currentSectionTitle: string | null;
    errorMsg: string | null;
}

/**
 * 建单请求。
 *
 * `chart` 与排盘接口同一份 `ZiweiQuery`（后端正本 `ZiweiChartRequest`），
 * 排盘口径少传一样就可能排出另一张盘；`targetDate` 在本入口被忽略。
 * 章节清单固定为正文 11 章 + 附录 3 章，不再有窗口参数。
 */
export interface ZiweiReportGenerateParams {
    chart: ZiweiQuery;
}
