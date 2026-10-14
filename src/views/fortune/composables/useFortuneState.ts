/**
 * 推演页的会话状态：SSE 事件 → 界面数据，以及左栏历史会话的增删改。
 *
 * <h3>为什么是一大坨而不是按接口拆几个 composable</h3>
 * 这一页的状态是<b>互相咬合</b>的：{@code settle()} 收尾要刷左栏，
 * {@code openHistory()} 要读 {@code busy} 并整页覆写 {@code rounds/chart}，
 * {@code removeSession()} 删的正是当前会话时要回落成 {@code newSession()}。
 * 拆成两个 composable 就得在两者间传回调，读起来反而看不出「谁改了谁」。
 *
 * <p>纯格式化与报告解析不在这里 —— 见 ../fortuneFormat.ts。
 */
import {computed, nextTick, onMounted, onUnmounted, reactive, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {ElMessage} from 'element-plus';
import {
  deleteSession,
  downloadReportPdf,
  generateReport,
  getSessionDetail,
  listSessions,
  renameSession,
  ROUND_STATUS,
  streamAsk,
} from '@/api/module/fortune';
import type {
  ErrorPayload,
  FortuneChart,
  FortuneRoundVo,
  FortuneSessionDetailVo,
  FortuneSessionVo,
  PageBirthSpec,
  PillarPayload,
} from '@/api/module/fortune';
import {goLogin, NeedLoginError} from '@/utils/auth';
import {
  CACHE_LABEL,
  disp,
  ERROR_HINT,
  orderedPillars,
  parsePillarTexts,
  PILLAR_FAILED_HINT,
  PILLAR_KEYS,
  PILLAR_LABELS,
  PILLAR_ORDER,
  splitCacheHits,
} from '../fortuneFormat';
import type {Round} from '../fortuneFormat';
import type {FortuneRail} from './useFortuneRail';

export function useFortuneState(rail: FortuneRail) {
  const router = useRouter();
  const route = useRoute();

  const sessionId = ref('');
  const question = ref('');
  const busy = ref(false);
  const chart = ref<FortuneChart | null>(null);
  const rounds = ref<Round[]>([]);

  /**
   * 排盘页带过来的排盘口径（出生地 / 真太阳时 / 均时差），随首轮请求发给后端。
   *
   * <p>它<b>不是一个展示态</b>，所以只在 {@code onMounted} 里从 query 解一次 ——
   * 之后即使清空输入框、换会话，它也只对「从排盘页过来的第一次提问」有意义。
   *
   * <p>为什么不塞进预填句、让 AI 自己读出来：真太阳时与均时差是<b>页面的选择</b>，
   * 用户从来不会说这句话，全靠模型从我们生成的句子里反读回来太脆 ——
   * 漏了就是「页面按校正后排、AI 按北京时间排」两张盘，而且不报错。
   */
  const pageSpec = ref<PageBirthSpec | null>(null);

  /** 当前会话的标题。命盘还没出来时，hero 区靠它说明「我现在在哪个会话」 */
  const currentTitle = ref('');
  /** 详情接口说这份命盘是按旧口径排的 —— 提示一句就够，不是错误 */
  const chartVersionStale = ref(false);

  let controller: AbortController | null = null;

  // ==================== 左栏：历史会话 ====================

  const sessions = ref<FortuneSessionVo[]>([]);
  /** 只用于首次加载的占位。后续静默刷新不动它，否则列表会一闪一闪 */
  const histLoading = ref(false);
  /** 正在打开的那条 —— 转圈用，同时防重复点击 */
  const openingId = ref('');
  // ==================== 报告 PDF 下载 ====================

  /** 下载按钮的 loading。PDF 由后端渲染，前端只是等一个二进制响应 */
  const pdfDownloading = ref(false);

  // ==================== 衍生数据 ====================

  /** 发送按钮的提示语。按钮是图标了，语义得靠 tooltip 补 */
  const sendTip = computed(() => {
    if (busy.value) return '推演中，请稍候';
    return question.value.trim() ? '发送（Enter）' : '先写下生辰或要问的事';
  });

  const chartColumns = computed(() => {
    const vo = chart.value;
    if (!vo) return [];
    return PILLAR_ORDER.map((code, index) => ({
      key: code,
      index,
      label: PILLAR_LABELS[code],
      present: !!vo[PILLAR_KEYS[index] as keyof FortuneChart],
    })).filter((col) => col.present);
  });

  /**
   * 「当前大运」文案。
   *
   * <p>`currentDaYunIndex` 有三个取值（见后端 `QiYunView` 字段注释）：
   * `1..10` 是真实的第 N 步；**`0` 表示还没起运**；**`-1` 表示已走完 10 步（100 年后）**。
   * 后两个都是哨兵值 —— 直接插值会渲染成「第 0 步 / 第 -1 步」。出生日期是今天的人
   * 一定落在 `0`（起运总是在出生之后），所以这条几乎必然会被看到。
   *
   * <p>未起运时顺手带上「距起运 N 天」——后端 `daysToNextYun` 在这个分支里就是这个含义
   * （`Long` 被全局序列化成字符串，插值不受影响）。
   */
  const currentDaYunText = computed(() => {
    const v = chart.value?.qiYunView;
    if (!v) return '—';
    if (v.currentDaYunIndex > 0) return `第 ${v.currentDaYunIndex} 步`;
    if (v.currentDaYunIndex === 0) return `尚未起运（距起运 ${v.daysToNextYun} 天）`;
    return '已超出全部大运';
  });

  /**
   * 「起运年份」文案。
   *
   * <p>未起运时后端把 `currentDaYunStartYear` 置为哨兵 `-1`，**不能当年份显示**
   * （否则页面会出现「-1 年」）。那时真正有意义的是「第一步大运从哪一年开始」——
   * 该流派的摘要里已有现成的 `firstStartYear`。流派的 key 用命盘上的 `sect`，
   * 取不到时退回摘要里的第一个（与后端 `QiYunViewCalculator` 同样的兜底口径）。
   *
   * <p>已超出全部大运（索引 `-1`）时没有任何可说的年份，给 `—`。
   */
  const qiYunYearText = computed(() => {
    const vo = chart.value;
    const v = vo?.qiYunView;
    if (!v) return '—';
    if (v.currentDaYunStartYear >= 0) return `${v.currentDaYunStartYear} 年`;
    if (v.currentDaYunIndex !== 0) return '—';
    const map = v.sectSummaryMap;
    const picked = map ? (map[vo?.sect ?? ''] ?? Object.values(map)[0]) : undefined;
    return picked?.firstStartYear ? `${picked.firstStartYear} 年（尚未起运）` : '尚未起运';
  });

  const chartRows = computed(() => {
    const vo = chart.value;
    if (!vo) return [];
    const at = (index: number) => vo[PILLAR_KEYS[index] as keyof FortuneChart] as any;
    const cells = (pick: (pillar: any) => string): string[] =>
      PILLAR_ORDER.map((_code, index) => {
        const pillar = at(index);
        return pillar ? pick(pillar) : '—';
      });
    const pair = (main: any, god: any) => {
      const head = disp(main);
      const tail = god ? disp(god) : '';
      return tail && tail !== '—' ? `${head} · ${tail}` : head;
    };

    return [
      {key: 'ganZhi', label: '干支', cls: 'gz', cells: cells((p) => disp(p.ganZhi))},
      {key: 'tianGan', label: '天干', cls: '', cells: cells((p) => pair(p.tianGan, p.tianGanGod))},
      {key: 'diZhi', label: '地支', cls: '', cells: cells((p) => pair(p.diZhi, p.diZhiGod))},
      {key: 'hideGan', label: '藏干', cls: 'dim', cells: cells((p) => disp(p.hideGanGods))},
      {key: 'naYin', label: '纳音', cls: 'dim', cells: cells((p) => disp(p.naYin))},
      {key: 'shenSha', label: '神煞', cls: 'dim ss', cells: cells((p) => disp(p.shenShaList))},
      {key: 'emptyDie', label: '空亡', cls: 'dim', cells: cells((p) => disp(p.emptyDie))},
    ];
  });

  // ==================== 左栏与导出的衍生数据 ====================

  /**
   * 可以进预览 / PDF 的轮次。
   *
   * <p>滤掉流式中的那一轮（半成品），也滤掉既没正文又没四柱的空轮次。
   * 失败轮如果留下了部分正文，仍然要导 —— 用户看到过的东西就该能带走。
   */
  const printableRounds = computed(() =>
    rounds.value.filter((r) => !r.streaming && (!!r.report || orderedPillars(r).length > 0)),
  );

  const canExport = computed(() => printableRounds.value.length > 0);
  // ==================== 发送 ====================

  function send(preset?: string): void {
    const text = (preset ?? question.value).trim();
    if (!text || busy.value) return;

    const isFollowUp = rounds.value.length > 0 && !!sessionId.value;

    question.value = '';
    busy.value = true;

    // 必须 reactive()，不能是普通对象。
    // ref([]) 只把**数组本身**变成响应式：push 一个普通对象进去，数组存的是原始对象，
    // 而模板读到的却是它的响应式代理 —— 于是后面 handleEvent 里对 round 的每一次
    // 赋值（stage / report / pillars）都绕过了代理，不触发重渲染。
    // 症状很隐蔽：busy 与 chart 会触发重渲染，所以骨架屏、命盘卡片都正常出现，
    // 但「四柱逐根点亮」和「报告打字机」全程不动，直到 finally 里 busy=false 才一次性糊上来。
    const round = reactive<Round>({
      question: text,
      stage: {},
      pillars: [],
      report: '',
      error: null,
      cacheHits: [],
      streaming: true,
      elapsed: 0,
      startedAt: performance.now(),
      followUp: isFollowUp,
      // 默认收起：首屏留给「核心结论」，详章是备查用的。
      // 想让详章默认展开，把这里改成 true 即可 —— 折叠与否只是展示，不影响报告内容。
      detailOpen: false,
    });
    rounds.value.push(round);
    scrollToBottom(true);

    controller = new AbortController();
    streamAsk({
      question: text,
      sessionId: sessionId.value,
      // 口径只在「还没有会话」时带。有 sessionId 时后端能从本会话的生辰快照里读到它，
      // 再传一遍是重复；而且那时用户很可能是在问<b>另一个人</b>，
      // 页面上那份口径（属于上一个人）不该糊到新那个人身上。
      birth: sessionId.value ? undefined : (pageSpec.value ?? undefined),
      signal: controller.signal,
      onEvent: (ev) => handleEvent(ev, round),
    })
        .catch((e: unknown) => {
          // 未登录 / 登录已过期：不做「连接中断」渲染，直接去登录页 ——
          // 登录成功后会带回本页（见 utils/auth.ts 的 goLogin），
          // 用户不必自己再点一次「AI 推演」。
          if (e instanceof NeedLoginError) {
            goLogin();
            return;
          }
          if (!round.error) {
            round.error = {
              code: 'NETWORK',
              message: '连接中断：' + (e instanceof Error ? e.message : String(e)),
            };
          }
        })
        .finally(() => settle(round));
    }

    /**
     * 收掉一轮的界面状态：报告定稿（切回 markdown 渲染）、按钮停止转圈。
     *
     * <p>为什么不能只在 {@code streamAsk} 的 finally 里做那件事：那个 finally 等的是
     * <b>HTTP 连接关闭</b>，而不是「服务端说完了」。正常时两者几乎同时，但一旦响应
     * 没能正常收尾（服务端在收尾阶段抛异常 → chunked 少了结束块；再经 vite / nginx
     * 这类代理把上游断连吞掉），浏览器就会一直等下去。
     * 症状正是「正文都看见了，按钮却永远在转，最后一段也不渲染」——
     * 2026-10-09 就踩过：{@code LoginIntercept} 在 SSE 的 ASYNC 派发上抛
     * {@code SaTokenContextException}，把响应收尾打断了。
     *
     * <p>所以判据改用<b>事件语义</b>：收到 {@code done}（正常说完）或
     * {@code error}（说完了，只是坏消息）就算本轮结束，不必再等 TCP。
     * 幂等 —— 事件先到、连接随后关闭时会再走一遍，第二次直接返回。
     */
    function settle(round: Round): void {
      if (!round.streaming) return;
      round.streaming = false;
      round.elapsed = Math.round(performance.now() - round.startedAt);
      busy.value = false;
      scrollToBottom();
      // 一轮收尾 = 库里多了一行（会话行 + 轮次行）。静默刷一次左栏：
      // 「新会话」立刻出现在列表里；失败的轮也在，用户看得见、删得掉。
      void refreshSessions(true);
    }

  function handleEvent(ev: { event: string; data: any }, round: Round): void {
    switch (ev.event) {
      case 'stage':
        if (ev.data?.name) round.stage[ev.data.name] = ev.data.status;
        break;

      case 'cache':
        // 一次请求可能推多条（抽取一条、报告一条）
        round.cacheHits.push(CACHE_LABEL[ev.data?.layer] ?? ev.data?.layer ?? '缓存');
        break;

      case 'chart':
        // 会话级：首轮推一次，追问轮不重推，所以直接替换即可
        chart.value = ev.data as FortuneChart;
        break;

      case 'pillar':
        upsertPillar(round, ev.data as PillarPayload);
        break;

      case 'delta':
        if (ev.data?.text) round.report += ev.data.text;
        break;

      case 'done':
        if (ev.data?.sessionId) sessionId.value = ev.data.sessionId;
        // 全文为准，且是整体替换而非追加 —— 这样既不会得到两倍正文，
        // 又能在 delta 丢包（断线重连、粘包）时把结果纠正过来
        if (ev.data?.text) round.report = ev.data.text;
        // 服务端已经把这一轮说完了，界面立刻定稿，不等连接关闭
        settle(round);
        break;

      case 'error':
        round.error = ev.data as ErrorPayload;
        // error 也是终态：流水线以它收场，之后不会再有任何事件
        settle(round);
        break;
    }
    scrollToBottom();
  }

  /** 四根柱子是并发推的，按柱位放进固定槽位 */
  function upsertPillar(round: Round, payload?: PillarPayload): void {
    if (!payload?.pillar) return;
    const index = PILLAR_ORDER.indexOf(payload.pillar);
    if (index < 0) {
      round.pillars.push(payload);
      return;
    }
    round.pillars[index] = payload;
  }

  /**
   * 清空当前会话，回到「新对话」状态。
   *
   * <p>注意这不是「删除」—— 已经落库的那些还在左栏里。这也正是它跟改版前那个
   * 纯前端 reset 的区别：以前一清就真没了，现在清掉的是看板，资产还在。
   */
  function reset(): void {
    controller?.abort();
    sessionId.value = '';
    rounds.value = [];
    chart.value = null;
    question.value = '';
    busy.value = false;
    currentTitle.value = '';
    chartVersionStale.value = false;
  }

  /** 开一条新对话。左栏的「新对话」、以及删掉当前会话时都会走到这里 */
  function newSession(): void {
    reset();
    rail.overlayOpen.value = false;
    // 刚结束的那一轮已经落库了，立刻反映到左栏 —— 否则新会话开出来了，列表里却还看不见它
    void refreshSessions(true);
  }
  // ==================== 历史会话：拉列表 / 打开 / 删除 ====================

  /**
   * 一次向后端要多少条。「加载更多」是把这个数加大一页后整份重取，而不是翻到第 N 页。
   *
   * <p>不按 pageNum 翻页是有意的：这一列按最后活跃时间倒序，中途刚聊过的那条会往上跳位，
   * 真去取第 2 页就会遇到两种错位 —— 同一个 id 在两页各出现一次（列表里成双），
   * 或原本在第 1 页尾部的被挤到第 2 页而永远看不见。整份重取两种都没有，
   * 顺带也让「一轮结束后的静默刷新」不必把已经展开的列表缩回 20 条。
   */
  const SESSION_PAGE_SIZE = 20;
  const sessionSize = ref(SESSION_PAGE_SIZE);
  /** 后端给的总条数。{@code Long} 全局序列化成字符串，取回即转数 */
  const sessionTotal = ref(0);
  const loadingMore = ref(false);
  /** 还没到底。total 缺失（老接口 / 请求失败）时按「没有更多」处理，别显示一个点了没反应的按钮 */
  const hasMoreSessions = computed(
      () => sessionTotal.value > 0 && sessions.value.length < sessionTotal.value,
  );

  /**
   * 刷新左栏列表。
   *
   * <p>失败只打日志、不弹提示 —— {@code src/api} 的响应拦截器已经弹过一次了，
   * 这里再弹就是两条一模一样的红条。何况「列表没刷新出来」不该打断用户正在读的报告。
   *
   * @param silent 静默刷新：不动 loading 占位。列表已经在屏上了，再闪一下很难看
   */
  async function refreshSessions(silent = false): Promise<void> {
    if (!silent) histLoading.value = true;
    try {
      const res = await listSessions(1, sessionSize.value);
      sessions.value = res.data?.records ?? [];
      sessionTotal.value = Number(res.data?.total ?? 0);
    } catch (e) {
      console.warn('[fortune] 拉取历史会话失败', e);
    } finally {
      if (!silent) histLoading.value = false;
    }
  }

  /** 再多看一页会话 */
  async function loadMoreSessions(): Promise<void> {
    if (loadingMore.value) return;
    loadingMore.value = true;
    sessionSize.value += SESSION_PAGE_SIZE;
    await refreshSessions(true);
    loadingMore.value = false;
  }

  /**
   * 打开一条历史会话：拉详情 → 整页复原。
   *
   * <p>为什么必须真调接口，而不是拿列表里那点数据在前端拼：轮次、四柱结论、命盘
   * 都只在详情里。而且后端读详情时会把该会话的生辰快照<b>回填进 Redis</b>
   * （那条 TTL 只有 24h）—— 不回填的话，点开两个月前的会话接着追问，
   * 后端会因为「抽不到生辰 + 缓存里也没有」而回一句「没能从你的话里看出出生日期」。
   * <b>所以「打开历史会话」不能只是前端切状态。</b>
   */
  async function openHistory(item: FortuneSessionVo): Promise<void> {
    if (busy.value) {
      ElMessage.warning('正在推演中，等这一轮结束再切换会话');
      return;
    }
    // 已经在看这一条了，别白跑一趟接口
    if (item.sessionId === sessionId.value && rounds.value.length) {
      rail.overlayOpen.value = false;
      return;
    }
    openingId.value = item.sessionId;
    try {
      const res = await getSessionDetail(item.sessionId);
      const detail = res.data as FortuneSessionDetailVo | undefined;
      if (!detail) {
        ElMessage.warning('这条会话打不开了');
        return;
      }
      applyDetail(detail);
      rail.overlayOpen.value = false;
    } catch (e) {
      console.warn('[fortune] 打开历史会话失败', e);
    } finally {
      openingId.value = '';
    }
  }

  /**
   * 按 sessionId 打开会话（URL 里带 {@code ?session=} 时走这里）。
   *
   * <p>先在看过的列表里找，找到就走 {@code openHistory} 那条正常路径（它会连带清覆盖层、
   * 转圈占位）；找不到就直接按 id 拉详情 —— 分享链接或刷新页面时，那条会话可能根本
   * 不在已经加载的那几页里，但 id 是确定的，不该因此退回「新对话」。
   */
  async function openSession(id: string): Promise<void> {
    const item = sessions.value.find((s) => s.sessionId === id);
    if (item) {
      await openHistory(item);
      return;
    }
    try {
      const res = await getSessionDetail(id);
      const detail = res.data as FortuneSessionDetailVo | undefined;
      if (detail) applyDetail(detail);
    } catch (e) {
      console.warn('[fortune] 按链接打开会话失败', e);
    }
  }

  /**
   * 当前会话换到 URL 上（{@code ?session=}）—— 刷新页面或把链接发给别人，
   * 回来的还是这一条会话，而不是一个空的新对话（见 index.vue 的 onMounted）。
   *
   * <p>先把现有 query 摊平再改这一个键：排盘页带来的生辰口径（dateTime / birthPlace …）
   * 只在挂载时读一次，留在地址栏里没有副作用，整串替换掉反而会把它们弄丢。
   */
  watch(sessionId, (id) => {
    const query = {...route.query};
    if (id) query.session = id;
    else delete query.session;
    // 用 replace 而不是 push：切会话是「换一张看板看」，不是往前走的独立一步。
    // push 会把开过的每条会话堆进浏览器历史，按后退要一路把它们全走一遍。
    void router.replace({path: route.path, query});
  });

  /** 把详情铺到页面上：会话级字段 + 每一轮 */
  function applyDetail(detail: FortuneSessionDetailVo): void {
    controller?.abort();
    sessionId.value = detail.session.sessionId;
    currentTitle.value = detail.session.title ?? '';
    chartVersionStale.value = !!detail.chartVersionStale;
    // 命盘直接用服务端给的：它优先回放当时存下的整盘快照。
    // 前端拿 birthJson 再调一次 /graph/chart 就绕过了这个口径 —— 引擎升级过的旧会话会当场换一张盘。
    chart.value = detail.chart ?? null;
    question.value = '';
    rounds.value = (detail.rounds ?? []).map(fromRoundVo);
    busy.value = false;
    scrollToTop();
  }

  /**
   * 一条落库的轮次 → 页面状态。
   *
   * <p>还原的是已经定稿的轮次，所以 stage 直接标完成态，不走「等待中」的骨架。
   * 四柱结论文本是 LLM 的产物、逐字存在 {@code pillarJson} 里 —— 只解析，不重算。
   */
  function fromRoundVo(row: FortuneRoundVo): Round {
    const failed = row.status === ROUND_STATUS.FAIL;
    const round = reactive<Round>({
      question: row.question ?? '',
      stage: {},
      pillars: [],
      report: row.answer ?? '',
      error: row.errorCode
          ? {code: row.errorCode, message: ERROR_HINT[row.errorCode] ?? '这一轮没能生成出来'}
          : null,
      cacheHits: splitCacheHits(row.cacheHits),
      streaming: false,
      elapsed: row.elapsedMs ?? 0,
      startedAt: 0,
      followUp: row.followUp === 1,
      detailOpen: false,
    });

    if (round.followUp) {
      // 追问轮不跑抽取与排盘（复用会话的），只点亮「解读」
      round.stage.summary = failed ? 'failed' : 'done';
    } else {
      round.stage.extract = 'done';
      round.stage.calc = 'done';
      round.stage.summary = failed ? 'failed' : 'done';
    }

    const texts = parsePillarTexts(row.pillarJson);
    PILLAR_ORDER.forEach((code, index) => {
      const text = texts[code];
      if (!text) return;
      round.pillars[index] = {
        pillar: code,
        label: PILLAR_LABELS[code],
        text,
        ok: !text.includes(PILLAR_FAILED_HINT),
      };
    });
    return round;
  }
  /**
   * 删除（后端是逻辑删除）。删掉的正好是当前会话时，页面一起回到新对话状态。
   *
   * <p>这里<b>不做确认</b> —— 确认框是侧栏的界面（{@code components/SessionRail.vue} 的
   * {@code el-dialog}），点「删除」才会走到这个函数。原先用
   * {@code ElMessageBox.confirm} 把「问一句」和「删一条」焊在同一个函数里，
   * 那段文案还得把八字拼进句子里，读着别扭。
   */
  async function removeSession(item: FortuneSessionVo): Promise<void> {
    try {
      const res = await deleteSession(item.sessionId);
      if (res.data !== true) {
        ElMessage.warning('这条会话已经不在了');
      }
      if (item.sessionId === sessionId.value) {
        // 删的是正在看的这条：页面留在原地已经没有意义了
        newSession();
      } else {
        await refreshSessions(true);
      }
    } catch (e) {
      console.warn('[fortune] 删除会话失败', e);
    }
  }

  /**
   * 重命名会话：调接口 → 就地更新那一条。
   *
   * <p>输入框与「保存 / 取消」在 {@code components/SessionRail.vue} 的 {@code el-dialog} 里 ——
   * 原先这里是 {@code ElMessageBox.prompt}，一个函数同时管「问名字」和「改名字」，
   * 连校验都得写在配置对象里，读起来两头都不沾。现在这里只管后者。
   *
   * <p>只改展示名，所以<b>不等接口回来再刷新整个列表</b>：改完直接把新名字写回那一条。
   * 这样零闪烁，也不会因为列表按 {@code lastActiveTime} 重排而让刚改的那条跳走
   * （改名本来就不该影响排序 —— 后端也没动 {@code last_active_time}）。
   *
   * <p>当前正打开的会话改名时，页头那句「当前会话 · xxx」也一起换掉，
   * 否则左栏和页头会显示两个名字，用户会以为改错了对象。
   *
   * @param next 用户在框里敲的新名字（本函数自己 trim）
   * @return 能不能关掉弹框 —— 空值与「没改」不白跑接口，也算改完；接口失败返回
   *         {@code false}，框留着让用户重试
   */
  async function renameSessionItem(item: FortuneSessionVo, next: string): Promise<boolean> {
    const name = (next ?? '').trim();
    // 没改（或只改了首尾空格）就白跑一趟接口，直接算改完
    if (!name || name === (item.title ?? '')) return true;
    try {
      const res = await renameSession(item.sessionId, name);
      if (res.data !== true) {
        ElMessage.warning('改名没成功，这条会话可能已经不在了');
        return false;
      }
      // 后端会按上限截断，这里按同一口径兜一下，免得列表显示的名字和刷新后不一致
      item.title = name.length > 30 ? name.slice(0, 30) : name;
      if (item.sessionId === sessionId.value) currentTitle.value = item.title;
      ElMessage.success('已重命名');
      return true;
    } catch (e) {
      console.warn('[fortune] 重命名会话失败', e);
      return false;
    }
  }

  // ==================== 下载报告 PDF ====================

  /**
   * 下载报告 PDF。
   *
   * <p>排版与渲染都在后端（openhtmltopdf + 内嵌中文字体子集），前端只管把二进制
   * 存成文件 —— 所以这里没有「准备画布 / 等字体 / 等两帧」那一套了。
   * 文件名以后端给的为准（含标题与八字，堆在下载目录里认得出是哪一次）。
   */
  async function downloadPdf(): Promise<void> {
    if (!sessionId.value || pdfDownloading.value) return;
    pdfDownloading.value = true;
    try {
      const filename = await downloadReportPdf(sessionId.value);
      ElMessage.success(`已下载：${filename}`);
    } catch (e) {
      if (e instanceof NeedLoginError) {
        goLogin();
        return;
      }
      console.error('[fortune] 下载报告 PDF 失败', e);
      ElMessage.error('下载 PDF 失败：' + (e instanceof Error ? e.message : String(e)));
    } finally {
      pdfDownloading.value = false;
    }
  }

  // ==================== 详细报告（/chat/report/**） ====================

  /** 正在建单的那条会话 —— 侧栏按钮转圈用，同时防重复点击 */
  const reportCreatingId = ref('');

  /**
   * 历史会话一键生成详细报告。
   *
   * <p>只带 {@code sessionId}：后端从 {@code fortune_session} 继承生辰与
   * <b>整盘快照</b>（chart_json），报告的章节 ctx 按当时的盘取数，不随引擎升级重排。
   *
   * <p>建单即返回 reportId（后端 Long 序列化成字符串），随即进详情页 ——
   * 那边开始轮询 status，用户看着进度往上走，不用守在本页。
   *
   * <p>先确认再建单：这是侧栏里唯一一个「点一下就起一次真模型批量推理」的按钮，
   * 而它挨着报告列表那排图标按钮，误触成本是实打实的。确认框在
   * {@code components/SessionRail.vue}（与改名 / 删除同一套 {@code el-dialog}），
   * 所以这里不再自己问 —— 进到本函数就是用户已经点过「开始生成」。
   */
  async function genReport(item: FortuneSessionVo): Promise<void> {
    if (reportCreatingId.value) return;
    reportCreatingId.value = item.sessionId;
    try {
      const res = await generateReport({sessionId: item.sessionId});
      const id = res.data;
      if (id) {
        router.push({name: 'report-detail', params: {id}});
      }
    } catch (e) {
      // 业务错误（会话不是你的 / 排不出盘）已由拦截器弹出，这里只兜底日志
      console.warn('[fortune] 生成详细报告失败', e);
    } finally {
      reportCreatingId.value = '';
    }
  }

  async function copyReport(round: Round): Promise<void> {
    if (!round.report) return;
    try {
      await navigator.clipboard.writeText(round.report);
      ElMessage.success('已复制报告全文');
    } catch {
      ElMessage.warning('浏览器拒绝了剪贴板访问，请手动选中复制');
    }
  }
  // ==================== 滚动 ====================

  /** 离底不足这个距离就算「正在跟读」，流式期间才继续自动滚；超过就是用户自己往上翻了 */
  const NEAR_BOTTOM = 120;

  /** 滚动容器是 {@code #app}（App.vue 里设了 {@code overflow:auto}），不是本组件里的某个 div */
  let scroller: HTMLElement | null = null;
  /** 用户此刻是否贴着底部。所有「要不要跟滚」都只看它，省掉每个 delta 都读一次布局 */
  const atBottom = ref(true);

  function onScroll(): void {
    if (!scroller) return;
    atBottom.value =
        scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < NEAR_BOTTOM;
  }

  /**
   * 滚到底。
   *
   * @param force 新起一轮时强制到底 —— 那是用户自己的动作，他就是要看最新那条。
   *              SSE 事件（每个 delta 都会来这里一次）只在他本来就贴着底时跟，
   *              否则往上翻重读的人会被一路拽回底部，而且每次都做一次强制重排。
   */
  function scrollToBottom(force = false): void {
    nextTick(() => {
      if (!scroller) scroller = document.getElementById('app');
      if (!scroller || (!force && !atBottom.value)) return;
      scroller.scrollTop = scroller.scrollHeight;
      onScroll();
    });
  }

  /** 「回到底部」浮标按的那一下：无条件到底 */
  function jumpToBottom(): void {
    if (!scroller) scroller = document.getElementById('app');
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
    onScroll();
  }

  /** 换会话时回到顶部。滚动容器同样是 #app，不是 window */
  function scrollToTop(): void {
    nextTick(() => {
      const top = document.getElementById('app');
      if (top) top.scrollTop = 0;
    });
  }

  // ==================== 生成中轮询 ====================

  let pollTimer: number | null = null;
  /**
   * 「生成中」的会话轮询。
   *
   * <p>这是「异步」在界面上的落点。用户提交完关掉页面，后端线程会把报告跑完并落库；
   * 过一会儿回来，左栏那条会话会自己从「生成中」变成「已完成」。
   * 没有这个轮询，用户就只能手动刷新才看得见状态变了。
   *
   * <p>两个前置条件都要满足才发请求：左侧列表里确实有「生成中」的，
   * 且当前没在推演（自己正在跑的时候 SSE 会驱动刷新，再轮询就是纯重复请求）。
   */
  function startPolling(): void {
    pollTimer = window.setInterval(() => {
      if (busy.value) return;
      if (!sessions.value.some((s) => s.status === ROUND_STATUS.DOING)) return;
      void refreshSessions(true);
    }, 20000);
  }
  /**
   * 滚动监听挂在 #app 上：靠它知道用户此刻贴不贴底，
   * 于是流式期间不必每个 delta 都读一次布局（那是一次强制重排）。
   */
  onMounted(() => {
    scroller = document.getElementById('app');
    scroller?.addEventListener('scroll', onScroll, {passive: true});
    onScroll();
  });

  /**
   * 离开页面时收尾：掐掉还在跑的 SSE，停掉「生成中」轮询，摘掉 #app 上的滚动监听。
   *
   * <p>原先这几条写在页面的 onUnmounted 里；controller 与 pollTimer 是本模块的私有变量，
   * 所以清理也跟着状态搬进来，效果等价。侧栏 mq 监听在 useFortuneRail 里各自注销。
   */
  onUnmounted(() => {
    controller?.abort();
    scroller?.removeEventListener('scroll', onScroll);
    scroller = null;
    if (pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  });

  return {
    atBottom,
    jumpToBottom,
    sessionId,
    question,
    busy,
    chart,
    rounds,
    pageSpec,
    currentTitle,
    chartVersionStale,
    sessions,
    histLoading,
    openingId,
    sessionTotal,
    loadingMore,
    hasMoreSessions,
    loadMoreSessions,
    openSession,
    pdfDownloading,
    sendTip,
    chartColumns,
    chartRows,
    currentDaYunText,
    qiYunYearText,
    printableRounds,
    canExport,
    send,
    reset,
    newSession,
    refreshSessions,
    openHistory,
    removeSession,
    renameSessionItem,
    downloadPdf,
    reportCreatingId,
    genReport,
    copyReport,
    startPolling,
  };
}

export type FortuneState = ReturnType<typeof useFortuneState>;
