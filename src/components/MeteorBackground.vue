<template>
  <!-- 流星 -->
  <div
      class="meteor"
      v-for="(meteor, index) in meteors"
      :key="index"
      :style="meteor.style"
  ></div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted,onUnmounted, PropType } from 'vue'

// 定义流星对象的接口
interface Meteor {
  style: {
    left: string
    top: string
    animationDelay: string
    animationDuration: string
    transform: string
  }
}

// 定义 props
const props = defineProps({
  // 流星数量
  meteorCount: {
    type: Number as PropType<number>,
    default: 2
  }
})

// 使用 ref 创建响应式流星数组
const meteors = ref<Meteor[]>([])
// 定时器引用
const meteorTimer = ref<number | null>(null)

// 生成流星的方法
const generateMeteors = (): void => {
  const newMeteors: Meteor[] = []
  for (let i = 0; i < props.meteorCount; i++) {
    // 随机生成流星的角度
    const angle = 45 - Math.random() * 50
    // 随机生成流星的起始位置
    const startLeft = Math.random() * 10
    // 从屏幕上方开始
    const startTop = -20 - Math.random() * 20

    newMeteors.push({
      style: {
        left: startLeft + '%',
        top: startTop + '%',
        animationDelay: Math.random() * 5 + 's', // 随机延迟
        animationDuration: (Math.random() * 1 + 2) + 's', // 动画时长
        transform: `rotate(${angle}deg)` // 旋转角度
      }
    })
  }
  meteors.value = newMeteors
}

// 更新流星位置的方法
const updateMeteors = (): void => {
  generateMeteors()
}

// 在组件挂载时生成星星
onMounted(() => {
  generateMeteors();

  // 每5秒更新一次流星位置
  meteorTimer.value = window.setInterval(updateMeteors, 10000)
})

// 在组件卸载时清除定时器
onUnmounted(() => {
  if (meteorTimer.value) {
    clearInterval(meteorTimer.value)
  }
})
</script>

<style lang="scss" scoped>

/*流星样式*/
.meteor {
  position: absolute;
  // 流星长度
  width: 80px;
  height: 2px;
  // 流星尾迹渐变效果
  background: linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 1), rgba(255, 255, 255, 0));
  border-radius: 50%;
  animation: meteorFall linear infinite;
  opacity: 0; // 初始不可见
  z-index: 1; // 确保流星在星星上方
  filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.8));
  pointer-events: none;

  /* 添加发光效果 */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0));
    border-radius: 50%;
    animation: meteorShine 6s infinite;
  }
}

@keyframes meteorFall {
  0% {
    opacity: 0;
    transform: translateX(0) translateY(0) rotate(var(--angle, 25deg));
  }

  10% {
    opacity: 1;
  }

  90% {
    opacity: 0.8;
  }

  100% {
    opacity: 0;
    transform: translateX(100vw) translateY(100vh) rotate(var(--angle, 25deg));
  }
}

@keyframes meteorShine {
  0%, 100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}
</style>

