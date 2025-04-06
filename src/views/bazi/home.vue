<template>
  <div class="container">
    <!-- 头部背景保持不变 -->
    <div class="cosmic-bg">
      <div class="star-field"></div>
      <div class="taiji-rotate">
        <div class="taiji"></div>
      </div>
    </div>

    <!-- 主要内容 -->
    <main class="content">
      <div class="input-section">
        <h1 class="title">八字命理分析系统</h1>
        <div class="datetime-picker">
          <el-date-picker
              v-model="birthDate"
              type="datetime"
              placeholder="选择出生日期时间"
              value-format="YYYY-MM-DD HH:mm:ss"
          />
          <el-button type="primary" @click="analyze" class="analyze-btn">
            <el-icon><MagicStick /></el-icon>
            立即解析
          </el-button>
        </div>
      </div>

      <!-- 分析结果 -->
      <transition name="fade-slide">
        <div v-if="showResult" class="result-container">
          <!-- 八字排盘 -->
          <div class="bazi-card">
            <h2 class="card-title">
              <el-icon><DataAnalysis /></el-icon>
              八字排盘
            </h2>
            <div class="bazi-grid">
              <div v-for="(pillar, index) in baziData" :key="index" class="pillar">
                <div class="heavenly-stem">{{ pillar.stem }}</div>
                <div class="earthly-branch">{{ pillar.branch }}</div>
              </div>
            </div>
          </div>

          <!-- 五行分布（修改后的版本） -->
          <div class="wuxing-section">
            <h2 class="card-title">
              <el-icon><PieChart /></el-icon>
              五行能量
            </h2>
            <div class="wuxing-bars">
              <div
                  v-for="item in wuxingData"
                  :key="item.name"
                  class="wuxing-item"
                  :style="{ '--percentage': item.percentage + '%', '--color': item.color }"
              >
                <div class="wuxing-label">{{ item.name }}</div>
                <div class="wuxing-progress">
                  <div class="wuxing-fill"></div>
                  <span class="wuxing-value">{{ item.percentage }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MagicStick, DataAnalysis, PieChart } from '@element-plus/icons-vue'

interface BaziPillar {
  stem: string
  branch: string
}

interface WuxingItem {
  name: string
  percentage: number
  color: string
}

const birthDate = ref('')
const showResult = ref(false)
const baziData = ref<BaziPillar[]>([])
const wuxingData = ref<WuxingItem[]>([
  { name: '金', percentage: 25, color: '#ffd700' },
  { name: '木', percentage: 30, color: '#00ff00' },
  { name: '水', percentage: 15, color: '#0099ff' },
  { name: '火', percentage: 20, color: '#ff3300' },
  { name: '土', percentage: 10, color: '#996633' }
])

const initData = () => {
  baziData.value = [
    { stem: '癸', branch: '卯' },
    { stem: '甲', branch: '寅' },
    { stem: '戊', branch: '辰' },
    { stem: '辛', branch: '酉' }
  ]
}

const analyze = () => {
  showResult.value = true
  initData()
}
</script>

<style scoped lang="scss">
/* 原有样式保持不变，新增以下样式 */

.wuxing-section {
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 2rem;
  border: 1px solid rgba(255,215,0,0.3);

  .wuxing-bars {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    margin-top: 1.5rem;
  }
}

.wuxing-item {
  display: flex;
  align-items: center;
  gap: 1rem;

  .wuxing-label {
    width: 40px;
    font-weight: bold;
    text-shadow: 0 0 5px currentColor;
  }

  .wuxing-progress {
    flex: 1;
    height: 30px;
    background: rgba(0,0,0,0.3);
    border-radius: 15px;
    position: relative;
    overflow: hidden;
  }

  .wuxing-fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: var(--percentage);
    background: linear-gradient(
            90deg,
            var(--color) 0%,
            rgba(var(--color), 0.7) 100%
    );
    transition: width 1s ease-out;
    border-radius: 15px;
  }

  .wuxing-value {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-weight: bold;
    color: white;
    mix-blend-mode: difference;
  }
}
</style>
