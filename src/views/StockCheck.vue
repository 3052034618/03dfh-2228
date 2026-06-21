<template>
  <div class="stock-check-page">
    <div class="page-header">
      <h2 class="page-title">入库盘点</h2>
      <p class="page-desc">录入本批应回箱码清单，扫码后实时核对已回、缺失、多出和错线路箱</p>
    </div>

    <el-card v-if="!currentBatch" class="setup-card" shadow="never">
      <div class="setup-header">
        <h3>盘点准备</h3>
      </div>
      <div class="setup-body">
        <div class="setup-row">
          <div class="setup-item">
            <label class="control-label">选择线路</label>
            <el-select
              v-model="selectedRoute"
              placeholder="请选择回库线路"
              style="width: 240px"
              size="large"
            >
              <el-option
                v-for="route in routes"
                :key="route.id"
                :label="route.name"
                :value="route.id"
              />
            </el-select>
          </div>
        </div>

        <div class="setup-row">
          <div class="setup-item full-width">
            <div class="code-input-header">
              <label class="control-label">本批应回箱码清单</label>
              <div class="code-input-actions">
                <el-button size="small" @click="showImportDialog = true">
                  导入文件
                </el-button>
                <el-button size="small" @click="fillDemoCodes">
                  填入示例
                </el-button>
                <el-button size="small" type="danger" @click="expectedCodesText = ''">
                  清空
                </el-button>
              </div>
            </div>
            <el-input
              v-model="expectedCodesText"
              type="textarea"
              :rows="6"
              placeholder="每行一个箱码，例如：&#10;BOX0001&#10;BOX0002&#10;BOX0003&#10;也可点击「导入文件」从 txt/csv 导入"
              resize="vertical"
            />
            <div class="code-count-hint">
              已录入 <strong>{{ parsedExpectedCodes.length }}</strong> 个箱码
              <span v-if="parsedExpectedCodes.length !== new Set(parsedExpectedCodes).size" class="dup-warn">
                （含重复，将自动去重）
              </span>
            </div>
          </div>
        </div>

        <div class="setup-footer">
          <el-button
            type="primary"
            size="large"
            :icon="VideoPlay"
            @click="startBatch"
            :disabled="!selectedRoute || parsedExpectedCodes.length === 0"
          >
            开始盘点（{{ parsedExpectedCodes.length }} 箱）
          </el-button>
        </div>
      </div>
    </el-card>

    <div v-if="currentBatch" class="active-batch-area">
      <div class="stats-row">
        <el-card class="stat-card expected" shadow="never">
          <div class="stat-card-icon">
            <el-icon><List /></el-icon>
          </div>
          <div class="stat-card-content">
            <div class="stat-card-value">{{ currentBatch.expectedCodes.length }}</div>
            <div class="stat-card-label">本批应回</div>
          </div>
        </el-card>

        <el-card class="stat-card scanned" shadow="never">
          <div class="stat-card-icon">
            <el-icon><Check /></el-icon>
          </div>
          <div class="stat-card-content">
            <div class="stat-card-value">{{ returnedCount }}</div>
            <div class="stat-card-label">已回</div>
          </div>
        </el-card>

        <el-card class="stat-card missing" shadow="never">
          <div class="stat-card-icon">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="stat-card-content">
            <div class="stat-card-value">{{ missingCodes.length }}</div>
            <div class="stat-card-label">缺失</div>
          </div>
        </el-card>

        <el-card class="stat-card extra" shadow="never">
          <div class="stat-card-icon">
            <el-icon><Plus /></el-icon>
          </div>
          <div class="stat-card-content">
            <div class="stat-card-value">{{ currentBatch.extraBoxes.length }}</div>
            <div class="stat-card-label">多出</div>
          </div>
        </el-card>

        <el-card class="stat-card wrong" shadow="never">
          <div class="stat-card-icon">
            <el-icon><WarningFilled /></el-icon>
          </div>
          <div class="stat-card-content">
            <div class="stat-card-value">{{ currentBatch.wrongRouteBoxes.length }}</div>
            <div class="stat-card-label">错线路</div>
          </div>
        </el-card>
      </div>

      <el-card class="scan-card" shadow="never">
        <div class="scan-header">
          <h3>扫码录入</h3>
          <span class="scan-status active">
            <span class="status-dot"></span>
            盘点进行中 · {{ getRouteName(currentBatch.routeId) }}
          </span>
        </div>

        <div class="scan-input-area">
          <el-input
            ref="scanInputRef"
            v-model="scanInput"
            placeholder="请扫描箱码或手动输入后按回车"
            size="large"
            clearable
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
            :disabled="!scanInput"
            @click="handleScan"
          >
            确认扫描
          </el-button>
        </div>

        <el-alert
          v-if="lastScanResult"
          :title="scanResultTitle"
          :type="scanResultType"
          :closable="true"
          class="scan-result-alert"
          show-icon
          @close="lastScanResult = null"
        >
          <template #default>
            <span>箱码: <strong>{{ lastScanResult.boxCode }}</strong></span>
            <span v-if="lastScanResult.wrongRouteInfo" style="margin-left: 12px;">
              原线路: <strong>{{ lastScanResult.wrongRouteInfo.originalRouteName }}</strong>
            </span>
          </template>
        </el-alert>
      </el-card>

      <div class="detail-row">
        <el-card class="detail-card" shadow="never">
          <div class="detail-header">
            <h3>扫码记录</h3>
            <div class="detail-tabs">
              <el-radio-group v-model="activeTab" size="small">
                <el-radio-button value="all">全部({{ allRecords.length }})</el-radio-button>
                <el-radio-button value="normal">正常({{ normalRecords.length }})</el-radio-button>
                <el-radio-button value="wrong">错线路({{ currentBatch.wrongRouteBoxes.length }})</el-radio-button>
                <el-radio-button value="extra">多出({{ currentBatch.extraBoxes.length }})</el-radio-button>
                <el-radio-button value="missing">缺失({{ missingCodes.length }})</el-radio-button>
              </el-radio-group>
            </div>
          </div>

          <div class="detail-table-wrapper">
            <el-table v-if="activeTab !== 'missing'" :data="filteredRecords" stripe height="280">
              <el-table-column type="index" label="序号" width="60" align="center" />
              <el-table-column prop="boxCode" label="箱码" width="140" />
              <el-table-column prop="type" label="类型" width="90" align="center">
                <template #default="{ row }">
                  <el-tag :type="getTagType(row.type)" size="small">
                    {{ getTypeLabel(row.type) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="route" label="所属线路" min-width="120" />
              <el-table-column prop="originalRoute" label="原线路" width="140">
                <template #default="{ row }">
                  <span v-if="row.originalRoute" class="wrong-route-text">{{ row.originalRoute }}</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column prop="time" label="扫描时间" width="170" />
            </el-table>

            <el-table v-else :data="missingRecords" stripe height="280">
              <el-table-column type="index" label="序号" width="60" align="center" />
              <el-table-column prop="boxCode" label="箱码" width="160" />
              <el-table-column prop="route" label="应回线路" min-width="160" />
              <el-table-column label="状态" width="100" align="center">
                <template #default>
                  <el-tag type="danger" size="small">未回库</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </div>

      <div class="finish-bar">
        <el-button
          type="success"
          size="large"
          :icon="CircleCheck"
          @click="finishBatch"
        >
          结束盘点
        </el-button>
      </div>
    </div>

    <el-dialog
      v-model="wrongRouteDialogVisible"
      title="错线路提醒"
      width="520px"
      :close-on-click-modal="true"
      class="wrong-route-dialog"
    >
      <div class="wrong-route-content">
        <el-icon class="warning-icon"><WarningFilled /></el-icon>
        <div class="warning-text">
          <h3>检测到错线路箱体！</h3>
          <p>
            箱码 <strong class="box-code-text">{{ wrongRouteInfo?.boxCode }}</strong>
            不属于当前盘点线路
          </p>
          <p>
            原线路: <strong>{{ wrongRouteInfo?.originalRouteName }}</strong>
          </p>
          <p class="tip">请将此箱体放入 <strong>"待核对区"</strong> 单独处理，记录已保存至本批次</p>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="wrongRouteDialogVisible = false">
          我知道了
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showImportDialog"
      title="导入箱码清单"
      width="500px"
    >
      <div class="import-content">
        <p class="import-hint">支持 .txt 或 .csv 文件，每行一个箱码；CSV 文件取第一列</p>
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :limit="1"
          accept=".txt,.csv"
          :on-change="handleFileChange"
          :on-exceed="() => ElMessage.warning('只能上传一个文件')"
          drag
        >
          <el-icon class="el-icon--upload"><Upload /></el-icon>
          <div class="el-upload__text">拖拽文件到此处，或<em>点击选择文件</em></div>
        </el-upload>
      </div>
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" @click="applyImport">确认导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  VideoPlay,
  CircleCheck,
  List,
  Check,
  Warning,
  Plus,
  Search,
  WarningFilled,
  Upload
} from '@element-plus/icons-vue'
import { useStore } from '../store'

const { state, createStockBatch, getActiveStockBatch, scanBoxForStock, finishStockBatch, getRouteName } = useStore()

const routes = computed(() => state.routes)
const selectedRoute = ref('')
const expectedCodesText = ref('')
const currentBatch = ref(null)
const scanInput = ref('')
const scanInputRef = ref(null)
const lastScanResult = ref(null)
const activeTab = ref('all')

const wrongRouteDialogVisible = ref(false)
const wrongRouteInfo = ref(null)

const showImportDialog = ref(false)
const importBuffer = ref('')
const uploadRef = ref(null)

const parsedExpectedCodes = computed(() => {
  const lines = expectedCodesText.value
    .split(/[\n\r,;]+/)
    .map(s => s.trim())
    .filter(Boolean)
  return [...new Set(lines)]
})

const returnedCount = computed(() => {
  if (!currentBatch.value) return 0
  return currentBatch.value.expectedCodes.filter(
    code => currentBatch.value.scannedCodes.includes(code)
  ).length
})

const missingCodes = computed(() => {
  if (!currentBatch.value) return []
  return currentBatch.value.expectedCodes.filter(
    code => !currentBatch.value.scannedCodes.includes(code)
  )
})

const scanResultType = computed(() => {
  if (!lastScanResult.value) return 'info'
  if (lastScanResult.value.isWrongRoute) return 'error'
  if (lastScanResult.value.isDuplicate) return 'warning'
  if (lastScanResult.value.isExtra) return 'warning'
  return 'success'
})

const scanResultTitle = computed(() => {
  if (!lastScanResult.value) return ''
  if (lastScanResult.value.isWrongRoute) return '错线路 - 已记录，请放入待核对区'
  if (lastScanResult.value.isDuplicate) return '重复扫描'
  if (lastScanResult.value.isExtra) return '多出箱体 - 不在本批清单内'
  if (lastScanResult.value.isInExpected) return '正常回库'
  return '扫描成功'
})

const normalRecords = computed(() => {
  if (!currentBatch.value) return []
  return currentBatch.value.scannedCodes
    .filter(code => {
      const isExtra = currentBatch.value.extraBoxes.some(r => r.boxCode === code)
      const isWrong = currentBatch.value.wrongRouteBoxes.some(r => r.boxCode === code)
      return !isExtra && !isWrong
    })
    .map(code => {
      const box = state.boxes.find(b => b.code === code)
      return {
        boxCode: code,
        type: 'normal',
        route: box ? getRouteName(box.routeId) : getRouteName(currentBatch.value.routeId),
        originalRoute: '',
        time: ''
      }
    })
})

const allRecords = computed(() => {
  if (!currentBatch.value) return []
  const records = []

  currentBatch.value.scannedCodes.forEach(code => {
    const extraRecord = currentBatch.value.extraBoxes.find(r => r.boxCode === code)
    const wrongRecord = currentBatch.value.wrongRouteBoxes.find(r => r.boxCode === code)
    const box = state.boxes.find(b => b.code === code)

    if (wrongRecord) {
      records.push({
        boxCode: code,
        type: 'wrong',
        route: getRouteName(currentBatch.value.routeId),
        originalRoute: wrongRecord.originalRouteName,
        time: wrongRecord.scanTime
      })
    } else if (extraRecord) {
      records.push({
        boxCode: code,
        type: 'extra',
        route: box ? getRouteName(box.routeId) : getRouteName(currentBatch.value.routeId),
        originalRoute: '',
        time: extraRecord.scanTime
      })
    } else {
      records.push({
        boxCode: code,
        type: 'normal',
        route: box ? getRouteName(box.routeId) : getRouteName(currentBatch.value.routeId),
        originalRoute: '',
        time: ''
      })
    }
  })

  return records.reverse()
})

const filteredRecords = computed(() => {
  if (activeTab.value === 'all') return allRecords.value
  return allRecords.value.filter(r => r.type === activeTab.value)
})

const missingRecords = computed(() => {
  if (!currentBatch.value) return []
  return missingCodes.value.map(code => ({
    boxCode: code,
    route: getRouteName(currentBatch.value.routeId)
  }))
})

function fillDemoCodes() {
  const codes = []
  for (let i = 1; i <= 10; i++) {
    codes.push('BOX' + String(i).padStart(4, '0'))
  }
  expectedCodesText.value = codes.join('\n')
}

function handleFileChange(file) {
  const reader = new FileReader()
  reader.onload = (e) => {
    importBuffer.value = e.target.result
  }
  reader.readAsText(file.raw)
}

function applyImport() {
  if (!importBuffer.value) {
    ElMessage.warning('请先选择文件')
    return
  }
  const lines = importBuffer.value
    .split(/[\n\r]+/)
    .map(line => {
      const parts = line.split(/[,;\t]/)
      return parts[0] ? parts[0].trim() : ''
    })
    .filter(Boolean)

  if (lines.length === 0) {
    ElMessage.warning('文件中未找到有效箱码')
    return
  }

  const existing = expectedCodesText.value
    .split(/[\n\r,;]+/)
    .map(s => s.trim())
    .filter(Boolean)
  const merged = [...new Set([...existing, ...lines])]
  expectedCodesText.value = merged.join('\n')

  ElMessage.success(`已导入 ${lines.length} 个箱码`)
  importBuffer.value = ''
  showImportDialog.value = false
}

function startBatch() {
  if (!selectedRoute.value) {
    ElMessage.warning('请先选择线路')
    return
  }
  if (parsedExpectedCodes.value.length === 0) {
    ElMessage.warning('请录入本批应回箱码清单')
    return
  }

  const existing = getActiveStockBatch(selectedRoute.value)
  if (existing) {
    currentBatch.value = existing
    ElMessage.info('该线路已有进行中的盘点，已恢复')
  } else {
    currentBatch.value = createStockBatch({
      routeId: selectedRoute.value,
      expectedCodes: parsedExpectedCodes.value
    })
    ElMessage.success(`盘点已开始，本批应回 ${parsedExpectedCodes.value.length} 箱，请扫描箱码`)
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
  if (!result) return
  lastScanResult.value = { boxCode: code, ...result }

  if (result.isWrongRoute) {
    wrongRouteInfo.value = result.wrongRouteInfo
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

  const batch = currentBatch.value
  const missCount = missingCodes.value.length
  const extraCount = batch.extraBoxes.length
  const wrongCount = batch.wrongRouteBoxes.length

  let confirmMsg = `确认结束盘点？\n应回 ${batch.expectedCodes.length} 箱，已回 ${returnedCount.value} 箱`
  if (missCount > 0) confirmMsg += `，缺失 ${missCount} 箱`
  if (extraCount > 0) confirmMsg += `，多出 ${extraCount} 箱`
  if (wrongCount > 0) confirmMsg += `，错线路 ${wrongCount} 箱`

  ElMessageBox.confirm(confirmMsg, '结束盘点确认', {
    type: 'warning',
    confirmButtonText: '确认结束',
    cancelButtonText: '继续盘点'
  }).then(() => {
    finishStockBatch(batch.id)

    const summary = `盘点完成！应回 ${batch.expectedCodes.length} 箱，实回 ${returnedCount.value} 箱，缺失 ${missCount} 箱，多出 ${extraCount} 箱，错线路 ${wrongCount} 箱`

    ElMessage.success({
      message: summary,
      duration: 5000
    })

    currentBatch.value = null
    lastScanResult.value = null
    expectedCodesText.value = ''
  }).catch(() => {})
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

.setup-card {
  border-radius: 10px;
}

.setup-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.setup-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 16px;
}

.setup-row {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.setup-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setup-item.full-width {
  flex: 1;
}

.control-label {
  font-size: 14px;
  font-weight: 500;
  color: #475569;
}

.code-input-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.code-input-actions {
  display: flex;
  gap: 8px;
}

.code-count-hint {
  font-size: 13px;
  color: #64748b;
  margin-top: 6px;
}

.dup-warn {
  color: #f59e0b;
  margin-left: 8px;
}

.setup-footer {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.active-batch-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.stat-card {
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px;
}

.stat-card-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
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

.stat-card.wrong .stat-card-icon {
  background: #fce7f3;
  color: #db2777;
}

.stat-card-content {
  flex: 1;
}

.stat-card-value {
  font-size: 26px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
}

.stat-card-label {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
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

.detail-row {
  display: flex;
  gap: 16px;
}

.detail-card {
  border-radius: 10px;
  flex: 1;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.detail-table-wrapper {
  margin: 0 -8px;
}

.wrong-route-text {
  color: #dc2626;
  font-weight: 500;
}

.finish-bar {
  display: flex;
  justify-content: center;
  padding: 4px 0;
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

.import-content {
  padding: 8px 0;
}

.import-hint {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 16px 0;
}
</style>
