# config/routers.py
import importlib
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class RouterManager:
    """
    Detects and imports FastAPI routers from apps/*/routers.py
    and includes them into provided FastAPI `app`.
    """

    def __init__(self, app):
        self.app = app
        # project root is two parents up from this file (config/)
        self.project_root = Path(__file__).resolve().parents[1]
        self.apps_directory = self.project_root / "apps"

    def import_routers(self):
        if not self.apps_directory.exists():
            logger.error(f"Apps directory not found: {self.apps_directory}")
            return

        for app_dir in self.apps_directory.iterdir():
            if not app_dir.is_dir():
                continue
            
            # Import regular routers.py
            routers_file = app_dir / "routers.py"
            if routers_file.exists():
                module_name = f"apps.{app_dir.name}.routers"
                try:
                    module = importlib.import_module(module_name)
                    if hasattr(module, "router"):
                        self.app.include_router(module.router)
                        logger.info(f"Imported router: {module_name}")
                    else:
                        logger.warning(f"No 'router' found in {module_name}")
                except Exception as exc:
                    logger.error(f"Failed to import {module_name}: {exc}", exc_info=True)
            
            # Import admin routers (routers_admin.py)
            admin_routers_file = app_dir / "routers_admin.py"
            if admin_routers_file.exists():
                admin_module_name = f"apps.{app_dir.name}.routers_admin"
                try:
                    admin_module = importlib.import_module(admin_module_name)
                    if hasattr(admin_module, "router"):
                        self.app.include_router(admin_module.router)
                        logger.info(f"Imported admin router: {admin_module_name}")
                    else:
                        logger.warning(f"No 'router' found in {admin_module_name}")
                except Exception as exc:
                    logger.error(f"Failed to import {admin_module_name}: {exc}", exc_info=True)
