<template>
  <div class="container">
    <Header></Header>
    <div class="main">
      <div class="user-info">
        <el-avatar :size="120" :src="avatar" >
          <img  src="https://cube.elemecdn.com/e/fd/0fc7d20532fdaf769a25683617711png.png" />
        </el-avatar>
        <h1>胖不了小陆</h1>
        <div class="divider">
          <el-divider />
        </div>
        <div class="line">专心赚钱</div>
        <div class="line">你已经是个大人了，专心赚钱就行，不要因为爱情，平添烦恼。</div>
        <div class="divider">
          <el-divider/>
        </div>
        <div class="line">欢迎来到我的介绍页</div>

      </div>
    </div>
  </div>


</template>

<script setup lang="ts">
import {onMounted, reactive, ref, watch} from 'vue';
import Header from "@/components/Header.vue";
import avatar from '@/assets/images/avatar.jpg';

components:{
  Header
}

// 数据初始化
const data = reactive<any>({
  text: "",
  list: [],
  page: {
    pageNum: 1,
    total: 0
  }

});

const getData = () => {

}

onMounted(() => {
  getData();
})
</script>

<style scoped lang="scss">
.container {
  width: 100%;
  height: 100%;

  .main {
    // 「主体」这一层与其它页面同宽（$mainWidth，见 style.scss）；
    // 里面的告示卡仍限 900px —— 只约束主体，不把正文行拉长到不好读。
    max-width: $mainWidth;
    margin: 0 auto;
    display: flex;
    justify-content: center;
    align-items: center;

    .user-info{
      max-width: 900px;
      text-align: center;
      margin-top: 50px;

      .line{
        margin-top: 10px;
      }
      .divider{
        width: 30%;margin: 0px auto;
      }
    }

  }

}

</style>
