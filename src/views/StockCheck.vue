<template>
  <div class="stock-check-page">
    <div class="page-header">
      <h2 class="page-title">入库盘点</h2>
      <p class="page-desc">使用扫码枪连续扫描箱码，实时核对本批回库情况</p>
    </div>

    <el-card class="control-card" shadow="never">
      <div class="control-row">
        <div class="control-item">
          <label class="control-label">选择线路</label>
          <el-select
            v-model="selectedRoute"
            placeholder="请选择回库线路"
            style="width: 220px"
            size="large"
            :disabled="!!currentBatch"
            @change="handleRouteChange"
          >
            <el-option
              v-for="route in routes"
              :key="route.id"
              :label="route.name"
              :value="route.id"
            />
          </el-select>
        </div>
        <div class="control-item">
          <label class="control-label">本批应回数量</label>
          <el-input-number
            v-model="expectedCount"
            :min="1"
            :max="500"
            size="large"
            style="width: 150px"
            :disabled="!!currentBatch"
          />
        </div>
        <div class="control-item action-item">
          <el-button
            v-if="!currentBatch"
            type="primary"
            size="large"
            :icon="VideoPlay"
            @click="startBatch"
            :disabled="!selectedRoute"
          >
            开始盘点
          </el-button>
          <el-button
            v-else
            type="success"
            size="large"
            :icon="CircleCheck"
            @click="finishBatch"
          >
            结束盘点
          </el-button>
        </div>
      </div>
    </el-card>

    <div class="stats-row">
      <el-card class="stat-card expected" shadow="never">
        <div class="stat-card-icon">
          <el-icon><List /></el-icon>
        </div>
        <div class="stat-card-content">
          <div class="stat-card-value">{{ currentBatch ? currentBatch.expectedCount : 0 }}</div>
          <div class="stat-card-label">本批应回</div>
        </div>
      </el-card>

      <el-card class="stat-card scanned" shadow="never">
        <div class="stat-card-icon">
          <el-icon><Check /></el-icon>
        </div>
        <div class="stat-card-content">
          <div class="stat-card-value">{{ scannedCount }}</div>
          <div class="stat-card-label">已回</div>
        </div>
      </el-card>

      <el-card class="stat-card missing" shadow="never">
        <div class="stat-card-icon">
          <el-icon><Warning /></el-icon>
        </div>
        <div class="stat-card-content">
          <div class="stat-card-value">{{ missingCount }}</div>
          <div class="stat-card-label">缺失</div>
        </div>
      </el-card>

      <el-card class="stat-card extra" shadow="never">
        <div class="stat-card-icon">
          <el-icon><Plus /></el-icon>
        </div>
        <div class="stat-card-content">
          <div class="stat-card-value">{{ extraCount }}</div>
          <div class="stat-card-label">多出</div>
        </div>
      </el-card>
    </div>

    <el-card class="scan-card" shadow="never">
      <div class="scan-header">
        <h3>扫码录入</h3>
        <span v-if="currentBatch" class="scan-status active">
          <span class="status-dot"></span>
          盘点进行中
        </span>
        <span v-else class="scan-status idle">
          <span class="status-dot"></span>
          未开始
        </span>
      </div>

      <div class="scan-input-area">
        <el-input
          ref="scanInputRef"
          v-model="scanInput"
          placeholder="请扫描箱码或手动输入后按回车"
          size="large"
          clearable
          :disabled="!currentBatch"
          @keyup.enter="handleScan"
          class="scan-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button
          type="primary"
          size="large"
          :disabled="!currentBatch || !scanInput"
          @click="handleScan"
        >
          确认扫描
        </el-button>
      </div>

      <el-alert
        v-if="lastScanResult"
        :title="scanResultTitle"
        :type="scanResultType"
        :closable="false"
        class="scan-result-alert"
        show-icon
      >
        <template #default>
          <span>箱码: <strong>{{ lastScanResult.boxCode }}</strong></span>
        </template>
      </el-alert>
    </el-card>

    <el-card class="records-card" shadow="never">
      <div class="records-header">
        <h3>扫描记录</h3>
        <div class="records-tabs">
          <el-radio-group v-model="activeTab" size="small">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="normal">正常</el-radio-button>
            <el-radio-button label="wrong">错线路</el-radio-button>
            <el-radio-button label="extra">多出</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <div class="records-table-wrapper">
        <el-table :data="filteredRecords" stripe height="320">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="boxCode" label="箱码" width="160" />
          <el-table-column prop="type" label="类型" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getTagType(row.type)" size="small">
                {{ getTypeLabel(row.type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="route" label="所属线路" />
          <el-table-column prop="time" label="扫描时间" width="180" />
        </el-table>
      </div>
    </el-card>

    <el-dialog
      v-model="wrongRouteDialogVisible"
      title="错线路提醒"
      width="480px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      class="wrong-route-dialog"
    >
      <div class="wrong-route-content">
        <el-icon class="warning-icon"><WarningFilled /></el-icon>
        <div class="warning-text">
          <h3>检测到错线路箱体！</h3>
          <p>
            箱码 <strong class="box-code-text">{{ wrongRouteBoxCode }}</strong> 
            不属于当前盘点线路
          </p>
          <p class="tip">请将此箱体放入 <strong>"待核对区"</strong> 单独处理</p>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="wrongRouteDialogVisible = false">
          我知道了
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  VideoPlay,
  CircleCheck,
  List,
  Check,
  Warning,
  Plus,
  Search,
  WarningFilled
} from '@element-plus/icons-vue'
import { useStore } from '../store'

const { state, createStockBatch, getActiveStockBatch, scanBoxForStock, finishStockBatch, getRouteName } = useStore()

const routes = computed(() => state.routes)
const selectedRoute = ref('')
const expectedCount = ref(20)
const currentBatch = ref(null)
const scanInput = ref('')
const scanInputRef = ref(null)
const lastScanResult = ref(null)
const activeTab = ref('all')

const wrongRouteDialogVisible = ref(false)
const wrongRouteBoxCode = ref('')

const scannedCount = computed(() => {
  if (!currentBatch.value) return 0
  return currentBatch.value.scannedCodes.length
})

const missingCount = computed(() => {
  if (!currentBatch.value) return 0
  const diff = currentBatch.value.expectedCount - scannedCount.value
  return diff > 0 ? diff : 0
})

const extraCount = computed(() => {
  if (!currentBatch.value) return 0
  return currentBatch.value.extraBoxes.length
})

const scanResultType = computed(() => {
  if (!lastScanResult.value) return 'info'
  if (lastScanResult.value.isWrongRoute) return 'error'
  if (lastScanResult.value.isDuplicate) return 'warning'
  if (lastScanResult.value.isExtra) return 'warning'
  if (lastScanResult.value.isNew) return 'success'
  return 'success'
})

const scanResultTitle = computed(() => {
  if (!lastScanResult.value) return ''
  if (lastScanResult.value.isWrongRoute) return '错线路 - 请放入待核对区'
  if (lastScanResult.value.isDuplicate) return '重复扫描'
  if (lastScanResult.value.isExtra) return '多出箱体'
  if (lastScanResult.value.isNew) return '新箱体入库'
  return '扫描成功'
})

const allRecords = computed(() => {
  if (!currentBatch.value) return []
  const records = []
  
  currentBatch.value.scannedCodes.forEach((code, index) => {
    const box = state.boxes.find(b => b.code === code)
    const isExtra = currentBatch.value.extraBoxes.includes(code)
    const isWrong = currentBatch.value.wrongRouteBoxes.includes(code)
    
    let type = 'normal'
    if (isWrong) type = 'wrong'
    else if (isExtra) type = 'extra'
    
    records.push({
      index: index + 1,
      boxCode: code,
      type,
      route: box ? getRouteName(box.routeId) : getRouteName(currentBatch.value.routeId),
      time: new Date().toLocaleString('zh-CN')
    })
  })
  
  return records.reverse()
})

const filteredRecords = computed(() => {
  if (activeTab.value === 'all') return allRecords.value
  if (activeTab.value === 'normal') {
    return allRecords.value.filter(r => r.type === 'normal')
  }
  if (activeTab.value === 'wrong') {
    return allRecords.value.filter(r => r.type === 'wrong')
  }
  if (activeTab.value === 'extra') {
    return allRecords.value.filter(r => r.type === 'extra')
  }
  return allRecords.value
})

function handleRouteChange() {
  const active = getActiveStockBatch(selectedRoute.value)
  if (active) {
    currentBatch.value = active
  } else {
    currentBatch.value = null
  }
}

function startBatch() {
  if (!selectedRoute.value) {
    ElMessage.warning('请先选择线路')
    return
  }
  
  const existing = getActiveStockBatch(selectedRoute.value)
  if (existing) {
    currentBatch.value = existing
    ElMessage.info('该线路已有进行中的盘点，已恢复')
  } else {
    currentBatch.value = createStockBatch({
      routeId: selectedRoute.value,
      expectedCount: expectedCount.value
    })
    ElMessage.success('盘点已开始，请扫描箱码')
  }
  
  nextTick(() => {
    scanInputRef.value?.focus()
  })
}

function handleScan() {
  if (!currentBatch.value) {
    ElMessage.warning('请先开始盘点')
    return
  }
  
  const code = scanInput.value.trim()
  if (!code) {
    ElMessage.warning('请输入或扫描箱码')
    return
  }
  
  const result = scanBoxForStock(currentBatch.value.id, code)
  lastScanResult.value = { boxCode: code, ...result }
  
  if (result.isWrongRoute) {
    wrongRouteBoxCode.value = code
    wrongRouteDialogVisible.value = true
    playErrorSound()
  } else if (result.isDuplicate) {
    ElMessage.warning(`箱码 ${code} 已扫描过`)
  }
  
  scanInput.value = ''
  nextTick(() => {
    scanInputRef.value?.focus()
  })
}

function finishBatch() {
  if (!currentBatch.value) return
  
  finishStockBatch(currentBatch.value.id)
  
  const summary = `盘点完成！应回 ${currentBatch.value.expectedCount} 箱，实回 ${scannedCount.value} 箱，缺失 ${missingCount.value} 箱，多出 ${extraCount.value} 箱`
  
  ElMessage.success({
    message: summary,
    duration: 5000
  })
  
  currentBatch.value = null
  lastScanResult.value = null
}

function getTagType(type) {
  const map = {
    normal: 'success',
    wrong: 'danger',
    extra: 'warning'
  }
  return map[type] || 'info'
}

function getTypeLabel(type) {
  const map = {
    normal: '正常',
    wrong: '错线路',
    extra: '多出'
  }
  return map[type] || '未知'
}

function playErrorSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 440
    oscillator.type = 'sine'
    gainNode.gain.value = 0.3
    
    oscillator.start()
    setTimeout(() => {
      oscillator.stop()
      audioContext.close()
    }, 300)
  } catch (e) {}
}

watch(
  () => state.stockBatches,
  () => {
    if (currentBatch.value) {
      const updated = state.stockBatches.find(b => b.id === currentBatch.value.id)
      if (updated) {
        currentBatch.value = updated
      }
    }
  },
  { deep: true }
)

onMounted(() => {
  if (state.routes.length > 0) {
    selectedRoute.value = state.routes[0].id
    handleRouteChange()
  }
  
  nextTick(() => {
    scanInputRef.value?.focus()
  })
})
</script>

<style scoped>
.stock-check-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.control-card {
  border-radius: 10px;
}

.control-row {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  flex-wrap: wrap;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-label {
  font-size: 14px;
  font-weight: 500;
  color: #475569;
}

.action-item {
  margin-left: auto;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px;
}

.stat-card-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.stat-card.expected .stat-card-icon {
  background: #dbeafe;
  color: #2563eb;
}

.stat-card.scanned .stat-card-icon {
  background: #dcfce7;
  color: #16a34a;
}

.stat-card.missing .stat-card-icon {
  background: #fee2e2;
  color: #dc2626;
}

.stat-card.extra .stat-card-icon {
  background: #fef3c7;
  color: #d97706;
}

.stat-card-content {
  flex: 1;
}

.stat-card-value {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
}

.stat-card-label {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
}

.scan-card {
  border-radius: 10px;
}

.scan-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.scan-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.scan-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 20px;
}

.scan-status.active {
  background: #dcfce7;
  color: #16a34a;
}

.scan-status.idle {
  background: #f1f5f9;
  color: #64748b;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.scan-input-area {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.scan-input {
  flex: 1;
}

.scan-result-alert {
  margin-top: 0;
}

.records-card {
  border-radius: 10px;
}

.records-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.records-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.records-table-wrapper {
  margin: 0 -8px;
}

.wrong-route-dialog :deep(.el-dialog__header) {
  background: #fef2f2;
  border-radius: 6px 6px 0 0;
}

.wrong-route-content {
  display: flex;
  gap: 16px;
  padding: 12px 0;
}

.warning-icon {
  font-size: 48px;
  color: #f59e0b;
  flex-shrink: 0;
}

.warning-text h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #991b1b;
}

.warning-text p {
  margin: 8px 0;
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
}

.box-code-text {
  color: #dc2626;
  font-size: 16px;
}

.tip {
  background: #fef9c3;
  padding: 8px 12px;
  border-radius: 6px;
  margin-top: 12px !important;
}
</style>
