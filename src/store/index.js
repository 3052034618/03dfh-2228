import { reactive, watch } from 'vue'

const STORAGE_KEY = 'cold_chain_inventory_data'

const defaultData = {
  routes: [
    { id: 'R001', name: '北京-海淀线路' },
    { id: 'R002', name: '北京-朝阳线路' },
    { id: 'R003', name: '上海-浦东线路' },
    { id: 'R004', name: '广州-天河线路' }
  ],
  boxes: [],
  stockBatches: [],
  repairRecords: [],
  cleaningRecords: []
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('加载数据失败:', e)
  }
  return { ...defaultData }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('保存数据失败:', e)
  }
}

const store = reactive(loadData())

watch(
  () => store,
  (newVal) => {
    saveData(newVal)
  },
  { deep: true }
)

function generateId(prefix) {
  return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase()
}

function getBoxByCode(boxCode) {
  return store.boxes.find(b => b.code === boxCode)
}

function addBox(boxData) {
  const existing = getBoxByCode(boxData.code)
  if (existing) {
    return existing
  }
  const box = {
    id: generateId('B'),
    code: boxData.code,
    routeId: boxData.routeId || null,
    status: 'idle',
    createdAt: new Date().toISOString(),
    ...boxData
  }
  store.boxes.push(box)
  return box
}

function updateBoxStatus(boxCode, status, extra = {}) {
  const box = getBoxByCode(boxCode)
  if (box) {
    box.status = status
    Object.assign(box, extra)
    return box
  }
  return null
}

function createStockBatch(batchData) {
  const batch = {
    id: generateId('SB'),
    routeId: batchData.routeId,
    expectedCount: batchData.expectedCount || 0,
    scannedCodes: [],
    wrongRouteBoxes: [],
    extraBoxes: [],
    startTime: new Date().toISOString(),
    endTime: null,
    status: 'active',
    ...batchData
  }
  store.stockBatches.unshift(batch)
  return batch
}

function getActiveStockBatch(routeId) {
  return store.stockBatches.find(b => b.routeId === routeId && b.status === 'active')
}

function scanBoxForStock(batchId, boxCode) {
  const batch = store.stockBatches.find(b => b.id === batchId)
  if (!batch) return null

  const box = getBoxByCode(boxCode)
  const result = {
    boxCode,
    isNew: false,
    isDuplicate: false,
    isWrongRoute: false,
    isExtra: false
  }

  if (batch.scannedCodes.includes(boxCode)) {
    result.isDuplicate = true
    return result
  }

  if (box && box.routeId && box.routeId !== batch.routeId) {
    result.isWrongRoute = true
    if (!batch.wrongRouteBoxes.includes(boxCode)) {
      batch.wrongRouteBoxes.push(boxCode)
    }
    return result
  }

  if (!box || !box.routeId) {
    result.isNew = true
    const newBox = addBox({
      code: boxCode,
      routeId: batch.routeId,
      status: 'pending_cleaning'
    })
    batch.scannedCodes.push(boxCode)
    return result
  }

  batch.scannedCodes.push(boxCode)
  
  if (batch.scannedCodes.length > batch.expectedCount) {
    result.isExtra = true
    if (!batch.extraBoxes.includes(boxCode)) {
      batch.extraBoxes.push(boxCode)
    }
  }

  updateBoxStatus(boxCode, 'pending_cleaning')

  return result
}

function finishStockBatch(batchId) {
  const batch = store.stockBatches.find(b => b.id === batchId)
  if (batch) {
    batch.status = 'finished'
    batch.endTime = new Date().toISOString()
  }
  return batch
}

function getPendingCleaningBoxes() {
  return store.boxes.filter(b => b.status === 'pending_cleaning')
}

function getAvailableBoxesByStatus(status) {
  return store.boxes.filter(b => b.status === status)
}

function processCleaning(boxCode, checkItems, passed) {
  const record = {
    id: generateId('CR'),
    boxCode,
    checkItems,
    passed,
    operator: checkItems.operator || '',
    createdAt: new Date().toISOString()
  }
  store.cleaningRecords.unshift(record)

  if (passed) {
    updateBoxStatus(boxCode, 'available')
  } else {
    updateBoxStatus(boxCode, 'pending_repair')
  }

  return record
}

function getPendingRepairBoxes() {
  return store.boxes.filter(b => b.status === 'pending_repair' || b.status === 'repairing')
}

function createRepairRecord(repairData) {
  const record = {
    id: generateId('RR'),
    boxCode: repairData.boxCode,
    damagePosition: repairData.damagePosition || '',
    handleMethod: repairData.handleMethod || '',
    expectedDate: repairData.expectedDate || '',
    remark: repairData.remark || '',
    status: 'repairing',
    createdAt: new Date().toISOString(),
    finishedAt: null
  }
  store.repairRecords.unshift(record)
  updateBoxStatus(repairData.boxCode, 'repairing')
  return record
}

function finishRepair(recordId) {
  const record = store.repairRecords.find(r => r.id === recordId)
  if (record) {
    record.status = 'finished'
    record.finishedAt = new Date().toISOString()
    updateBoxStatus(record.boxCode, 'available')
  }
  return record
}

function getRouteName(routeId) {
  const route = store.routes.find(r => r.id === routeId)
  return route ? route.name : '未知线路'
}

function initMockData() {
  if (store.boxes.length > 0) return

  const mockBoxes = []
  for (let i = 1; i <= 30; i++) {
    const routeIdx = i % 4
    let status = 'idle'
    if (i > 15) {
      status = 'pending_cleaning'
    }
    if (i === 5) {
      status = 'repairing'
    }
    mockBoxes.push({
      id: 'B' + i,
      code: 'BOX' + String(i).padStart(4, '0'),
      routeId: store.routes[routeIdx].id,
      status,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    })
  }
  store.boxes = mockBoxes

  store.repairRecords = [
    {
      id: 'RR001',
      boxCode: 'BOX0005',
      damagePosition: '箱盖密封条破损',
      handleMethod: '更换密封条',
      expectedDate: '2026-06-25',
      remark: '密封性能下降',
      status: 'repairing',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      finishedAt: null
    }
  ]
}

initMockData()

export const useStore = () => ({
  state: store,
  generateId,
  getBoxByCode,
  addBox,
  updateBoxStatus,
  createStockBatch,
  getActiveStockBatch,
  scanBoxForStock,
  finishStockBatch,
  getPendingCleaningBoxes,
  getAvailableBoxesByStatus,
  processCleaning,
  getPendingRepairBoxes,
  createRepairRecord,
  finishRepair,
  getRouteName,
  initMockData
})
