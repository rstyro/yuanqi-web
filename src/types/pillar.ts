export interface Pillar {
    type: number
    ganZhi: string
    tianGan: {
        name: string
        element: {
            name: string
            restrain: string
            help: string
            color: string
        }
        yinYang: string
    }
    diZhi: {
        name: string
        element: {
            name: string
            restrain: string
            help: string
            color: string
        }
        yinYang: string
        hideHeavenlyStems: {
            name: string
            element: {
                name: string
                restrain: string
                help: string
                color: string
            }
            yinYang: string
        }[]
    }
    tianGanGod: string
    diZhiGod: string
    naYin: {
        name: string
        element: {
            name: string
            restrain: string
            help: string
            color: string
        }
    }
    hideGanGods: string[]
    shenShaList: {
        name: string
    }[]
    emptyDie: string
    starLuck: {
        name: string
    }
    selfStarLuck: {
        name: string
    }
}

export interface LuckPillar {
    year: number
    age: number
    pillar: Pillar
    child?: LuckPillar[]
}