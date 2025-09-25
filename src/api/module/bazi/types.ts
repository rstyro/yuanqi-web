export interface BaziQuery {
    dateType: number;
    sex: number;
    dateTime: string;
    username: string;
}

export interface  Pillar{
    type: number;
    ganZhi: string;
}

export interface  PillarVo{
    ganZhi: string;
    yearPillar: Pillar|null;
    monthPillar: Pillar|null;
    dayPillar: Pillar|null;
    hourPillar: Pillar|null;
    zodiac: string;
    starSign: string;
    lunarDate: string;
    gregorianDate: string;
}
