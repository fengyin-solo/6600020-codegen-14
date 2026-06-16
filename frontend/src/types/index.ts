export interface ModbusRegister {
  address: number
  name: string
  type: 'coil' | 'discrete' | 'holding' | 'input'
  value: number | boolean
  unit: string
  updatedAt: number
}

export interface Device {
  id: string
  name: string
  ip: string
  port: number
  slaveId: number
  online: boolean
  registers: ModbusRegister[]
}

export interface Alarm {
  id: string
  deviceId: string
  register: string
  message: string
  level: 'info' | 'warning' | 'critical'
  timestamp: number
  acknowledged: boolean
}

export interface TrendDataPoint {
  time: number
  deviceId: string
  deviceName: string
  register: string
  registerName: string
  value: number | boolean
  unit: string
}

export type ExportType = 'trend' | 'alarm'
export type ExportFormat = 'xlsx' | 'csv'

export interface ExportConfig {
  exportType: ExportType
  deviceIds: string[]
  registerNames: string[]
  startTime: number
  endTime: number
  format: ExportFormat
  alarmLevels?: Alarm['level'][]
}

export interface ExportTask {
  id: string
  config: ExportConfig
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: number
  completedAt?: number
  fileSize?: number
  error?: string
}

export interface ExportHistoryRecord {
  id: string
  name: string
  type: ExportType
  format: ExportFormat
  deviceCount: number
  timeRange: string
  createdAt: number
  fileSize: string
}
