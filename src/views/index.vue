<template>
  <div class="container">
    <!-- 星空背景 -->
    <StarsBackground :star-count="200"/>
    <!-- 流星背景 -->
    <MeteorBackground :meteor-count="3"/>

    <!-- 主标题 -->
    <h1 class="main-title">探索命运奥秘</h1>
    <p class="subtitle">通过千年易学智慧，解析八字命理，洞悉事业、姻缘与财富</p>

    <div class="btn-container">
      <el-button class="btn-seek" type="success" plain @click="formDialogVisible = true">开始探索</el-button>
    </div>

    <!-- 特性展示 -->
    <div class="features">
      <div v-for="(item, index) in features" :key="index" class="feature-card feature">
        <div v-if="item.icon=='taiji'" class="taiji">
          <Taiji :size="60" primary-color="#fff" secondary-color="#222"
                 :duration="5"/>
        </div>
        <div v-else class="feature-icon" :class="item.icon"></div>
        <div class="feature-text">
          <h3>{{ item.title }}</h3>
          <p>{{ item.desc }}</p>
        </div>
      </div>
    </div>


    <!-- 模态框 -->
    <el-dialog
        v-model="formDialogVisible"
        title="生辰录入"
        width="500"
        draggable
        center
        align-center
    >

      <el-form :model="form" size="large" label-width="auto" style="max-width: 500px">
        <el-form-item label="性别" >
          <el-radio-group v-model="form.sex">
            <el-radio :value="1">男</el-radio>
            <el-radio :value="0">女</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="日历" >
          <el-radio-group v-model="form.dateType">
            <el-radio :value="1">新历</el-radio>
            <el-radio :value="2">农历</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="您的生日" >
          <el-date-picker
              v-model="form.dateTime"
              type="datetime"
              placeholder="请选择您的生辰"
              class="hologram-date-picker"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="formDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="submitForm" :disabled="!formValid">
            开始探索
          </el-button>
        </div>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import {ref, reactive, computed} from 'vue';
import {useRouter} from 'vue-router';
import StarsBackground from "@/components/StartBackground.vue";
import MeteorBackground from "@/components/MeteorBackground.vue";
import Taiji from "@/components/Taiji.vue";
import {BaziQuery} from "@/api/module/bazi/types";

const router = useRouter();
const formDialogVisible = ref(false);

const form = reactive<BaziQuery>({
  dateType: 2,
  sex: 1,
  dateTime: '',
  username: '',
});

const formValid = computed(() => form.dateTime !== null && form.dateTime!='');

const submitForm = () => {
  if (formValid.value) {
    formDialogVisible.value=false;
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
  {icon: 'taiji', title: '命理乾坤', desc: '八字精解，融合千年易学智慧，深入剖析人生轨迹'},
  {icon: 'quantum', title: '大运流转', desc: '阴阳五行流转，揭示大运起伏，把握命运转折点'},
  {icon: 'ai', title: '智能解析', desc: '解锁专属命盘解析，洞悉事业、姻缘、财富的天地玄机'}
];
</script>

<style scoped lang="scss">

$cyber-blue: #00f3ff;
$neon-purple: #bc13fe;
$hologram-teal: #00ff9d;
$deep-space: #020617;


.container {
  min-height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  background: #0a0e17;
  font-family: 'Helvetica Neue', sans-serif;

  /* 主标题样式 */
  .main-title {
    font-size: 3.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    text-align: center;
    background: linear-gradient(45deg, #6a93cb, #a4bfef, #c2e9fb);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 0 20px rgba(164, 191, 239, 0.5);
  }

  .subtitle {
    font-size: 1.2rem;
    margin-bottom: 3rem;
    color: #a4bfef;
    text-align: center;
    max-width: 600px;
  }

}

/*按钮特效*/
.btn-container {
  text-align: center;
  margin: 2rem 0;
  position: relative;
  z-index: 10;

  // 添加装饰性光点元素
  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 8px;
    height: 8px;
    background: $hologram-teal;
    border-radius: 50%;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0.6;
    animation: float 3s ease-in-out infinite;
  }

  &::before {
    left: -20px;
    animation-delay: 0.5s;
  }

  &::after {
    right: -20px;
    animation-delay: 1s;
  }

  @keyframes float {
    0%, 100% { transform: translateY(-50%) scale(1); }
    50% { transform: translateY(-60%) scale(1.2); }
  }
}

.btn-seek {
  // 基础样式重置与增强
  position: relative;
  background: transparent !important;
  border: 2px solid $hologram-teal !important;
  color: $hologram-teal !important;
  padding: 12px 36px !important;
  font-size: 1.2rem !important;
  font-weight: 600;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.4s ease !important;

  // 霓虹光晕效果
  box-shadow:
      0 0 10px rgba(0, 255, 157, 0.5),
      0 0 20px rgba(0, 255, 157, 0.3),
      inset 0 0 15px rgba(0, 255, 157, 0.1);

  // 流光动画效果
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
            90deg,
            transparent,
            rgba(0, 255, 157, 0.4),
            transparent
    );
    transition: left 0.6s ease;
  }

  // 悬停特效
  &:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow:
        0 0 20px rgba(0, 255, 157, 0.8),
        0 0 40px rgba(0, 255, 157, 0.5),
        0 5px 15px rgba(0, 0, 0, 0.3),
        inset 0 0 20px rgba(0, 255, 157, 0.2);

    &::before {
      left: 100%;
    }

    &::after {
      width: 120%;
      height: 120%;
      opacity: 0;
    }
  }

  // 点击特效
  &:active {
    transform: translateY(1px) scale(0.98);
    transition-duration: 0.1s;
    box-shadow:
        0 0 10px rgba(0, 255, 157, 0.9),
        0 0 20px rgba(0, 255, 157, 0.6),
        inset 0 0 10px rgba(0, 255, 157, 0.3);
  }

  // 脉动吸引动画
  animation: subtle-pulse 3s ease-in-out infinite;
}

@keyframes subtle-pulse {
  0%, 100% {
    box-shadow:
        0 0 10px rgba(0, 255, 157, 0.5),
        0 0 20px rgba(0, 255, 157, 0.3),
        inset 0 0 15px rgba(0, 255, 157, 0.1);
  }
  50% {
    box-shadow:
        0 0 15px rgba(0, 255, 157, 0.7),
        0 0 30px rgba(0, 255, 157, 0.4),
        inset 0 0 20px rgba(0, 255, 157, 0.15);
  }
}


// 特性展示
.features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-top: 3rem;

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

  /*太极组件图片大小*/
  .taiji {
    width: 60px;
    height: 60px;
    margin: 0 auto 1em;
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

}


</style>
