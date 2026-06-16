import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import * as XLSX from 'xlsx'
import type { Device, Alarm, ModbusRegister, ExportConfig, ExportTask, ExportHistoryRecord, TrendDataPoint } from '../types'

export const useModbusStore = defineStore('modbus', () => {
  const devices = ref<Device[]>([])
  const alarms = ref<Alarm[]>([])
  const historyData = ref<Record<string, { time: number[]; values: number[] }>>({})
  const isPolling = ref(false)
  const pollInterval = ref(1000)
  const selectedDevice = ref<Device | null>(null)

  const criticalAlarms = computed(() => alarms.value.filter(a => a.level === 'critical' && !a.acknowledged))
  const onlineDevices = computed(() => devices.value.filter(d => d.online))

  function initMockDevices() {
    devices.value = [
      {
        id: 'dev1', name: '温湿度传感器-A区', ip: '192.168.1.101', port: 502, slaveId: 1, online: true,
        registers: [
          { address: 0, name: '温度', type: 'holding', value: 25.6, unit: '°C', updatedAt: Date.now() },
          { address: 1, name: '湿度', type: 'holding', value: 62.3, unit: '%RH', updatedAt: Date.now() },
          { address: 2, name: '露点', type: 'holding', value: 17.8, unit: '°C', updatedAt: Date.now() },
        ]
      },
      {
        id: 'dev2', name: '压力变送器-B区', ip: '192.168.1.102', port: 502, slaveId: 2, online: true,
        registers: [
          { address: 0, name: '管道压力', type: 'holding', value: 3.45, unit: 'MPa', updatedAt: Date.now() },
          { address: 1, name: '差压', type: 'holding', value: 0.12, unit: 'kPa', updatedAt: Date.now() },
        ]
      },
      {
        id: 'dev3', name: '电机控制器-C区', ip: '192.168.1.103', port: 502, slaveId: 3, online: false,
        registers: [
          { address: 0, name: '转速', type: 'holding', value: 1480, unit: 'RPM', updatedAt: Date.now() },
          { address: 1, name: '电流', type: 'holding', value: 12.5, unit: 'A', updatedAt: Date.now() },
          { address: 2, name: '运行状态', type: 'coil', value: true, unit: '', updatedAt: Date.now() },
        ]
      },
      {
        id: 'dev4', name: '流量计-D区', ip: '192.168.1.104', port: 502, slaveId: 4, online: true,
        registers: [
          { address: 0, name: '瞬时流量', type: 'holding', value: 156.7, unit: 'L/min', updatedAt: Date.now() },
          { address: 1, name: '累计流量', type: 'holding', value: 98234, unit: 'L', updatedAt: Date.now() },
        ]
      },
    ]
    selectedDevice.value = devices.value[0]
  }

  function simulatePoll() {
    for (const dev of devices.value) {
      if (!dev.online) continue
      for (const reg of dev.registers) {
        if (typeof reg.value === 'number') {
          const noise = (Math.random() - 0.5) * reg.value * 0.02
          reg.value = Math.round((reg.value + noise) * 100) / 100
          reg.updatedAt = Date.now()
          const key = `${dev.id}_${reg.address}`
          if (!historyData.value[key]) historyData.value[key] = { time: [], values: [] }
          historyData.value[key].time.push(Date.now())
          historyData.value[key].values.push(reg.value)
          if (historyData.value[key].time.length > 100) {
            historyData.value[key].time.shift()
            historyData.value[key].values.shift()
          }
          // Check thresholds
          if (reg.name === '温度' && reg.value > 28) {
            alarms.value.unshift({
              id: `a_${Date.now()}`, deviceId: dev.id, register: reg.name,
              message: `${dev.name} ${reg.name}超限: ${reg.value}${reg.unit}`,
              level: reg.value > 30 ? 'critical' : 'warning',
              timestamp: Date.now(), acknowledged: false
            })
          }
        }
      }
    }
    if (alarms.value.length > 50) alarms.value = alarms.value.slice(0, 50)
  }

  function acknowledgeAlarm(id: string) {
    const a = alarms.value.find(a => a.id === id)
    if (a) a.acknowledged = true
  }

  function toggleDevice(id: string) {
    const d = devices.value.find(d => d.id === id)
    if (d) d.online = !d.online
  }

  const exportTasks = ref<ExportTask[]>([])
  const exportHistory = ref<ExportHistoryRecord[]>([])

  function getTrendData(config: ExportConfig): TrendDataPoint[] {
    const data: TrendDataPoint[] = []
    const selectedDevices = devices.value.filter(d => config.deviceIds.includes(d.id))

    for (const dev of selectedDevices) {
      for (const reg of dev.registers) {
        if (config.registerNames.length > 0 && !config.registerNames.includes(reg.name)) continue
        const key = `${dev.id}_${reg.address}`
        const hd = historyData.value[key]
        if (!hd) continue

        for (let i = 0; i < hd.time.length; i++) {
          const t = hd.time[i]
          if (t < config.startTime || t > config.endTime) continue
          data.push({
            time: t,
            deviceId: dev.id,
            deviceName: dev.name,
            register: `${reg.address}`,
            registerName: reg.name,
            value: hd.values[i],
            unit: reg.unit
          })
        }
      }
    }
    return data.sort((a, b) => a.time - b.time)
  }

  function getFilteredAlarms(config: ExportConfig): Alarm[] {
    let filtered = alarms.value.filter(a =>
      a.timestamp >= config.startTime && a.timestamp <= config.endTime &&
      config.deviceIds.includes(a.deviceId)
    )
    if (config.registerNames && config.registerNames.length > 0) {
      filtered = filtered.filter(a => config.registerNames!.includes(a.register))
    }
    if (config.alarmLevels && config.alarmLevels.length > 0) {
      filtered = filtered.filter(a => config.alarmLevels!.includes(a.level))
    }
    return filtered.sort((a, b) => b.timestamp - a.timestamp)
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  function downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function trendToCSV(data: TrendDataPoint[]): string {
    const headers = ['时间', '设备ID', '设备名称', '寄存器地址', '指标名称', '数值', '单位']
    const rows = data.map(d => [
      new Date(d.time).toLocaleString(),
      d.deviceId,
      d.deviceName,
      d.register,
      d.registerName,
      typeof d.value === 'number' ? d.value : d.value ? 'ON' : 'OFF',
      d.unit
    ])
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  }

  function alarmToCSV(alarms: Alarm[], deviceMap: Record<string, string>): string {
    const headers = ['时间', '设备ID', '设备名称', '指标', '告警信息', '级别', '是否确认']
    const levelMap: Record<string, string> = { info: '信息', warning: '警告', critical: '严重' }
    const rows = alarms.map(a => [
      new Date(a.timestamp).toLocaleString(),
      a.deviceId,
      deviceMap[a.deviceId] || '',
      a.register,
      a.message,
      levelMap[a.level] || a.level,
      a.acknowledged ? '是' : '否'
    ])
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  }

  async function exportData(config: ExportConfig): Promise<ExportTask> {
    const task: ExportTask = {
      id: `task_${Date.now()}`,
      config,
      status: 'running',
      createdAt: Date.now()
    }
    exportTasks.value.unshift(task)

    try {
      await new Promise(resolve => setTimeout(resolve, 500))

      const deviceMap: Record<string, string> = {}
      devices.value.forEach(d => { deviceMap[d.id] = d.name })

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const typeName = config.exportType === 'trend' ? '趋势数据' : '告警明细'
      const filename = `${typeName}_${timestamp}.${config.format}`

      let blob: Blob
      let fileSize: number

      if (config.exportType === 'trend') {
        const data = getTrendData(config)
        if (config.format === 'xlsx') {
          const wsData = data.map(d => ({
            '时间': new Date(d.time).toLocaleString(),
            '设备ID': d.deviceId,
            '设备名称': d.deviceName,
            '寄存器地址': d.register,
            '指标名称': d.registerName,
            '数值': typeof d.value === 'number' ? d.value : d.value ? 'ON' : 'OFF',
            '单位': d.unit
          }))
          const wb = XLSX.utils.book_new()
          const ws = XLSX.utils.json_to_sheet(wsData)
          ws['!cols'] = [
            { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 12 },
            { wch: 12 }, { wch: 10 }, { wch: 8 }
          ]
          XLSX.utils.book_append_sheet(wb, ws, '趋势数据')
          const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
          blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
          fileSize = buf.byteLength
        } else {
          const csv = trendToCSV(data)
          blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
          fileSize = blob.size
        }
      } else {
        const filteredAlarms = getFilteredAlarms(config)
        const levelMap: Record<string, string> = { info: '信息', warning: '警告', critical: '严重' }
        if (config.format === 'xlsx') {
          const wsData = filteredAlarms.map(a => ({
            '时间': new Date(a.timestamp).toLocaleString(),
            '设备ID': a.deviceId,
            '设备名称': deviceMap[a.deviceId] || '',
            '指标': a.register,
            '告警信息': a.message,
            '级别': levelMap[a.level] || a.level,
            '是否确认': a.acknowledged ? '是' : '否'
          }))
          const wb = XLSX.utils.book_new()
          const ws = XLSX.utils.json_to_sheet(wsData)
          ws['!cols'] = [
            { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 12 },
            { wch: 30 }, { wch: 8 }, { wch: 10 }
          ]
          XLSX.utils.book_append_sheet(wb, ws, '告警明细')
          const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
          blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
          fileSize = buf.byteLength
        } else {
          const csv = alarmToCSV(filteredAlarms, deviceMap)
          blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
          fileSize = blob.size
        }
      }

      downloadFile(blob, filename)

      task.status = 'completed'
      task.completedAt = Date.now()
      task.fileSize = fileSize

      const historyRecord: ExportHistoryRecord = {
        id: task.id,
        name: filename,
        type: config.exportType,
        format: config.format,
        deviceCount: config.deviceIds.length,
        timeRange: `${new Date(config.startTime).toLocaleString()} ~ ${new Date(config.endTime).toLocaleString()}`,
        createdAt: task.createdAt,
        fileSize: formatFileSize(fileSize)
      }
      exportHistory.value.unshift(historyRecord)
      if (exportHistory.value.length > 20) exportHistory.value = exportHistory.value.slice(0, 20)

    } catch (error: any) {
      task.status = 'failed'
      task.error = error.message || '导出失败'
    }

    return task
  }

  function getAllRegisterNames(): string[] {
    const names = new Set<string>()
    devices.value.forEach(d => d.registers.forEach(r => names.add(r.name)))
    return Array.from(names)
  }

  return {
    devices, alarms, historyData, isPolling, pollInterval, selectedDevice,
    criticalAlarms, onlineDevices,
    exportTasks, exportHistory,
    initMockDevices, simulatePoll, acknowledgeAlarm, toggleDevice,
    exportData, getTrendData, getFilteredAlarms, getAllRegisterNames
  }
})
