"""Compatibility shim so supervisor's `uvicorn server:app` works."""
from app.main import app  # noqa: F401
