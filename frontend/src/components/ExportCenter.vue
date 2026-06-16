<template>
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-gray-900 rounded-xl w-[900px] max-h-[90vh] flex flex-col shadow-2xl border border-gray-700">
      <div class="flex justify-between items-center p-4 border-b border-gray-700">
        <h2 class="text-lg font-bold text-orange-400">📊 数据导出中心</h2>
        <button @click="$emit('close')" class="text-gray-400 hover:text-white text-xl">&times;</button>
      </div>

      <div class="flex flex-1 overflow-hidden">
        <div class="w-[420px] border-r border-gray-700 overflow-y-auto p-4 space-y-4">
          <div class="space-y-2">
            <label class="text-xs text-gray-400 block">导出类型</label>
            <div class="flex gap-2">
              <button
                @click="config.exportType = 'trend'"
                class="flex-1 py-2 rounded text-sm transition"
                :class="config.exportType === 'trend' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
              >
                📈 趋势数据
              </button>
              <button
                @click="config.exportType = 'alarm'"
                class="flex-1 py-2 rounded text-sm transition"
                :class="config.exportType === 'alarm' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
              >
                ⚠ 告警明细
              </button>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-xs text-gray-400 flex justify-between">
              <span>选择设备</span>
              <button @click="toggleAllDevices" class="text-orange-400 hover:underline text-xs">
                {{ allDevicesSelected ? '取消全选' : '全选' }}
              </button>
            </label>
            <div class="space-y-1 max-h-28 overflow-y-auto bg-gray-800 rounded p-2">
              <label v-for="d in store.devices" :key="d.id" class="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-700 p-1 rounded">
                <input type="checkbox" :value="d.id" v-model="config.deviceIds" class="accent-orange-500" />
                <span class="text-gray-300">{{ d.name }}</span>
                <span class="w-2 h-2 rounded-full" :class="d.online ? 'bg-green-500' : 'bg-red-500'"></span>
              </label>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-xs text-gray-400 flex justify-between">
              <span>选择指标</span>
              <button @click="toggleAllRegisters" class="text-orange-400 hover:underline text-xs">
                {{ allRegistersSelected ? '取消全选' : '全选' }}
              </button>
            </label>
            <div class="space-y-1 max-h-24 overflow-y-auto bg-gray-800 rounded p-2">
              <label v-for="name in allRegisterNames" :key="name" class="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-700 p-1 rounded">
                <input type="checkbox" :value="name" v-model="config.registerNames" class="accent-orange-500" />
                <span class="text-gray-300">{{ name }}</span>
              </label>
            </div>
            <div v-if="config.registerNames.length === 0" class="text-xs text-gray-500">未选择则导出所有指标</div>
          </div>

          <div v-if="config.exportType === 'alarm'" class="space-y-2">
            <label class="text-xs text-gray-400">告警级别</label>
            <div class="flex gap-2">
              <label class="flex items-center gap-1 text-sm cursor-pointer bg-gray-800 px-3 py-1.5 rounded">
                <input type="checkbox" value="critical" v-model="config.alarmLevels" class="accent-red-500" />
                <span class="text-red-400">严重</span>
              </label>
              <label class="flex items-center gap-1 text-sm cursor-pointer bg-gray-800 px-3 py-1.5 rounded">
                <input type="checkbox" value="warning" v-model="config.alarmLevels" class="accent-yellow-500" />
                <span class="text-yellow-400">警告</span>
              </label>
              <label class="flex items-center gap-1 text-sm cursor-pointer bg-gray-800 px-3 py-1.5 rounded">
                <input type="checkbox" value="info" v-model="config.alarmLevels" class="accent-blue-500" />
                <span class="text-blue-400">信息</span>
              </label>
            </div>
            <div v-if="!config.alarmLevels || config.alarmLevels.length === 0" class="text-xs text-gray-500">未选择则导出所有级别</div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-xs text-gray-400">开始时间</label>
              <input type="datetime-local" v-model="startTimeStr" class="w-full bg-gray-800 rounded px-3 py-2 text-sm text-gray-200" />
            </div>
            <div class="space-y-1">
              <label class="text-xs text-gray-400">结束时间</label>
              <input type="datetime-local" v-model="endTimeStr" class="w-full bg-gray-800 rounded px-3 py-2 text-sm text-gray-200" />
            </div>
          </div>

          <div class="flex gap-2">
            <button
              @click="setQuickRange(3600000)"
              class="flex-1 text-xs py-1.5 rounded bg-gray-800 text-gray-400 hover:bg-gray-700"
            >
              最近1小时
            </button>
            <button
              @click="setQuickRange(86400000)"
              class="flex-1 text-xs py-1.5 rounded bg-gray-800 text-gray-400 hover:bg-gray-700"
            >
              最近24小时
            </button>
            <button
              @click="setQuickRange(604800000)"
              class="flex-1 text-xs py-1.5 rounded bg-gray-800 text-gray-400 hover:bg-gray-700"
            >
              最近7天
            </button>
          </div>

          <div class="space-y-2">
            <label class="text-xs text-gray-400">导出格式</label>
            <div class="flex gap-2">
              <button
                @click="config.format = 'xlsx'"
                class="flex-1 py-2 rounded text-sm transition"
                :class="config.format === 'xlsx' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
              >
                📗 Excel (.xlsx)
              </button>
              <button
                @click="config.format = 'csv'"
                class="flex-1 py-2 rounded text-sm transition"
                :class="config.format === 'csv' ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
              >
                📄 CSV (.csv)
              </button>
            </div>
          </div>

          <div class="bg-gray-800 rounded p-3 space-y-2">
            <h4 class="text-xs text-gray-400">导出预览</h4>
            <div class="text-sm space-y-1">
              <div class="flex justify-between">
                <span class="text-gray-500">数据类型:</span>
                <span class="text-gray-300">{{ config.exportType === 'trend' ? '趋势数据' : '告警明细' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">设备数量:</span>
                <span class="text-gray-300">{{ config.deviceIds.length }} 台</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">指标数量:</span>
                <span class="text-gray-300">{{ config.registerNames.length || '全部' }} 项</span>
              </div>
              <div v-if="config.exportType === 'trend'" class="flex justify-between">
                <span class="text-gray-500">预计数据量:</span>
                <span class="text-gray-300">{{ estimateDataCount }} 条</span>
              </div>
              <div v-if="config.exportType === 'alarm'" class="flex justify-between">
                <span class="text-gray-500">预计数据量:</span>
                <span class="text-gray-300">{{ estimateAlarmCount }} 条</span>
              </div>
            </div>
          </div>

          <button
            @click="handleExport"
            :disabled="isExporting || config.deviceIds.length === 0"
            class="w-full py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            :class="isExporting ? 'bg-gray-600' : 'bg-orange-600 hover:bg-orange-500 text-white'"
          >
            <span v-if="isExporting">⏳ 正在导出...</span>
            <span v-else>📥 开始导出</span>
          </button>
        </div>

        <div class="flex-1 flex flex-col overflow-hidden">
          <div class="p-4 border-b border-gray-700">
            <h3 class="text-sm font-medium text-gray-300">📋 导出历史</h3>
          </div>
          <div class="flex-1 overflow-y-auto p-4 space-y-2">
            <div v-if="store.exportHistory.length === 0" class="text-center text-gray-600 py-12">
              暂无导出记录
            </div>
            <div
              v-for="record in store.exportHistory"
              :key="record.id"
              class="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition"
            >
              <div class="flex justify-between items-start">
                <div>
                  <div class="text-sm font-medium text-gray-200">{{ record.name }}</div>
                  <div class="text-xs text-gray-500 mt-1">{{ record.timeRange }}</div>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="text-xs px-2 py-0.5 rounded"
                    :class="record.type === 'trend' ? 'bg-blue-900 text-blue-300' : 'bg-red-900 text-red-300'"
                  >
                    {{ record.type === 'trend' ? '趋势' : '告警' }}
                  </span>
                  <span class="text-xs text-gray-500">{{ record.format.toUpperCase() }}</span>
                </div>
              </div>
              <div class="flex justify-between items-center mt-2 text-xs">
                <div class="text-gray-500">
                  {{ record.deviceCount }} 台设备 · {{ record.fileSize }}
                </div>
                <div class="text-gray-500">
                  {{ new Date(record.createdAt).toLocaleString() }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useModbusStore } from '../store/modbus'
import type { ExportConfig, ExportType, ExportFormat } from '../types'

const emit = defineEmits<{ (e: 'close'): void }>()

const store = useModbusStore()
const isExporting = ref(false)

const config = ref<ExportConfig>({
  exportType: 'trend' as ExportType,
  deviceIds: [],
  registerNames: [],
  startTime: Date.now() - 3600000,
  endTime: Date.now(),
  format: 'xlsx' as ExportFormat,
  alarmLevels: []
})

const startTimeStr = ref('')
const endTimeStr = ref('')

function formatDateTimeLocal(timestamp: number): string {
  const d = new Date(timestamp)
  const offset = d.getTimezoneOffset() * 60000
  const local = new Date(timestamp - offset)
  return local.toISOString().slice(0, 16)
}

function parseDateTimeLocal(str: string): number {
  if (!str) return Date.now()
  const d = new Date(str)
  return d.getTime()
}

watch(startTimeStr, (v) => { config.value.startTime = parseDateTimeLocal(v) })
watch(endTimeStr, (v) => { config.value.endTime = parseDateTimeLocal(v) })

const allRegisterNames = computed(() => store.getAllRegisterNames())

const allDevicesSelected = computed(() =>
  store.devices.length > 0 && config.value.deviceIds.length === store.devices.length
)

const allRegistersSelected = computed(() =>
  allRegisterNames.value.length > 0 && config.value.registerNames.length === allRegisterNames.value.length
)

const estimateDataCount = computed(() => {
  let count = 0
  const devices = store.devices.filter(d => config.value.deviceIds.includes(d.id))
  for (const dev of devices) {
    for (const reg of dev.registers) {
      if (config.value.registerNames.length > 0 && !config.value.registerNames.includes(reg.name)) continue
      const key = `${dev.id}_${reg.address}`
      const hd = store.historyData[key]
      if (hd) count += hd.time.length
    }
  }
  return count
})

const estimateAlarmCount = computed(() => {
  return store.getFilteredAlarms(config.value).length
})

function toggleAllDevices() {
  if (allDevicesSelected.value) {
    config.value.deviceIds = []
  } else {
    config.value.deviceIds = store.devices.map(d => d.id)
  }
}

function toggleAllRegisters() {
  if (allRegistersSelected.value) {
    config.value.registerNames = []
  } else {
    config.value.registerNames = [...allRegisterNames.value]
  }
}

function setQuickRange(ms: number) {
  const now = Date.now()
  config.value.endTime = now
  config.value.startTime = now - ms
  startTimeStr.value = formatDateTimeLocal(config.value.startTime)
  endTimeStr.value = formatDateTimeLocal(config.value.endTime)
}

async function handleExport() {
  if (config.value.deviceIds.length === 0) return
  isExporting.value = true
  try {
    await store.exportData(config.value)
  } finally {
    isExporting.value = false
  }
}

onMounted(() => {
  const now = Date.now()
  config.value.startTime = now - 3600000
  config.value.endTime = now
  startTimeStr.value = formatDateTimeLocal(config.value.startTime)
  endTimeStr.value = formatDateTimeLocal(config.value.endTime)
})
</script>
