import { Pillar } from "@/types/bazi";

export function createEmptyPillar(type: number): Pillar {
    return {
        type,
        ganZhi: "",
        tianGan: "",
        diZhi: "",
        tianGanGod: "",
        diZhiGod: "",
        naYin: "",
    };
}
