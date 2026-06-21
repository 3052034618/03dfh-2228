<template>
  <div class="batch-history-page">
    <div class="page-header">
      <h2 class="page-title">批次历史</h2>
      <p class="page-desc">追溯历史盘点批次，查看明细与交接清单</p>
    </div>

    <el-card v-if="!selectedBatch" class="list-card" shadow="never">
      <div class="filter-bar">
        <el-select
          v-model="filterRoute"
          placeholder="全部线路"
          clearable
          style="width: 200px"
        >
          <el-option
            v-for="route in routes"
            :key="route.id"
            :label="route.name"
            :value="route.id"
          />
        </el-select>
        <el-date-picker
          v-model="filterDateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 280px"
        />
        <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width: 130px">
          <el-option label="已完成" value="finished" />
          <el-option label="进行中" value="active" />
        </el-select>
      </div>

      <el-table :data="filteredBatches" stripe>
        <el-table-column type="index" label="#" width="50" align="center" />
        <el-table-column label="线路" min-width="130">
          <template #default="{ row }">
            {{ getRouteName(row.routeId) }}
          </template>
        </el-table-column>
        <el-table-column label="应回" width="60" align="center">
          <template #default="{ row }">
            {{ row.expectedCodes.length }}
          </template>
        </el-table-column>
        <el-table-column label="已回" width="60" align="center">
          <template #default="{ row }">
            {{ getReturnedCount(row) }}
          </template>
        </el-table-column>
        <el-table-column label="缺失" width="60" align="center">
          <template #default="{ row }">
            <span :class="{ 'text-danger': getMissingCodes(row).length > 0 }">
              {{ getMissingCodes(row).length }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="多出" width="60" align="center">
          <template #default="{ row }">
            <span :class="{ 'text-warning': row.extraBoxes.length > 0 }">
              {{ row.extraBoxes.length }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="错线路" width="60" align="center">
          <template #default="{ row }">
            <span :class="{ 'text-danger': row.wrongRouteBoxes.length > 0 }">
              {{ row.wrongRouteBoxes.length }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="盘点" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'warning' : 'success'" size="small">
              {{ row.status === 'active' ? '进行中' : '已完成' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="交接" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="handoverTagType(row.handoverStatus)" size="small">
              {{ handoverLabel(row.handoverStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="盘点时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.startTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="openDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="filteredBatches.length === 0" class="empty-hint">
        <el-empty description="暂无盘点批次记录" />
      </div>
    </el-card>

    <div v-if="selectedBatch" class="detail-area">
      <div class="detail-top-bar">
        <el-button :icon="Back" @click="selectedBatch = null">返回列表</el-button>
        <span class="detail-title">
          {{ getRouteName(selectedBatch.routeId) }} ·
          {{ formatTime(selectedBatch.startTime) }}
        </span>
        <el-tag :type="selectedBatch.status === 'active' ? 'warning' : 'success'">
          {{ selectedBatch.status === 'active' ? '进行中' : '已完成' }}
        </el-tag>
      </div>

      <div class="stats-row">
        <el-card class="stat-card expected" shadow="never">
          <div class="stat-icon"><el-icon><List /></el-icon></div>
          <div class="stat-body">
            <div class="stat-val">{{ selectedBatch.expectedCodes.length }}</div>
            <div class="stat-lbl">应回</div>
          </div>
        </el-card>
        <el-card class="stat-card returned" shadow="never">
          <div class="stat-icon"><el-icon><Check /></el-icon></div>
          <div class="stat-body">
            <div class="stat-val">{{ detailReturnedCount }}</div>
            <div class="stat-lbl">已回</div>
          </div>
        </el-card>
        <el-card class="stat-card missing" shadow="never">
          <div class="stat-icon"><el-icon><Warning /></el-icon></div>
          <div class="stat-body">
            <div class="stat-val">{{ detailMissingCodes.length }}</div>
            <div class="stat-lbl">缺失</div>
          </div>
        </el-card>
        <el-card class="stat-card extra" shadow="never">
          <div class="stat-icon"><el-icon><Plus /></el-icon></div>
          <div class="stat-body">
            <div class="stat-val">{{ selectedBatch.extraBoxes.length }}</div>
            <div class="stat-lbl">多出</div>
          </div>
        </el-card>
        <el-card class="stat-card wrong" shadow="never">
          <div class="stat-icon"><el-icon><WarningFilled /></el-icon></div>
          <div class="stat-body">
            <div class="stat-val">{{ selectedBatch.wrongRouteBoxes.length }}</div>
            <div class="stat-lbl">错线路</div>
          </div>
        </el-card>
      </div>

      <el-card class="review-card" shadow="never">
        <div class="review-header">
          <h3>复盘备注与交接</h3>
          <div class="handover-select">
            <span class="handover-label">交接状态:</span>
            <el-select v-model="editHandoverStatus" size="small" style="width: 120px" @change="saveReview">
              <el-option label="待交接" value="pending" />
              <el-option label="已确认" value="confirmed" />
              <el-option label="已签字" value="signed" />
            </el-select>
          </div>
        </div>
        <div class="review-grid">
          <div class="review-item">
            <label class="review-item-label">
              <el-tag type="danger" size="small">缺失</el-tag>
              处理结论
            </label>
            <el-input
              v-model="editReviewNotes.missing"
              type="textarea"
              :rows="2"
              placeholder="记录缺失箱体的处理情况..."
              @blur="saveReview"
            />
          </div>
          <div class="review-item">
            <label class="review-item-label">
              <el-tag type="warning" size="small">多出</el-tag>
              处理结论
            </label>
            <el-input
              v-model="editReviewNotes.extra"
              type="textarea"
              :rows="2"
              placeholder="记录多出箱体的处理情况..."
              @blur="saveReview"
            />
          </div>
          <div class="review-item">
            <label class="review-item-label">
              <el-tag type="danger" size="small">错线路</el-tag>
              处理结论
            </label>
            <el-input
              v-model="editReviewNotes.wrong"
              type="textarea"
              :rows="2"
              placeholder="记录错线路箱体的处理情况..."
              @blur="saveReview"
            />
          </div>
        </div>
      </el-card>

      <div class="detail-tabs-bar">
        <el-radio-group v-model="detailTab" size="small">
          <el-radio-button value="all">全部({{ detailAllRecords.length }})</el-radio-button>
          <el-radio-button value="normal">正常({{ detailNormalCount }})</el-radio-button>
          <el-radio-button value="wrong">错线路({{ selectedBatch.wrongRouteBoxes.length }})</el-radio-button>
          <el-radio-button value="extra">多出({{ selectedBatch.extraBoxes.length }})</el-radio-button>
          <el-radio-button value="missing">缺失({{ detailMissingCodes.length }})</el-radio-button>
        </el-radio-group>
        <el-button type="primary" size="small" :icon="Printer" @click="exportHandover">
          导出交接清单
        </el-button>
      </div>

      <el-card shadow="never" class="detail-table-card">
        <el-table v-if="detailTab !== 'missing'" :data="detailFilteredRecords" stripe height="280">
          <el-table-column type="index" label="#" width="50" align="center" />
          <el-table-column prop="boxCode" label="箱码" width="140" />
          <el-table-column prop="type" label="类型" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.tagType" size="small">{{ row.typeLabel }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="route" label="所属线路" min-width="120" />
          <el-table-column label="原线路" width="140">
            <template #default="{ row }">
              <span v-if="row.originalRoute" class="wrong-route-text">{{ row.originalRoute }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="time" label="扫描时间" width="170" />
        </el-table>

        <el-table v-else :data="detailMissingRecords" stripe height="280">
          <el-table-column type="index" label="#" width="50" align="center" />
          <el-table-column prop="boxCode" label="箱码" width="160" />
          <el-table-column prop="route" label="应回线路" min-width="160" />
          <el-table-column label="状态" width="100" align="center">
            <template #default>
              <el-tag type="danger" size="small">未回库</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <el-dialog
      v-model="showExportPreview"
      title="交接清单预览"
      width="700px"
      :close-on-click-modal="false"
    >
      <div class="export-preview" ref="exportPreviewRef">
        <div class="export-header">
          <h2>盘点交接清单</h2>
          <p>{{ getRouteName(selectedBatch?.routeId) }} · {{ formatTime(selectedBatch?.startTime) }}</p>
        </div>
        <div class="export-summary">
          <span>应回: <strong>{{ selectedBatch?.expectedCodes.length }}</strong></span>
          <span>已回: <strong>{{ detailReturnedCount }}</strong></span>
          <span>缺失: <strong class="text-danger">{{ detailMissingCodes.length }}</strong></span>
          <span>多出: <strong class="text-warning">{{ selectedBatch?.extraBoxes.length }}</strong></span>
          <span>错线路: <strong class="text-danger">{{ selectedBatch?.wrongRouteBoxes.length }}</strong></span>
        </div>

        <div v-if="detailMissingCodes.length > 0" class="export-section">
          <h4>缺失箱码 ({{ detailMissingCodes.length }})</h4>
          <table class="export-table">
            <thead><tr><th>序号</th><th>箱码</th><th>应回线路</th></tr></thead>
            <tbody>
              <tr v-for="(code, idx) in detailMissingCodes" :key="'m'+idx">
                <td>{{ idx + 1 }}</td>
                <td>{{ code }}</td>
                <td>{{ getRouteName(selectedBatch?.routeId) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="selectedBatch?.reviewNotes?.missing" class="export-note">
            处理结论: {{ selectedBatch.reviewNotes.missing }}
          </div>
        </div>

        <div v-if="selectedBatch && selectedBatch.extraBoxes.length > 0" class="export-section">
          <h4>多出箱码 ({{ selectedBatch.extraBoxes.length }})</h4>
          <table class="export-table">
            <thead><tr><th>序号</th><th>箱码</th><th>扫描时间</th></tr></thead>
            <tbody>
              <tr v-for="(rec, idx) in selectedBatch.extraBoxes" :key="'e'+idx">
                <td>{{ idx + 1 }}</td>
                <td>{{ rec.boxCode }}</td>
                <td>{{ rec.scanTime }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="selectedBatch?.reviewNotes?.extra" class="export-note">
            处理结论: {{ selectedBatch.reviewNotes.extra }}
          </div>
        </div>

        <div v-if="selectedBatch && selectedBatch.wrongRouteBoxes.length > 0" class="export-section">
          <h4>错线路箱码 ({{ selectedBatch.wrongRouteBoxes.length }})</h4>
          <table class="export-table">
            <thead><tr><th>序号</th><th>箱码</th><th>原线路</th><th>扫描时间</th></tr></thead>
            <tbody>
              <tr v-for="(rec, idx) in selectedBatch.wrongRouteBoxes" :key="'w'+idx">
                <td>{{ idx + 1 }}</td>
                <td>{{ rec.boxCode }}</td>
                <td>{{ rec.originalRouteName }}</td>
                <td>{{ rec.scanTime }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="selectedBatch?.reviewNotes?.wrong" class="export-note">
            处理结论: {{ selectedBatch.reviewNotes.wrong }}
          </div>
        </div>

        <div class="export-footer">
          <p>交接状态: {{ handoverLabel(selectedBatch?.handoverStatus) }}</p>
          <p>制表人: ____________ &nbsp;&nbsp; 接收人: ____________ &nbsp;&nbsp; 日期: ____________</p>
        </div>
      </div>

      <template #footer>
        <el-button @click="showExportPreview = false">关闭</el-button>
        <el-button type="primary" :icon="Printer" @click="printHandover">打印</el-button>
        <el-button type="success" @click="downloadHandoverCsv">下载 CSV</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Back,
  List,
  Check,
  Warning,
  Plus,
  WarningFilled,
  Printer
} from '@element-plus/icons-vue'
import { useStore } from '../store'

const { state, getRouteName, updateBatchReview } = useStore()

const routes = computed(() => state.routes)
const filterRoute = ref('')
const filterDateRange = ref(null)
const filterStatus = ref('')
const selectedBatch = ref(null)
const detailTab = ref('all')
const showExportPreview = ref(false)
const exportPreviewRef = ref(null)

const editHandoverStatus = ref('pending')
const editReviewNotes = ref({ missing: '', extra: '', wrong: '' })

const filteredBatches = computed(() => {
  let list = state.stockBatches.slice()
  if (filterRoute.value) {
    list = list.filter(b => b.routeId === filterRoute.value)
  }
  if (filterStatus.value) {
    list = list.filter(b => b.status === filterStatus.value)
  }
  if (filterDateRange.value && filterDateRange.value.length === 2) {
    const [start, end] = filterDateRange.value
    const startDate = new Date(start + 'T00:00:00')
    const endDate = new Date(end + 'T23:59:59')
    list = list.filter(b => {
      const t = new Date(b.startTime)
      return t >= startDate && t <= endDate
    })
  }
  return list
})

function getReturnedCount(batch) {
  return batch.expectedCodes.filter(code => batch.scannedCodes.includes(code)).length
}

function getMissingCodes(batch) {
  return batch.expectedCodes.filter(code => !batch.scannedCodes.includes(code))
}

function formatTime(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

function handoverLabel(status) {
  const map = { pending: '待交接', confirmed: '已确认', signed: '已签字' }
  return map[status] || '待交接'
}

function handoverTagType(status) {
  const map = { pending: 'info', confirmed: 'warning', signed: 'success' }
  return map[status] || 'info'
}

const detailReturnedCount = computed(() => {
  if (!selectedBatch.value) return 0
  return getReturnedCount(selectedBatch.value)
})

const detailMissingCodes = computed(() => {
  if (!selectedBatch.value) return []
  return getMissingCodes(selectedBatch.value)
})

const detailNormalCount = computed(() => {
  if (!selectedBatch.value) return 0
  return selectedBatch.value.scannedCodes.filter(code => {
    const isExtra = selectedBatch.value.extraBoxes.some(r => r.boxCode === code)
    const isWrong = selectedBatch.value.wrongRouteBoxes.some(r => r.boxCode === code)
    return !isExtra && !isWrong
  }).length
})

const detailAllRecords = computed(() => {
  if (!selectedBatch.value) return []
  const batch = selectedBatch.value
  const records = []

  batch.scannedCodes.forEach(code => {
    const extraRecord = batch.extraBoxes.find(r => r.boxCode === code)
    const wrongRecord = batch.wrongRouteBoxes.find(r => r.boxCode === code)
    const box = state.boxes.find(b => b.code === code)

    if (wrongRecord) {
      records.push({
        boxCode: code, type: 'wrong', tagType: 'danger', typeLabel: '错线路',
        route: getRouteName(batch.routeId),
        originalRoute: wrongRecord.originalRouteName,
        time: wrongRecord.scanTime
      })
    } else if (extraRecord) {
      records.push({
        boxCode: code, type: 'extra', tagType: 'warning', typeLabel: '多出',
        route: box ? getRouteName(box.routeId) : getRouteName(batch.routeId),
        originalRoute: '', time: extraRecord.scanTime
      })
    } else {
      records.push({
        boxCode: code, type: 'normal', tagType: 'success', typeLabel: '正常',
        route: box ? getRouteName(box.routeId) : getRouteName(batch.routeId),
        originalRoute: '', time: ''
      })
    }
  })

  batch.wrongRouteBoxes.forEach(r => {
    if (!batch.scannedCodes.includes(r.boxCode)) {
      records.push({
        boxCode: r.boxCode, type: 'wrong', tagType: 'danger', typeLabel: '错线路',
        route: getRouteName(batch.routeId),
        originalRoute: r.originalRouteName,
        time: r.scanTime
      })
    }
  })

  return records.reverse()
})

const detailFilteredRecords = computed(() => {
  if (detailTab.value === 'all') return detailAllRecords.value
  return detailAllRecords.value.filter(r => r.type === detailTab.value)
})

const detailMissingRecords = computed(() => {
  if (!selectedBatch.value) return []
  return detailMissingCodes.value.map(code => ({
    boxCode: code,
    route: getRouteName(selectedBatch.value.routeId)
  }))
})

function openDetail(batch) {
  selectedBatch.value = batch
  detailTab.value = 'all'
  editHandoverStatus.value = batch.handoverStatus || 'pending'
  editReviewNotes.value = {
    missing: batch.reviewNotes?.missing || '',
    extra: batch.reviewNotes?.extra || '',
    wrong: batch.reviewNotes?.wrong || ''
  }
}

function saveReview() {
  if (!selectedBatch.value) return
  updateBatchReview(selectedBatch.value.id, {
    handoverStatus: editHandoverStatus.value,
    reviewNotes: { ...editReviewNotes.value }
  })
}

watch(
  () => state.stockBatches,
  () => {
    if (selectedBatch.value) {
      const updated = state.stockBatches.find(b => b.id === selectedBatch.value.id)
      if (updated) {
        selectedBatch.value = updated
      }
    }
  },
  { deep: true }
)

function exportHandover() {
  showExportPreview.value = true
}

function printHandover() {
  const el = exportPreviewRef.value
  if (!el) return
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>交接清单</title>
    <style>
      body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; font-size: 13px; }
      h2 { text-align: center; margin-bottom: 4px; }
      .export-header p { text-align: center; color: #666; margin: 0 0 12px; }
      .export-summary { display: flex; gap: 20px; justify-content: center; margin: 12px 0; font-size: 14px; }
      .export-section { margin-top: 16px; }
      .export-section h4 { margin: 0 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
      .export-table { width: 100%; border-collapse: collapse; }
      .export-table th, .export-table td { border: 1px solid #ddd; padding: 4px 8px; text-align: left; }
      .export-table th { background: #f5f5f5; }
      .export-note { background: #f8fafc; border-left: 3px solid #3b82f6; padding: 6px 10px; margin-top: 8px; font-size: 12px; color: #334155; }
      .export-footer { margin-top: 24px; border-top: 1px solid #ddd; padding-top: 12px; }
      .text-danger { color: #dc2626; }
      .text-warning { color: #d97706; }
    </style></head><body>${el.innerHTML}</body></html>`

  const w = window.open('', '_blank', 'width=800,height=600')
  if (w) {
    w.document.write(html)
    w.document.close()
    w.onload = () => w.print()
  }
}

function downloadHandoverCsv() {
  if (!selectedBatch.value) return
  const batch = selectedBatch.value
  const rn = batch.reviewNotes || {}
  const rows = [['盘点交接清单', '', '', ''],
    ['线路', getRouteName(batch.routeId), '', ''],
    ['时间', formatTime(batch.startTime), '', ''],
    ['应回', batch.expectedCodes.length, '已回', detailReturnedCount.value],
    ['缺失', detailMissingCodes.value.length, '多出', batch.extraBoxes.length],
    ['错线路', batch.wrongRouteBoxes.length, '', ''],
    ['交接状态', handoverLabel(batch.handoverStatus), '', ''],
    []]

  if (detailMissingCodes.value.length > 0) {
    rows.push(['缺失箱码', '', '', ''])
    rows.push(['序号', '箱码', '应回线路', ''])
    detailMissingCodes.value.forEach((code, i) => {
      rows.push([i + 1, code, getRouteName(batch.routeId), ''])
    })
    if (rn.missing) {
      rows.push(['缺失处理结论', rn.missing, '', ''])
    }
    rows.push([])
  }

  if (batch.extraBoxes.length > 0) {
    rows.push(['多出箱码', '', '', ''])
    rows.push(['序号', '箱码', '扫描时间', ''])
    batch.extraBoxes.forEach((r, i) => {
      rows.push([i + 1, r.boxCode, r.scanTime, ''])
    })
    if (rn.extra) {
      rows.push(['多出处理结论', rn.extra, '', ''])
    }
    rows.push([])
  }

  if (batch.wrongRouteBoxes.length > 0) {
    rows.push(['错线路箱码', '', '', ''])
    rows.push(['序号', '箱码', '原线路', '扫描时间'])
    batch.wrongRouteBoxes.forEach((r, i) => {
      rows.push([i + 1, r.boxCode, r.originalRouteName, r.scanTime])
    })
    if (rn.wrong) {
      rows.push(['错线路处理结论', rn.wrong, '', ''])
    }
  }

  const bom = '\uFEFF'
  const csv = bom + rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `交接清单_${getRouteName(batch.routeId)}_${new Date(batch.startTime).toLocaleDateString('zh-CN')}.csv`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('CSV 文件已下载')
}
</script>

<style scoped>
.batch-history-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header { margin-bottom: 4px; }
.page-title { font-size: 22px; font-weight: 600; color: #1e293b; margin: 0 0 4px; }
.page-desc { font-size: 14px; color: #64748b; margin: 0; }

.list-card { border-radius: 10px; }

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.text-danger { color: #dc2626; font-weight: 600; }
.text-warning { color: #d97706; font-weight: 600; }

.empty-hint { padding: 40px 0; }

.detail-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  flex: 1;
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
  gap: 12px;
  padding: 8px;
}

.stat-icon {
  width: 48px; height: 48px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; font-size: 24px;
}

.stat-card.expected .stat-icon { background: #dbeafe; color: #2563eb; }
.stat-card.returned .stat-icon { background: #dcfce7; color: #16a34a; }
.stat-card.missing .stat-icon { background: #fee2e2; color: #dc2626; }
.stat-card.extra .stat-icon { background: #fef3c7; color: #d97706; }
.stat-card.wrong .stat-icon { background: #fce7f3; color: #db2777; }

.stat-body { flex: 1; }
.stat-val { font-size: 24px; font-weight: 700; color: #1e293b; line-height: 1.2; }
.stat-lbl { font-size: 12px; color: #64748b; margin-top: 2px; }

.review-card {
  border-radius: 10px;
}

.review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.review-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.handover-select {
  display: flex;
  align-items: center;
  gap: 8px;
}

.handover-label {
  font-size: 13px;
  color: #64748b;
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.review-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.review-item-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
}

.detail-tabs-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail-table-card { border-radius: 10px; }

.wrong-route-text { color: #dc2626; font-weight: 500; }

.export-preview {
  font-family: 'Microsoft YaHei', sans-serif;
  font-size: 13px;
  background: white;
  padding: 8px;
}

.export-header h2 { text-align: center; margin: 0 0 4px; font-size: 18px; }
.export-header p { text-align: center; color: #666; margin: 0 0 12px; }

.export-summary {
  display: flex; gap: 16px; justify-content: center; margin: 12px 0;
  font-size: 14px; flex-wrap: wrap;
}

.export-section { margin-top: 16px; }
.export-section h4 { margin: 0 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }

.export-table { width: 100%; border-collapse: collapse; }
.export-table th, .export-table td { border: 1px solid #ddd; padding: 4px 8px; text-align: left; }
.export-table th { background: #f5f5f5; font-weight: 600; }

.export-note {
  background: #f8fafc;
  border-left: 3px solid #3b82f6;
  padding: 6px 10px;
  margin-top: 8px;
  font-size: 12px;
  color: #334155;
}

.export-footer {
  margin-top: 24px; border-top: 1px solid #ddd; padding-top: 12px;
  font-size: 13px; color: #666;
}

.export-footer p { margin: 4px 0; }
</style>
