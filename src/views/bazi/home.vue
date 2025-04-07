<template>
  <div class="container">
    <Header></Header>
    <div class="content">
      <h1>哈哈哈哈哈哈哈哈</h1>
    </div>
  </div>

</template>

<script setup lang="ts">
import {onMounted, reactive} from 'vue';
import Header from "@/components/Header.vue";
import {useRoute, useRouter} from "vue-router";
import {getBaziInfo} from "@/api/module/bazi";
import { Pillar, PillarVo } from "@/types/bazi";

components:{
  Header
}
const router = useRouter();
const route = useRoute();

// 请求参数
interface QueryParams {
  dateType: number;
  sex: number;
  dateTime: string;
}

interface Pillar{
  type: string,
  ganZhi: string,
  tianGan: string,
  diZhi: string,
  tianGanGod: string,
  diZhiGod: string,
  naYin: string,
}

interface PillarVo{
  ganZhi: string,
  yearPillar: Pillar,
  monthPillar: Pillar,
  dayPillar: Pillar,
  hourPillar: Pillar,
}

const data: PillarVo = reactive<PillarVo>({
  ganZhi : "tags",
  yearPillar: {},

});


// 数据初始化
const dto: QueryParams = reactive<QueryParams>({
  dateType: 1,
  sex: 1,
  dateTime: ''
});

const data:


onMounted(() => {
  // 提取路由参数并进行类型转换与默认值处理
  const {dateType, sex, dateTime} = route.query;

  dto.dateType = Number(dateType) || 1; // 如果 dateType 无效，默认为 1
  dto.sex = Number(sex) || 1; // 如果 sex 无效，默认为 1
  // 加 as string 是断言这个参数是string类型，因为route.query 返回的值是一个对象，可能是：string、string[]、null ,所以会触发类型检查错误
  dto.dateTime = dateTime as string || '';

  // 打印路由参数和最终的 dto 对象
  console.log("router.dateType:", dateType);
  console.log("router.sex:", sex);
  console.log("router.dateTime:", dateTime);
  console.log("dto:", dto);
})
</script>

<style scoped lang="scss">
.container {
  width: 100%;
  height: 100%;
  margin: 0px;
  padding: 0px;

  .content{
    max-width: $mainWidth;
    margin: 0px auto;
  }
}

</style>
