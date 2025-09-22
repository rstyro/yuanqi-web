<template>
  <!-- 动态星空背景 -->
  <div class="star-background">
    <!-- 使用 props 传入的 starCount 参数 -->
    <div
        class="star"
        v-for="(star, index) in stars"
        :key="index"
        :style="star.style"
        :class="star.colorClass"
    ></div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, PropType } from 'vue'

// 定义星星对象的接口
interface Star {
  style: {
    left: string
    top: string
    animationDelay: string
  },
  colorClass: string
}

// 定义 props
const props = defineProps({
  // 定义 starCount 属性，默认值为 50
  starCount: {
    type: Number as PropType<number>,
    default: 50
  }
})

// 使用 ref 创建响应式星星数组
const stars = ref<Star[]>([]);

// 星星颜色样式总和
const colorVariants=9;

// 生成星星的方法
const generateStars = (): void => {
  const newStars: Star[] = []
  for (let i = 0; i < props.starCount; i++) {
    // 随机选择颜色类别
    const colorClass = `color${Math.floor(Math.random() * colorVariants) + 1}`

    newStars.push({
      style: {
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        animationDelay: Math.random() * 2 + 's', // 延长随机范围
      },
      colorClass:colorClass
    })
  }
  stars.value = newStars
}

// 在组件挂载时生成星星
onMounted(() => {
  generateStars();
})

</script>

<style lang="scss" scoped>
.star-background {
  position: fixed;
  width: 100%;
  height: 100%;
  overflow: hidden;
  //background: linear-gradient(-225deg, #231557 0%, #43107a 30%, #ff1361 100%);
  pointer-events: none;

  .star {
    position: absolute;
    width: 3px;
    height: 3px;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    animation: twinkle 2s infinite;
    /* 添加发光效果 */
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);

    /* 添加一些大小变化 */
    &:nth-child(3n) {
      width: 2px;
      height: 2px;
    }
    &:nth-child(5n) {
      width: 5px;
      height: 5px;
    }
  }

  /* 添加一些不同颜色的星星 */
  .color1 { background-color: #ffffff; }
  .color2 { background-color: #ffe066; }
  .color3 { background-color: #6eb6ff; }
  .color4 { background-color: #ff7eee; }
  .color5 { background-color: #ffffff; }
  .color6 { background-color: #ffffff; }
  .color7 { background-color: #ffffff; }
  .color8 { background-color: #ffffff; }
  .color9 { background-color: #ffffff; }
}



@keyframes twinkle {
  0% {
    opacity: 0.2;
    transform: scale(0.8);
  }

  50% {
    opacity: 1;
    transform: scale(1.2);
  }

  100% {
    opacity: 0.2;
    transform: scale(0.8);
  }
}

</style>