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
      const data = JSON.parse(saved)
      if (data.stockBatches) {
        data.stockBatches = data.stockBatches.map(batch => {
          if (batch.expectedCodes) return batch
          return {
            ...batch,
            expectedCodes: []
          }
        })
        data.stockBatches = data.stockBatches.map(batch => {
          batch.wrongRouteBoxes = (batch.wrongRouteBoxes || []).map(item => {
            if (typeof item === 'string') {
              return { boxCode: item, originalRouteId: '', originalRouteName: '未知线路', scanTime: '' }
            }
            return item
          })
          batch.extraBoxes = (batch.extraBoxes || []).map(item => {
            if (typeof item === 'string') {
              return { boxCode: item, scanTime: '' }
            }
            return item
          })
          return batch
        })
      }
      return data
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
  const expectedCodes = batchData.expectedCodes || []
  const batch = {
    id: generateId('SB'),
    routeId: batchData.routeId,
    expectedCodes,
    scannedCodes: [],
    wrongRouteBoxes: [],
    extraBoxes: [],
    startTime: new Date().toISOString(),
    endTime: null,
    status: 'active'
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
  const scanTime = new Date().toLocaleString('zh-CN')
  const result = {
    boxCode,
    isNew: false,
    isDuplicate: false,
    isWrongRoute: false,
    isExtra: false,
    isInExpected: false,
    wrongRouteInfo: null
  }

  const allScannedCodes = [
    ...batch.scannedCodes,
    ...batch.wrongRouteBoxes.map(r => r.boxCode),
    ...batch.extraBoxes.map(r => r.boxCode)
  ]
  if (allScannedCodes.includes(boxCode)) {
    result.isDuplicate = true
    return result
  }

  if (box && box.routeId && box.routeId !== batch.routeId) {
    result.isWrongRoute = true
    result.wrongRouteInfo = {
      boxCode,
      originalRouteId: box.routeId,
      originalRouteName: getRouteName(box.routeId),
      scanTime
    }
    batch.wrongRouteBoxes.push(result.wrongRouteInfo)
    return result
  }

  const isInExpected = batch.expectedCodes.includes(boxCode)

  if (!isInExpected) {
    result.isExtra = true
    if (!box) {
      addBox({
        code: boxCode,
        routeId: batch.routeId,
        status: 'pending_cleaning'
      })
    } else {
      updateBoxStatus(boxCode, 'pending_cleaning')
    }
    batch.extraBoxes.push({ boxCode, scanTime })
    batch.scannedCodes.push(boxCode)
    return result
  }

  result.isInExpected = true

  if (!box) {
    result.isNew = true
    addBox({
      code: boxCode,
      routeId: batch.routeId,
      status: 'pending_cleaning'
    })
  } else {
    updateBoxStatus(boxCode, 'pending_cleaning')
  }

  batch.scannedCodes.push(boxCode)
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
