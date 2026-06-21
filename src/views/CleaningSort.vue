<template>
  <div class="cleaning-sort-page">
    <div class="page-header">
      <h2 class="page-title">清洗分拣</h2>
      <p class="page-desc">对清洗后的箱体进行质量检查，合格转入可再用，不合格转维修</p>
    </div>

    <div class="content-row">
      <div class="left-panel">
        <el-card class="pending-card" shadow="never">
          <div class="card-header">
            <h3>待清洗箱体</h3>
            <el-tag type="warning" size="large">
              {{ pendingBoxes.length }} 箱
            </el-tag>
          </div>

          <div class="search-bar">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索箱码..."
              size="default"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>

          <div class="box-list">
            <div
              v-for="box in filteredBoxes"
              :key="box.id"
              class="box-item"
              :class="{ active: selectedBox?.id === box.id }"
              @click="selectBox(box)"
            >
              <div class="box-code">{{ box.code }}</div>
              <div class="box-route">{{ getRouteName(box.routeId) }}</div>
            </div>
            <div v-if="filteredBoxes.length === 0" class="empty-box">
              <el-empty description="暂无待清洗箱体" :image-size="80" />
            </div>
          </div>
        </el-card>
      </div>

      <div class="right-panel">
        <el-card class="check-card" shadow="never">
          <div class="card-header">
            <h3>质量检查</h3>
            <div v-if="selectedBox" class="current-box-info">
              <span class="label">当前箱体:</span>
              <span class="code">{{ selectedBox.code }}</span>
            </div>
          </div>

          <div v-if="!selectedBox" class="no-selection">
            <el-icon class="no-selection-icon"><Box /></el-icon>
            <p>请从左侧选择待检查的箱体</p>
            <p class="tip">或者使用扫码枪直接扫描箱码快速定位</p>
          </div>

          <div v-else class="check-content">
            <div class="box-info-bar">
              <div class="info-item">
                <span class="info-label">箱码</span>
                <span class="info-value code">{{ selectedBox.code }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">线路</span>
                <span class="info-value">{{ getRouteName(selectedBox.routeId) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">状态</span>
                <el-tag type="warning" size="small">待清洗检查</el-tag>
              </div>
            </div>

            <el-divider />

            <div class="check-items-section">
              <h4 class="section-title">
                <el-icon><CircleCheck /></el-icon>
                检查项目
              </h4>
              
              <div class="check-items-grid">
                <div
                  v-for="item in checkItems"
                  :key="item.key"
                  class="check-item-card"
                  :class="{ checked: checkResults[item.key] }"
                  @click="toggleCheck(item.key)"
                >
                  <div class="check-icon">
                    <el-icon v-if="checkResults[item.key]" color="#16a34a">
                      <CircleCheckFilled />
                    </el-icon>
                    <el-icon v-else color="#cbd5e1">
                      <Close />
                    </el-icon>
                  </div>
                  <div class="check-info">
                    <div class="check-name">{{ item.name }}</div>
                    <div class="check-desc">{{ item.desc }}</div>
                  </div>
                </div>
              </div>
            </div>

            <el-divider />

            <div class="scan-input-section">
              <h4 class="section-title">
                <el-icon><Search /></el-icon>
                快速扫码
              </h4>
              <div class="scan-input-row">
                <el-input
                  ref="scanInputRef"
                  v-model="scanInput"
                  placeholder="扫描箱码自动定位并加载"
                  size="large"
                  @keyup.enter="handleScan"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
                <el-button size="large" type="primary" @click="handleScan">
                  定位
                </el-button>
              </div>
            </div>

            <div class="action-buttons">
              <el-button
                size="large"
                type="success"
                :icon="CircleCheckFilled"
                :disabled="!allChecked"
                @click="passInspection"
              >
                检验合格 - 可再用
              </el-button>
              <el-button
                size="large"
                type="danger"
                :icon="Warning"
                :disabled="allChecked"
                @click="failInspection"
              >
                检验不合格 - 转维修
              </el-button>
              <el-button size="large" @click="resetCheck">
                重置
              </el-button>
            </div>

            <div v-if="failReason" class="fail-reason-box">
              <el-alert
                :title="'未通过项: ' + failReason"
                type="error"
                :closable="false"
                show-icon
              />
            </div>
          </div>
        </el-card>

        <el-card class="history-card" shadow="never">
          <div class="card-header">
            <h3>今日清洗记录</h3>
            <el-tag type="success">{{ todayPassed }} 合格</el-tag>
            <el-tag type="danger">{{ todayFailed }} 转修</el-tag>
          </div>

          <div class="history-list">
            <el-table :data="todayRecords" stripe height="180">
              <el-table-column prop="boxCode" label="箱码" width="120" />
              <el-table-column prop="result" label="结果" width="80" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.passed ? 'success' : 'danger'" size="small">
                    {{ row.passed ? '合格' : '转修' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="time" label="时间" width="100" />
            </el-table>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Box,
  CircleCheck,
  CircleCheckFilled,
  Close,
  Warning
} from '@element-plus/icons-vue'
import { useStore } from '../store'

const { state, getPendingCleaningBoxes, processCleaning, getRouteName } = useStore()

const searchKeyword = ref('')
const selectedBox = ref(null)
const scanInput = ref('')
const scanInputRef = ref(null)

const checkItems = [
  { key: 'icePackComplete', name: '冰排齐全', desc: '冰排数量和状态符合要求' },
  { key: 'linerNoOdor', name: '内胆无异味', desc: '内胆清洁，无异味和污渍' },
  { key: 'sealNormal', name: '箱盖密封正常', desc: '密封条完好，密封性良好' },
  { key: 'noDamage', name: '箱体无破损', desc: '外箱无裂缝、凹陷等破损' },
  { key: 'lockNormal', name: '锁扣完好', desc: '锁扣功能正常，锁紧可靠' },
  { key: 'cleanAndDry', name: '清洁干燥', desc: '箱体内外清洁干燥' }
]

const checkResults = reactive({})

function initCheckResults() {
  checkItems.forEach(item => {
    checkResults[item.key] = false
  })
}

initCheckResults()

const pendingBoxes = computed(() => {
  return getPendingCleaningBoxes()
})

const filteredBoxes = computed(() => {
  if (!searchKeyword.value) return pendingBoxes.value
  const keyword = searchKeyword.value.toLowerCase()
  return pendingBoxes.value.filter(b => 
    b.code.toLowerCase().includes(keyword)
  )
})

const allChecked = computed(() => {
  return checkItems.every(item => checkResults[item.key])
})

const failReason = computed(() => {
  if (allChecked.value) return ''
  const failed = checkItems.filter(item => !checkResults[item.key])
  return failed.map(item => item.name).join('、')
})

const todayRecords = computed(() => {
  const today = new Date().toDateString()
  return state.cleaningRecords
    .filter(r => new Date(r.createdAt).toDateString() === today)
    .map(r => ({
      ...r,
      time: new Date(r.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }))
    .slice(0, 20)
})

const todayPassed = computed(() => {
  return todayRecords.value.filter(r => r.passed).length
})

const todayFailed = computed(() => {
  return todayRecords.value.filter(r => !r.passed).length
})

function selectBox(box) {
  selectedBox.value = box
  initCheckResults()
}

function toggleCheck(key) {
  if (!selectedBox.value) return
  checkResults[key] = !checkResults[key]
}

function resetCheck() {
  initCheckResults()
}

function handleScan() {
  const code = scanInput.value.trim()
  if (!code) {
    ElMessage.warning('请输入或扫描箱码')
    return
  }

  const box = pendingBoxes.value.find(b => b.code.toLowerCase() === code.toLowerCase())
  if (box) {
    selectBox(box)
    ElMessage.success(`已定位到箱体 ${code}`)
  } else {
    ElMessage.warning(`未找到待清洗的箱体 ${code}`)
  }

  scanInput.value = ''
  nextTick(() => {
    scanInputRef.value?.focus()
  })
}

function passInspection() {
  if (!selectedBox.value) return
  if (!allChecked.value) {
    ElMessage.warning('请确保所有检查项目都通过')
    return
  }

  ElMessageBox.confirm(
    `确认箱体 ${selectedBox.value.code} 检验合格，转为可再用状态？`,
    '检验合格确认',
    {
      type: 'success',
      confirmButtonText: '确认合格',
      cancelButtonText: '取消'
    }
  ).then(() => {
    processCleaning(selectedBox.value.code, { ...checkResults }, true)
    ElMessage.success(`箱体 ${selectedBox.value.code} 检验合格，已转入可再用`)
    
    const currentIndex = pendingBoxes.value.findIndex(b => b.id === selectedBox.value.id)
    selectedBox.value = null
    initCheckResults()
    
    if (pendingBoxes.value.length > 0) {
      const nextIndex = Math.min(currentIndex, pendingBoxes.value.length - 1)
      if (nextIndex >= 0) {
        nextTick(() => {
          selectBox(pendingBoxes.value[nextIndex])
        })
      }
    }
  }).catch(() => {})
}

function failInspection() {
  if (!selectedBox.value) return
  if (allChecked.value) {
    ElMessage.warning('请勾选未通过的检查项')
    return
  }

  ElMessageBox.confirm(
    `箱体 ${selectedBox.value.code} 未通过项：${failReason.value}\n确认转入维修登记？`,
    '不合格确认',
    {
      type: 'warning',
      confirmButtonText: '确认转修',
      cancelButtonText: '取消'
    }
  ).then(() => {
    processCleaning(selectedBox.value.code, { ...checkResults }, false)
    ElMessage.warning(`箱体 ${selectedBox.value.code} 已转入维修登记`)
    
    const currentIndex = pendingBoxes.value.findIndex(b => b.id === selectedBox.value.id)
    selectedBox.value = null
    initCheckResults()
    
    if (pendingBoxes.value.length > 0) {
      const nextIndex = Math.min(currentIndex, pendingBoxes.value.length - 1)
      if (nextIndex >= 0) {
        nextTick(() => {
          selectBox(pendingBoxes.value[nextIndex])
        })
      }
    }
  }).catch(() => {})
}

watch(
  () => state.boxes,
  () => {
    if (selectedBox.value) {
      const updated = state.boxes.find(b => b.id === selectedBox.value.id)
      if (!updated || updated.status !== 'pending_cleaning') {
        selectedBox.value = null
      }
    }
  },
  { deep: true }
)

onMounted(() => {
  if (pendingBoxes.value.length > 0) {
    selectedBox.value = pendingBoxes.value[0]
  }
  nextTick(() => {
    scanInputRef.value?.focus()
  })
})
</script>

<style scoped>
.cleaning-sort-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.page-header {
  margin-bottom: 4px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.page-desc {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.content-row {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.left-panel {
  display: flex;
  flex-direction: column;
}

.right-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pending-card,
.check-card,
.history-card {
  border-radius: 10px;
  display: flex;
  flex-direction: column;
}

.pending-card {
  flex: 1;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.card-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.current-box-info {
  font-size: 13px;
}

.current-box-info .label {
  color: #64748b;
  margin-right: 4px;
}

.current-box-info .code {
  font-weight: 600;
  color: #1e40af;
}

.search-bar {
  margin-bottom: 12px;
}

.box-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
}

.box-item {
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.box-item:hover {
  background: #f1f5f9;
}

.box-item.active {
  background: #eff6ff;
  border-color: #3b82f6;
}

.box-code {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.box-route {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

.empty-box {
  padding: 40px 0;
  text-align: center;
}

.no-selection {
  text-align: center;
  padding: 60px 20px;
  color: #94a3b8;
}

.no-selection-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.no-selection p {
  margin: 8px 0;
  font-size: 14px;
}

.no-selection .tip {
  font-size: 12px;
  color: #cbd5e1;
}

.check-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.box-info-bar {
  display: flex;
  gap: 24px;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  font-size: 13px;
  color: #64748b;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
}

.info-value.code {
  font-size: 16px;
  color: #1e40af;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #334155;
  margin: 0 0 12px 0;
}

.check-items-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.check-item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.check-item-card:hover {
  background: #f1f5f9;
}

.check-item-card.checked {
  background: #f0fdf4;
  border-color: #22c55e;
}

.check-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.check-info {
  flex: 1;
  min-width: 0;
}

.check-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.check-desc {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.scan-input-section {
  margin-top: 8px;
}

.scan-input-row {
  display: flex;
  gap: 12px;
}

.scan-input-row .el-input {
  flex: 1;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 8px;
}

.fail-reason-box {
  margin-top: 4px;
}

.history-list {
  margin: 0 -8px;
}
</style>
