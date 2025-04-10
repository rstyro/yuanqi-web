<template>
  <div class="yun-container">
    <!-- 大运列表 -->
    <div
        v-for="(dayun, index) in data"
        :key="index"
        class="yun-item"
    >
      <div
          class="dayun-item"
          :class="{ 'active': activeIndex === index }"
          @click="toggleXiaoyun(index)"
      >
        <div class="yun-info">
          <span>{{ dayun.year }}年</span>
          <span class="ml-2">{{ dayun.age }}岁</span>
        </div>
        <div class="yun-detail">
          <el-tag size="small">{{ dayun.pillar.ganZhi }}</el-tag>
          <el-tag type="info" size="small" class="ml-1">
            {{ dayun.pillar.tianGanGod }}/{{ dayun.pillar.diZhiGod }}
          </el-tag>
        </div>
      </div>

      <!-- 小运列表 -->
      <transition name="el-zoom-in-top">
        <div
            v-show="activeIndex === index"
            class="xiaoyun-list"
        >
          <div
              v-for="(xiaoyun, xIndex) in dayun.pillar.child"
              :key="xIndex"
              class="xiaoyun-item"
          >
            <div class="yun-info">
              <span>{{ xiaoyun.year }}年</span>
              <span class="ml-2">{{ xiaoyun.age }}岁</span>
            </div>
            <div class="yun-detail">
              <el-tag size="small">{{ xiaoyun.pillar.ganZhi }}</el-tag>
              <el-tag type="info" size="small" class="ml-1">
                {{ xiaoyun.pillar.tianGanGod }}/{{ xiaoyun.pillar.diZhiGod }}
              </el-tag>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Pillar {
  type: number
  ganZhi: string
  tianGan: { name: string }
  diZhi: { name: string }
  tianGanGod: string
  diZhiGod: string
  child: YunItem[]
}

interface YunItem {
  year: number
  age: number
  pillar: Pillar
}

// 示例数据
const data = ref<YunItem[]>([
  {
    year: 2008,
    age: 8,
    pillar: {
      type: -1,
      ganZhi: '乙亥',
      tianGan: { name: '乙' },
      diZhi: { name: '亥' },
      tianGanGod: '正官',
      diZhiGod: '正财',
      child: Array(10).fill(null).map((_, i) => ({
        year: 2008 + i,
        age: 8 + i,
        pillar: {
          type: -1,
          ganZhi: `乙亥${i}`,
          tianGan: { name: '乙' },
          diZhi: { name: '亥' },
          tianGanGod: '正官',
          diZhiGod: '正财',
          child: []
        }
      }))
    }
  },
  // 更多大运数据...
])

const activeIndex = ref<number>(-1)

const toggleXiaoyun = (index: number) => {
  activeIndex.value = activeIndex.value === index ? -1 : index
}
</script>

<style scoped>
.yun-container {
  width: 300px;
  font-size: 12px;
}

.yun-item {
  margin-bottom: 4px;
  cursor: pointer;
}

.dayun-item {
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  transition: all 0.3s;
}

.dayun-item.active {
  background: #ecf5ff;
  border-left: 3px solid #409eff;
}

.xiaoyun-list {
  margin: 8px 0 8px 12px;
  border-left: 2px solid #eee;
}

.xiaoyun-item {
  padding: 6px 8px;
  margin: 4px 0;
  background: #fafafa;
  border-radius: 3px;
}

.yun-info {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  color: #666;
}

.yun-detail {
  display: flex;
  align-items: center;
}

.el-tag {
  height: 22px;
  line-height: 20px;
}
</style>