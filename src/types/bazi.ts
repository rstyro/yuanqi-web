// 五行元素
export interface Element{
    name: string,
    restrain: string,
    help: string,
    color: string
}

// 纳音
export interface NaYin{
    name: string,
    element: Element
}

// 干支
export interface GanZhi{
    name: string,
    element: Element
    yinYang: string,
    hideHeavenlyStems: GanZhi
}

// 柱子信息
export interface Pillar{
    type: number,
    ganZhi: string,
    tianGan: GanZhi,
    diZhi: GanZhi,
    tianGanGod: string,
    diZhiGod: string,
    naYin: NaYin,
    shenShaList: string[],
    emptyDie: string,
    starLuck: string,
    selfStarLuck: string,
}

// 大运流年
export interface FleetingYear {
    year: number,
    age: string,
    pillar: Pillar,
}

// 运
export interface Yun {
    sex: number,
    birthday: string,
    solarTermDateTime: string,
    yunYear: number,
    yunMonth: number,
    yunDay: number,
    contrary: boolean,
    startYunDateTime: string,
    luckGanZhiList: string[],
    luckPillarList: FleetingYear[],
}

// 整个八字信息
export interface PillarVo{
    ganZhi: string,
    yearPillar: Pillar,
    monthPillar: Pillar,
    dayPillar: Pillar,
    hourPillar: Pillar,
    zodiac: string,
    starSign: string,
    lunarDate: string,
    gregorianDate: string,
    yun: Yun,
}
