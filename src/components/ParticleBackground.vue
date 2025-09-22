<template>
  <div class="particles-container">
    <div
        class="particle"
        v-for="(particle, index) in particles"
        :key="index"
        :style="particle.style"
    ></div>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, onUnmounted, computed} from 'vue'

interface ParticleStyle {
  style:{
    left: string
    top: string
    width: string
    height: string
    animationDuration: string
    animationDelay: string
    opacity: string
  }
}

const props = defineProps({
  particleCount: {
    type: Number,
    default: 30 // 减少默认数量，DOM方案不宜太多
  },
  particleSize: {
    type: Number,
    default: 20 // 最大尺寸
  }
})

const particles = ref<ParticleStyle[]>([])

// 生成粒子数据
const generateParticles = () => {
  const newParticles: ParticleStyle[] = []

  for (let i = 0; i < props.particleCount; i++) {
    const size = Math.random() * props.particleSize + 5;
    newParticles.push({
      style:{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        width: `${size}px`,
        height: `${size}px`,
        animationDuration: `${Math.random() * 20 + 20}s`,
        animationDelay: `${Math.random() * 5}s`,
        opacity: `${Math.random() * 0.5 + 0.3}`
      }
    })
  }
  particles.value = newParticles
}

onMounted(() => {
  generateParticles()
})
</script>

<style lang="scss" scoped>
.particles-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  background: linear-gradient(45deg, #8a2be2, #00bfff);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: float 20s linear infinite;
  box-shadow: 0 0 15px 5px rgba(138, 43, 226, 0.5);
}

@keyframes float {
  0% {
    transform: translate(-50%, -50%) translate(0, 0) rotate(0deg);
  }
  25% {
    transform: translate(-50%, -50%) translate(30px, -40px) rotate(90deg);
  }
  50% {
    transform: translate(-50%, -50%) translate(0, -80px) rotate(180deg);
  }
  75% {
    transform: translate(-50%, -50%) translate(-30px, -40px) rotate(270deg);
  }
  100% {
    transform: translate(-50%, -50%) translate(0, 0) rotate(360deg);
  }
}
</style>