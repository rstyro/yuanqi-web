/**
 * 排盘接口（`POST /home/pillarData`）的数据契约。
 *
 * 权威文档：`commons/common-ganzhi/docs/pillar-json-contract.md`（当前 v7）。
 *
 * 和「老版本」的三处关键差异 —— 也是排盘页曾经整页空白的原因：
 *
 * 1. 柱子里的 `tianGan` / `diZhi` / `naYin` **只序列化中文名**（如 `"甲"` / `"子"` / `"海中金"`），
 *    完整属性（五行、阴阳、颜色、藏干）挪到了顶层一份 `ganZhiDict`。
 *    所以不能再写 `item.tianGan.element.color` —— `"甲".element` 是 `undefined`，
 *    再取 `.color` 会在渲染期抛 TypeError，Vue 整棵子树渲染中断 → 白屏。
 *    正确写法是 `ganZhiDict.tianGan[item.tianGan].element.color`。
 *
 * 2. `PillarVo.yun.luckPillarList[i].child[j]` 已删除，改成按「起运流派」分组的两个 Map：
 *    `qiYunMap` / `daYunListMap`（key 是流派编码 `"1"` / `"2"`），
 *    大运是 `DaYun`、流年是 `LiuNian`，各自只带自己的字段。
 *
 * 3. 新增 `sect`（当前展示流派）与 `qiYunView`（服务端算好的派生结论：
 *    当前几岁、走到第几步、两流派摘要）。**「现在第几步」不要去前端比年份**，
 *    直接用 `qiYunView.currentDaYunIndex`。
 *
 * 4. **v7 新增 `structureView`**（取格依据 + 透干 + 通根），并给 `mergeVo` 补上
 *    `tianGanChongList` / `diZhiHalfMergeList`。这四样以前是前端按标准定义自己推的，
 *    导致「页面的盘」与「AI 的盘」两套口径；现在只认后端字段，**前端不再自算**。
 *
 * 另外柱子里的 `starLuck` / `selfStarLuck` 是 `{name}` 对象、
 * `shenShaList` 是 `[{name}]`、`hideGanGods` 是 `string[]` —— 这三者的形状各不一样，别记混。
 */

/** 排盘请求入参 */
export interface BaziQuery {
    /** 1 = 公历（新历），2 = 农历 */
    dateType: number;
    /** 1 = 男，0 = 女 */
    sex: number;
    /** `yyyy-MM-dd HH:mm:ss` */
    dateTime: string;
    username: string;

    /* ---- v5：真太阳时（都可选，缺省即关，保持历史行为） ---- */
    /** 出生地经度；不传则无法校正，退回北京时间 */
    longitude?: number | null;
    /** 是否启用真太阳时校正 */
    useTrueSolarTime?: boolean;
    /** 校正时是否计入均时差 */
    withEquationOfTime?: boolean;

    /* ---- v6：农历闰月 ---- */
    /** 仅 `dateType=2` 有意义；不传按平月处理 */
    leapMonth?: boolean;
}

/** 五行元素 */
export interface Element {
    name: string;
    restrain: string;
    help: string;
    color: string;
}

/**
 * 干支的完整属性。
 * 只出现在顶层 `ganZhiDict` 里；柱子内的 `tianGan` / `diZhi` 只是一个中文字符串。
 */
export interface GanZhi {
    name: string;
    element: Element;
    /** `YANG` | `YIN` */
    yinYang: string;
    /** 仅地支有：藏干（元素本身仍是完整对象，不用再查表） */
    hideHeavenlyStems?: GanZhi[];
}

/** 干支字典：10 天干 + 12 地支，key 就是中文名 */
export interface GanZhiDict {
    tianGan: Record<string, GanZhi>;
    diZhi: Record<string, GanZhi>;
}

/** 神煞 */
export interface ShenSha {
    name: string;
}

/** 星运 */
export interface StarLuck {
    name: string;
}

/**
 * 一根柱子（四柱 / 大运柱 / 流年柱共用）。
 *
 * 注意 `tianGan` / `diZhi` / `naYin` 都是**中文名字符串**，不是对象。
 */
export interface Pillar {
    /** 0=年柱 1=月柱 2=日柱 3=时柱 -1=非四柱（大运/流年） */
    type: number;
    ganZhi: string;
    tianGan: string;
    diZhi: string;
    /** 日柱上是「元男 / 元女」而非十神，历史行为 */
    tianGanGod: string;
    diZhiGod: string;
    naYin: string;
    hideGanGods: string[];
    shenShaList: ShenSha[];
    emptyDie: string;
    starLuck: StarLuck;
    selfStarLuck: StarLuck;
    /** 前端补的展示标题（年柱/月柱/日柱/时柱/大运/流年），接口不返回 */
    title?: string;
}

/** 起运（某一流派的读数与交运时刻） */
export interface QiYun {
    birthday: string;
    /** 参照节令时刻 */
    solarTermDateTime: string;
    /** 是否逆推 */
    contrary: boolean;
    years: number;
    months: number;
    days: number;
    hours: number;
    /** 交运时刻 */
    startYunDateTime: string;
}

/** 流年 */
export interface LiuNian {
    year: number;
    age: number;
    ganZhi: string;
    pillar: Pillar;
}

/**
 * 一个流月（**节气月**，`POST /home/liuYue`）。
 *
 * **「月」不是公历月、也不是农历月**：一个月从某个【节】交节那刻开始，到下一个节为止，
 * 区间是半开的 `[startDateTime, nextTermDateTime)`。一个流年（立春 → 次年立春）
 * 正好被切成 12 个月，第 1 个是寅月、第 12 个是丑月。
 *
 * 所以**「2026 年 1 月」属丙午流年的丑月**，它的 `year` 是 `2027`。
 * 要显示「这一月是哪年哪月」请读 `year` / `month`，**不要拿流年加 `index` 去推**。
 *
 * 也不要用 `now` 的「年月」去判「哪个月是本月」—— 一个流月横跨两个公历月
 * （戌月 10/08 → 11/07），11/01 那天的交节月仍是 10 月。**要判当前月必须比时刻**。
 */
export interface LiuYue {
    /** 流年内第几个月，1~12（1 = 寅月，从立春起算） */
    index: number;
    /** 节气月名，如「寅月」 */
    name: string;
    /** 起始的节名，如「立春」「惊蛰」 */
    termName: string;
    /** 交节时刻所在公历年（丑月恒为流年的次年） */
    year: number;
    /** 交节时刻所在公历月，1~12 */
    month: number;
    ganZhi: string;
    /** 起节时刻（含） */
    startDateTime: string;
    /** 下一个节的原时刻（**不含**）—— 本月的半开区间终点 */
    nextTermDateTime: string;
    pillar: Pillar;
}

/** 一步大运（下辖 10 个流年） */
export interface DaYun {
    /** 第几步，从 1 开始 */
    index: number;
    /** 交运日的公历年 */
    startYear: number;
    /** 名义年份 = startYear + 9，管 10 个流年 */
    endYear: number;
    /** 真实交运时刻（判断「现在第几步」要比它，不是比年份） */
    startDateTime: string;
    /** 下一步交运日前一刻 */
    endDateTime: string;
    age: number;
    ganZhi: string;
    pillar: Pillar;
    liuNianList: LiuNian[];
}

/** 某个流派的起运摘要（qiYunView.sectSummaryMap 的值） */
export interface SectSummary {
    sect: string;
    label: string;
    contrary: boolean;
    startYunDateTime: string;
    /** 服务端拼好的「出生后 N 年 N 月 N 天 N 时起运」 */
    startYunText: string;
    startYears: number[];
    firstStartYear: number;
}

/**
 * 起运视图：服务端算好的派生结论，纯展示用。
 *
 * `currentDaYunIndex` 的三个特殊值：`1..10` 正常；`0` 还没起运；`-1` 已超出全部大运。
 * **不要把 -1 当第 1 步**，那会高亮错一格且看不出来。
 */
export interface QiYunView {
    /** 服务端算这个 View 的时刻，显示「距今」类相对量请以它为准 */
    now: string;
    currentAge: number;
    currentNominalAge: number;
    currentDaYunIndex: number;
    /** 未起运/超出时为 -1 */
    currentDaYunStartYear: number;
    /** 距本步结束还有几天 */
    daysToNextYun: number;
    sectSummaryMap: Record<string, SectSummary>;
}

/**
 * 身强身弱（后端 `LifeTime`）。
 *
 * <p><b>`score` 不是百分制</b>：它是后端按「得令/得地/得势得生」三层加权、
 * 再看藏干分层、虚实、合化、刑冲修正后的原始值，量程 −100 ~ +100
 * （月支得令 ±40 是大头，其余三支各 ±10，三个天干各 ±10，合化/刑冲各另有修正）。
 * 所以界面上不能写成「评分 76 分」那种直觉化的百分比。
 *
 * <p><b>判强弱的阈值不是固定值</b>（2026-10-10 改口径）：后端用 `strongBaseline`
 * ——「同类型盘（同一天干五行）的基准分」，取该日主 score 分布的<b>中位数</b>：
 * 木/火 −33、水 −30、金 −14、土 −19（10 万张随机盘实测）。
 * 画量尺、写文案都要用后端下发的这个值，**别在前端写死 50 或百分比**。
 *
 * <p><b>`joyousElements` / `fearElements` 是完整 `Element` 对象</b>
 * （含 `name` / `color`），不是字符串 —— 这里曾误标成 `string[]`。
 * 只有 `joyousGods` / `fearGods`（十神名）才是字面量数组。
 */
export interface LifeTime {
    score: number;
    /** 身强判定基准（`score > strongBaseline` 即身强）；随日干五行变，见上 */
    strongBaseline: number;
    /** 后端派生值（`score > strongBaseline`）。判断强弱用它，别在前端重复那个比较 */
    strong: boolean;
    joyousElements: Element[];
    joyousGods: string[];
    fearElements: Element[];
    fearGods: string[];
}

/** 格局 */
export interface Caput {
    name: string;
}

/**
 * 天干地支的合冲刑害（后端 `MergeVo`）。
 *
 * <p>每个字段对应一类关系，列表项是**后端拼好的中文短语**（如 `"乙庚合"`、
 * `"巳酉丑合金局"`、`"申子半合水局"`），前端直接展示即可，不要自己拆字重拼。
 *
 * <p><b>v7 起后端补齐了原先缺的三类</b>，前端不再自己推导：
 * <ul>
 *   <li>{@link tianGanChongList} —— 天干相冲（只有四组，戊己居中不冲）</li>
 *   <li>{@link diZhiHalfMergeList} —— 地支半合（与 `diZhi3MergeList` 互斥）</li>
 *   <li>透干 / 通根 —— 在 {@link StructureView} 里，不在这八个/十个 List 上</li>
 * </ul>
 */
export interface MergeVo {
    /** 天干五合 */
    tianGanMergeList: string[];
    /** 地支六合 */
    diZhi6MergeList: string[];
    /** 地支三刑（含自刑） */
    diZhi3HarmList: string[];
    /** 地支三合局（三支齐全才算） */
    diZhi3MergeList: string[];
    /** 地支暗合 */
    diZhiHideMergeList: string[];
    /** 地支六冲 */
    diZhi6ConflictList: string[];
    /** 地支六害 */
    diZhi6HarmList: string[];
    /** 地支三会方 */
    diZhi3MeetList: string[];
    /**
     * 天干相冲：只有 **甲庚 / 乙辛 / 丙壬 / 丁癸** 四组（戊己居中，不相冲）。
     * 与 `tianGanMergeList`（五合）是两回事，可以同时存在。
     */
    tianGanChongList: string[];
    /**
     * 地支半合：三合局缺一支、且剩下两支带帝旺（长生+帝旺 或 帝旺+墓库），
     * 形如 `"申子半合水局"`。
     *
     * **与 `diZhi3MergeList` 互斥**：三支齐全时只报三合局，不再报半合。
     * 注意「长生+墓库」（如 申辰）叫**拱**，不算半合 —— 后端不会把它放进这里。
     */
    diZhiHalfMergeList: string[];
}

/* ==========================================================================
 * 结构视图（后端 `StructureView`）：取格依据 + 透干 + 通根
 *
 * v7 新增。此前这些内容后端没有出口，排盘页由前端按标准定义自己推导
 * （半合、天干相冲、透干、通根、取格印证）—— 结果是「页面上的盘」与
 * 「AI 说的盘」两套口径。现在统一由服务端产出，页面只做展示。
 * ========================================================================== */

/** 藏干层级：0 = 本气，1 = 中气，2 = 余气 */
export type HiddenDepth = 0 | 1 | 2;

/** 取格依据的种类 */
export type CaputBasis =
    /** 月令藏干有透出者，据透出者取格 */
    | 'EXPOSED'
    /** 月令藏干皆不透，按子平法「酌取其一」 */
    | 'NONE_EXPOSED'
    /** 外格（月令禄刃 / 一气专旺 / 特殊格），不以月令透干取格 */
    | 'OUTER';

/** 月令藏干里透出的一个候选 */
export interface CaputCandidate {
    /** 透出的天干名，如 `"庚"` */
    stem: string;
    /** 该干对日主的十神，如 `"正官"` */
    god: string;
    depth: HiddenDepth;
}

/** 一个藏干字 */
export interface HiddenStem {
    /** 藏干名，如 `"庚"` */
    name: string;
    /** 该藏干对日主的十神 */
    god: string;
    depth: HiddenDepth;
    /** 是否透出于四柱天干位（**不是**「在十二字里找得到」） */
    exposed: boolean;
}

/** 一根地支及其藏干 */
export interface BranchHiddenStems {
    /** 地支名，如 `"巳"` */
    branch: string;
    /** 位标：年 / 月 / 日 / 时 */
    position: string;
    /** 藏干（本气在前） */
    stems: HiddenStem[];
}

/** 一处根 */
export interface Root {
    /** 扎根的地支，如 `"卯"` */
    branch: string;
    position: string;
    depth: HiddenDepth;
    /** 是否**同名之根**（乙见卯），比异名同五行更实 */
    same: boolean;
}

/** 一根天干及其根 */
export interface StemRoots {
    /** 天干名，如 `"乙"` */
    stem: string;
    position: string;
    god: string;
    /** 在四支上找到的根；空数组 = 无根（虚浮） */
    roots: Root[];
}

/** 结构视图：格局是怎么取的 + 透干 + 通根。纯派生，不参与排盘。 */
export interface StructureView {
    /** 是否属**八格**（正格）；`false` = 外格 */
    standardPattern: boolean;
    basis: CaputBasis;
    /** 取格依据的一句话中文说明（服务端拼好，直接展示） */
    basisText: string;
    /** 月令藏干里透出的候选，按「本气→中气→余气」排列；`OUTER`/`NONE_EXPOSED` 时为空 */
    caputCandidates: CaputCandidate[];
    /** 最终据以立格的天干；外格为 `null`。要标「就是这一个」时认它 */
    chosenStem: string | null;
    /** `chosenStem` 对日主的十神；外格为 `null` */
    chosenGod: string | null;
    /** 透干：顺序恒为 年 → 月 → 日 → 时。第 2 项就是月令藏干 */
    touGan: BranchHiddenStems[];
    /** 通根：顺序恒为 年 → 月 → 日 → 时 */
    tongGen: StemRoots[];
}

/** 格局成败的分级（与后端 `PatternGrade` 一一对应） */
export type PatternGradeCode =
    | "CHENG"
    | "DAI_FU"
    | "PO_WITH_RESCUE"
    | "PO"
    | "NOT_APPLICABLE";

/**
 * 格局成败里的一条依据（相神 / 破格 / 救应）。
 *
 * `gods` 与 `chars` **同序**：第 i 个字就是 `gods[i]` 这个十神。
 */
export interface PatternFinding {
    /** 角色：`相神` / `破格` / `救应` */
    role: string;
    /** 类别名，如 `财` / `伤官` / `比劫` —— 规则表里的那个称呼 */
    label: string;
    gods: string[];
    chars: string[];
    /** 每个字的落点（`年干` / `月支` …），与 `chars` 同序 */
    positions: string[];
    /** 一句话说明（服务端拼好） */
    text: string;
}

/**
 * 格局的**成败与救应**（v12 新增）。
 *
 * 补的是「格名之外」那一段：`caput` 只说是什么格、`structureView` 只说这个格怎么取的，
 * 而「这个格立不立得住」原本没人回答 —— 子平论命的落点恰恰在这里。
 *
 * 与 `yongShen` 是**两把不同的尺子**（一把问「日主需要什么」，一把问「这个格需要什么、
 * 什么会破坏它」），结论可以不同甚至相反，这不是矛盾。
 * 外格（建禄 / 阳刃 / 专旺 / 特殊格）恒为 `NOT_APPLICABLE` 且 `findings` 为空。
 */
export interface PatternVo {
    grade: { name: string; code: PatternGradeCode };
    /** 与 `caput.name` 一致，如「正官格」；外格时也照给 */
    caputName: string;
    /** 一句话结论（服务端按档位分档措辞，直接展示） */
    summary: string;
    /** 顺序恒为「相神 → 破格 → 救应」，各角色内按 年→月→日→时 */
    findings: PatternFinding[];
}

/** 一个宫位所主的六亲与人生阶段（宫法，盲派那一半） */
export interface KinPalace {
    /** `祖上宫` / `父母兄弟宫` / `夫妻宫` / `子女宫` */
    palace: string;
    /** `年柱` / `月柱` / `日柱` / `时柱` */
    pillarType: string;
    ganZhi: string;
    /** 该宫所主之六亲（一宫可兼主两位） */
    kin: string[];
    ageRange: string;
    /** 天干十神；**日柱为「日主」** */
    ganGod: string | null;
    zhiGod: string | null;
    /** 损耗性关系：冲 / 刑 / 害。为空 = 此宫安静 */
    disrupt: string[];
    /** 牵绊性关系：五合 / 六合 / 三合 / 半合 / 暗合 / 三会 */
    bond: string[];
    /** 一句话：此宫被扰还是被绊还是安静 */
    reading: string;
}

/** 一颗六亲星及其在原局的明暗（星法，子平那一半） */
export interface KinStar {
    /** `父` / `母` / `兄弟` / `姐妹` / `配偶` / `子女` */
    role: string;
    /** 子平映射的表述，如「男命以正财为妻星」 */
    mapping: string;
    gods: string[];
    chars: string[];
    /** 与 `chars` 同序 */
    positions: string[];
    /** `透干通根` / `透干` / `通根` / `不见` */
    state: string;
    /** 此星所主之宫名，用于宫星合参 */
    palace: string;
    reading: string;
}

/**
 * 宫位六亲（v12 新增）—— **「宫」与「星」两法并出**。
 *
 * `stars` 走子平（哪个十神代表哪位亲属、透不透、有没有根），
 * `palaces` 走盲派的宫法（哪一柱代表哪位亲属、宫被刑冲合害扰动没有），
 * `notes` 是宫星合参。两法并列给依据，**不合成吉凶总分，也不断六亲存殁**。
 */
export interface KinVo {
    gender: string;
    /** 四宫，顺序恒为 年 → 月 → 日 → 时 */
    palaces: KinPalace[];
    /** 六亲星，顺序恒为 父 → 母 → 兄弟 → 姐妹 → 配偶 → 子女 */
    stars: KinStar[];
    /** 宫星合参；第一段恒为两法分工说明 */
    notes: string[];
}

/** 一张命盘 */
export interface PillarVo {
    ganZhi: string;
    yearPillar: Pillar;
    monthPillar: Pillar;
    dayPillar: Pillar;
    hourPillar: Pillar;
    ganZhiDict: GanZhiDict;
    /** key = 流派编码 `"1"` / `"2"` */
    qiYunMap: Record<string, QiYun>;
    /** key 同上 */
    daYunListMap: Record<string, DaYun[]>;
    /** 当前展示/落库的流派编码 */
    sect: string;
    qiYunView: QiYunView | null;
    lifeTime: LifeTime;
    caput: Caput;
    /**
     * 结构视图：取格依据 + 透干 + 通根（v7 新增）。
     *
     * 与 {@link caput} 由**同一个**后端决策产出，`basisText` 里说的格与 `caput.name` 必然一致。
     * 理论上不会为 null，但旧缓存 / 手搓对象上可能没有 —— 前端仍按 `null` 兜底。
     */
    structureView: StructureView | null;
    /**
     * 格局成败与救应（v12 新增）。外格恒为 `NOT_APPLICABLE`。
     *
     * 理论上不会为 null，但旧缓存 / 手搓对象上可能没有 —— 前端仍按 `null` 兜底。
     */
    pattern: PatternVo | null;
    /**
     * 宫位六亲（v12 新增）：四宫 + 六亲星 + 宫星合参，顺序固定。
     *
     * 同上，旧缓存上可能没有，按 `null` 兜底。
     */
    kin: KinVo | null;
    /** 请求带 `extend=false` 时为 null */
    mergeVo: MergeVo | null;
    zodiac: string;
    starSign: string;
    lunarDate: string;
    gregorianDate: string;
}

/** 神煞 / 十神释义 */
export interface LunarExtend {
    summary: string;
    description: string;
}

/**
 * 接口返回的 `data` 部分。
 *
 * `useTrueSolarTime` 记录的是**实际有没有校正**（开关开了但没给经度时并不会校正），
 * 与请求里的开关不是一回事。
 */
export interface BaziResult {
    pillarVo: PillarVo;
    lunarExtendMap: Record<string, LunarExtend>;
    useTrueSolarTime: boolean;
    solarTimeOffsetMinutes: number;
}

/** 行政区（出生地级联）。经度是字符串，用前记得 Number() */
export interface RegionVo {
    code: string;
    name: string;
    parentCode?: string | null;
    level?: number;
    longitude?: string | number | null;
    latitude?: string | number | null;
    /** adcode = 官方点位；children-avg = 上级推算；parent:xx = 上级回填 */
    source?: string;
}
