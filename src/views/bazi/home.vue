<template>
  <div class="bazi-page">
    <Header/>

    <div class="page">
      <!-- ================= 页头 ================= -->
      <div class="page-head">
        <div class="page-title">
          生辰八字
          <small v-if="pillarVo.gregorianDate">{{ pillarVo.gregorianDate }}</small>
        </div>
        <div class="head-actions">
          <el-button size="small" @click="showFormBox">
            {{ showForm ? '收起' : '录入生辰' }}
          </el-button>
          <el-button
              v-if="loaded"
              size="small"
              type="primary"
              @click="goFortune"
          >AI 推演
          </el-button>
        </div>
      </div>

      <!-- ================= 录入表单 ================= -->
      <el-collapse-transition>
        <div v-show="showForm" class="form-panel">
          <el-form :model="pillarDto" label-width="76px" label-position="left">
            <el-row :gutter="16">
              <el-col :xs="24" :sm="12" :md="6">
                <el-form-item label="姓名">
                  <el-input v-model="pillarDto.username" placeholder="选填" clearable/>
                </el-form-item>
              </el-col>
              <el-col :xs="12" :sm="6" :md="4">
                <el-form-item label="性别">
                  <el-radio-group v-model="pillarDto.sex">
                    <el-radio-button :value="1">男</el-radio-button>
                    <el-radio-button :value="0">女</el-radio-button>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :xs="12" :sm="6" :md="4">
                <el-form-item label="历法">
                  <el-radio-group v-model="pillarDto.dateType">
                    <el-radio-button :value="1">新历</el-radio-button>
                    <el-radio-button :value="2">农历</el-radio-button>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="10">
                <el-form-item label="出生时间">
                  <div class="tst-inline">
                    <el-date-picker
                        v-model="pillarDto.dateTime"
                        type="datetime"
                        placeholder="请选择生辰"
                        format="YYYY-MM-DD HH:mm:ss"
                        value-format="YYYY-MM-DD HH:mm:ss"
                        :disabled-date="disabledFutureDate"
                        style="width: 220px"
                    />
                    <!-- 校正结果即时回显，让人一眼看到「差了多少」 -->
                    <span v-if="tstActive" class="tst-shift">
                      <span class="arrow">→</span>
                      <span class="val">{{ tstCorrectedText }}</span>
                      <span class="delta">{{ tstOffsetText }}</span>
                    </span>
                  </div>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :xs="24" :sm="12" :md="8">
                <el-form-item label="出生地">
                  <div class="tst-inline">
                    <el-select v-model="region.province" placeholder="省" filterable
                               style="width: 118px" @change="onProvinceChange">
                      <el-option v-for="p in region.provinces" :key="p.code"
                                 :label="p.name" :value="p.code"/>
                    </el-select>
                    <el-select v-model="region.city" placeholder="市" filterable clearable
                               style="width: 118px" :disabled="!region.cities.length"
                               @change="onCityChange">
                      <el-option v-for="c in region.cities" :key="c.code"
                                 :label="c.name" :value="c.code"/>
                    </el-select>
                    <el-select v-model="region.district" placeholder="区县（选填）" filterable clearable
                               style="width: 130px" :disabled="!region.districts.length"
                               @change="onDistrictChange">
                      <el-option v-for="d in region.districts" :key="d.code"
                                 :label="d.name" :value="d.code"/>
                    </el-select>
                  </div>
                </el-form-item>
              </el-col>

              <el-col :xs="24" :sm="12" :md="10">
                <el-form-item label="真太阳时">
                  <div class="tst-inline">
                    <el-switch v-model="pillarDto.useTrueSolarTime"/>
                    <span v-if="!pillarDto.useTrueSolarTime" class="tst-hint">按北京时间排盘</span>
                    <template v-else>
                      <el-checkbox v-model="pillarDto.withEquationOfTime" label="含均时差"/>
                      <span class="tst-tag" :class="{ 'is-approx': tstIsApprox }">{{ tstSourceText }}</span>
                    </template>
                  </div>
                </el-form-item>
              </el-col>

              <el-col v-if="pillarDto.dateType === 2" :xs="24" :sm="12" :md="6">
                <el-form-item label="闰月">
                  <el-checkbox v-model="pillarDto.leapMonth" label="按闰月排"/>
                </el-form-item>
              </el-col>
            </el-row>

            <el-alert
                v-if="pillarDto.useTrueSolarTime && !pillarDto.longitude"
                type="warning"
                :closable="false"
                show-icon
                title="尚未选择出生地，无法校正经度差，将退回北京时间排盘"
                style="margin-bottom: 12px"
            />

            <el-form-item label=" ">
              <el-button type="primary" :loading="loading" @click="submitData">开始排盘</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-collapse-transition>

      <!-- ================= 空状态 ================= -->
      <el-card v-if="!loaded" class="empty-card">
        <el-empty :description="loading ? '正在排盘…' : '点击「录入生辰」并提交，开始排盘'"/>
      </el-card>

      <template v-else>
        <!-- ================= 概要条 ================= -->
        <div class="summary-bar">
          <div class="summary-item">
            <span class="k">公历</span>
            <span class="v">{{ pillarVo.gregorianDate }}</span>
          </div>
          <div class="summary-item">
            <span class="k">农历</span>
            <span class="v">{{ pillarVo.lunarDate }}</span>
          </div>
          <div v-if="tstApplied" class="summary-item">
            <span class="k">真太阳时</span>
            <span class="v"><span class="tst-tag">{{ tstAppliedText }}</span></span>
          </div>
          <div class="summary-divider"/>
          <div class="summary-item">
            <span class="k">四柱</span>
            <span class="v mono">{{ pillarVo.ganZhi }}</span>
          </div>
          <div class="summary-divider"/>
          <div class="summary-item">
            <span class="k">生肖</span>
            <span class="v">{{ pillarVo.zodiac }}</span>
          </div>
          <div class="summary-item">
            <span class="k">星座</span>
            <span class="v">{{ pillarVo.starSign }}</span>
          </div>
          <template v-if="qiYunView">
            <div class="summary-divider"/>
            <div class="summary-item">
              <span class="k">当前</span>
              <span class="v">{{ qiYunView.currentAge }} 岁（虚 {{ qiYunView.currentNominalAge }}）</span>
            </div>
            <div class="summary-item">
              <span class="k">大运</span>
              <span class="v">{{ currentYunText }}</span>
            </div>
          </template>
        </div>

        <!-- ================= 起运 ================= -->
        <el-card class="block">
          <template #header>
            <div class="card-head">
              <div class="card-title">
                起运
                <span class="hint">从出生时刻推算到交运时刻的完整链条</span>
              </div>
              <el-radio-group v-if="sectCount > 1" v-model="sect" size="small">
                <el-radio-button v-for="opt in availableSectOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </el-radio-button>
              </el-radio-group>
            </div>
          </template>

          <div class="chain">
            <div class="chain-node">
              <div class="cn-label">① 出生时刻</div>
              <div class="cn-value">{{ fmt(qiYun.birthday) }}</div>
            </div>
            <div class="chain-node">
              <div class="cn-label">② 参照节令（{{ qiYun.contrary ? '逆推·上一个节' : '顺推·下一个节' }}）</div>
              <div class="cn-value">{{ fmt(qiYun.solarTermDateTime) }}</div>
            </div>
            <div class="chain-node">
              <div class="cn-label">③ 换算方式</div>
              <div class="cn-value">{{ sectLabel }}</div>
            </div>
            <div class="chain-node is-key">
              <div class="cn-label">④ 起运读数</div>
              <div class="cn-value">{{ startYunText }}</div>
            </div>
            <div class="chain-node is-key">
              <div class="cn-label">⑤ 交运时刻</div>
              <div class="cn-value">{{ fmt(qiYun.startYunDateTime) }}</div>
            </div>
          </div>

          <div class="qiyun-grid">
            <div class="qiyun-item is-key">
              <div class="label">起运时刻</div>
              <div class="value mono">{{ fmt(qiYun.startYunDateTime) }}</div>
            </div>
            <div class="qiyun-item">
              <div class="label">顺推 / 逆推</div>
              <div class="value">
                {{ qiYun.contrary ? '逆推' : '顺推' }}
                <span class="sub">（{{ qiYun.contrary ? '阴年男 / 阳年女' : '阳年男 / 阴年女' }}）</span>
              </div>
            </div>
            <div class="qiyun-item">
              <div class="label">第一步大运</div>
              <div class="value">{{ firstYunText }}</div>
            </div>
            <div class="qiyun-item">
              <div class="label">当前所处</div>
              <div class="value">{{ currentYunText }}</div>
            </div>
          </div>
        </el-card>

        <!-- ================= 流派对照 ================= -->
        <el-card v-if="sectCount > 1" class="block">
          <template #header>
            <div class="card-head">
              <div class="card-title">
                流派对照
                <span class="hint">起运差几天，整条大运年份就可能错位</span>
              </div>
            </div>
          </template>

          <div class="sect-compare">
            <div v-for="opt in availableSectOptions" :key="opt.value"
                 class="sect-panel" :class="{ 'is-active': sect === opt.value }">
              <div class="sect-panel-head">
                <div class="sect-name">
                  {{ qiYunView?.sectSummaryMap[opt.value]?.label }}
                  <span v-if="sect === opt.value" class="sect-badge">当前</span>
                </div>
                <el-button v-if="sect !== opt.value" link type="primary" @click="sect = opt.value">
                  切到此流派
                </el-button>
              </div>
              <div class="sect-body">
                <div class="sect-row">
                  <span class="sk">起运时刻</span>
                  <span class="sv">{{ fmt(qiYunView?.sectSummaryMap[opt.value]?.startYunDateTime) }}</span>
                </div>
                <div class="sect-row">
                  <span class="sk">起运读数</span>
                  <span class="sv">{{ qiYunView?.sectSummaryMap[opt.value]?.startYunText }}</span>
                </div>
                <div class="sect-row">
                  <span class="sk">顺 / 逆</span>
                  <span class="sv">{{ qiYunView?.sectSummaryMap[opt.value]?.contrary ? '逆推' : '顺推' }}</span>
                </div>
                <div class="year-block">
                  <div class="sk">大运起始年份</div>
                  <div class="year-seq">
                    <span v-for="(y, yi) in qiYunView?.sectSummaryMap[opt.value]?.startYears" :key="yi"
                          class="year-chip" :class="{ 'is-diff': isYearDiff(opt.value, y) }">{{ y }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="diff-callout" :class="{ 'no-diff': !sectDiff.hasDiff }">
            <template v-if="sectDiff.hasDiff"><b>两流派有差异：</b>{{ sectDiff.text }}</template>
            <template v-else>两个流派算出的起运时刻与大运年份完全一致，无需取舍。</template>
          </div>
        </el-card>

        <!-- ================= 命盘 ================= -->
        <el-card class="block">
          <template #header>
            <div class="card-head">
              <div class="card-title">
                命盘
                <span class="hint">左侧四柱为原局，右侧「大运 / 流年」跟随下方时间轴选择</span>
              </div>
            </div>
          </template>

          <div class="pillar-table">
            <!-- 行标签列 -->
            <div class="pt-col is-label">
              <div class="pt-cell is-head">柱</div>
              <div class="pt-cell">主星</div>
              <div class="pt-cell">天干</div>
              <div class="pt-cell">地支</div>
              <div class="pt-cell">副星</div>
              <div class="pt-cell is-tall">藏干</div>
              <div class="pt-cell">星运</div>
              <div class="pt-cell">自坐</div>
              <div class="pt-cell">空亡</div>
              <div class="pt-cell">纳音</div>
              <div class="pt-cell is-tall">神煞</div>
            </div>

            <!-- 四柱 -->
            <div v-for="(item, index) in fourPillars" :key="'fp' + index" class="pt-col is-pillar">
              <div class="pt-cell is-head">{{ item.title }}</div>

              <div class="pt-cell">
                <span v-if="item.tianGanGod === '元女' || item.tianGanGod === '元男'"
                      class="tag-op is-strong">{{ item.tianGanGod }}</span>
                <el-popover v-else placement="bottom" :width="420" trigger="hover" :title="item.tianGanGod">
                  <template #reference>
                    <span class="tag-op">{{ item.tianGanGod }}</span>
                  </template>
                  <div class="pop-detail" v-html="getDetail(item.tianGanGod)"></div>
                </el-popover>
              </div>

              <div class="pt-cell">
                <span class="pt-gz" :style="{ color: tianGan(item.tianGan).element?.color }">{{ item.tianGan }}</span>
                <span class="pt-yy">{{ tianGan(item.tianGan).yinYang === 'YANG' ? '阳' : '阴' }}</span>
              </div>

              <div class="pt-cell">
                <span class="pt-gz" :style="{ color: diZhi(item.diZhi).element?.color }">{{ item.diZhi }}</span>
                <span class="pt-yy">{{ diZhi(item.diZhi).yinYang === 'YANG' ? '阳' : '阴' }}</span>
              </div>

              <div class="pt-cell">
                <el-popover placement="bottom" :width="420" trigger="hover" :title="item.diZhiGod">
                  <template #reference>
                    <span class="tag-op">{{ item.diZhiGod }}</span>
                  </template>
                  <div class="pop-detail" v-html="getDetail(item.diZhiGod)"></div>
                </el-popover>
              </div>

              <div class="pt-cell is-tall">
                <div v-for="(hs, hi) in (diZhi(item.diZhi).hideHeavenlyStems || [])" :key="'hs' + hi" class="pt-hide">
                  <span :style="{ color: hs.element?.color }">{{ hs.name }}</span>
                  <span class="pt-yy">{{ hs.yinYang === 'YANG' ? '阳' : '阴' }}</span>
                  <span class="hg-god">{{ (item.hideGanGods || [])[hi] }}</span>
                </div>
              </div>

              <div class="pt-cell pt-mini">{{ (item.starLuck || {}).name || '' }}</div>
              <div class="pt-cell pt-mini">{{ (item.selfStarLuck || {}).name || '' }}</div>
              <div class="pt-cell pt-mini">{{ item.emptyDie }}</div>
              <div class="pt-cell pt-mini">{{ item.naYin }}</div>

              <div class="pt-cell is-tall">
                <div class="pt-shensha">
                  <el-popover v-for="(ss, si) in item.shenShaList" :key="'ss' + index + '-' + si"
                              placement="bottom" :width="420" trigger="hover" :title="ss.name">
                    <template #reference>
                      <span class="tag-op">{{ ss.name }}</span>
                    </template>
                    <div class="pop-detail" v-html="getDetail(ss.name)"></div>
                  </el-popover>
                </div>
              </div>
            </div>

            <!-- 大运 + 选中流年 -->
            <div v-for="(item, index) in yunPillars" :key="'yp' + index"
                 class="pt-col is-pillar is-yun" :class="{ 'first-yun': index === 0 }">
              <div class="pt-cell is-head">{{ item.title }}</div>
              <div class="pt-cell">
                <span class="tag-op is-strong">{{ item.tianGanGod }}</span>
              </div>
              <div class="pt-cell">
                <span class="pt-gz" :style="{ color: tianGan(item.tianGan).element?.color }">{{ item.tianGan }}</span>
                <span class="pt-yy">{{ tianGan(item.tianGan).yinYang === 'YANG' ? '阳' : '阴' }}</span>
              </div>
              <div class="pt-cell">
                <span class="pt-gz" :style="{ color: diZhi(item.diZhi).element?.color }">{{ item.diZhi }}</span>
                <span class="pt-yy">{{ diZhi(item.diZhi).yinYang === 'YANG' ? '阳' : '阴' }}</span>
              </div>
              <div class="pt-cell">
                <span v-if="item.diZhiGod" class="tag-op">{{ item.diZhiGod }}</span>
              </div>
              <div class="pt-cell is-tall">
                <div v-for="(hs, hi) in (diZhi(item.diZhi).hideHeavenlyStems || [])" :key="'yh' + hi" class="pt-hide">
                  <span :style="{ color: hs.element?.color }">{{ hs.name }}</span>
                  <span class="pt-yy">{{ hs.yinYang === 'YANG' ? '阳' : '阴' }}</span>
                  <span class="hg-god">{{ (item.hideGanGods || [])[hi] }}</span>
                </div>
              </div>
              <div class="pt-cell pt-mini">{{ (item.starLuck || {}).name || '' }}</div>
              <div class="pt-cell pt-mini">{{ (item.selfStarLuck || {}).name || '' }}</div>
              <div class="pt-cell pt-mini">{{ item.emptyDie }}</div>
              <div class="pt-cell pt-mini">{{ item.naYin }}</div>
              <div class="pt-cell is-tall">
                <div class="pt-shensha">
                  <el-popover v-for="(ss, si) in item.shenShaList" :key="'yss' + si"
                              placement="bottom" :width="420" trigger="hover" :title="ss.name">
                    <template #reference>
                      <span class="tag-op">{{ ss.name }}</span>
                    </template>
                    <div class="pop-detail" v-html="getDetail(ss.name)"></div>
                  </el-popover>
                </div>
              </div>
            </div>
          </div>
        </el-card>

        <!-- ================= 大运时间轴 ================= -->
        <el-card class="block">
          <template #header>
            <div class="card-head">
              <div class="card-title">
                大运
                <span class="hint">{{ sectLabel }} · 每步十年，点击查看该运下的流年</span>
              </div>
              <div class="legend">
                <span class="dot"></span>标记「今」为当前所处大运
              </div>
            </div>
          </template>

          <div class="timeline-scroll">
            <div class="timeline">
              <div v-for="(dy, index) in daYunList" :key="'dy' + index"
                   class="tl-yun"
                   :class="{ 'is-active': index === yunActiveIndex, 'is-now': isNowYun(dy) }"
                   @click="checkYun(index)">
                <div class="tl-years">{{ dy.startYear }}</div>
                <div class="tl-age">{{ dy.age }}岁</div>
                <div class="tl-gz">{{ dy.pillar?.ganZhi }}</div>
                <div class="tl-gods">
                  {{ getShortGod(dy.pillar?.tianGanGod) }}{{ getShortGod(dy.pillar?.diZhiGod) }}
                </div>
              </div>
            </div>
          </div>

          <div v-if="activeYun" class="yun-note">
            第 {{ activeYun.index }} 步：名义 <b>{{ activeYun.startYear }} ~ {{ activeYun.endYear }}</b> 年（管 10 个流年）；
            真实区间 <b class="mono">{{ fmt(activeYun.startDateTime) }} ~ {{ fmt(activeYun.endDateTime) }}</b>
            <span v-if="activeYunSpansEleven" class="warn">
              —— 交运日在年中，真实区间横跨 11 个公历年，判断「现在第几步」须比时刻而非年份
            </span>
          </div>
        </el-card>

        <!-- ================= 流年时间轴 ================= -->
        <el-card v-if="activeYun" class="block">
          <template #header>
            <div class="card-head">
              <div class="card-title">
                流年
                <span class="hint">{{ activeYun.startYear }} ~ {{ activeYun.endYear }} 年（{{ activeYun.pillar?.ganZhi }} 运）</span>
              </div>
            </div>
          </template>

          <div class="timeline-scroll">
            <div class="timeline is-liunian">
              <div v-for="(ln, index) in activeYun.liuNianList" :key="'ln' + index"
                   class="tl-yun"
                   :class="{ 'is-active': index === fleetActiveIndex, 'is-now': isNowLiuNian(ln) }"
                   @click="checkFleetYear(index)">
                <div class="tl-years">{{ ln.year }}</div>
                <div class="tl-age">{{ ln.age }}岁</div>
                <div class="tl-gz">{{ ln.pillar?.ganZhi }}</div>
                <div class="tl-gods">
                  {{ getShortGod(ln.pillar?.tianGanGod) }}{{ getShortGod(ln.pillar?.diZhiGod) }}
                </div>
              </div>
            </div>
          </div>
        </el-card>

        <!-- ================= 格局与用神 ================= -->
        <el-card class="block">
          <template #header>
            <div class="card-head">
              <div class="card-title">
                格局与用神
                <span class="hint">格局取自月令透干；用神按扶抑法（身弱取生扶、身强取泄耗）</span>
              </div>
            </div>
          </template>

          <!-- 格局 + 取格依据 -->
          <div class="pattern-row">
            <div class="pattern-head">
              <span class="pattern-key">格局</span>
              <el-popover v-if="caputName" placement="bottom" :width="420" trigger="hover" :title="caputName">
                <template #reference>
                  <span class="pattern-name">{{ caputName }}</span>
                </template>
                <div class="pop-detail" v-html="getDetail(caputName)"></div>
              </el-popover>
              <span v-else class="pattern-name">—</span>
              <!-- 「八格 / 外格」只认 structureView.standardPattern。拿不到结构视图时**不显示**，
                   而不是退回「非八格」——那会把正官格标成「外格」，比空着更误导。 -->
              <span v-if="structureView" class="pattern-kind" :class="isBaGe ? 'is-ba' : 'is-other'">
                {{ isBaGe ? '八格' : '外格' }}
              </span>
              <span class="pattern-meta">
                日主 {{ fourPillars[2]?.tianGan || '—' }} · 月令 {{ monthBranch || '—' }}
              </span>
            </div>
            <div class="pattern-basis" :class="'is-' + caputBasis.kind">
              <span class="basis-key">取格依据</span>
              <span class="basis-text">{{ caputBasis.text }}</span>
            </div>
          </div>

          <!-- 月令藏干与透干 -->
          <div class="relation-block">
            <div class="relation-label">
              月令藏干与透干
              <span class="cnt">{{ monthHideStems.length }}</span>
              <span class="label-hint">带「透」者已出现在四柱天干位</span>
            </div>
            <div class="relation-tags">
              <span v-for="h in monthHideStems" :key="'mh' + h.char"
                    class="hide-chip" :class="{ 'is-exposed': h.exposed }">
                <b :style="{ color: h.color }">{{ h.char }}</b>
                <em>{{ h.god }}</em>
                <i v-if="h.isMain" class="via">本气</i>
                <i v-if="h.exposed" class="dot">透</i>
              </span>
              <span v-if="!monthHideStems.length" class="no-relation">—</span>
            </div>
          </div>

          <!-- 身强弱量尺 -->
          <div class="strength-row">
            <span class="strength-tag" :class="lifeTime?.strong ? 'is-strong' : 'is-weak'">
              身{{ lifeTime?.strong ? '强' : '弱' }}
            </span>
            <div class="score-scale"
                 :title="`量程 −100 ~ +100；本盘阈值 ${lifeTime?.strongBaseline ?? 0}（高于它判身强）`">
              <div class="scale-track">
                <div class="scale-fill" :style="{ width: scorePct + '%' }"></div>
                <div class="scale-mark" :style="{ left: STRONG_THRESHOLD_PCT + '%' }"></div>
              </div>
              <div class="scale-foot">
                <span>−100</span>
                <span class="scale-mid">阈值 {{ lifeTime?.strongBaseline ?? 0 }}</span>
                <span>+100</span>
              </div>
            </div>
            <span class="score-num" :class="lifeTime?.strong ? 'is-strong' : 'is-weak'">
              {{ lifeTime?.score ?? 0 }}
            </span>
          </div>

          <!-- 用神：五行 + 十神，喜忌分列 -->
          <div class="god-grid">
            <div class="god-cell">
              <div class="god-key is-joy">喜用五行</div>
              <div class="relation-tags">
                <span v-for="e in (lifeTime?.joyousElements || [])" :key="'je' + e.name"
                      class="elem-chip is-joy" :style="{ borderColor: e.color, color: e.color }">{{ e.name }}</span>
                <span v-if="!(lifeTime?.joyousElements || []).length" class="no-relation">—</span>
              </div>
            </div>
            <div class="god-cell">
              <div class="god-key is-fear">忌凶五行</div>
              <div class="relation-tags">
                <span v-for="e in (lifeTime?.fearElements || [])" :key="'fe' + e.name"
                      class="elem-chip is-fear" :style="{ borderColor: e.color, color: e.color }">{{ e.name }}</span>
                <span v-if="!(lifeTime?.fearElements || []).length" class="no-relation">—</span>
              </div>
            </div>
            <div class="god-cell">
              <div class="god-key is-joy">喜用十神</div>
              <div class="relation-tags">
                <el-popover v-for="(g, gi) in (lifeTime?.joyousGods || [])" :key="'jg' + gi"
                            placement="bottom" :width="420" trigger="hover" :title="g">
                  <template #reference><span class="tag-god is-joy">{{ g }}</span></template>
                  <div class="pop-detail" v-html="getDetail(g)"></div>
                </el-popover>
                <span v-if="!(lifeTime?.joyousGods || []).length" class="no-relation">—</span>
              </div>
            </div>
            <div class="god-cell">
              <div class="god-key is-fear">忌凶十神</div>
              <div class="relation-tags">
                <el-popover v-for="(g, gi) in (lifeTime?.fearGods || [])" :key="'fg' + gi"
                            placement="bottom" :width="420" trigger="hover" :title="g">
                  <template #reference><span class="tag-god is-fear">{{ g }}</span></template>
                  <div class="pop-detail" v-html="getDetail(g)"></div>
                </el-popover>
                <span v-if="!(lifeTime?.fearGods || []).length" class="no-relation">—</span>
              </div>
            </div>
          </div>
        </el-card>

        <!-- ================= 干支关系 / 透干通根 ================= -->
        <div class="two-col">
          <el-card>
            <template #header>
              <div class="card-head">
                <div class="card-title">
                  干支关系
                  <span class="hint">原局内部的合冲刑害 · 共 {{ relationTotal }} 条</span>
                </div>
              </div>
            </template>

            <div class="relation-block">
              <div class="relation-label">
                天干<span class="cnt">{{ tianGanRelations.length }}</span>
              </div>
              <div class="relation-tags">
                <span v-for="(r, ri) in tianGanRelations" :key="'tg' + ri"
                      class="tag-relation" :class="'is-' + r.tone">{{ r.text }}</span>
                <span v-if="!tianGanRelations.length" class="no-relation">无</span>
              </div>
            </div>

            <div class="relation-block">
              <div class="relation-label">
                地支<span class="cnt">{{ branchRelationGroups.reduce((n, g) => n + g.list.length, 0) }}</span>
              </div>
              <div v-if="hasBranchRelation" class="branch-groups">
                <div v-for="g in branchRelationGroups" :key="g.key" class="branch-group">
                  <span class="group-key" :class="'is-' + g.tone">{{ g.label }}</span>
                  <div class="relation-tags">
                    <span v-for="(t, ti) in g.list" :key="g.key + ti"
                          class="tag-relation" :class="'is-' + g.tone">{{ t }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="no-relation">无</div>
            </div>
          </el-card>

          <el-card>
            <template #header>
              <div class="card-head">
                <div class="card-title">
                  透干与通根
                  <span class="hint">藏干上透天干 · 天干下扎地支</span>
                </div>
              </div>
            </template>

            <div class="relation-block">
              <div class="relation-label">
                透干<span class="cnt">{{ touGanCountText }}</span>
              </div>
              <div class="tg-rows">
                <div v-for="row in touGanRows" :key="'tgr' + row.pos" class="tg-row">
                  <span class="tg-branch" :style="{ color: diZhi(row.branch).element?.color }">{{ row.branch }}</span>
                  <span class="tg-pos">{{ row.pos }}支</span>
                  <div class="tg-stems">
                    <span v-for="s in row.stems" :key="'tgs' + row.pos + s.char"
                          class="hide-chip is-mini" :class="{ 'is-exposed': s.exposed }">
                      <b :style="{ color: s.color }">{{ s.char }}</b>
                      <em>{{ s.god }}</em>
                      <i v-if="s.exposed" class="dot">透</i>
                    </span>
                  </div>
                </div>
              </div>
              <!-- 「四柱藏干皆未透干」和「根本没有结构数据」是两回事：
                   前者是真结论，后者是后端没返回（旧缓存 / 服务没重启）。别混成一句。 -->
              <div v-if="!structureView" class="no-relation">未获取到结构数据（后端未返回 structureView）</div>
              <div v-else-if="!touGanCount" class="no-relation">四柱藏干皆未透干</div>
            </div>

            <div class="relation-block">
              <div class="relation-label">
                通根<span class="cnt">{{ tongGenCountText }}</span>
              </div>
              <div class="tg-rows">
                <div v-for="row in tongGenRows" :key="'tgrr' + row.pos" class="tg-row">
                  <span class="tg-branch" :style="{ color: row.color }">{{ row.stem }}</span>
                  <span class="tg-pos">{{ row.pos }}干</span>
                  <div class="tg-stems">
                    <span v-for="(rt, ri) in row.roots" :key="'rt' + row.pos + ri"
                          class="root-chip" :class="{ 'is-same': rt.same }">
                      {{ rt.pos }}支<b>{{ rt.branch }}</b><i>{{ rt.via }}</i>
                    </span>
                    <span v-if="!row.roots.length" class="root-chip is-none">无根（虚浮）</span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, reactive, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {ElMessage} from 'element-plus';
import Header from '@/components/Header.vue';
import {getBaziInfo, getRegionChildren} from '@/api/module/bazi';
import type {
  BaziQuery,
  Caput,
  DaYun,
  GanZhi,
  GanZhiDict,
  LifeTime,
  LiuNian,
  LunarExtend,
  MergeVo,
  Pillar,
  PillarVo,
  QiYun,
  QiYunView,
  RegionVo,
  StructureView,
} from '@/api/module/bazi/types';

const route = useRoute();
const router = useRouter();

/* ==========================================================================
 * 表单与请求状态
 * ========================================================================= */

const showForm = ref(false);
const loading = ref(false);
const loaded = ref(false);

const pillarDto = reactive<BaziQuery>({
  dateType: 1,
  sex: 1,
  dateTime: '',
  username: '',
  longitude: null,
  useTrueSolarTime: false,
  withEquationOfTime: false,
  leapMonth: false,
});

/* ==========================================================================
 * 排盘结果
 * ========================================================================= */

const pillarVo = ref<Partial<PillarVo>>({});
/** 四柱（已补 title） */
const fourPillars = ref<Pillar[]>([]);
/** 命盘表右端平铺的两根柱子：大运 + 选中流年 */
const yunPillars = ref<Partial<Pillar>[]>([{}, {}]);

/** 柱子里的干支只存中文名，完整属性在这里查 */
const ganZhiDict = ref<GanZhiDict>({tianGan: {}, diZhi: {}});
/** 起运 / 大运按流派分组 */
const qiYunMap = ref<Record<string, QiYun>>({});
const daYunListMap = ref<Record<string, DaYun[]>>({});
const qiYunView = ref<QiYunView | null>(null);
const lifeTime = ref<LifeTime | null>(null);
const caput = ref<Caput | null>(null);
/** 结构视图：取格依据 + 透干 + 通根（后端算，前端只展示） */
const structureView = ref<StructureView | null>(null);
const mergeVo = ref<MergeVo | null>(null);
const lunarExtendMap = ref<Record<string, LunarExtend>>({});

/** 当前展示的流派编码 */
const sect = ref('2');
const SECT_OPTIONS = [
  {value: '2', label: '流派2'},
  {value: '1', label: '流派1'},
];

const yunActiveIndex = ref(0);
const fleetActiveIndex = ref(0);

/** 服务端记录的实际校正情况（「开关开了」≠「真的校正了」） */
const tstApplied = ref(false);
const tstAppliedMinutes = ref(0);

/* ==========================================================================
 * 出生地级联
 * ========================================================================= */

const region = reactive({
  provinces: [] as RegionVo[],
  cities: [] as RegionVo[],
  districts: [] as RegionVo[],
  province: null as string | null,
  city: null as string | null,
  district: null as string | null,
  picked: null as RegionVo | null,
});

/* ==========================================================================
 * 计算属性
 * ========================================================================= */

/** 当前流派的起运 */
const qiYun = computed<Partial<QiYun>>(() => qiYunMap.value[sect.value] || {});

/** 当前流派的大运序列。恒为数组，模板里的下标访问不会炸 */
const daYunList = computed<DaYun[]>(() => daYunListMap.value[sect.value] || []);

const activeYun = computed<DaYun | null>(() => daYunList.value[yunActiveIndex.value] || null);

/** 实际算出来的流派数（只有 1 个时不展示「对照」） */
const sectCount = computed(() => Object.keys(qiYunMap.value).length);

const sectLabel = computed(() => {
  const opt = SECT_OPTIONS.find(o => o.value === sect.value);
  return opt ? opt.label : sect.value;
});

/** 对照卡片只列「实际算出来且摘要存在」的流派 */
const availableSectOptions = computed(() => {
  const s = qiYunView.value?.sectSummaryMap;
  if (!s) return [];
  return SECT_OPTIONS.filter(o => s[o.value]);
});

/** 起运读数：优先后端拼好的，退化到前端拼 */
const startYunText = computed(() => {
  const s = qiYunView.value?.sectSummaryMap?.[sect.value];
  if (s?.startYunText) return s.startYunText;
  const q = qiYun.value;
  if (q.years === undefined) return '—';
  return `出生后 ${q.years || 0} 年 ${q.months || 0} 月 ${q.days || 0} 天 ${q.hours || 0} 时起运`;
});

const firstYunText = computed(() => {
  const first = daYunList.value[0];
  if (!first) return '—';
  return `${first.startYear} 年（${first.age} 岁）· ${first.pillar?.ganZhi || ''}`;
});

/**
 * 「当前所处」文案 —— 直接用后端算好的索引，**不在前端比年份**。
 * `0` = 未起运，`-1` = 已超出全部大运，都不能当第 1 步处理。
 */
const currentYunText = computed(() => {
  const v = qiYunView.value;
  if (!v) return '—';
  if (v.currentDaYunIndex === 0) return `未起运（距起运 ${v.daysToNextYun} 天）`;
  if (v.currentDaYunIndex < 0) return '已超出全部大运';
  const dy = daYunList.value[v.currentDaYunIndex - 1];
  const gz = dy?.pillar?.ganZhi || '';
  return `第 ${v.currentDaYunIndex} 步 · ${gz} 运（${v.currentDaYunStartYear} 起）`;
});

/** 选中大运的真实区间是否横跨 11 个公历年 */
const activeYunSpansEleven = computed(() => {
  const dy = activeYun.value;
  if (!dy?.startDateTime) return false;
  return new Date(String(dy.startDateTime).replace(/-/g, '/')).getFullYear() !== dy.startYear;
});

/* ==========================================================================
 * 命理派生信息（关系 / 格局取法 / 透干 / 通根）
 *
 * 这些**全部由后端算好**（v7 起），页面只做两件事：把后端字段搬成视图形状、
 * 按 `ganZhiDict` 给干支配五行色。
 *
 * 曾有一版把「半合 / 天干相冲 / 透干 / 通根 / 取格依据」放在前端推导 —— 已全部删除：
 *   ① 「同一套知识写两份」：前端这份与后端 `Caput` 那张规则表迟早漂移，且没人会发现漂了；
 *   ② **「页面的盘」≠「AI 的盘」**：AI 只读后端字段，前端自算的部分它根本看不到，
 *      于是同一张盘两处说法不一样。
 * 现在数据源只有后端：`structureView`（取格依据 + 透干 + 通根）与
 * `mergeVo`（合冲刑害，含 v7 新增的 `tianGanChongList` / `diZhiHalfMergeList`）。
 * ========================================================================= */

/* ---------------- 关系 ---------------- */

type RelationTone = 'he' | 'chong' | 'harm' | 'neutral';

interface RelationItem {
  text: string;
  tone: RelationTone;
}

/**
 * 天干关系：五合（`tianGanMergeList`）+ 相冲（`tianGanChongList`）。
 * 两项都由后端出；相冲只有 甲庚 / 乙辛 / 丙壬 / 丁癸 四组（戊己居中不冲）。
 */
const tianGanRelations = computed<RelationItem[]>(() => [
  ...(mergeVo.value?.tianGanMergeList || []).map(t => ({text: t, tone: 'he' as RelationTone})),
  ...(mergeVo.value?.tianGanChongList || []).map(t => ({text: t, tone: 'chong' as RelationTone})),
]);

/** 地支关系分组：按「先聚后散」排序，空组不渲染 */
const branchRelationGroups = computed<
    { key: string; label: string; tone: RelationTone; list: string[] }[]>(() => {
  const m = mergeVo.value;
  const groups = [
    {key: 'he3', label: '三合局（成局）', tone: 'he' as RelationTone, list: m?.diZhi3MergeList || []},
    // 半合由后端给（`diZhiHalfMergeList`）。它与上面的三合局**互斥**：三支齐全时
    // 后端只报三合局，不会再冒出两条半合 —— 这个判断前端不再自己做。
    {key: 'banhe', label: '半合', tone: 'he' as RelationTone, list: m?.diZhiHalfMergeList || []},
    {key: 'meet3', label: '三会方', tone: 'he' as RelationTone, list: m?.diZhi3MeetList || []},
    {key: 'he6', label: '六合', tone: 'he' as RelationTone, list: m?.diZhi6MergeList || []},
    {key: 'hide', label: '暗合', tone: 'neutral' as RelationTone, list: m?.diZhiHideMergeList || []},
    {key: 'chong', label: '六冲', tone: 'chong' as RelationTone, list: m?.diZhi6ConflictList || []},
    {key: 'harm', label: '六害', tone: 'harm' as RelationTone, list: m?.diZhi6HarmList || []},
    {key: 'xing', label: '三刑', tone: 'harm' as RelationTone, list: m?.diZhi3HarmList || []},
  ];
  return groups.filter(g => g.list.length);
});

const hasBranchRelation = computed(() => branchRelationGroups.value.length > 0);

const relationTotal = computed(
    () => tianGanRelations.value.length
        + branchRelationGroups.value.reduce((n, g) => n + g.list.length, 0));

/* ---------------- 格局取法 ---------------- */

interface HideStem {
  char: string;
  god: string;
  /** 是否本气（藏干列表第一位） */
  isMain: boolean;
  /** 是否透出于四柱天干 */
  exposed: boolean;
  color?: string;
}

/** 月令（月支）的藏干：带十神、本气标记与「是否透出」—— 全部取自后端 structureView */
const monthHideStems = computed<HideStem[]>(() => {
  // structureView.touGan 的顺序恒为 年 → 月 → 日 → 时，第 2 项就是月令。
  const month = structureView.value?.touGan?.[1];
  if (!month?.stems?.length) return [];
  return month.stems.map((s, i) => ({
    char: s.name,
    god: s.god,
    // 后端不单独给「本气」标记，但藏干恒按 本气→中气→余气 排，第一位就是本气
    isMain: i === 0,
    exposed: s.exposed,
    // 藏干本身是天干，五行色从 ganZhiDict 的 tianGan 字典取（同一份字典，别再塞一份）
    color: tianGan(s.name).element?.color,
  }));
});

const monthBranch = computed(() => fourPillars.value[1]?.diZhi || '');

const caputName = computed(() => caput.value?.name || '');

/**
 * 是否八格（正格）。
 *
 * **认后端的 `structureView.standardPattern`**，不在前端维护一份八格清单 ——
 * 后端将来加一个格，前端不会漏改。`structureView` 缺失时退回「非八格」，
 * 配合下面 `caputBasis` 的中性文案，不会误导。
 */
const isBaGe = computed(() => structureView.value?.standardPattern ?? false);

/**
 * 取格依据：**直接展示后端 `basisText`**。
 *
 * 这句话依赖候选表与藏干层级，服务端拼得出来、前端拼不出来；各端各拼一遍必然与
 * `caput.name` 漂移。这里只把后端的三种 `basis` 映射成原有的三个 CSS 类名
 * （`is-exposed` / `is-multi` / `is-fallback` / `is-other`），不再自己讲一套因果。
 */
const caputBasis = computed<{ kind: 'exposed' | 'multi' | 'fallback' | 'other' | 'none'; text: string }>(() => {
  const sv = structureView.value;
  if (!sv) {
    // 只有旧缓存 / 手搓对象才会走到这（CACHE_VERSION 已抬到 v7）。
    // 给中性提示，而不是在前端把推导重来一遍 —— 那正是这次要删掉的东西。
    return {kind: 'none', text: '接口未返回取格依据（structureView 缺失）'};
  }
  const kind = sv.basis === 'OUTER' ? 'other'
      : sv.basis === 'NONE_EXPOSED' ? 'fallback'
          : (sv.caputCandidates?.length || 0) > 1 ? 'multi' : 'exposed';
  return {kind, text: sv.basisText || '—'};
});

/* ---------------- 透干 / 通根 ---------------- */

interface TouGanRow {
  branch: string;
  pos: string;
  stems: HideStem[];
}

/**
 * 透干：逐支列出藏干，标出哪些透到了四柱天干。
 *
 * 数据来自后端 `structureView.touGan`（顺序恒为 年→月→日→时）。
 * 「透」的判定在服务端做（「出现在四柱任一天干位」），前端**不再**用
 * 「十二字串里找得到」这种错口径重算。
 */
const touGanRows = computed<TouGanRow[]>(() =>
    (structureView.value?.touGan || []).map(b => ({
      branch: b.branch,
      pos: b.position,
      stems: (b.stems || []).map((s, i) => ({
        char: s.name,
        god: s.god,
        isMain: i === 0,
        exposed: s.exposed,
        color: tianGan(s.name).element?.color,
      })),
    })),
);

/** 透出的藏干个数，用于空态提示 */
const touGanCount = computed(
    () => touGanRows.value.reduce((n, r) => n + r.stems.filter(s => s.exposed).length, 0));

interface RootRef {
  branch: string;
  pos: string;
  /** 本气 / 藏干 */
  via: string;
  /** 是否「同名之根」（乙见卯），比异名同五行更实 */
  same: boolean;
}

interface TongGenRow {
  stem: string;
  pos: string;
  god: string;
  color?: string;
  roots: RootRef[];
}

/**
 * 通根：天干在四支上得到的根（后端 `structureView.tongGen`，顺序恒为 年→月→日→时）。
 *
 * 口径（只比五行、不比阴阳；同名之根更强）由服务端统一实现，前端不再自己算。
 * `depth === 0` 即本气之根，展示成「本气」，其余是「藏干」。
 */
const tongGenRows = computed<TongGenRow[]>(() =>
    (structureView.value?.tongGen || []).map(r => ({
      stem: r.stem,
      pos: r.position,
      god: r.god,
      color: tianGan(r.stem).element?.color,
      roots: (r.roots || []).map(x => ({
        branch: x.branch,
        pos: x.position,
        via: x.depth === 0 ? '本气' : '藏干',
        same: x.same,
      })),
    })),
);

/** 无根之干（虚浮） */
const rootlessStems = computed(() => tongGenRows.value.filter(r => !r.roots.length));

/**
 * 计数文案：拿不到结构视图时给 `—` 而不是 `0` ——
 * 「0 个透干」和「压根没拿到数据」是两回事，后者显示 0 会被读成「这张盘没有透干」。
 */
const touGanCountText = computed(() => (structureView.value ? String(touGanCount.value) : '—'));
const tongGenCountText = computed(() => (structureView.value
    ? `${tongGenRows.value.length - rootlessStems.value.length}/${tongGenRows.value.length}`
    : '—'));

/*
 * ---------------- 身强弱量尺 ----------------
 *
 * score 的量程是 −100 ~ +100（后端按「得令/得地/得势得生」三层加权，再看藏干分层、
 * 虚实、合化、刑冲修正；月支得令 ±40 是大头）。
 * 判强弱的阈值**不是固定值**：后端 2026-10-10 起改用「相对同类型盘的基准分」
 * （取该日主 score 分布的中位数：木/火 −33、水 −30、金 −14、土 −19），
 * 基准随日主五行变，所以**不能在前端写死百分比** ——
 * 这里直接用后端下发的 `lifeTime.strongBaseline` 换算阈值线的位置。
 *
 * ⚠️ 别退回「阈值 50 / 75%」：那个口径 5000 张随机盘实测 89.5% 判身弱，
 * 已废弃（详见 metaphysics 仓库 commons/common-ganzhi/docs/strong-weak-calibration-2026-10-10.md）。
 */
const scorePct = computed(() => {
  const s = Number(lifeTime.value?.score ?? 0);
  return Math.max(0, Math.min(100, (s + 100) / 2));
});

/** 阈值线在量尺上的位置（%）：把 −100~+100 线性映射到 0~100。 */
const STRONG_THRESHOLD_PCT = computed(() => {
  const base = Number(lifeTime.value?.strongBaseline ?? 0);
  return Math.max(0, Math.min(100, (base + 100) / 2));
});

/** 两流派差异摘要 */
const sectDiff = computed(() => {
  const keys = Object.keys(qiYunMap.value);
  if (keys.length < 2) return {hasDiff: false, text: ''};
  const [k1, k2] = keys;
  const t1 = qiYunMap.value[k1]?.startYunDateTime;
  const t2 = qiYunMap.value[k2]?.startYunDateTime;
  if (!t1 || !t2) return {hasDiff: false, text: ''};
  const ms = Math.abs(
      new Date(t1.replace(/-/g, '/')).getTime() - new Date(t2.replace(/-/g, '/')).getTime(),
  );
  const days = Math.round(ms / 86400000);
  const n1 = SECT_OPTIONS.find(o => o.value === k1)?.label || k1;
  const n2 = SECT_OPTIONS.find(o => o.value === k2)?.label || k2;
  if (days === 0) return {hasDiff: false, text: ''};
  return {hasDiff: true, text: `${n1} 与 ${n2} 的起运时刻相差约 ${days} 天`};
});

/* ---- 真太阳时预览（与后端 TrueSolarTime 同口径，仅用于回显） ---- */

const tstActive = computed(() => !!(pillarDto.useTrueSolarTime && pillarDto.longitude));

const tstOffsetMinutes = computed(() => {
  if (!tstActive.value) return 0;
  const lng = Number(pillarDto.longitude);
  let m = Math.round((lng - 120) * 4);
  if (pillarDto.withEquationOfTime) m += Math.round(equationOfTimeMinutes(pillarDto.dateTime));
  return m;
});

const tstOffsetText = computed(() => {
  const m = tstOffsetMinutes.value;
  if (!m) return '±0 分';
  return (m > 0 ? '+' : '') + m + ' 分';
});

const tstCorrectedText = computed(() => {
  const dt = pillarDto.dateTime;
  if (!dt) return '—';
  const d = new Date(String(dt).replace(/-/g, '/'));
  if (isNaN(d.getTime())) return '—';
  d.setMinutes(d.getMinutes() + tstOffsetMinutes.value);
  return formatDateTime(d);
});

const tstSourceText = computed(() => {
  const s = region.picked?.source;
  if (!s) return '已选出生地';
  if (s === 'adcode') return '官方点位';
  if (s === 'children-avg') return '上级推算';
  if (s.startsWith('parent:')) return '上级回填';
  return s;
});
const tstIsApprox = computed(() => !!region.picked?.source && region.picked.source !== 'adcode');

/** 概要条里的实际校正量（服务端给的，不是前端预览值） */
const tstAppliedText = computed(() => {
  const m = tstAppliedMinutes.value;
  if (!m) return '已校正';
  return `已校正 ${m > 0 ? '+' : ''}${m} 分`;
});

/* ==========================================================================
 * 方法
 * ========================================================================= */

/** 后端返回 "2009-09-15T16:40:22" 或 "... 16:40:22" → 显示到分钟 */
const fmt = (v?: string | null) => {
  if (!v) return '—';
  return String(v).replace('T', ' ').slice(0, 16);
};

/** 干支查表：柱子里的 tianGan/diZhi 只有名字，属性从字典取（查不到给空对象，模板不会炸） */
const tianGan = (name?: string): Partial<GanZhi> => (name ? ganZhiDict.value.tianGan[name] ?? {} : {});
const diZhi = (name?: string): Partial<GanZhi> => (name ? ganZhiDict.value.diZhi[name] ?? {} : {});

const getShortGod = (god?: string) => {
  const map: Record<string, string> = {
    偏印: '枭', 正印: '印', 食神: '食', 伤官: '伤', 偏财: '财',
    正财: '才', 七杀: '杀', 正官: '官', 比肩: '比', 劫财: '劫',
  };
  return (god && map[god]) || '';
};

const getDetail = (key?: string) => {
  if (!key) return '';
  let k = key;
  if (k === '天罗' || k === '地网') k = '天罗地网';
  const entry = lunarExtendMap.value[k];
  if (!entry) return '';
  return replaceNewlinesWithBr(entry.summary || '') + '<br/><br/>' + replaceNewlinesWithBr(entry.description || '');
};

const replaceNewlinesWithBr = (s: string) => s.replace(/\n/g, '<br/>');

const formatDateTime = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

/**
 * 均时差（分钟）—— 与后端 `TrueSolarTime.equationOfTimeMinutes` 同口径。
 * 前端复刻只为「选完就能预览差多少」，不作为排盘依据。
 */
const equationOfTimeMinutes = (dtStr?: string) => {
  if (!dtStr) return 0;
  const d = new Date(String(dtStr).replace(/-/g, '/'));
  if (isNaN(d.getTime())) return 0;
  const start = new Date(d.getFullYear(), 0, 0);
  const doy = Math.floor((d.getTime() - start.getTime()) / 86400000);
  // γ 取「当天 12:00」，让同一天任何时刻的均时差为定值（与后端一致）
  const gamma = (2 * Math.PI / 365) * (doy - 1 + 0.5);
  return 229.18 * (0.000075
      + 0.001868 * Math.cos(gamma)
      - 0.032077 * Math.sin(gamma)
      - 0.014615 * Math.cos(2 * gamma)
      - 0.040849 * Math.sin(2 * gamma));
};

const disabledFutureDate = (time: Date) => time.getTime() > Date.now();

const showFormBox = () => {
  showForm.value = !showForm.value;
};

/** 同步命盘表右端的两根柱子 */
const syncYunPillars = (list: DaYun[]) => {
  const first = list[0];
  if (first?.pillar) {
    yunPillars.value = [
      {...first.pillar, title: '大运'},
      first.liuNianList?.[0]?.pillar
          ? {...first.liuNianList[0].pillar, title: '流年'}
          : {title: '流年'},
    ];
  } else {
    yunPillars.value = [{title: '大运'}, {title: '流年'}];
  }
};

const getPillarInfo = () => {
  loading.value = true;
  getBaziInfo(pillarDto).then((r: any) => {
    const payload = r?.data || {};
    const data: Partial<PillarVo> = payload.pillarVo || {};

    lunarExtendMap.value = payload.lunarExtendMap || {};
    pillarVo.value = data;
    ganZhiDict.value = data.ganZhiDict || {tianGan: {}, diZhi: {}};
    qiYunMap.value = data.qiYunMap || {};
    daYunListMap.value = data.daYunListMap || {};
    qiYunView.value = data.qiYunView || null;
    lifeTime.value = data.lifeTime || null;
    caput.value = data.caput || null;
    structureView.value = data.structureView || null;
    mergeVo.value = data.mergeVo || null;
    tstApplied.value = !!payload.useTrueSolarTime;
    tstAppliedMinutes.value = Number(payload.solarTimeOffsetMinutes) || 0;

    fourPillars.value = [
      {...(data.yearPillar as Pillar), title: '年柱'},
      {...(data.monthPillar as Pillar), title: '月柱'},
      {...(data.dayPillar as Pillar), title: '日柱'},
      {...(data.hourPillar as Pillar), title: '时柱'},
    ];

    // 后端建议的默认流派；不在返回的 Map 里就退回任意一个可用 key
    sect.value = data.sect || '2';
    if (!qiYunMap.value[sect.value]) {
      const keys = Object.keys(qiYunMap.value);
      if (keys.length) sect.value = keys[0];
    }

    syncYunPillars(daYunListMap.value[sect.value] || []);
    yunActiveIndex.value = 0;
    fleetActiveIndex.value = 0;
    loaded.value = true;
  }).catch((error: unknown) => {
    // 业务错误（如「农历该月没有这一天」）已由 axios 拦截器弹出中文提示，这里只兜底日志
    console.error('排盘请求失败：', error);
  }).finally(() => {
    loading.value = false;
  });
};

const submitData = () => {
  showForm.value = false;
  getPillarInfo();
};

/** 带着本次排盘的口径跳到 AI 推演页 */
const goFortune = () => {
  router.push({
    name: 'fortune',
    query: {
      dateType: pillarDto.dateType,
      sex: pillarDto.sex,
      dateTime: pillarDto.dateTime,
      longitude: pillarDto.longitude ?? undefined,
      useTrueSolarTime: pillarDto.useTrueSolarTime ? '1' : undefined,
      withEquationOfTime: pillarDto.withEquationOfTime ? '1' : undefined,
      leapMonth: pillarDto.leapMonth ? '1' : undefined,
    },
  });
};

/* ---- 大运 / 流年联动 ---- */

const checkYun = (index: number) => {
  yunActiveIndex.value = index;
  const dy = daYunList.value[index];
  if (dy?.pillar) yunPillars.value[0] = {...dy.pillar, title: '大运'};
  fleetActiveIndex.value = 0;
  checkFleetYear(0);
};

const checkFleetYear = (index: number) => {
  fleetActiveIndex.value = index;
  const ln = activeYun.value?.liuNianList?.[index];
  if (ln?.pillar) yunPillars.value[1] = {...ln.pillar, title: '流年'};
};

/** 某步大运是否「当前所处」—— 用后端算好的索引，前端不重算 */
const isNowYun = (dy: DaYun) => {
  const v = qiYunView.value;
  return !!(v && dy && v.currentDaYunIndex > 0 && dy.index === v.currentDaYunIndex);
};

/** 流年里的「今年」：流年本身就是年份粒度，可以比年份 */
const isNowLiuNian = (ln: LiuNian) => {
  const v = qiYunView.value;
  if (!v?.now) return false;
  return Number(String(v.now).slice(0, 4)) === ln.year;
};

const isYearDiff = (sectKey: string, year: number) => {
  const map = qiYunView.value?.sectSummaryMap;
  if (!map) return false;
  const others = Object.keys(map).filter(k => k !== sectKey);
  return others.some(k => (map[k]?.startYears || []).includes(year) === false);
};

/* ---- 出生地级联 ---- */

const fetchRegions = (parentCode?: string): Promise<RegionVo[]> => {
  return getRegionChildren(parentCode).then((r: any) => {
    if (r?.code === 200) return (r.data || []) as RegionVo[];
    return [];
  }).catch((error: unknown) => {
    console.error('加载行政区失败：', error);
    return [];
  });
};

const loadProvinces = () => {
  fetchRegions().then(list => {
    region.provinces = list;
  });
};

const onProvinceChange = (code: string | null) => {
  region.province = code;
  region.cities = [];
  region.districts = [];
  region.city = null;
  region.district = null;
  applyPicked(region.provinces.find(x => x.code === code));
  if (!code) return;
  fetchRegions(code).then(list => {
    region.cities = list;
  });
};

const onCityChange = (code: string | null) => {
  region.city = code || null;
  region.districts = [];
  region.district = null;
  const c = region.cities.find(x => x.code === code);
  if (c) {
    applyPicked(c);
  } else {
    // 清掉市 → 退回省坐标（不能只传 undefined，那会走「保留原值」分支）
    applyPicked(region.provinces.find(x => x.code === region.province));
  }
  if (!code) return;
  fetchRegions(code).then(list => {
    region.districts = list;
  });
};

const onDistrictChange = (code: string | null) => {
  region.district = code || null;
  const d = region.districts.find(x => x.code === code);
  if (d) {
    applyPicked(d);
  } else if (!region.city) {
    applyPicked(region.provinces.find(x => x.code === region.province));
  } else if (!code) {
    applyPicked(region.cities.find(x => x.code === region.city));
  }
};

/**
 * 把选中区域的经度写进 pillarDto。
 *
 * 传 undefined 时**不会**清掉已有经度 —— 调用方要「退回上一级」
 * 必须显式传上一级的记录，而不是指望这里兜底。
 */
const applyPicked = (r?: RegionVo) => {
  region.picked = r || null;
  if (r && r.longitude != null) {
    pillarDto.longitude = Number(r.longitude);
  } else if (r) {
    // 有地区但无坐标（街道级才会出现），置空以免用错坐标
    pillarDto.longitude = null;
  }
};

/* ==========================================================================
 * 生命周期
 * ========================================================================= */

/** route.query 的值可能是 string | string[] | null，统一成 string */
const q = (v: unknown): string | undefined => {
  if (Array.isArray(v)) return v[0];
  return v == null ? undefined : String(v);
};

/**
 * 把地址栏上的参数读进表单。
 *
 * 抽成函数是因为它有两个触发点：首次挂载，以及<b>同路由换 query</b>
 * （例如用户从首页带着新的生辰再次跳进来）。后者 vue-router 会复用组件实例，
 * `onMounted` 不会再跑，只 watch query 才不会停在上一份命盘上。
 */
const applyRouteQuery = () => {
  pillarDto.dateType = Number(q(route.query.dateType)) || 1;
  const sex = Number(q(route.query.sex));
  pillarDto.sex = Number.isNaN(sex) ? 1 : sex;
  pillarDto.username = q(route.query.username) || '';
  pillarDto.dateTime = q(route.query.dateTime) || '';

  // 联动参数：真太阳时 / 闰月
  pillarDto.useTrueSolarTime = q(route.query.useTrueSolarTime) === '1';
  pillarDto.withEquationOfTime = q(route.query.withEquationOfTime) === '1';
  pillarDto.leapMonth = q(route.query.leapMonth) === '1';
  const lng = q(route.query.longitude);
  if (lng !== undefined && lng !== '' && !Number.isNaN(Number(lng))) {
    pillarDto.longitude = Number(lng);
  }

  if (pillarDto.dateTime) {
    getPillarInfo();
  } else if (!loaded.value) {
    showForm.value = true;
  }
};

onMounted(() => {
  loadProvinces();
  applyRouteQuery();
});

// 同路由换 query → 复用实例，onMounted 不会再跑，这里补一次
watch(() => route.query, () => {
  if (route.name === 'bazi') applyRouteQuery();
});

// 切流派：大运/起运是 computed 自动换；yunPillars 是平铺数组，需手动同步一次
watch(sect, (s) => {
  yunActiveIndex.value = 0;
  fleetActiveIndex.value = 0;
  syncYunPillars(daYunListMap.value[s] || []);
});
</script>

<style scoped lang="scss">
/* ==========================================================================
 * 全部颜色走全局设计令牌（assets/css/theme.css），
 * 因此明暗两套主题不需要在本文件里写两遍。
 * ========================================================================= */

.bazi-page {
  min-height: 100%;
  background: var(--bg);
  color: var(--text);
}

.page {
  // 主体宽度锁在 $mainWidth，与 Header 内层同轴。
  // 不要再改回固定大值（曾为 1440px）—— 命盘表是按可用宽度流式排布的，
  // 容器一变宽，列也跟着变宽，整页留白与列宽就不可预期了。
  @include main-container($mainPad);
  padding-top: 20px;
  padding-bottom: 64px;
}

/* ============================ 页头 ============================ */

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;

  .page-title {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: 0.5px;

    small {
      font-size: 12px;
      font-weight: 400;
      color: var(--text-faint);
      margin-left: 8px;
      letter-spacing: 0;
    }
  }

  .head-actions {
    display: flex;
    gap: 8px;
  }
}

/* ============================ 表单 ============================ */

.form-panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 18px 20px 4px;
  margin-bottom: 16px;

  :deep(.el-form-item) {
    margin-bottom: 14px;
  }
}

.tst-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tst-hint {
  font-size: 12px;
  color: var(--text-faint);
}

.tst-shift {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-faint);
  white-space: nowrap;

  .arrow {
    color: var(--gold);
  }

  .val {
    font-family: var(--mono);
    color: var(--text-dim);
  }

  .delta {
    padding: 0 5px;
    border-radius: 3px;
    background: var(--gold-wash);
    border: 1px solid var(--gold-soft);
    color: var(--gold);
    font-size: 11px;
  }
}

.tst-tag {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: var(--gold-wash);
  border: 1px solid var(--gold-soft);
  color: var(--gold);

  &.is-approx {
    background: rgba(183, 138, 36, 0.14);
    border-color: var(--el-color-warning);
    color: var(--el-color-warning);
  }
}

.empty-card :deep(.el-card__body) {
  padding: 24px;
}

/* ============================ 概要条 ============================ */

.summary-bar {
  display: flex;
  align-items: center;
  gap: 22px;
  flex-wrap: wrap;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  padding: 12px 20px;
  margin-bottom: 16px;
}

.summary-item {
  display: flex;
  align-items: baseline;
  gap: 6px;

  .k {
    font-size: 12px;
    color: var(--text-faint);
  }

  .v {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);

    &.mono {
      font-family: var(--mono);
      letter-spacing: 1px;
    }
  }
}

.summary-divider {
  width: 1px;
  height: 16px;
  background: var(--line);
}

/* ============================ 卡片通用 ============================ */

.block {
  margin-bottom: 16px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);

  &::before {
    content: '';
    width: 3px;
    height: 14px;
    border-radius: 2px;
    background: var(--gold);
  }

  .hint {
    font-size: 12px;
    font-weight: 400;
    color: var(--text-faint);
  }
}

.legend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-faint);

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--red);
  }
}

/* ============================ 起运推算链 ============================ */

.chain {
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: 14px;
}

.chain-node {
  flex: 1 1 0;
  min-width: 132px;
  padding: 10px 14px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-right: none;
  position: relative;

  &:first-child {
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  }

  &:last-child {
    border-right: 1px solid var(--line);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }

  &.is-key {
    background: var(--gold-wash);
    border-color: var(--gold-soft);
  }

  /* 节点之间的箭头 */
  &:not(:last-child)::after {
    content: '›';
    position: absolute;
    right: -7px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-faint);
    font-size: 16px;
    line-height: 1;
    z-index: 1;
  }

  .cn-label {
    font-size: 11px;
    color: var(--text-faint);
    letter-spacing: 0.5px;
  }

  .cn-value {
    font-size: 13px;
    font-weight: 500;
    margin-top: 2px;
    font-family: var(--mono);
    color: var(--text);
  }
}

.qiyun-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
}

.qiyun-item {
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 10px 12px;

  &.is-key {
    background: var(--gold-wash);
    border-color: var(--gold-soft);
  }

  .label {
    font-size: 12px;
    color: var(--text-faint);
    margin-bottom: 4px;
  }

  .value {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
    word-break: break-all;

    &.mono {
      font-family: var(--mono);
      font-size: 13px;
    }

    .sub {
      font-size: 12px;
      color: var(--text-faint);
      font-weight: 400;
    }
  }
}

/* ============================ 流派对照 ============================ */

.sect-compare {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.sect-panel {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;

  &.is-active {
    border-color: var(--gold);
    box-shadow: 0 0 0 2px var(--gold-wash);
  }
}

.sect-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  background: var(--panel-2);
  border-bottom: 1px solid var(--line);

  .sect-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .sect-badge {
    font-size: 11px;
    padding: 1px 7px;
    border-radius: 10px;
    background: var(--gold);
    color: #fff;
    margin-left: 6px;
  }
}

.sect-panel.is-active .sect-panel-head {
  background: var(--gold-wash);
}

.sect-body {
  padding: 12px 14px;
}

.sect-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;

  .sk {
    color: var(--text-faint);
    flex-shrink: 0;
  }

  .sv {
    text-align: right;
    font-family: var(--mono);
    color: var(--text);
  }
}

.year-block {
  margin-top: 8px;

  .sk {
    font-size: 12px;
    color: var(--text-faint);
  }
}

.year-seq {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.year-chip {
  font-family: var(--mono);
  font-size: 12px;
  padding: 2px 7px;
  border-radius: 4px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  color: var(--text-dim);

  &.is-diff {
    background: rgba(183, 138, 36, 0.16);
    border-color: var(--el-color-warning);
    color: var(--el-color-warning);
    font-weight: 600;
  }
}

.diff-callout {
  margin-top: 14px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: rgba(183, 138, 36, 0.14);
  border: 1px solid var(--el-color-warning);
  color: var(--el-color-warning);
  font-size: 12.5px;
  line-height: 1.7;

  &.no-diff {
    background: var(--panel-2);
    border-color: var(--line);
    color: var(--text-dim);
  }
}

/* ============================ 命盘表 ============================
 * 列宽策略：数据柱等分容器剩余宽度（flex: 1 1 0 + min-width: 0），
 * 行标签列固定 76px。
 *
 * 为什么不用固定宽度：主体收在 $mainWidth（1100）后，可用宽度
 * 1100 − 2×24 = 1052px。若沿用旧稿给每根数据柱固定 165px，
 * 6 柱 + 标签列 = 1066px > 1052px，整表必然横向溢出。
 *
 * 也不能只写 min-width 而不写 flex-basis：那是「宽度由内容决定」的列，
 * 神煞格虽写了 flex-wrap，在没有回绕边界的容器里永远不换行 ——
 * 神煞越多，列被撑得越宽。flex: 1 1 0 把列宽交回容器，
 * wrap 才真正生效；min-width: 0 是允许 flex 项收缩到内容宽度以下的关键，
 * 少了它，flex 项不会内收，上面两条都不成立。
 *
 * min-width 只兜「窄到不可读」的下限，触发时交给 .pillar-table 横向滚动。
 * ============================================================= */

.pillar-table {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--panel);
  // 正常宽度下列宽由容器算出来、正好铺满，不会滚动；
  // 只有窄屏撞到 .is-pillar 的 min-width 时才出现横向滚动条。
  overflow-x: auto;
}

.pt-col {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;

  &.is-label {
    flex: 0 0 76px;
    background: var(--panel-2);
    border-right: 1px solid var(--line);

    .pt-cell {
      color: var(--text-faint);
      font-size: 12px;
      justify-content: flex-start;
      padding-left: 12px;
    }
  }

  &.is-pillar {
    // 兜底下限：比这更窄格子就挤烂了，改为整表横向滚动。
    // 取值来自实测：900px 视口下卡片可用宽约 828px，
    // 6×120 + 76 = 796 < 828，刚好不触发滚动，故取 120。
    min-width: 120px;
    border-right: 1px solid var(--line);

    &:last-child {
      border-right: none;
    }
  }

  &.is-yun {
    background: var(--panel-2);

    &.first-yun {
      border-left: 2px solid var(--line-strong);
    }
  }
}

.pt-cell {
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 6px;
  border-bottom: 1px solid var(--line);
  font-size: 14px;
  color: var(--text);

  &:last-child {
    border-bottom: none;
  }

  &.is-tall {
    min-height: 76px;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
  }

  &.is-head {
    background: var(--gold-wash);
    font-weight: 600;
    font-size: 13px;
  }

  &.pt-mini {
    font-size: 12px;
    color: var(--text-dim);
  }
}

.pt-gz {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
}

.pt-yy {
  font-size: 11px;
  color: var(--text-faint);
}

.pt-hide {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  line-height: 1.45;
  max-width: 100%;
  flex-wrap: wrap;
  justify-content: center;

  .hg-god {
    color: var(--text-faint);
    font-size: 11px;
  }
}

/* 神煞格：固定高度 + 自动换行；只在纵向溢出时滚动，绝不撑宽列 */
.pt-shensha {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  justify-content: center;
  align-content: flex-start;
  width: 100%;
  min-height: 76px;
  overflow-y: auto;
  overflow-x: hidden;
}

.tag-op {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  color: var(--text-dim);
  font-size: 12px;
  cursor: help;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    background: var(--gold-wash);
    border-color: var(--gold-soft);
    color: var(--gold);
  }

  &.is-strong {
    font-weight: 600;
    color: var(--text);
  }
}

/* ============================ 大运 / 流年时间轴 ============================ */

.timeline-scroll {
  overflow-x: auto;
  padding-bottom: 6px;
}

.timeline {
  display: flex;
  gap: 6px;
  min-width: min-content;

  &.is-liunian .tl-yun {
    width: 78px;
  }
}

.tl-yun {
  flex: 0 0 auto;
  width: 86px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--panel-2);
  padding: 8px 6px;
  cursor: pointer;
  transition: all 0.14s;
  position: relative;
  text-align: center;

  &:hover {
    border-color: var(--gold-soft);
    background: var(--gold-wash);
  }

  &.is-active {
    background: var(--gold);
    border-color: var(--gold);
    color: #fff;

    .tl-years, .tl-age, .tl-gods {
      color: rgba(255, 255, 255, 0.82);
    }

    .tl-gz {
      color: #fff;
    }
  }

  &.is-now {
    box-shadow: 0 0 0 2px var(--gold-wash);
  }

  &.is-now::after {
    content: '今';
    position: absolute;
    top: -6px;
    right: -6px;
    width: 18px;
    height: 18px;
    line-height: 18px;
    border-radius: 50%;
    background: var(--red);
    color: #fff;
    font-size: 10px;
    text-align: center;
  }

  .tl-years, .tl-age {
    font-size: 11px;
    color: var(--text-faint);
  }

  .tl-gz {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.3;
    margin: 2px 0;
    color: var(--text);
  }

  .tl-gods {
    font-size: 11px;
    color: var(--red);
    letter-spacing: 0.5px;
  }
}

.yun-note {
  margin-top: 10px;
  font-size: 12.5px;
  color: var(--text-faint);
  line-height: 1.8;

  b {
    color: var(--text-dim);
  }

  .mono {
    font-family: var(--mono);
  }

  .warn {
    color: var(--el-color-warning);
  }
}

/* ============================ 格局用神 / 干支关系 / 透干通根 ============================ */

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* ---------------- 格局 + 取格依据 ---------------- */

.pattern-row {
  margin-bottom: 18px;
}

.pattern-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.pattern-key {
  font-size: 13px;
  color: var(--text-faint);
}

.pattern-name {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--gold);
  cursor: help;
}

.pattern-kind {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 9px;
  border: 1px solid;

  &.is-ba {
    color: var(--gold);
    border-color: var(--gold-soft);
    background: var(--gold-wash);
  }

  &.is-other {
    color: var(--blue);
    border-color: rgba(61, 107, 150, 0.36);
    background: rgba(61, 107, 150, 0.1);
  }
}

.pattern-meta {
  font-size: 12px;
  color: var(--text-faint);
}

.pattern-basis {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  border-left: 3px solid var(--line-strong);
  background: var(--panel-2);
  font-size: 13px;
  line-height: 1.7;

  .basis-key {
    flex: none;
    color: var(--text-faint);
    font-size: 12px;
    padding-top: 1px;
  }

  .basis-text {
    color: var(--text-dim);
  }

  // 由「月令透干」印证成立时给金色；退到中性描述时保持素色，
  // 颜色本身就提示了「这条是确证还是仅陈述」。
  &.is-exposed {
    border-left-color: var(--gold);
  }

  &.is-multi {
    border-left-color: var(--gold-2);
  }

  &.is-other {
    border-left-color: var(--blue);
  }

  &.is-fallback {
    border-left-color: var(--red);
  }
}

/* ---------------- 藏干小片 ---------------- */

.hide-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 12px;
  border: 1px solid var(--line);
  background: var(--panel-2);
  color: var(--text-dim);
  white-space: nowrap;

  b {
    font-size: 14px;
    font-weight: 600;
  }

  em {
    font-style: normal;
    font-size: 11px;
    color: var(--text-faint);
  }

  .via {
    font-style: normal;
    font-size: 10px;
    color: var(--text-faint);
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 0 4px;
  }

  .dot {
    font-style: normal;
    font-size: 11px;
    font-weight: 600;
    color: var(--gold);
  }

  // 透出者整体提亮 + 金边，一眼能挑出来
  &.is-exposed {
    border-color: var(--gold-soft);
    background: var(--gold-wash);
    color: var(--text);
  }

  &.is-mini {
    padding: 1px 6px;
    gap: 3px;

    b {
      font-size: 13px;
    }
  }
}

/* ---------------- 身强弱量尺 ---------------- */

.strength-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 0 16px;
}

.strength-tag {
  flex: none;
  font-size: 15px;
  font-weight: 600;
  padding: 2px 12px;
  border-radius: 6px;

  &.is-strong {
    color: var(--red);
    background: rgba(184, 68, 44, 0.12);
  }

  &.is-weak {
    color: var(--green);
    background: rgba(47, 122, 82, 0.12);
  }
}

.score-scale {
  flex: 1;
  min-width: 0;
}

.scale-track {
  position: relative;
  height: 8px;
  border-radius: 4px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  overflow: hidden;
}

.scale-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--gold-soft), var(--gold));
  transition: width 0.3s ease;
}

/* 阈值刻线压在填充之上。注意它在 75% 处而非中点 ——
   量程 −100~+100 而阈值是 +50，画成「过半即身强」就错了。 */
.scale-mark {
  position: absolute;
  top: -1px;
  bottom: -1px;
  width: 2px;
  background: var(--text-faint);
  opacity: 0.7;
}

.scale-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 10px;
  color: var(--text-faint);

  .scale-mid {
    transform: translateX(-50%);
    margin-left: 25%;
  }
}

.score-num {
  flex: none;
  font-family: var(--mono);
  font-size: 16px;
  font-weight: 600;

  &.is-strong {
    color: var(--red);
  }

  &.is-weak {
    color: var(--green);
  }
}

/* ---------------- 用神：2×2 喜忌对照 ---------------- */

.god-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 20px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.god-key {
  font-size: 12px;
  margin-bottom: 7px;

  &.is-joy {
    color: var(--green);
  }

  &.is-fear {
    color: var(--red);
  }
}

.elem-chip {
  display: inline-block;
  min-width: 34px;
  text-align: center;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid currentColor;
  background: var(--panel-2);
}

/* ---------------- 通用关系块 ---------------- */

.relation-block {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.relation-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-dim);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;

  .cnt {
    font-size: 11px;
    font-weight: 400;
    color: var(--text-faint);
    background: var(--panel-2);
    border-radius: 8px;
    padding: 0 6px;
  }

  .label-hint {
    font-size: 11px;
    font-weight: 400;
    color: var(--text-faint);
  }
}

.relation-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 地支关系分组：每组「类名 + 该类的条目」一行 */
.branch-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.branch-group {
  display: flex;
  align-items: flex-start;
  gap: 10px;

  .group-key {
    flex: none;
    width: 84px;
    font-size: 12px;
    line-height: 1.9;
    color: var(--text-faint);
    text-align: right;

    &.is-he {
      color: var(--gold);
    }

    &.is-chong {
      color: var(--red);
    }

    &.is-harm {
      color: var(--red);
      opacity: 0.8;
    }
  }

  .relation-tags {
    flex: 1;
    min-width: 0;
  }
}

.tag-god {
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 13px;
  border: 1px solid transparent;
  cursor: help;

  &.is-joy {
    background: rgba(47, 122, 82, 0.12);
    border-color: rgba(47, 122, 82, 0.4);
    color: var(--green);
  }

  &.is-fear {
    background: rgba(184, 68, 44, 0.12);
    border-color: rgba(184, 68, 44, 0.36);
    color: var(--red);
  }
}

.tag-relation {
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 13px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  color: var(--text-dim);
  cursor: help;
  transition: border-color 0.12s, color 0.12s;

  // 合 / 会：金色（聚而成象）
  &.is-he {
    border-color: var(--gold-soft);
    background: var(--gold-wash);
    color: var(--gold);
  }

  // 冲：红（逆）
  &.is-chong {
    border-color: rgba(184, 68, 44, 0.4);
    background: rgba(184, 68, 44, 0.1);
    color: var(--red);
  }

  // 刑 / 害：红但更暗，与「冲」分层
  &.is-harm {
    border-color: rgba(184, 68, 44, 0.24);
    background: rgba(184, 68, 44, 0.06);
    color: var(--red);
    opacity: 0.85;
  }
}

/* ---------------- 透干 / 通根 行表 ---------------- */

.tg-rows {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.tg-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.tg-branch {
  flex: none;
  width: 20px;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.5;
}

.tg-pos {
  flex: none;
  width: 28px;
  font-size: 11px;
  color: var(--text-faint);
  line-height: 2.4;
}

.tg-stems {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.root-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  border: 1px solid var(--line);
  background: var(--panel-2);
  color: var(--text-dim);
  white-space: nowrap;

  b {
    font-size: 14px;
    color: var(--text);
  }

  i {
    font-style: normal;
    font-size: 10px;
    color: var(--text-faint);
  }

  // 同名之根（乙见卯）比异名同五行更实，加重提示
  &.is-same {
    border-color: var(--gold-soft);
    background: var(--gold-wash);

    b {
      color: var(--gold);
    }
  }

  &.is-none {
    color: var(--text-faint);
    border-style: dashed;
  }
}

.no-relation {
  color: var(--text-faint);
  font-size: 13px;
}

.pop-detail {
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-dim);
  max-height: 380px;
  overflow-y: auto;
  word-break: break-word;

  :first-child {
    margin-top: 0;
  }
}

/* ============================ 响应式 ============================ */

@media (max-width: 1000px) {
  .two-col {
    grid-template-columns: 1fr;
  }

  .page {
    padding: 16px 12px 48px;
  }
}

@media (max-width: 700px) {
  // 列宽由 flex 决定，这里调的是「下限」和「标签列基准」。
  // 直接写 width 是无效的 —— flex-basis: 0 会把它忽略掉。
  .pt-col.is-pillar {
    min-width: 104px;
  }

  .pt-col.is-label {
    flex-basis: 64px;
  }

  .pt-gz {
    font-size: 18px;
  }

  // 用神 2×2 在窄屏塌成一列，否则「喜用五行」这种四字标签会先被压换行
  .god-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .pattern-name {
    font-size: 19px;
  }

  // 分组类名不再占固定宽度，改成压在标签上方
  .branch-group {
    flex-direction: column;
    gap: 5px;

    .group-key {
      width: auto;
      text-align: left;
      line-height: 1.4;
    }
  }
}
</style>
