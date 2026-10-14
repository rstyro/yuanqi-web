<template>
      <!--
        历史会话栏（方案 A 的左栏）。

        为什么常驻而不是收进抽屉：这一页的主区是长阅读（命盘 + 四柱 + 多轮问答），
        同时开着两三个盘时，「我现在在哪个会话」必须一眼可见 ——
        一旦变成「点开才知道」的状态，就会点错盘。

        窄屏（<900px）自动收成图标栏；此时点「历史」把它摊成覆盖层，
        而不是继续挤压本来就不够的报告区。
      -->
      <aside class="hist">
        <div class="hist-head">
          <el-tooltip content="开一条新对话" placement="right" :disabled="ctx.showText">
            <button class="hist-new" type="button" :disabled="ctx.busy" @click="ctx.newSession">
              <el-icon><Plus/></el-icon>
              <span v-if="ctx.showText">新对话</span>
            </button>
          </el-tooltip>
        </div>

        <div class="hist-body">
          <p v-if="ctx.histLoading" class="hist-tip">正在读取历史会话…</p>
          <p v-else-if="!ctx.sessions.length" class="hist-tip">还没有历史会话。聊过一次之后，这里会留档。</p>

          <el-tooltip
              v-for="item in ctx.sessions"
              :key="item.sessionId"
              placement="right"
              :content="item.title || item.ganZhi || '未命名会话'"
              :disabled="ctx.showText"
          >
            <div class="hist-item" :class="{'is-active': item.sessionId === ctx.sessionId}">
              <button
                  class="hist-hit"
                  type="button"
                  :disabled="ctx.openingId === item.sessionId"
                  @click="ctx.openHistory(item)"
              >
                <span class="h-dot" :class="'is-' + statusKey(item.status)"></span>
                <span v-if="ctx.showText" class="h-main">
                  <span class="h-gz">{{ item.title || item.ganZhi || '未命名会话' }}</span>
                  <span class="h-sub">
                    <span v-if="item.roundCount > 1">{{ item.roundCount }} 轮</span>
                    <span>{{ shortWhen(item.lastActiveTime) }}</span>
                  </span>
                </span>
              </button>
              <button
                  v-if="ctx.showText"
                  class="h-report"
                  type="button"
                  title="为这条会话生成详细报告"
                  :disabled="ctx.reportCreatingId === item.sessionId"
                  @click.stop="openReport(item)"
              >
                <el-icon><Reading/></el-icon>
              </button>
              <!--
                每条会话的「更多操作」。
                为什么是下拉菜单而不是再排两个图标按钮：侧栏只有 150px，
                三个 22px 图标会把标题区压到放不下八字（「庚午 辛巳 戊子 己未」11 字要断行），
                所以图标数量必须固定在 2 个 —— 报告按钮常显（高频、一键直达），
                重命名与删除收进这个菜单。收进菜单还有个额外好处：菜单项带文字，
                比一个 40% 透明度的小垃圾桶图标好找得多（那正是「找不到删除」的原因）。
              -->
              <el-dropdown
                  v-if="ctx.showText"
                  class="h-more-wrap"
                  trigger="click"
                  placement="bottom-end"
                  @command="(cmd: string) => onCommand(cmd, item)"
              >
                <button class="h-more" type="button" title="更多操作">
                  <el-icon><MoreFilled/></el-icon>
                </button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="rename" :icon="EditPen">重命名</el-dropdown-item>
                    <el-dropdown-item command="delete" :icon="Delete" divided>删除会话</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </el-tooltip>

          <!--
            分页入口放在列表末尾，而不是和「收起侧栏」并排在 .hist-foot：
            它属于「这一列还有更多」，和那个全局动作不是一类。
            图标栏（40px）里隐掉 —— 那一档连标题都放不下，塞个按钮只会更挤。
          -->
          <button
              v-if="ctx.hasMoreSessions && ctx.showText"
              class="hist-more"
              type="button"
              :disabled="ctx.loadingMore"
              @click="ctx.loadMoreSessions"
          >
            <el-icon v-if="ctx.loadingMore" class="is-loading"><Loading/></el-icon>
            <span>{{ ctx.loadingMore ? '正在加载' : '加载更多' }}</span>
            <span class="hm-count">{{ ctx.sessions.length }}/{{ ctx.sessionTotal }}</span>
          </button>
        </div>

        <div class="hist-foot">
          <button class="rail-btn" type="button" @click="ctx.toggleRail">
            <el-icon>
              <ArrowLeft v-if="!ctx.rail"/><ArrowRight v-else/>
            </el-icon>
            <span v-if="ctx.showText">{{ ctx.rail && !ctx.overlayOpen ? '展开' : '收起' }}</span>
          </button>
        </div>

        <!--
          生成详细报告的确认框。这是侧栏里唯一「点一下就起一次真模型批量推理」的动作，
          误触有实打实的成本，所以问得明白一点：哪一条盘、要跑多久、点了会跳走。
        -->
        <el-dialog
            v-model="reportOpen"
            title="生成详细报告"
            width="380px"
            append-to-body
        >
          <p class="del-tip">将按这条会话当时的命盘逐章生成流年与流月报告：</p>
          <p class="del-name">{{ nameOf(reportTarget) }}</p>
          <p class="del-sub">
            章节多、要调多次模型，后台会跑一段时间。建单后直接进报告详情页看进度，本页可以关掉。
          </p>
          <template #footer>
            <el-button @click="reportOpen = false">取消</el-button>
            <el-button type="primary" :loading="ctx.reportCreatingId === reportTarget?.sessionId" @click="confirmReport">
              开始生成
            </el-button>
          </template>
        </el-dialog>

        <!--
          重命名会话。与删除框同一套：输入框、校验提示、页脚按钮都自己排，
          不再用 ElMessageBox.prompt 那种「一句话 + 一个输入框」的默认排版。
        -->
        <el-dialog
            v-model="renameOpen"
            title="重命名会话"
            width="380px"
            append-to-body
        >
          <el-input
              v-model="renameValue"
              maxlength="30"
              show-word-limit
              placeholder="给这条会话起个名字"
              @keydown.enter.prevent="confirmRename"
          />
          <p v-if="renameError" class="dlg-err">{{ renameError }}</p>
          <p class="del-sub">只改列表里显示的名字，八字与已生成的报告都不受影响。</p>
          <template #footer>
            <el-button @click="renameOpen = false">取消</el-button>
            <el-button type="primary" :loading="renaming" @click="confirmRename">保存</el-button>
          </template>
        </el-dialog>

        <!--
          删除会话的确认框。
          用 el-dialog 而不是 ElMessageBox.confirm：后者只能把文案拼成一句话，
          八字名得用「」塞进句子结尾，读着像报错信息；对话框可以把名字单独排一行，
          一眼看清「要删的是哪一条」。侧栏本来就窄，确认这一步不该发生在侧栏里。
        -->
        <el-dialog
            v-model="removeOpen"
            title="删除会话"
            width="380px"
            :close-on-click-modal="true"
            append-to-body
        >
          <p class="del-tip">这条会话将从历史列表里移除：</p>
          <p class="del-name">{{ nameOf(removeTarget) }}</p>
          <p class="del-sub">删除是逻辑删除，已生成的详细报告不受影响。</p>
          <template #footer>
            <el-button @click="removeOpen = false">取消</el-button>
            <el-button type="danger" :loading="removing" @click="confirmRemove">删除</el-button>
          </template>
        </el-dialog>
      </aside>
</template>

<script setup lang="ts">
/**
 * 左栏：历史会话列表、新对话、收起 / 覆盖层。
 */
import {computed, ref} from 'vue';
import {ArrowLeft, ArrowRight, Delete, EditPen, Loading, MoreFilled, Plus, Reading} from '@element-plus/icons-vue';
import type {FortuneSessionVo} from '@/api/module/fortune';
import {shortWhen, statusKey} from '../fortuneFormat';
import type {FortuneCtx} from '../composables/useFortuneCtx';

const props = defineProps<{ctx: FortuneCtx}>();
const ctx = props.ctx;

/** 待删的那条。非空即等于「确认框开着」，所以不再另开一个 visible */
const removeTarget = ref<FortuneSessionVo | null>(null);
const removing = ref(false);

const removeOpen = computed({
  get: () => !!removeTarget.value,
  set: (open) => {
    if (!open) removeTarget.value = null;
  },
});

/** 待改名的那条 + 框里的新名字 */
const renameTarget = ref<FortuneSessionVo | null>(null);
const renameValue = ref('');
const renameError = ref('');
const renaming = ref(false);

const renameOpen = computed({
  get: () => !!renameTarget.value,
  set: (open) => {
    if (!open) renameTarget.value = null;
  },
});

/** 卡片上显示的那个名字，与列表条目同一口径（八字优先，退回自定义名） */
function nameOf(item: FortuneSessionVo | null): string {
  return item ? (item.ganZhi || item.title || '未命名会话') : '';
}

/** 待建单的那条会话（详细报告） */
const reportTarget = ref<FortuneSessionVo | null>(null);

const reportOpen = computed({
  get: () => !!reportTarget.value,
  set: (open) => {
    if (!open) reportTarget.value = null;
  },
});

/**
 * 「更多操作」菜单的派发。
 *
 * <p>两项都要先问一句（改名要输入、删除要确认），而「怎么问」是界面事 ——
 * 所以整个菜单留在组件里自己接，不再往 ctx 转一手。
 */
function onCommand(cmd: string, item: FortuneSessionVo): void {
  if (cmd === 'delete') {
    removeTarget.value = item;
    return;
  }
  if (cmd === 'rename') {
    renameTarget.value = item;
    // 默认填当前显示名（多数时候只是想微调），与列表同一口径
    renameValue.value = item.title || item.ganZhi || '';
    renameError.value = '';
  }
}

async function confirmRename(): Promise<void> {
  const item = renameTarget.value;
  if (!item || renaming.value) return;
  const name = renameValue.value.trim();
  if (!name) {
    // 原先这是 ElMessageBox 的 inputValidator，现在自己写这一条
    renameError.value = '名称不能为空';
    return;
  }
  renaming.value = true;
  try {
    // 改成了（或本来就没改）才关框；接口失败留着，用户能直接重试
    if (await ctx.renameSessionItem(item, name)) renameTarget.value = null;
  } finally {
    renaming.value = false;
  }
}

async function confirmRemove(): Promise<void> {
  const item = removeTarget.value;
  if (!item || removing.value) return;
  removing.value = true;
  try {
    await ctx.removeSession(item);
    removeTarget.value = null;
  } finally {
    removing.value = false;
  }
}

/** 侧栏那本书按钮。已经在建单时不再开第二个框（ctx.genReport 也会挡住重复建单） */
function openReport(item: FortuneSessionVo): void {
  if (ctx.reportCreatingId) return;
  reportTarget.value = item;
}

function confirmReport(): void {
  const item = reportTarget.value;
  if (!item) return;
  // 先关框再建单：建单成功会 router.push 去报告详情页，
  // 框留着会在离开的一瞬压在新页面上
  reportTarget.value = null;
  void ctx.genReport(item);
}
</script>

<style scoped lang="scss">
.hist-head {
  flex: none;
}

.hist-new {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px 6px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--gold);
  font-family: inherit;
  font-size: 13px;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease;

  &:hover:not(:disabled) {
    border-color: var(--gold-soft);
    background: var(--gold-wash);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.hist-body {
  flex: 1;
  // 必须有 min-height: 0，否则 flex 子项不肯收缩，列表会把整个侧栏顶高
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 8px;
  scrollbar-width: thin;
}

.hist-tip {
  margin: 8px 2px;
  font-size: 12px;
  line-height: 1.75;
  color: var(--text-faint);
}

.hist-item {
  position: relative;
  display: flex;
  align-items: stretch;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  transition: background-color 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: var(--panel-2);
  }

  // 当前会话：主色描边 + 淡底。这是「我现在在哪个会话」的全部视觉依据
  &.is-active {
    background: var(--gold-wash);
    border-color: var(--gold-soft);
  }
}

.hist-hit {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 6px;
  border: none;
  background: transparent;
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: progress;
  }
}

.h-dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--green);

  &.is-doing {
    background: var(--el-color-warning);
    // 复用下面「阶段点」的同一个动画，两处含义一致：进行中
    animation: pulse 1.1s ease-in-out infinite;
  }

  &.is-fail {
    background: var(--red);
  }
}

.h-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.h-gz {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--text);
  word-break: break-all;
}

.h-sub {
  display: flex;
  gap: 6px;
  font-size: 11px;
  color: var(--text-faint);
}

/**
 * 「更多操作」触发器的外层（el-dropdown 的根节点）。
 * 它必须自己 flex: none —— 否则会被当成可压缩项，和标题抢宽度。
 */
.h-more-wrap {
  flex: none;
}

/**
 * 「更多操作」按钮（⋯）。常显（低透明度）而不是 hover 才出现 ——
 * 手机上根本没有 hover，藏起来就等于没有这个功能。
 *
 * <p>hover 色刻意<b>不是</b>红：这个按钮点开的是菜单（里面才有删除），
 * 把它自己染红会让人以为「点它就是删」。
 */
.h-more {
  flex: none;
  width: 22px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-faint);
  cursor: pointer;
  opacity: 0.4;
  transition: opacity 0.15s ease, color 0.15s ease;

  &:hover {
    opacity: 1;
    color: var(--text-dim);
  }
}

/* 为这条会话生成详细报告。与 .h-del 同构，只是 hover 用金色（建设性动作，
   不用删除红）；禁用态（正在建单）由 :disabled 兜底，不再显式写样式 */
.h-report {
  flex: none;
  width: 22px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-faint);
  cursor: pointer;
  opacity: 0.4;
  transition: opacity 0.15s ease, color 0.15s ease;

  &:hover {
    opacity: 1;
    color: var(--gold);
  }

  &:disabled {
    opacity: 0.15;
    cursor: default;
  }
}

/* 列表末尾的「加载更多」：虚线描边区别于会话条目，表示它不是又一条历史会话 */
.hist-more {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 4px;
  padding: 7px 6px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-faint);
  font-family: inherit;
  font-size: 12px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;

  &:hover:not(:disabled) {
    border-color: var(--gold-soft);
    color: var(--gold);
  }

  &:disabled {
    cursor: progress;
    opacity: 0.6;
  }
}

.hm-count {
  font-size: 11px;
  color: var(--text-faint);
}

.hist-foot {
  flex: none;
  padding-top: 6px;
  border-top: 1px solid var(--line);
}

.rail-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 7px 4px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-faint);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover {
    background: var(--panel-2);
    color: var(--text-dim);
  }
}

/* ==================== 删除会话确认框 ==================== */

.del-tip {
  margin: 0;
  font-size: 13px;
  color: var(--text-dim);
}

/* 要删的那条单独一行、加大一号 —— 这是这个框存在的理由 */
.del-name {
  margin: 8px 0 0;
  padding: 8px 10px;
  border-left: 3px solid var(--gold-soft);
  border-radius: var(--radius-sm);
  background: var(--panel-2);
  color: var(--text);
  font-size: 14px;
  line-height: 1.6;
  word-break: break-all;
}

.del-sub {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-faint);
}

/* 改名框的校验提示。EP 的 el-form-item 那套错误排版要一整层表单，为一个输入框不值当 */
.dlg-err {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--red);
}
</style>
