<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-left">
        <el-icon class="logo-icon"><ColdDrink /></el-icon>
        <h1 class="app-title">低温箱周转盘点系统</h1>
      </div>
      <div class="header-right">
        <span class="current-time">{{ currentTime }}</span>
      </div>
    </el-header>
    <el-container>
      <el-aside width="220px" class="app-aside">
        <el-menu
          :default-active="activeMenu"
          class="nav-menu"
          @select="handleMenuSelect"
        >
          <el-menu-item index="/stock-check">
            <el-icon><Box /></el-icon>
            <span>入库盘点</span>
          </el-menu-item>
          <el-menu-item index="/batch-history">
            <el-icon><Document /></el-icon>
            <span>批次历史</span>
          </el-menu-item>
          <el-menu-item index="/cleaning-sort">
            <el-icon><Brush /></el-icon>
            <span>清洗分拣</span>
          </el-menu-item>
          <el-menu-item index="/repair-register">
            <el-icon><Tools /></el-icon>
            <span>维修登记</span>
          </el-menu-item>
        </el-menu>
        <div class="aside-footer">
          <el-divider />
          <div class="stats-summary">
            <div class="stat-item">
              <span class="stat-label">在库箱体</span>
              <span class="stat-value">{{ stats.total }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">待清洗</span>
              <span class="stat-value warning">{{ stats.pendingCleaning }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">待维修</span>
              <span class="stat-value danger">{{ stats.pendingRepair }}</span>
            </div>
          </div>
        </div>
      </el-aside>
      <el-main class="app-main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from './store'

const route = useRoute()
const router = useRouter()
const { state } = useStore()

const currentTime = ref('')
let timer = null

const activeMenu = computed(() => route.path)

const stats = computed(() => {
  const boxes = state.boxes
  return {
    total: boxes.length,
    pendingCleaning: boxes.filter(b => b.status === 'pending_cleaning').length,
    pendingRepair: boxes.filter(b => b.status === 'pending_repair' || b.status === 'repairing').length
  }
})

function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function handleMenuSelect(index) {
  router.push(index)
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  width: 100%;
}
</style>

<style scoped>
.app-container {
  height: 100vh;
}

.app-header {
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 28px;
}

.app-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.header-right {
  font-size: 14px;
  opacity: 0.9;
}

.app-aside {
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}

.nav-menu {
  border-right: none;
  flex: 1;
  padding-top: 12px;
}

.nav-menu .el-menu-item {
  height: 52px;
  line-height: 52px;
  font-size: 15px;
  margin: 4px 8px;
  border-radius: 6px;
}

.nav-menu .el-menu-item.is-active {
  background: #dbeafe !important;
  color: #1e40af !important;
}

.aside-footer {
  padding: 12px;
}

.stats-summary {
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.stat-value.warning {
  color: #f59e0b;
}

.stat-value.danger {
  color: #ef4444;
}

.app-main {
  background: #f1f5f9;
  padding: 20px;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
