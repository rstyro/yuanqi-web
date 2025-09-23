<template>
  <div class="container">
    <!-- 星空背景 -->
    <StarsBackground :star-count="200"/>
    <!-- 流星背景 -->
    <MeteorBackground :meteor-count="3"/>

    <!-- 主标题 -->
    <h1 class="main-title">探索命运奥秘</h1>
    <p class="subtitle">通过千年易学智慧，解析八字命理，洞悉事业、姻缘与财富</p>

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


  </div>
</template>

<script setup lang="ts">
import {ref, reactive, computed} from 'vue';
import {useRouter} from 'vue-router';
import StarsBackground from "@/components/StartBackground.vue";
import MeteorBackground from "@/components/MeteorBackground.vue";
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
