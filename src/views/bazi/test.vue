<template>
  <div class="container">
    <Header></Header>
    <div class="content">

      <div class="pillar-list">
        <el-card class="box-card-header">
          <div v-for="item in items" :key="item" class="item-header">
            <div class="title">{{item}}</div>
          </div>
        </el-card>

        <!-- 四柱 -->
        <el-card class="box-card">
          <div class="title">年柱</div>
        </el-card>
        <el-card class="box-card">
          <div v-for="o in 4" :key="o" class="text item">{{ 'List item ' + o }}</div>
        </el-card>
        <el-card class="box-card">
          <div v-for="o in 4" :key="o" class="text item">{{ 'List item ' + o }}</div>
        </el-card>
        <el-card class="box-card">
          <div v-for="o in 4" :key="o" class="text item">{{ 'List item ' + o }}</div>
        </el-card>


        <el-divider direction="vertical" />
        <!--  大运与流年 -->
        <el-card class="box-card">
          <div v-for="o in 4" :key="o" class="text item">{{ 'List item ' + o }}</div>
        </el-card>
        <el-card class="box-card">
          <div v-for="o in 4" :key="o" class="text item">{{ 'List item ' + o }}</div>
        </el-card>
      </div>

      <div class="yun">
        <el-card class="yun-card">
          <div v-for="o in 4" :key="o" class="text item">{{ 'List item ' + o }}</div>
        </el-card>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Pillar, LuckPillar } from '../../types/pillar'
import Header from "@/components/Header.vue";

const items = ref<Array<string>>([
 '日期',
 '主星',
 '天干',
 '地支',
 '副星',
 '藏干支',
 '星运',
 '自坐',
 '空亡',
 '纳音',
 '神煞'
])


</script>

<style scoped lang="scss">
.container {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: #f5f7fa;

  .content {
    max-width: $mainWidth;
    margin: 0px auto;
    display: flex;
    justify-content: space-between;

    // 八字排盘
    .pillar-list{
      display: flex;

      // 标题
      .box-card-header{
        width: 90px;
        .item-header{
          width: 100%;
          height: 60px;
          border: 1px solid #8ec5fc;
          display: flex;
          text-align: center;
          align-items: center;

          .title{
            font-weight: bold;
            width: 100%;
            height: auto;
          }
        }
      }
      // 四柱
      .box-card{
        width: 100px;

      }
    }

    // 大运流年
    .yun{

      .yun-card{
        width: 400px;
      }

    }

  }
}




</style>