from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ModbusRegister(BaseModel):
    address: int
    name: str
    type: str
    value: float
    unit: str

class Device(BaseModel):
    id: str
    name: str
    ip: str
    port: int
    slave_id: int
    online: bool
    registers: List[ModbusRegister] = []

class Alarm(BaseModel):
    id: str
    device_id: str
    register: str
    message: str
    level: str
    timestamp: float
    acknowledged: bool

class TrendDataPoint(BaseModel):
    time: float
    device_id: str
    device_name: str
    register: str
    register_name: str
    value: float
    unit: str

class ExportConfig(BaseModel):
    export_type: str
    device_ids: List[str]
    register_names: List[str] = []
    start_time: float
    end_time: float
    format: str
    alarm_levels: List[str] = []

class ExportTask(BaseModel):
    id: str
    status: str
    created_at: float
    completed_at: Optional[float] = None
    file_size: Optional[int] = None
    error: Optional[str] = None

class ExportHistoryRecord(BaseModel):
    id: str
    name: str
    type: str
    format: str
    device_count: int
    time_range: str
    created_at: float
    file_size: str
