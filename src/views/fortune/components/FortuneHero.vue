<template>
        <!-- ==================== 页头 ==================== -->
        <section class="hero">
          <div class="seal">命</div>
          <div class="hero-text">
            <h1>AI 命理推演</h1>
            <p>一句话说出出生时间 —— 命盘先出，四柱次之，解读流式补齐</p>
            <!-- 左栏负责「列表里哪条是高亮」，这里补一句「它叫什么」，两处一起才够定位 -->
            <p v-if="ctx.currentTitle" class="hero-current">当前会话 · {{ ctx.currentTitle }}</p>
          </div>
          <div class="hero-actions">
            <el-tooltip v-if="ctx.sessionId" :content="ctx.sessionId" placement="bottom">
              <el-tag type="info" effect="plain" round>会话 {{ ctx.sessionId.slice(0, 8) }}</el-tag>
            </el-tooltip>
            <el-tag :type="ctx.busy ? 'warning' : 'success'" effect="plain" round>
              {{ ctx.busy ? '推演中' : '空闲' }}
            </el-tag>
            <el-tooltip
                v-if="ctx.chartVersionStale"
                content="这份报告是按旧版排盘口径生成的。历史即历史 —— 命盘不会随引擎升级而改变"
                placement="bottom"
            >
              <el-tag type="warning" effect="plain" round>旧口径</el-tag>
            </el-tooltip>
            <el-button
                plain
                :icon="Download"
                :disabled="!ctx.canExport"
                :loading="ctx.pdfDownloading"
                @click="ctx.downloadPdf"
            >
              下载 PDF
            </el-button>
            <el-tooltip content="流年 × 流月的完整报告，后台逐章生成" placement="bottom">
              <el-button plain :icon="Reading" @click="router.push({name: 'report-list'})">
                详细报告
              </el-button>
            </el-tooltip>
          </div>
        </section>
</template>

<script setup lang="ts">
/**
 * 页头：会话标识、状态标签、下载 PDF 与进详细报告。
 */
import {useRouter} from 'vue-router';
import {Download, Reading} from '@element-plus/icons-vue';
import type {FortuneCtx} from '../composables/useFortuneCtx';

const props = defineProps<{ctx: FortuneCtx}>();
const ctx = props.ctx;
const router = useRouter();
</script>

<style scoped lang="scss">
/* ==================== 页头 ==================== */

.hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 4px 0 26px;

  .seal {
    flex: none;
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: linear-gradient(160deg, var(--gold-2), var(--gold));
    color: #fff;
    font-size: 26px;
    font-weight: 600;
    letter-spacing: 0;
    box-shadow: var(--shadow-sm);
    user-select: none;
  }

  .hero-text {
    flex: 1;
    min-width: 0;

    h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: var(--text);
    }

    p {
      margin: 4px 0 0;
      font-size: 13px;
      color: var(--text-faint);
    }

    /* 当前会话名。压在副标题下面一行，颜色提亮一档，和上面那句说明区分开 */
    .hero-current {
      color: var(--gold);
      word-break: break-all;
    }
  }

  .hero-actions {
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}

@media (max-width: 720px) {
  .hero {
    flex-wrap: wrap;

    .hero-text h1 {
      font-size: 21px;
    }

    .hero-actions {
      width: 100%;
    }
  }
}
</style>
