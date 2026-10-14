<template>
  <!-- ================= 录入表单 ================= -->
  <el-collapse-transition>
    <div v-show="ctx.showForm" class="form-panel">
      <el-form :model="ctx.pillarDto" label-width="76px" label-position="left">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="姓名">
              <el-input v-model="ctx.pillarDto.username" placeholder="选填" clearable/>
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="6" :md="4">
            <el-form-item label="性别">
              <el-radio-group v-model="ctx.pillarDto.sex">
                <el-radio-button :value="1">男</el-radio-button>
                <el-radio-button :value="0">女</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="6" :md="4">
            <el-form-item label="历法">
              <el-radio-group v-model="ctx.pillarDto.dateType">
                <el-radio-button :value="1">新历</el-radio-button>
                <el-radio-button :value="2">农历</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="10">
            <el-form-item label="出生时间">
              <div class="tst-inline">
                <el-date-picker
                    v-model="ctx.pillarDto.dateTime"
                    type="datetime"
                    placeholder="请选择生辰"
                    format="YYYY-MM-DD HH:mm:ss"
                    value-format="YYYY-MM-DD HH:mm:ss"
                    :disabled-date="ctx.disabledFutureDate"
                    style="width: 220px"
                />
                <!-- 校正结果即时回显，让人一眼看到「差了多少」 -->
                <span v-if="ctx.tstActive" class="tst-shift">
                  <span class="arrow">→</span>
                  <span class="val">{{ ctx.tstCorrectedText }}</span>
                  <span class="delta">{{ ctx.tstOffsetText }}</span>
                </span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="出生地">
              <div class="tst-inline">
                <el-select v-model="ctx.region.province" placeholder="省" filterable
                           style="width: 118px" @change="ctx.onProvinceChange">
                  <el-option v-for="p in ctx.region.provinces" :key="p.code"
                             :label="p.name" :value="p.code"/>
                </el-select>
                <el-select v-model="ctx.region.city" placeholder="市" filterable clearable
                           style="width: 118px" :disabled="!ctx.region.cities.length"
                           @change="ctx.onCityChange">
                  <el-option v-for="c in ctx.region.cities" :key="c.code"
                             :label="c.name" :value="c.code"/>
                </el-select>
                <el-select v-model="ctx.region.district" placeholder="区县（选填）" filterable clearable
                           style="width: 130px" :disabled="!ctx.region.districts.length"
                           @change="ctx.onDistrictChange">
                  <el-option v-for="d in ctx.region.districts" :key="d.code"
                             :label="d.name" :value="d.code"/>
                </el-select>
              </div>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12" :md="10">
            <el-form-item label="真太阳时">
              <div class="tst-inline">
                <el-switch v-model="ctx.pillarDto.useTrueSolarTime"/>
                <span v-if="!ctx.pillarDto.useTrueSolarTime" class="tst-hint">按北京时间排盘</span>
                <template v-else>
                  <el-checkbox v-model="ctx.pillarDto.withEquationOfTime" label="含均时差"/>
                  <span class="tst-tag" :class="{ 'is-approx': ctx.tstIsApprox }">{{ ctx.tstSourceText }}</span>
                </template>
              </div>
            </el-form-item>
          </el-col>

          <el-col v-if="ctx.pillarDto.dateType === 2" :xs="24" :sm="12" :md="6">
            <el-form-item label="闰月">
              <el-checkbox v-model="ctx.pillarDto.leapMonth" label="按闰月排"/>
            </el-form-item>
          </el-col>
        </el-row>

        <el-alert
            v-if="ctx.pillarDto.useTrueSolarTime && !ctx.pillarDto.longitude"
            type="warning"
            :closable="false"
            show-icon
            title="尚未选择出生地，无法校正经度差，将退回北京时间排盘"
            style="margin-bottom: 12px"
        />

        <el-form-item label=" ">
          <el-button type="primary" :loading="ctx.loading" @click="ctx.submitData">开始排盘</el-button>
        </el-form-item>
      </el-form>
    </div>
  </el-collapse-transition>
</template>

<script setup lang="ts">
import type {BaziCtx} from '../composables/useBaziCtx';

const props = defineProps<{ctx: BaziCtx}>();
const ctx = props.ctx;
</script>

<style scoped lang="scss">
@use '../styles/tst-tag';

/* ============================ 表单 ============================ */

.form-panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 18px 20px 4px;
  margin-bottom: 16px;

  :deep(.el-form-item) {
    margin-bottom: 14px;
  }
}

.tst-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tst-hint {
  font-size: 12px;
  color: var(--text-faint);
}

.tst-shift {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-faint);
  white-space: nowrap;

  .arrow {
    color: var(--gold);
  }

  .val {
    font-family: var(--mono);
    color: var(--text-dim);
  }

  .delta {
    padding: 0 5px;
    border-radius: 3px;
    background: var(--gold-wash);
    border: 1px solid var(--gold-soft);
    color: var(--gold);
    font-size: 11px;
  }
}
</style>
