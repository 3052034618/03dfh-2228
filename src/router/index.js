import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/stock-check'
  },
  {
    path: '/stock-check',
    name: 'StockCheck',
    component: () => import('../views/StockCheck.vue'),
    meta: { title: '入库盘点' }
  },
  {
    path: '/batch-history',
    name: 'BatchHistory',
    component: () => import('../views/BatchHistory.vue'),
    meta: { title: '批次历史' }
  },
  {
    path: '/cleaning-sort',
    name: 'CleaningSort',
    component: () => import('../views/CleaningSort.vue'),
    meta: { title: '清洗分拣' }
  },
  {
    path: '/repair-register',
    name: 'RepairRegister',
    component: () => import('../views/RepairRegister.vue'),
    meta: { title: '维修登记' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
