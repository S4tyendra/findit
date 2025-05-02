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
from api import locations as locations_router
from api import found_items as found_items_router # Import found items router

app = f.FastAPI(
    title="Lost & Found Backend",
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
app.include_router(found_items_router.router) # Include found items router


@app.on_event("startup")
async def startup_event():
    logger.info("Starting up the FastAPI application.")
    await mongo_manager.connect()
    db_instance = mongo_manager.get_db()
    try:
        # Indexes for the lost_items collection
        # Indexes for the lost_items collection
        await db_instance.lost_items.create_index("management_token", unique=True)
        await db_instance.lost_items.create_index("created_at")
        await db_instance.lost_items.create_index("reporter_email")
        await db_instance.lost_items.create_index([("description", "text")], name="description_text_index") # Add text index
        # TODO: Consider indexes on location for matching?
        logger.info("Ensured indexes on 'lost_items'.")

        # Indexes for the found_items collection
        await db_instance.found_items.create_index("created_at")
        await db_instance.found_items.create_index([("description", "text")], name="description_text_index") # Add text index
        # TODO: Consider indexes on location for matching?
        logger.info("Ensured indexes on 'found_items'.")
    except Exception as e:
        logger.error(f"Error creating database indexes during startup: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down the FastAPI application.")
    await mongo_manager.disconnect()
    logger.info("FastAPI application has been shut down.")

# Import required dependencies
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import httpx

# Proxy middleware for development
class DevProxyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if not request.url.path.startswith("/api") and not request.url.path.startswith("/images"):
            # Proxy to Vite dev server
            async with httpx.AsyncClient() as client:
                try:
                    url = f"http://localhost:5353{request.url.path}"
                    if request.url.query:
                        url = f"{url}?{request.url.query}"
                    
                    response = await client.request(
                        method=request.method,
                        url=url,
                        headers=request.headers,
                        content=await request.body()
                    )
                    
                    return f.Response(
                        content=response.content,
                        status_code=response.status_code,
                        headers=dict(response.headers)
                    )
                except httpx.RequestError:
                    return f.Response(status_code=503, content="Vite dev server is not running")
        return await call_next(request)

# Mount static files directory for uploaded images
app.mount("/images", StaticFiles(directory="images"), name="uploaded_images")

# Add proxy middleware in development

app.add_middleware(DevProxyMiddleware)

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Uvicorn server on http://{config.APP_HOST}:{config.APP_PORT}")
    uvicorn.run(
        "main:app",
        host=config.APP_HOST,
        port=config.APP_PORT,
        reload=True
    )