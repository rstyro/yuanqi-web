<template>
  <div class="container">
    <Header></Header>
    <div class="content">
      <div class="box">
        <div class="form-container">
          <el-button type="primary" @click="showFormBox" size="small" :icon="showForm ? 'el-icon-arrow-up' : 'el-icon-arrow-down'">
            {{ showForm ? '收起' : '展开' }}查询
          </el-button>

          <el-collapse-transition>
            <div v-show="showForm" class="form">
              <el-form :model="pillarDto" label-position="top">
                <el-row :gutter="20">
                  <el-col :span="8">
                    <el-form-item label="姓名">
                      <el-input v-model="pillarDto.username" placeholder="请输入姓名" clearable></el-input>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="性别">
                      <el-select v-model="pillarDto.sex" placeholder="请选择性别" style="width: 100%">
                        <el-option :value="1" label="男"></el-option>
                        <el-option :value="0" label="女"></el-option>
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="出生时间">
                      <el-date-picker
                          v-model="pillarDto.dateTime"
                          type="datetime"
                          placeholder="选择日期时间"
                          format="YYYY-MM-DD HH:mm:ss"
                          value-format="YYYY-MM-DD HH:mm:ss"
                          style="width: 100%"
                          :shortcuts="pickerOptions.shortcuts"
                          :disabled-date="pickerOptions.disabledDate"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-form-item>
                  <el-button type="primary" @click="submitData" style="width: 100%">查询</el-button>
                </el-form-item>
              </el-form>
            </div>
          </el-collapse-transition>
        </div>

        <div class="result-container" v-if="ganZhi">
          <div class="ganZhi">
            <h3>出生日期：{{yun.birthday}}</h3>
            <h3>天干地支：{{ganZhi}}</h3>
          </div>

          <div class="pillar-container">
            <div class="left">
              <el-card class="box-card">
                <template #header>
                  <div class="card-header">
                    <span>八字排盘</span>
                  </div>
                </template>
                <div class="pillar-box">
                  <div class="pillar-column">
                    <div class="row-item row-item-h40 row-item-head">日期</div>
                    <div class="row-item row-item-h40 row-item-head">主星</div>
                    <div class="row-item row-item-h40 row-item-head">天干</div>
                    <div class="row-item row-item-h40 row-item-head">地支</div>
                    <div class="row-item row-item-h40 row-item-head">副星</div>
                    <div class="row-item row-item-h80 row-item-head">藏干支</div>
                    <div class="row-item row-item-h40 row-item-head">星运</div>
                    <div class="row-item row-item-h40 row-item-head">自坐</div>
                    <div class="row-item row-item-h40 row-item-head">空亡</div>
                    <div class="row-item row-item-h40 row-item-head">纳音</div>
                    <div class="row-item row-item-h40 row-item-head">神煞</div>
                  </div>
                  <!-- 四柱 -->
                  <div class="pillar-column" v-for="(item,index) in fourPillars" :key="'four'+index">
                    <div class="row-item row-item-h40 row-item-head">{{item.title}}</div>
                    <div class="row-item row-item-h40">
                      <div v-if="item.tianGanGod =='元女' || item.tianGanGod =='元男'">
                        {{item.tianGanGod}}
                      </div>
                      <el-popover v-else placement="right-start"
                                  :title="item.tianGanGod"
                                  width="500"
                                  trigger="hover" >
                        <div v-html="getDetail(item.tianGanGod)"></div>
                        <template #reference>
                          <el-tag size="small" type="primary">{{item.tianGanGod}}</el-tag>
                        </template>
                      </el-popover>
                    </div>
                    <div class="row-item row-item-h40">
                      <div>
                        <span class="ti"
                              :style="{ color: item.tianGan.element.color }">{{ item.tianGan.name}}</span>
                        <span class="extend">{{ item.tianGan.yinYang === 'YANG' ? '阳' : '阴'}}</span>
                      </div>
                    </div>
                    <div class="row-item row-item-h40">
                      <div>
                        <span class="ti"
                              :style="{ color: item.diZhi.element.color }">{{ item.diZhi.name}}</span>
                        <span class="extend">{{ item.diZhi.yinYang === 'YANG' ? '阳' : '阴'}}</span>
                      </div>
                    </div>
                    <div class="row-item row-item-h40">
                      <el-popover placement="right-start"
                                  :title="item.diZhiGod"
                                  width="500"
                                  trigger="hover" >
                        <div v-html="getDetail(item.diZhiGod)"></div>
                        <template #reference>
                          <el-tag size="small" type="success">{{item.diZhiGod}}</el-tag>
                        </template>
                      </el-popover>
                    </div>
                    <div class="row-item row-item-h80">
                      <div class="hideHight">
                        <el-row :gutter="0">
                          <el-col :span="14">
                            <div v-for="(hideItem,hideIndex) in item.diZhi.hideHeavenlyStems" :key="'hide'+hideIndex">
                              <span :style="{ color: hideItem.element.color }">{{ `${hideItem.name}`}}</span>
                              <span class="extend">{{ hideItem.yinYang === 'YANG' ? '阳' : '阴'}}</span>
                            </div>
                          </el-col>
                          <el-col :span="10">
                            <div v-for="(hideGod,hideGodIndex) in item.hideGanGods" :key="'hideGod'+hideGodIndex">
                              <span class="hideGod">{{ hideGod }}</span>
                            </div>
                          </el-col>
                        </el-row>
                      </div>
                    </div>
                    <div class="row-item row-item-h40">{{item.starLuck.name ||''}}</div>
                    <div class="row-item row-item-h40">{{item.selfStarLuck.name}}</div>
                    <div class="row-item row-item-h40">{{item.emptyDie}}</div>
                    <div class="row-item row-item-h40">{{item.naYin.name}}</div>
                    <div class="row-item row-item-h40">
                      <div class="shensha">
                        <el-space wrap>
                          <el-popover v-for="(shenItem,shenIndex) in item.shenShaList" :key="'shen'+shenIndex"
                                      placement="right-start"
                                      :title="shenItem.name"
                                      width="500"
                                      trigger="hover">
                            <div v-html="getDetail(shenItem.name)"></div>
                            <template #reference>
                              <el-tag size="small" type="info">{{shenItem.name}}</el-tag>
                            </template>
                          </el-popover>
                        </el-space>
                      </div>
                    </div>
                  </div>
                  <!-- 大运流年 -->
                  <div class="pillar-column" v-for="(item,index) in yunPillars" :key="'yun'+index">
                    <div class="row-item row-item-h40 row-item-head">{{item.title}}</div>
                    <div class="row-item row-item-h40">{{item.tianGanGod}}</div>
                    <div class="row-item row-item-h40">
                      <div>
                        <span class="ti"
                              :style="{ color: item.tianGan.element.color }">{{ item.tianGan.name}}</span>
                        <span class="extend">{{ item.tianGan.yinYang === 'YANG' ? '阳' : '阴'}}</span>
                      </div>
                    </div>
                    <div class="row-item row-item-h40">
                      <div>
                        <span class="ti"
                              :style="{ color: item.diZhi.element.color }">{{ item.diZhi.name}}</span>
                        <span class="extend">{{ item.diZhi.yinYang === 'YANG' ? '阳' : '阴'}}</span>
                      </div>
                    </div>
                    <div class="row-item row-item-h40">{{item.diZhiGod}}</div>
                    <div class="row-item row-item-h80">
                      <div class="hideHight">
                        <el-row :gutter="0">
                          <el-col :span="14">
                            <div v-for="(hideItem,hideIndex) in item.diZhi.hideHeavenlyStems" :key="'hideYun'+hideIndex">
                              <span :style="{ color: hideItem.element.color }">{{ `${hideItem.name}`}}</span>
                              <span class="extend">{{ hideItem.yinYang === 'YANG' ? '阳' : '阴'}}</span>
                            </div>
                          </el-col>
                          <el-col :span="10">
                            <div v-for="(hideGod,hideGodIndex) in item.hideGanGods" :key="'hideGodYun'+hideGodIndex">
                              <span class="hideGod">{{ hideGod }}</span>
                            </div>
                          </el-col>
                        </el-row>
                      </div>
                    </div>
                    <div class="row-item row-item-h40">{{item.starLuck.name||''}}</div>
                    <div class="row-item row-item-h40">{{item.selfStarLuck.name}}</div>
                    <div class="row-item row-item-h40">{{item.emptyDie}}</div>
                    <div class="row-item row-item-h40">{{item.naYin.name}}</div>
                    <div class="row-item row-item-h40">
                      <div class="shensha">
                        <el-space wrap>
                          <el-popover v-for="(shenItem,shenIndex) in item.shenShaList" :key="'shenYun'+shenIndex"
                                      placement="right-start"
                                      :title="shenItem.name"
                                      width="500"
                                      trigger="hover">
                            <div v-html="getDetail(shenItem.name)"></div>
                            <template #reference>
                              <el-tag size="small" type="info">{{shenItem.name}}</el-tag>
                            </template>
                          </el-popover>
                        </el-space>
                      </div>
                    </div>
                  </div>
                </div>
              </el-card>
            </div>
            <div class="right">
              <el-card class="box-card">
                <template #header>
                  <div class="card-header">
                    <span>大运流年</span>
                  </div>
                </template>
                <div class="yun-info">
                  <div class="yun-row">
                    起运：出生后{{yun.yunYear}}年{{yun.yunMonth}}月{{yun.yunDay}}天{{yun.yunHour}}时起运
                  </div>
                  <div class="yun-row">起运时间：{{yun.startYunDateTime}}</div>

                  <!-- 大运 -->
                  <div class="yun-box">
                    <div class="yun yun-ti row-item-head vertical-text">大运</div>
                    <div class="yun" v-for="(item,index) in yun.luckPillarList" :key="'yunBox'+index"
                         :class="{ 'yun-active': index === yunActiveIndex }" @click="checkYun(index)">
                      <div class="yun-attr">{{item.year}}</div>
                      <div class="yun-attr">{{item.age}}岁</div>
                      <div class="yun-ganzhi">
                        <div class="yun-ti vertical-text">{{item.pillar.ganZhi}}</div>
                        <div class="yun-shensha">{{getShortGod(item.pillar.tianGanGod)+getShortGod(item.pillar.diZhiGod)}}</div>
                      </div>
                    </div>
                  </div>

                  <!-- 流年 -->
                  <div class="yun-box">
                    <div class="yun yun-ti row-item-head vertical-text">流年</div>
                    <div class="yun" v-for="(item,index) in (yun.luckPillarList[yunActiveIndex]?.child || [])" :key="'fleet'+index"
                         :class="{ 'yun-active': index === fleetActiveIndex }" @click="checkFleetYear(index)">
                      <div class="yun-attr">{{item.year}}</div>
                      <div class="yun-attr">{{item.age}}岁</div>
                      <div class="yun-ganzhi">
                        <div class="yun-ti vertical-text">{{item.pillar.ganZhi}}</div>
                        <div class="yun-shensha">{{getShortGod(item.pillar.tianGanGod)+getShortGod(item.pillar.diZhiGod)}}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <el-divider content-position="left">喜用忌凶</el-divider>
                <div class="god-container">
                  <div class="god-section">
                    <h3>身{{lifeTime.score>50?'强':'弱'}}: {{caput.name}}</h3>
                    <div class="god-list">
                      <h4>喜用之神：</h4>
                      <el-space wrap>
                        <el-popover v-for="(item,index) in lifeTime.joyousGods" :key="'joy'+index"
                                    placement="top-start"
                                    :title="item"
                                    width="500"
                                    trigger="hover">
                          <div v-html="getDetail(item)"></div>
                          <template #reference>
                            <el-tag type="success">{{item}}</el-tag>
                          </template>
                        </el-popover>
                      </el-space>
                    </div>
                    <div class="god-list">
                      <h4>忌凶之神：</h4>
                      <el-space wrap>
                        <el-popover v-for="(item,index) in lifeTime.fearGods" :key="'fear'+index"
                                    placement="top-start"
                                    :title="item"
                                    width="500"
                                    trigger="hover">
                          <div v-html="getDetail(item)"></div>
                          <template #reference>
                            <el-tag type="warning">{{item}}</el-tag>
                          </template>
                        </el-popover>
                      </el-space>
                    </div>
                  </div>

                  <el-divider content-position="left">天干地支关系</el-divider>
                  <div class="god-section">
                    <div class="god-list">
                      <h4>天干相关</h4>
                      <el-space wrap>
                        <el-tag v-for="(item,index) in mergeVo.tianGanMergeList" :key="'tian'+index" type="info">
                          {{item}}
                        </el-tag>
                      </el-space>
                    </div>

                    <div class="god-list">
                      <h4>地支相关</h4>
                      <el-space wrap>
                        <el-tag v-for="(item,index) in mergeVo.diZhi6MergeList" :key="'di6'+index" type="info">
                          {{item}}
                        </el-tag>
                        <el-tag v-for="(item,index) in mergeVo.diZhi3HarmList" :key="'di3h'+index" type="danger">
                          {{item}}
                        </el-tag>
                        <el-tag v-for="(item,index) in mergeVo.diZhi3MergeList" :key="'di3m'+index" type="info">
                          {{item}}
                        </el-tag>
                        <el-tag v-for="(item,index) in mergeVo.diZhiHideMergeList" :key="'dihide'+index" type="info">
                          {{item}}
                        </el-tag>
                        <el-tag v-for="(item,index) in mergeVo.diZhi6ConflictList" :key="'di6c'+index" type="danger">
                          {{item}}
                        </el-tag>
                        <el-tag v-for="(item,index) in mergeVo.diZhi6HarmList" :key="'di6h'+index" type="danger">
                          {{item}}
                        </el-tag>
                        <el-tag v-for="(item,index) in mergeVo.diZhi3MeetList" :key="'di3meet'+index" type="info">
                          {{item}}
                        </el-tag>
                      </el-space>
                    </div>
                  </div>
                </div>
              </el-card>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted, reactive, ref} from 'vue';
import Header from "@/components/Header.vue";
import {useRoute, useRouter} from "vue-router";
import {getBaziInfo} from "@/api/module/bazi";

const router = useRouter();
const route = useRoute();

// 请求参数
interface QueryParams {
  dateType: number;
  sex: number;
  dateTime: string;
  username: string;
}

// 数据初始化
const pillarDto = reactive<QueryParams>({
  dateType: 1,
  sex: 1,
  dateTime: '',
  username: ''
});

const ganZhi = ref('');
const showForm = ref(false);
const yun = reactive({
  luckPillarList: [],
  birthday: '',
  yunYear: '',
  yunMonth: '',
  yunDay: '',
  yunHour: '',
  startYunDateTime: ''
});
const fourPillars = ref([]);
const yunPillars = ref([]);
const lifeTime = reactive({
  score: 0,
  joyousGods: [],
  fearGods: []
});
const caput = reactive({
  name: ''
});
const mergeVo = reactive({
  tianGanMergeList: [],
  diZhi6MergeList: [],
  diZhi3HarmList: [],
  diZhi3MergeList: [],
  diZhiHideMergeList: [],
  diZhi6ConflictList: [],
  diZhi6HarmList: [],
  diZhi3MeetList: []
});
const lunarExtendMap = ref({});
const yunActiveIndex = ref(0);
const fleetActiveIndex = ref(0);
const dialogTitle = ref('提交');
const formLabelWidth = ref('100px');

const pickerOptions = {
  disabledDate(time: Date) {
    return time.getTime() > Date.now();
  },
  shortcuts: [{
    text: '今天',
    onClick(picker: any) {
      picker.$emit('pick', new Date());
    }
  }, {
    text: '昨天',
    onClick(picker: any) {
      const date = new Date();
      date.setTime(date.getTime() - 3600 * 1000 * 24);
      picker.$emit('pick', date);
    }
  }, {
    text: '一周前',
    onClick(picker: any) {
      const date = new Date();
      date.setTime(date.getTime() - 3600 * 1000 * 24 * 7);
      picker.$emit('pick', date);
    }
  }]
};

const getPillarInfo = () => {
  getBaziInfo(pillarDto).then(r => {
    if (r.code === 200) {
      const data = r.data.pillarVo;
      lunarExtendMap.value = r.data.lunarExtendMap;
      ganZhi.value = data.ganZhi;
      Object.assign(yun, data.yun);
      Object.assign(lifeTime, data.lifeTime);
      Object.assign(caput, data.caput);
      Object.assign(mergeVo, data.mergeVo);

      fourPillars.value = [
        {...data.yearPillar, "title": "年柱"},
        {...data.monthPillar, "title": "月柱"},
        {...data.dayPillar, "title": "日柱"},
        {...data.hourPillar, "title": "时柱"}
      ];

      if (data.yun?.luckPillarList?.length > 0) {
        yunPillars.value = [
          {...data.yun.luckPillarList[0].pillar, "title": "大运"},
          ...(data.yun.luckPillarList[0].child?.[0] ? [{...data.yun.luckPillarList[0].child[0].pillar, "title": "流年"}] : [])
        ];
      }
    }
  }).catch(error => {
    console.error("请求失败：", error);
    // TODO: 添加错误提示
  });
};

const getShortGod = (god: string) => {
  const godMap: { [key: string]: string } = {
    '偏印': '枭',
    '正印': '印',
    '食神': '食',
    '伤官': '伤',
    '偏财': '财',
    '正财': '才',
    '七杀': '杀',
    '正官': '官',
    '比肩': '比',
    '劫财': '劫'
  };
  return godMap[god] || '';
};

const showFormBox = () => {
  showForm.value = !showForm.value;
};

const submitData = () => {
  showForm.value = false;
  getPillarInfo();
};

const formatDateTime = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const checkYun = (index: number) => {
  if (!yun.luckPillarList?.[index]) return;
  yunActiveIndex.value = index;
  const pillar = yun.luckPillarList[index].pillar;
  yunPillars.value[0] = {...pillar, "title": "大运"};
  checkFleetYear(0);
};

const checkFleetYear = (index: number) => {
  if (!yun.luckPillarList?.[yunActiveIndex.value]?.child?.[index]) return;
  fleetActiveIndex.value = index;
  const pillar = yun.luckPillarList[yunActiveIndex.value].child[index].pillar;
  yunPillars.value[1] = {...pillar, "title": "流年"};
};

const getDetail = (key: string) => {
  if(key==="天罗"||key==="地网"){
    key="天罗地网";
  }
  const entry = lunarExtendMap.value[key];
  if (!entry) {
    return '';
  }
  return replaceNewlinesWithBr(entry.summary || '') + "<br/><br/>" + replaceNewlinesWithBr(entry.description || '');
};

const replaceNewlinesWithBr = (htmlString: string) => {
  return htmlString.replace(/\n/g, '<br/>');
};

onMounted(() => {

  // 提取路由参数并进行类型转换与默认值处理
  const {dateType, sex, dateTime} = route.query;

  pillarDto.dateType = Number(dateType) || 1; // 如果 dateType 无效，默认为 1
  pillarDto.sex = Number(sex) || 1; // 如果 sex 无效，默认为 1
  // 加 as string 是断言这个参数是string类型，因为route.query 返回的值是一个对象，可能是：string、string[]、null ,所以会触发类型检查错误
  pillarDto.dateTime = dateTime as string || '';


  getPillarInfo();
});
</script>

<style scoped lang="scss">
.container {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: #f5f7fa;

  .content {
    max-width: 1500px;
    margin: 0 auto;
    padding: 20px;

    .box {
      width: 100%;

      .form-container {
        margin-bottom: 20px;
        background: #fff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 12px 0 rgba(0,0,0,.1);
      }

      .result-container {
        .ganZhi {
          background: #fff;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 12px 0 rgba(0,0,0,.1);

          h3 {
            margin: 0;
            color: #409EFF;
          }
        }

        .pillar-container {
          display: flex;
          gap: 20px;

          .left, .right {
            flex: 1;
          }

          .box-card {
            border-radius: 8px;
            box-shadow: 0 2px 12px 0 rgba(0,0,0,.1);

            .card-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-weight: bold;
              color: #409EFF;
            }
          }
        }
      }
    }
  }
}

.pillar-container {
  display: flex;
  gap: 20px;

  .left {
    flex: 0 0 1100px;
  }

  .right {
    flex: 1;
    min-width: 300px;
  }
}

.extend {
  font-size: 12px;
  color: #CCC;
}

.hideGod {
  font-size: 13px;
}

.shensha {
  overflow: auto;
}

.hideHight {
  height: 80px;
}

.pillar-box {
  display: flex;
  flex-direction: row;
  gap: 2px;
  background: #f5f7fa;
  padding: 10px;
  border-radius: 8px;
}

.pillar-column {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 4px;
  overflow: hidden;

  &:first-child {
    background: #f5f7fa;
  }

  &:nth-child(6) {
    border-left: 2px solid #ddd;
    margin-left: 5px;
    padding-left: 10px;
  }
}

.row-item {
  width: 100px;
  padding: 8px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  justify-content: center;

  &-head {
    color: #909399;
    font-weight: bold;
    background: #f5f7fa;
  }

  &-h40 {
    min-height: 40px;
  }

  &-h80 {
    min-height: 80px;
  }
}

.vertical-text {
  display: flex;
  justify-content: center;
  align-items: center;
  writing-mode: vertical-rl;
  text-orientation: upright;
}

.yun-box {
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;

  .yun {
    background: #fff;
    border-radius: 4px;
    transition: all 0.3s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 12px 0 rgba(0,0,0,.1);
    }

    &-active {
      background: #ecf5ff;
      border: 1px solid #409EFF;
    }
  }
}

.god-container {
  .god-section {
    margin-bottom: 20px;

    h3 {
      color: #409EFF;
      margin-bottom: 15px;
    }

    .god-list {
      margin-bottom: 15px;

      h4 {
        margin: 10px 0;
        color: #606266;
      }
    }
  }
}

.yun-info {
  .yun-row {
    padding: 10px;
    background: #f5f7fa;
    border-radius: 4px;
    margin-bottom: 10px;
    color: #606266;
  }

  .yun-box {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    padding: 10px;
    background: #f5f7fa;
    border-radius: 4px;
    overflow-x: auto;

    .yun {
      flex: 0 0 80px;
      height: 120px;
      background: #fff;
      border-radius: 4px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      transition: all 0.3s;
      border: 1px solid #ebeef5;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 2px 12px 0 rgba(0,0,0,.1);
      }

      &-active {
        background: #ecf5ff;
        border-color: #409EFF;
      }

      &-attr {
        font-size: 12px;
        color: #909399;
      }

      &-ti {
        font-size: 18px;
        font-weight: bold;
        color: #409EFF;
      }

      &-shensha {
        font-size: 12px;
        color: #f56c6c;
      }
    }
  }
}
</style>
