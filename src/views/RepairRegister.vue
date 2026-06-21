<template>
  <div class="repair-register-page">
    <div class="page-header">
      <h2 class="page-title">维修登记</h2>
      <p class="page-desc">记录箱体破损信息、处理方式，打印维修标签</p>
    </div>

    <div class="content-row">
      <div class="left-panel">
        <el-card class="pending-card" shadow="never">
          <div class="card-header">
            <h3>待维修箱体</h3>
            <el-tag type="danger" size="large">
              {{ pendingRepairBoxes.length }} 箱
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
              <el-empty description="暂无待维修箱体" :image-size="80" />
            </div>
          </div>
        </el-card>
      </div>

      <div class="right-panel">
        <el-card class="form-card" shadow="never">
          <div class="card-header">
            <h3>维修登记</h3>
            <el-tag v-if="selectedBox" type="info">
              {{ selectedBox.code }}
            </el-tag>
          </div>

          <el-form
            ref="repairFormRef"
            :model="repairForm"
            :rules="formRules"
            label-width="100px"
            class="repair-form"
          >
            <el-form-item label="箱码" prop="boxCode">
              <el-input
                v-model="repairForm.boxCode"
                placeholder="请输入或扫描箱码"
                size="large"
                @keyup.enter="handleBoxCodeEnter"
              >
                <template #prefix>
                  <el-icon><Box /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="所属线路">
              <el-input
                :value="currentBoxRoute"
                disabled
                size="large"
                placeholder="自动识别"
              />
            </el-form-item>

            <el-form-item label="破损位置" prop="damagePosition">
              <el-select
                v-model="repairForm.damagePosition"
                placeholder="请选择破损位置"
                size="large"
                style="width: 100%"
              >
                <el-option
                  v-for="pos in damagePositions"
                  :key="pos"
                  :label="pos"
                  :value="pos"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="处理方式" prop="handleMethod">
              <el-radio-group v-model="repairForm.handleMethod" size="large">
                <el-radio-button value="更换配件">更换配件</el-radio-button>
                <el-radio-button value="维修修复">维修修复</el-radio-button>
                <el-radio-button value="清洁消毒">清洁消毒</el-radio-button>
                <el-radio-button value="报废处理">报废处理</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="预计可用" prop="expectedDate">
              <el-date-picker
                v-model="repairForm.expectedDate"
                type="date"
                placeholder="选择预计可用日期"
                size="large"
                style="width: 100%"
                value-format="YYYY-MM-DD"
                :min-date="new Date()"
              />
            </el-form-item>

            <el-form-item label="备注说明">
              <el-input
                v-model="repairForm.remark"
                type="textarea"
                :rows="3"
                placeholder="请输入详细描述或备注..."
                maxlength="200"
                show-word-limit
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                size="large"
                :icon="Plus"
                @click="submitRepair"
                :disabled="!canSubmit"
              >
                提交登记
              </el-button>
              <el-button
                size="large"
                :icon="Printer"
                @click="previewAndPrintLabel"
                :disabled="!canPrint"
              >
                打印标签
              </el-button>
              <el-button size="large" @click="resetForm">
                重置
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card class="records-card" shadow="never">
          <div class="card-header">
            <h3>维修记录</h3>
            <el-radio-group v-model="recordFilter" size="small">
              <el-radio-button value="all">全部</el-radio-button>
              <el-radio-button value="repairing">维修中</el-radio-button>
              <el-radio-button value="finished">已完成</el-radio-button>
            </el-radio-group>
          </div>

          <div class="records-table">
            <el-table :data="filteredRecords" stripe height="280">
              <el-table-column type="index" label="#" width="50" align="center" />
              <el-table-column prop="boxCode" label="箱码" width="120" />
              <el-table-column prop="damagePosition" label="破损位置" width="140" />
              <el-table-column prop="handleMethod" label="处理方式" width="100" />
              <el-table-column prop="expectedDate" label="预计可用" width="110" />
              <el-table-column prop="status" label="状态" width="80" align="center">
                <template #default="{ row }">
                  <el-tag
                    :type="row.status === 'repairing' ? 'warning' : 'success'"
                    size="small"
                  >
                    {{ row.status === 'repairing' ? '维修中' : '已完成' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="160" align="center" fixed="right">
                <template #default="{ row }">
                  <el-button
                    v-if="row.status === 'repairing'"
                    type="success"
                    size="small"
                    @click="completeRepair(row)"
                  >
                    完成维修
                  </el-button>
                  <el-button
                    size="small"
                    @click="printRecordLabel(row)"
                  >
                    打印标签
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </div>
    </div>

    <el-dialog
      v-model="labelPreviewVisible"
      title="维修标签预览"
      width="420px"
      :close-on-click-modal="false"
    >
      <div class="label-preview-wrapper">
        <div class="label-preview" ref="labelPreviewRef">
          <div class="label-title">维 修 标 签</div>
          <div class="label-box-code">{{ labelPreviewData.boxCode || 'BOX0000' }}</div>
          <div class="label-row">
            <span class="label-label">线路:</span>
            <span class="label-value">{{ labelPreviewData.route || '-' }}</span>
          </div>
          <div class="label-damage">
            <div class="label-label">破损位置:</div>
            <div class="label-value">{{ labelPreviewData.damagePosition || '-' }}</div>
          </div>
          <div class="label-row">
            <span class="label-label">处理方式:</span>
            <span class="label-value">{{ labelPreviewData.handleMethod || '-' }}</span>
          </div>
          <div class="label-row">
            <span class="label-label">预计可用:</span>
            <span class="label-value">{{ labelPreviewData.expectedDate || '待定' }}</span>
          </div>
          <div class="label-footer">
            <span class="status-badge">待维修</span>
            <span class="print-time">打印: {{ labelPreviewData.printTime || '' }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="labelPreviewVisible = false">关闭</el-button>
        <el-button type="primary" :icon="Printer" @click="confirmPrint">
          确认打印
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Box,
  Plus,
  Printer
} from '@element-plus/icons-vue'
import { useStore } from '../store'

const {
  state,
  getPendingRepairBoxes,
  getBoxByCode,
  createRepairRecord,
  finishRepair,
  getRouteName
} = useStore()

const searchKeyword = ref('')
const selectedBox = ref(null)
const repairFormRef = ref(null)
const recordFilter = ref('all')
const labelPreviewVisible = ref(false)
const labelPreviewData = ref({})
const labelToPrint = ref(null)

const damagePositions = [
  '箱盖密封条破损',
  '箱体开裂',
  '锁扣损坏',
  '内胆破损',
  '把手断裂',
  '滚轮损坏',
  '保温层失效',
  '外壳凹陷',
  '其他破损'
]

const repairForm = reactive({
  boxCode: '',
  damagePosition: '',
  handleMethod: '更换配件',
  expectedDate: '',
  remark: ''
})

const formRules = {
  boxCode: [{ required: true, message: '请输入箱码', trigger: 'blur' }],
  damagePosition: [{ required: true, message: '请选择破损位置', trigger: 'change' }],
  handleMethod: [{ required: true, message: '请选择处理方式', trigger: 'change' }],
  expectedDate: [{ required: true, message: '请选择预计可用日期', trigger: 'change' }]
}

const pendingRepairBoxes = computed(() => {
  return getPendingRepairBoxes()
})

const filteredBoxes = computed(() => {
  if (!searchKeyword.value) return pendingRepairBoxes.value
  const keyword = searchKeyword.value.toLowerCase()
  return pendingRepairBoxes.value.filter(b =>
    b.code.toLowerCase().includes(keyword)
  )
})

const currentBoxRoute = computed(() => {
  if (selectedBox.value) {
    return getRouteName(selectedBox.value.routeId)
  }
  if (repairForm.boxCode) {
    const box = getBoxByCode(repairForm.boxCode)
    if (box) return getRouteName(box.routeId)
  }
  return ''
})

const canSubmit = computed(() => {
  return repairForm.boxCode && repairForm.damagePosition && 
         repairForm.handleMethod && repairForm.expectedDate
})

const canPrint = computed(() => {
  return repairForm.boxCode && repairForm.damagePosition
})

const repairRecords = computed(() => {
  return state.repairRecords.map(r => ({
    ...r,
    route: getRouteName(getBoxByCode(r.boxCode)?.routeId)
  }))
})

const filteredRecords = computed(() => {
  if (recordFilter.value === 'all') return repairRecords.value
  return repairRecords.value.filter(r => r.status === recordFilter.value)
})

function selectBox(box) {
  selectedBox.value = box
  repairForm.boxCode = box.code
  repairForm.damagePosition = ''
  repairForm.remark = ''
}

function handleBoxCodeEnter() {
  const code = repairForm.boxCode.trim()
  if (!code) return
  
  const box = getBoxByCode(code)
  if (box) {
    selectedBox.value = box
    ElMessage.success(`已找到箱体 ${code}`)
  } else {
    ElMessage.warning(`未找到箱体 ${code}，将作为新箱体登记`)
  }
}

function resetForm() {
  repairForm.boxCode = ''
  repairForm.damagePosition = ''
  repairForm.handleMethod = '更换配件'
  repairForm.expectedDate = ''
  repairForm.remark = ''
  selectedBox.value = null
  repairFormRef.value?.clearValidate()
}

function submitRepair() {
  if (!canSubmit.value) {
    ElMessage.warning('请填写完整的维修信息')
    return
  }

  ElMessageBox.confirm(
    `确认提交箱体 ${repairForm.boxCode} 的维修登记？`,
    '确认提交',
    {
      type: 'warning',
      confirmButtonText: '确认提交',
      cancelButtonText: '取消'
    }
  ).then(() => {
    const record = createRepairRecord({
      boxCode: repairForm.boxCode,
      damagePosition: repairForm.damagePosition,
      handleMethod: repairForm.handleMethod,
      expectedDate: repairForm.expectedDate,
      remark: repairForm.remark
    })

    ElMessage.success('维修登记提交成功')
    
    labelToPrint.value = record
    labelPreviewData.value = {
      boxCode: record.boxCode,
      route: getRouteName(getBoxByCode(record.boxCode)?.routeId),
      damagePosition: record.damagePosition,
      handleMethod: record.handleMethod,
      expectedDate: record.expectedDate,
      printTime: new Date().toLocaleString('zh-CN')
    }
    labelPreviewVisible.value = true

    resetForm()
  }).catch(() => {})
}

function previewAndPrintLabel() {
  if (!canPrint.value) {
    ElMessage.warning('请先填写箱码和破损位置')
    return
  }

  labelPreviewData.value = {
    boxCode: repairForm.boxCode,
    route: currentBoxRoute.value,
    damagePosition: repairForm.damagePosition,
    handleMethod: repairForm.handleMethod,
    expectedDate: repairForm.expectedDate,
    printTime: new Date().toLocaleString('zh-CN')
  }
  labelToPrint.value = null
  labelPreviewVisible.value = true
}

function printRecordLabel(record) {
  labelPreviewData.value = {
    boxCode: record.boxCode,
    route: getRouteName(getBoxByCode(record.boxCode)?.routeId),
    damagePosition: record.damagePosition,
    handleMethod: record.handleMethod,
    expectedDate: record.expectedDate,
    printTime: new Date().toLocaleString('zh-CN')
  }
  labelToPrint.value = record
  labelPreviewVisible.value = true
}

async function confirmPrint() {
  try {
    if (window.electronAPI?.printLabel) {
      await window.electronAPI.printLabel(labelPreviewData.value)
      ElMessage.success('标签已发送打印')
    } else {
      printLabelInBrowser()
    }
    labelPreviewVisible.value = false
  } catch (error) {
    ElMessage.error('打印失败: ' + (error.message || '未知错误'))
  }
}

function printLabelInBrowser() {
  const labelHtml = generateLabelHtml(labelPreviewData.value)
  const printWindow = window.open('', '_blank', 'width=400,height=400')
  if (printWindow) {
    printWindow.document.write(labelHtml)
    printWindow.document.close()
    printWindow.onload = function() {
      printWindow.print()
    }
  } else {
    ElMessage.error('无法打开打印窗口，请检查浏览器弹窗设置')
  }
}

function generateLabelHtml(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>维修标签 - ${data.boxCode}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @media print {
          body { margin: 0; padding: 0; }
        }
        body {
          width: 80mm;
          padding: 5mm;
          font-family: 'Microsoft YaHei', sans-serif;
          font-size: 12px;
        }
        .label-title {
          text-align: center;
          font-size: 16px;
          font-weight: bold;
          color: #e74c3c;
          margin-bottom: 6px;
          border-bottom: 2px solid #e74c3c;
          padding-bottom: 4px;
        }
        .label-box-code {
          text-align: center;
          font-size: 20px;
          font-weight: bold;
          margin: 8px 0;
          letter-spacing: 2px;
        }
        .label-row {
          margin: 4px 0;
          display: flex;
          justify-content: space-between;
        }
        .label-label {
          color: #666;
        }
        .label-value {
          font-weight: bold;
        }
        .label-damage {
          background: #fff3f3;
          padding: 4px;
          margin: 6px 0;
          border-radius: 3px;
        }
        .label-footer {
          margin-top: 8px;
          padding-top: 4px;
          border-top: 1px dashed #ccc;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #999;
        }
        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          background: #e74c3c;
          color: white;
          border-radius: 10px;
          font-size: 10px;
        }
      </style>
    </head>
    <body>
      <div class="label-title">维 修 标 签</div>
      <div class="label-box-code">${data.boxCode || '-'}</div>
      <div class="label-row">
        <span class="label-label">线路:</span>
        <span class="label-value">${data.route || '-'}</span>
      </div>
      <div class="label-damage">
        <div class="label-label">破损位置:</div>
        <div class="label-value">${data.damagePosition || '-'}</div>
      </div>
      <div class="label-row">
        <span class="label-label">处理方式:</span>
        <span class="label-value">${data.handleMethod || '-'}</span>
      </div>
      <div class="label-row">
        <span class="label-label">预计可用:</span>
        <span class="label-value">${data.expectedDate || '待定'}</span>
      </div>
      <div class="label-footer">
        <span class="status-badge">待维修</span>
        <span class="print-time">${data.printTime || ''}</span>
      </div>
    </body>
    </html>
  `
}

function completeRepair(record) {
  ElMessageBox.confirm(
    `确认箱体 ${record.boxCode} 维修完成？完成后状态将转为可再用`,
    '完成维修确认',
    {
      type: 'success',
      confirmButtonText: '确认完成',
      cancelButtonText: '取消'
    }
  ).then(() => {
    finishRepair(record.id)
    ElMessage.success(`箱体 ${record.boxCode} 维修完成，已转为可再用`)
  }).catch(() => {})
}

watch(
  () => state.boxes,
  () => {
    if (selectedBox.value) {
      const updated = state.boxes.find(b => b.id === selectedBox.value.id)
      if (!updated || (updated.status !== 'pending_repair' && updated.status !== 'repairing')) {
        if (pendingRepairBoxes.value.length > 0) {
          selectedBox.value = pendingRepairBoxes.value[0]
        } else {
          selectedBox.value = null
        }
      }
    }
  },
  { deep: true }
)

onMounted(() => {
  if (pendingRepairBoxes.value.length > 0) {
    selectBox(pendingRepairBoxes.value[0])
  }
})
</script>

<style scoped>
.repair-register-page {
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
  min-height: 0;
}

.pending-card,
.form-card,
.records-card {
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
  background: #fef2f2;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.box-item:hover {
  background: #fee2e2;
}

.box-item.active {
  background: #fee2e2;
  border-color: #ef4444;
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

.repair-form {
  padding: 8px 0;
}

.records-table {
  margin: 0 -8px;
}

.label-preview-wrapper {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: #f1f5f9;
  border-radius: 8px;
}

.label-preview {
  width: 80mm;
  min-height: 120mm;
  padding: 5mm;
  background: white;
  font-family: 'Microsoft YaHei', sans-serif;
  font-size: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.label-title {
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  color: #e74c3c;
  margin-bottom: 6px;
  border-bottom: 2px solid #e74c3c;
  padding-bottom: 4px;
}

.label-box-code {
  text-align: center;
  font-size: 20px;
  font-weight: bold;
  margin: 8px 0;
  letter-spacing: 2px;
}

.label-row {
  margin: 4px 0;
  display: flex;
  justify-content: space-between;
}

.label-label {
  color: #666;
}

.label-value {
  font-weight: bold;
}

.label-damage {
  background: #fff3f3;
  padding: 6px;
  margin: 8px 0;
  border-radius: 3px;
}

.label-damage .label-label {
  margin-bottom: 4px;
}

.label-footer {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px dashed #ccc;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  color: #999;
}

.status-badge {
  display: inline-block;
  padding: 2px 10px;
  background: #e74c3c;
  color: white;
  border-radius: 10px;
  font-size: 10px;
}

.print-time {
  font-size: 10px;
}
</style>
