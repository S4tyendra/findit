import fastapi as f
from contextlib import asynccontextmanager
import os
from fastapi import staticfiles, Depends, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi.middleware.cors import CORSMiddleware

from db_setup import mongo_manager, get_db, config
from helpers.logger import logger, ic
import os
from fastapi import HTTPException
from fastapi.staticfiles import StaticFiles

# Import API routers
from api import items as items_router
from api import locations as locations_router # Import locations router

app = f.FastAPI(
    title="Lost & Found Backend", # Updated title
    # lifespan=lifespan #lifespan for cleaner startup/shutdown
)

origins = [
    "http://localhost:5173",
    "http://localhost",
    *config.ALLOWED_ORIGINS,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Login"],
)

# Include API routers
app.include_router(items_router.router)
app.include_router(locations_router.router)


@app.on_event("startup")
async def startup_event():
    logger.info("Starting up the FastAPI application.")
    await mongo_manager.connect()
    db_instance = mongo_manager.get_db()
    try:
        # Indexes for the lost_items collection
        await db_instance.lost_items.create_index("management_token", unique=True)
        await db_instance.lost_items.create_index("created_at")
        await db_instance.lost_items.create_index("reporter_email")
        # Add indexes for location fields later if needed for filtering (Phase 4)
        # await db_instance.lost_items.create_index("country")
        # await db_instance.lost_items.create_index("state")
        # await db_instance.lost_items.create_index("city")
        logger.info("Ensured indexes on 'lost_items' collection (management_token, created_at, reporter_email).")

    except Exception as e:
        logger.error(f"Error creating database indexes during startup: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down the FastAPI application.")
    await mongo_manager.disconnect()
    logger.info("FastAPI application has been shut down.")

# Mount static files directory for uploaded images
app.mount("/images", StaticFiles(directory="images"), name="uploaded_images")

static_dir = "dist" # Frontend build output

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """
    Serves the index.html for SPA routing, or specific files if they exist.
    Handles requests that weren't matched by API routes or /static mount.
    """
    spa_index = os.path.join(static_dir, "index.html")
    abs_static_dir = os.path.abspath(static_dir)

    # Check if path exists with .html extension for Next.js pages
    if not full_path.endswith(".html") and not full_path.endswith(".svg") and not full_path.endswith(".ico"):
        html_path = os.path.join(abs_static_dir, f"{full_path}.html")
        if os.path.isfile(html_path):
            return f.responses.FileResponse(html_path)
    
    # If this is a specific path request, try to serve it
    abs_requested_path = os.path.abspath(os.path.join(abs_static_dir, full_path))
    if not abs_requested_path.startswith(abs_static_dir):
        logger.warning(f"Directory traversal attempt blocked: {full_path}")
        raise f.HTTPException(status_code=404, detail="Not Found")
    
    if os.path.isfile(abs_requested_path):
        return f.responses.FileResponse(abs_requested_path)
    
    # Fallback to SPA index
    if os.path.exists(spa_index):
        return f.responses.FileResponse(spa_index)
    else:
        logger.error(f"SPA index file '{spa_index}' not found.")
        raise f.HTTPException(status_code=404, detail="SPA index not found")

if os.path.isdir(static_dir):
    app.mount("/_next", staticfiles.StaticFiles(directory=os.path.join(static_dir, "_next")), name="next_assets")
    app.mount("/", staticfiles.StaticFiles(directory=static_dir), name="static_assets")
else:
    logger.error(f"Static files directory '{static_dir}' still not found after check. SPA serving will fail.")

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Uvicorn server on http://{config.APP_HOST}:{config.APP_PORT}")
    uvicorn.run(
        "main:app",
        host=config.APP_HOST,
        port=config.APP_PORT,
        reload=True
    )