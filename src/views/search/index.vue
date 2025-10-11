<template>
  <div class="container">
    <Header></Header>
    <div class="main">

    </div>
  </div>

</template>

<script setup lang="ts">
import {onMounted, reactive, ref, watch} from 'vue';
import Header from "@/components/Header.vue";
import {useRouter, useRoute} from "vue-router";
import gaps from 'gsap';

components:{
  Header
}


onMounted(() => {
  // 得到地址栏q参数

})
</script>

<style scoped lang="scss">
.container {
  width: 100%;
  height: 100%;
  margin: 0px;
  padding: 0px;
}


</style>
