from fastapi import APIRouter
from app.models.schemas import ExportConfig, ExportHistoryRecord
from app.services.export_service import export_data, get_export_history, get_register_names

router = APIRouter()


@router.post("/export")
async def create_export(config: ExportConfig):
    """Create and download an export file."""
    return export_data(config)


@router.get("/export/history", response_model=list[ExportHistoryRecord])
async def list_export_history():
    """Get export history records."""
    return get_export_history()


@router.get("/export/register-names")
async def list_register_names():
    """Get all available register names for filtering."""
    return get_register_names()
