"""Routes that emulate the @base44/sdk public-app endpoints used by the
nexus-realty AuthContext.jsx, plus app health.
"""
from fastapi import APIRouter

router = APIRouter(tags=["public"])


@router.get("/api/apps/public/prod/public-settings/by-id/{app_id}")
async def public_settings(app_id: str):
    return {
        "id": app_id,
        "public_settings": {
            "auth_required": False,
            "app_name": "Nexus Realty",
            "theme": {"primary": "#D4AF37"},
            "features": {
                "registration_open": True,
            },
        },
    }


@router.get("/api/health")
async def health():
    return {"status": "ok"}
