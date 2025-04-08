<template>
  <div class="container">
    <!-- 背景光效 -->
    <div class="bg-glow"></div>

    <div class="card">
      <!-- 动态装饰元素 -->
      <div class="deco-line deco-line-1"></div>
      <div class="deco-line deco-line-2"></div>
      <div class="deco-dot"></div>

      <!-- 内容区域 -->
      <div class="content">
        <!-- 科技感Logo -->
        <div class="hex-logo">
          <div class="hex-inner">
            <div class="core"></div>
          </div>
        </div>

        <h1 class="title">
          <span class="gradient-text">AI</span>
          <span>命理引擎</span>
        </h1>
        <p class="subtitle"> 当《渊海子平》邂逅深度学习，千年命理智慧在数字世界焕发新生</p>

        <!-- 输入区域 -->
        <div class="input-group">
          <div class="input-deco"></div>
          <div class="controls">
            <el-radio-group v-model="form.dateType" class="date-type">
              <el-radio-button :label="1" class="control-btn">公历</el-radio-button>
              <el-radio-button :label="2" class="control-btn">农历</el-radio-button>
            </el-radio-group>

            <el-radio-group v-model="form.sex" class="date-type">
              <el-radio-button :label="1" class="control-btn"><Male style="width: 1.4em; height: 1.4em;color: black"/></el-radio-button>
              <el-radio-button :label="0" class="control-btn"><Female style="width: 1.4em; height: 1.4em;color: palevioletred" /></el-radio-button>
            </el-radio-group>

            <!-- 定制化时间选择器 -->
            <div class="time-picker-wrapper">
              <el-date-picker
                  v-model="form.dateTime"
                  type="datetime"
                  placeholder="请选择您的生辰"
                  class="hologram-date-picker"
                  format="YYYY-MM-DD HH:mm:ss"
                  value-format="YYYY-MM-DD HH:mm:ss"
              />
              <div class="picker-glow"></div>
            </div>

            <el-button
                type="primary"
                class="submit-btn"
                @click="submitForm"
                :disabled="!formValid"
            >
              开始解析
              <el-icon>
                <ArrowRight/>
              </el-icon>
            </el-button>
          </div>
        </div>

        <!-- 特性展示 -->
        <div class="features">
          <div v-for="(item, index) in features" :key="index" class="feature">
            <div v-if="item.icon=='taiji'" class="taiji">
              <Taiji :size="60"  primary-color="#fff" secondary-color="#222"
                  :duration="5" />
            </div>
            <div v-else class="feature-icon" :class="item.icon"></div>
            <div class="feature-text">
              <h3>{{ item.title }}</h3>
              <p>{{ item.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, reactive, computed} from 'vue';
import {useRouter} from 'vue-router';
import {ArrowRight,Male,Female} from '@element-plus/icons-vue';

import Taiji from "@/components/Taiji.vue";

const router = useRouter();

interface Form {
  dateType: number,
  sex: number,
  dateTime: Date | null,
}

const form = reactive<Form>({
  dateType: 2,
  sex: 1,
  dateTime: null,
});

const formValid = computed(() => form.dateTime !== null);

const submitForm = () => {
  if (formValid.value) {
    router.push({
      name: 'bazi',
      query: {
        dateType: form.dateType,
        sex: form.sex,
        dateTime: form.dateTime
      }
    });
  }
};

const features = [
  {icon: 'taiji', title: '命理乾坤', desc: '八字精解，千年易学智慧触手可及'},
  {icon: 'quantum', title: '大运流转', desc: '阴阳交汇处，遇见更好的自己'},
  {icon: 'ai', title: '深度学习', desc: '解锁专属命盘解析，洞悉事业、姻缘、财富的天地玄机'}
];
</script>

<style scoped lang="scss">

// 配色方案
$space-black: #0a0e17;
$cyber-blue: #00f3ff;
$neon-purple: #bc13fe;
$hologram-teal: #00ff9d;
$deep-space: #020617;

// 全局样式
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: $deep-space;
  position: relative;
  overflow: hidden;
  font-family: 'Helvetica Neue', sans-serif;
}

// 背景光效
.bg-glow {
  position: fixed;
  width: 200vw;
  height: 200vh;
  background: radial-gradient(
          circle at 50% 50%,
          rgba($cyber-blue, 0.1) 0%,
          rgba($deep-space, 1) 60%
  );
  animation: pulse 8s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.3;
  }
}

// 主卡片
.card {
  position: relative;
  background: rgba($space-black, 0.95);
  border-radius: 20px;
  padding: 4rem;
  width: 100%;
  max-width: 800px;
  border: 1px solid rgba($cyber-blue, 0.2);
  box-shadow: 0 0 50px rgba($cyber-blue, 0.1);
  backdrop-filter: blur(10px);
  overflow: hidden;
}

// 装饰元素
.deco-line {
  position: absolute;
  background: linear-gradient(90deg, transparent, $cyber-blue);
  height: 1px;
  animation: scan 3s linear infinite;

  &-1 {
    top: 20%;
    width: 30%;
  }

  &-2 {
    bottom: 20%;
    width: 25%;
    right: 0;
    transform: rotate(180deg);
  }
}

.deco-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  background: $neon-purple;
  border-radius: 50%;
  top: 15%;
  right: 10%;
  filter: drop-shadow(0 0 5px $neon-purple);
  animation: blink 1.5s ease-in-out infinite;
}

@keyframes scan {
  0% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(100%);
  }
}

@keyframes blink {
  0%, 100% {
    opacity: 0.2;
  }
  50% {
    opacity: 1;
  }
}

// Logo设计
.hex-logo {
  width: 100px;
  height: 115px;
  margin: 0 auto 2rem;
  position: relative;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: linear-gradient(45deg, $cyber-blue, $neon-purple);

  .hex-inner {
    position: absolute;
    inset: 2px;
    background: $space-black;
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);

    .core {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 30%;
      height: 30%;
      background: linear-gradient(45deg, $cyber-blue, $neon-purple);
      transform: translate(-50%, -50%);
      border-radius: 50%;
      animation: core-pulse 2s infinite;
    }
  }
}

@keyframes core-pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
  }
}

// 标题样式
.title {
  color: white;
  font-size: 2.5rem;
  margin-bottom: 1rem;
  text-align: center;

  .gradient-text {
    background: linear-gradient(45deg, $cyber-blue, $hologram-teal);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
}

.subtitle {
  color: rgba(white, 0.8);
  text-align: center;
  margin-bottom: 3rem;
  font-size: 1.1rem;
}

// 输入区域
.input-group {
  position: relative;
  margin: 2rem 0;

  .input-deco {
    position: absolute;
    inset: 0;
    border: 1px solid rgba($cyber-blue, 0.3);
    border-radius: 12px;
    pointer-events: none;
  }
}

.controls {
  display: grid;
  gap: 1.5rem;
  padding: 2rem;
}


// 组件样式覆盖
.date-type {
  width: 100%;

  .control-btn {
    flex: 1;
    height: 45px;
    background: transparent !important;
    color: rgba(white, 0.7) !important;
    border: 1px solid rgba($cyber-blue, 0.3) !important;
    transition: all 0.3s;

    &.is-active {
      background: linear-gradient(45deg, $cyber-blue, $neon-purple) !important;
      color: white !important;
      border: none !important;
    }
  }

  :deep(.el-radio-button__inner ){
    height: 45px;
    vertical-align:middle;
    border-radius: 1px;
    padding: 15px 0px;
    width: 80px;
  }
}



/* 深度定制时间选择器 */
.time-picker-wrapper {
  position: relative;
  width: 100%;

  &:hover .picker-glow {
    opacity: 0.4;
  }
}

:deep(.hologram-date-picker) {
  width: 100%;

  .el-input__wrapper {
    height: 45px;
    padding: 0 1.5rem;
    background: rgba(black, 0.4) !important;
    border: 1px solid rgba($cyber-blue, 0.3) !important;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba($cyber-blue, 0.1);
    transition: all 0.3s;

    &:hover {
      border-color: $cyber-blue !important;
      box-shadow: 0 0 20px rgba($cyber-blue, 0.2);
    }

    .el-input__inner {
      color: white;
      font-size: 1.1rem;
      letter-spacing: 1px;

      &::placeholder {
        color: rgba(white, 0.4);
      }
    }

    .el-input__suffix {
      .el-icon {
        color: $cyber-blue;
        font-size: 1.2rem;
        transition: transform 0.3s;
      }

      &:hover .el-icon {
        transform: scale(1.2);
      }
    }
  }
}

//.picker-glow {
//  position: absolute;
//  top: 50%;
//  left: 0;
//  right: 0;
//  height: 80%;
//  background: linear-gradient(
//          90deg,
//          transparent,
//          rgba($cyber-blue, 0.1),
//          transparent
//  );
//  opacity: 0;
//  transform: translateY(-50%);
//  transition: opacity 0.3s;
//  pointer-events: none;
//}


.neon-input {
  width: 100%;

  :deep(.el-input__wrapper) {
    background: rgba(black, 0.5);
    border: 1px solid rgba($cyber-blue, 0.3);
    color: white;
    transition: all 0.3s;

    &:hover {
      border-color: $cyber-blue;
      box-shadow: 0 0 10px rgba($cyber-blue, 0.2);
    }
  }
}

.submit-btn {
  width: 100%;
  background: linear-gradient(45deg, $cyber-blue, $neon-purple);
  border: none !important;
  color: white !important;
  font-weight: bold;
  padding: 1.2rem;
  border-radius: 8px;
  transition: transform 0.3s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba($cyber-blue, 0.3);
  }
}

// 特性展示
.features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-top: 3rem;
}

.feature {
  padding: 1.5rem;
  background: rgba(black, 0.3);
  border-radius: 12px;
  border: 1px solid rgba($cyber-blue, 0.1);
  transition: all 0.3s;

  &:hover {
    transform: translateY(-5px);
    border-color: $cyber-blue;
  }
}

.taiji{
  width: 60px;
  height: 60px;
  margin: 0 auto 1em;
}

.feature-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 1rem;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba($cyber-blue, 0.1);
    border-radius: 50%;
  }

  &.neural::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 30px;
    height: 30px;
    background: linear-gradient(45deg, transparent 45%, $cyber-blue 50%, transparent 55%),
    linear-gradient(-45deg, transparent 45%, $cyber-blue 50%, transparent 55%);
    transform: translate(-50%, -50%);
  }

  &.quantum::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 30px;
    height: 30px;
    background: radial-gradient(circle at 30% 30%, $cyber-blue 10%, transparent 11%),
    radial-gradient(circle at 70% 70%, $neon-purple 10%, transparent 11%);
    transform: translate(-50%, -50%);
    animation: orbit 4s linear infinite;
  }

  &.ai::after {
    content: 'AI';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: $hologram-teal;
    font-weight: bold;
    font-size: 1.2rem;
  }
}

@keyframes orbit {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

.feature-text {
  color: white;
  text-align: center;

  h3 {
    color: $hologram-teal;
    margin-bottom: 0.5rem;
  }

  p {
    color: rgba(white, 0.7);
    font-size: 0.9rem;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .card {
    padding: 2rem;
    margin: 1rem;
  }

  .features {
    grid-template-columns: 1fr;
  }

  .title {
    font-size: 2rem;
  }
}
</style>
