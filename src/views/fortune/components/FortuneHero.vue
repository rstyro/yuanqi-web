<template>
        <!-- ==================== 页头 ==================== -->
        <section class="hero">
          <div class="seal">命</div>
          <div class="hero-text">
            <h1>AI 命理推演</h1>
            <p>一句话说出出生时间 —— 命盘先出，六类解读一类一类点亮</p>
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
            <!--
              波 D（P56）的页内入口：当前这条会话一键建单，不用再回列表页找它。
              只加按钮 —— 建单走的是侧栏那本书同一个 ctx.genReport，
              不动 SSE、不动上下文，后端四项指纹因此一个都不抬。
            -->
            <el-tooltip
                v-if="ctx.sessionId"
                :content="ctx.canExport ? '按这一页的盘生成完整报告' : '先完成一轮推演，才有可报告的盘'"
                placement="bottom"
            >
              <el-button
                  plain
                  :icon="DocumentAdd"
                  :disabled="!ctx.canExport"
                  :loading="creating"
                  @click="confirmOpen = true"
              >
                生成详细报告
              </el-button>
            </el-tooltip>

            <!--
              与侧栏那本书同一套确认框（同一个理由：点一下就是几十次真模型批量推理，
              误触成本是实打实的）。文案把「要等多久」写在脸上 ——
              后台是按固定节拍一节一节推进的，首节最多等约一分钟，全份要几十分钟，
              这一段等待是老哥拍板认下的，不是这里漏写。
            -->
            <el-dialog
                v-model="confirmOpen"
                title="生成详细报告"
                width="380px"
                :close-on-click-modal="true"
                append-to-body
            >
              <p class="dlg-tip">将按当前会话已排的盘，生成一份完整报告：</p>
              <p v-if="ctx.currentTitle" class="dlg-name">{{ ctx.currentTitle }}</p>
              <p class="dlg-sub">
                章节多、要调多次模型，后台会跑几十分钟；开头一节的等待不超过约一分钟。
                建单后直接进报告详情页看进度，本页可以关掉。
              </p>
              <template #footer>
                <el-button @click="confirmOpen = false">取消</el-button>
                <el-button type="primary" :loading="creating" @click="startReport">
                  开始生成
                </el-button>
              </template>
            </el-dialog>
          </div>
        </section>
</template>

<script setup lang="ts">
/**
 * 页头：会话标识、状态标签、下载 PDF、进详细报告列表，以及本页的一键建单。
 */
import {computed, ref} from 'vue';
import {useRouter} from 'vue-router';
import {DocumentAdd, Download, Reading} from '@element-plus/icons-vue';
import type {FortuneCtx} from '../composables/useFortuneCtx';

const props = defineProps<{ctx: FortuneCtx}>();
const ctx = props.ctx;
const router = useRouter();

/** 确认框开着与否。刻意不用「reportTarget 非空即开」那套 —— 这里只有当前这一条会话 */
const confirmOpen = ref(false);

/** 建单中：与侧栏按钮共用 ctx.reportCreatingId，两处不会同时转两个圈 */
const creating = computed(() => ctx.reportCreatingId === ctx.sessionId);

function startReport(): void {
  // 先关框再建单：建单成功会 router.push 去报告详情页，
  // 框留着会在离开的一瞬压在新页面上（与 SessionRail.confirmReport 同一笔账）
  confirmOpen.value = false;
  void ctx.genReport({sessionId: ctx.sessionId});
}
</script>

<style scoped lang="scss">
.dlg-tip {
  margin: 0;
  font-size: 14px;
  color: var(--text);
}

.dlg-name {
  margin: 8px 0 0;
  font-size: 15px;
  color: var(--gold);
  word-break: break-all;
}

.dlg-sub {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-faint);
}
</style>

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
