export interface PillarDto {
    username: string;
    sex: 0 | 1;
    dateTime: string;
}

export interface Element {
    color: string;
    name: string;
}

export interface HeavenlyStem {
    name: string;
    yinYang: 'YANG' | 'YIN';
    element: Element;
}

export interface DiZhi {
    name: string;
    yinYang: 'YANG' | 'YIN';
    element: Element;
    hideHeavenlyStems: HeavenlyStem[];
}

export interface Pillar {
    title: string;
    tianGanGod: string;
    diZhiGod: string;
    tianGan: HeavenlyStem;
    diZhi: DiZhi;
    hideGanGods: string[];
    starLuck: { name: string };
    selfStarLuck: { name: string };
    emptyDie: string;
    naYin: { name: string };
    shenShaList: Array<{ name: string }>;
}

export interface Yun {
    birthday: string;
    yunYear: number;
    yunMonth: number;
    yunDay: number;
    yunHour: number;
    startYunDateTime: string;
    luckPillarList: Array<{
        year: string;
        age: number;
        pillar: Pillar;
        child: Array<{
            year: string;
            age: number;
            pillar: Pillar;
        }>;
    }>;
}

export interface LifeTime {
    score: number;
    joyousGods: string[];
    fearGods: string[];
}

export interface Caput {
    name: string;
}

export interface MergeVo {
    tianGanMergeList: string[];
    diZhi6MergeList: string[];
    diZhi3HarmList: string[];
    diZhi3MergeList: string[];
    diZhiHideMergeList: string[];
    diZhi6ConflictList: string[];
    diZhi6HarmList: string[];
    diZhi3MeetList: string[];
}

export interface PillarResponse {
    ganZhi: string;
    yun: Yun;
    lifeTime: LifeTime;
    caput: Caput;
    mergeVo: MergeVo;
    lunarExtendMap: Record<string, { summary: string; description: string }>;
    yearPillar: Pillar;
    monthPillar: Pillar;
    dayPillar: Pillar;
    hourPillar: Pillar;
}
