import fastapi as f
from fastapi import UploadFile, File, Form, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Annotated, Optional
from datetime import datetime
import pydantic as p
import uuid
import os
import shutil

from models.found_item import FoundItemCreate, FoundItemDB, FoundItemPublicResponse
from db_setup import get_db, config
from helpers.logger import logger
# Note: No email sending needed here unless we add notifications later

# Use the same IMAGE_DIR as defined in api/items.py or main.py
# Ensure consistency or move IMAGE_DIR definition to config.py
IMAGE_DIR = "images"
os.makedirs(IMAGE_DIR, exist_ok=True) # Ensure it exists

router = f.APIRouter(
    prefix="/api/found-items",
    tags=["Found Items"],
)

@router.post("", response_model=FoundItemPublicResponse, status_code=f.status.HTTP_201_CREATED)
async def create_found_item_report(
    description: Annotated[str, Form(min_length=10, max_length=1000)],
    date_found_str: Annotated[str, Form(alias="date_found")],
    # Optional fields
    finder_contact: Annotated[Optional[str], Form()] = None,
    country: Annotated[Optional[str], Form()] = None,
    state: Annotated[Optional[str], Form()] = None,
    city: Annotated[Optional[str], Form()] = None,
    images: Annotated[List[UploadFile], File(description="Up to 5 images of the found item")] = [],
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Create a new report for an item that someone has found.
    """
    logger.info(f"Received request to create found item report. Contact provided: {bool(finder_contact)}")

    if len(images) > 5:
        raise HTTPException(status_code=400, detail="Maximum of 5 images allowed.")

    # --- Image Saving ---
    saved_image_filenames = []
    for image in images:
        if not image.filename: continue
        allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
        if image.content_type not in allowed_types: continue
        try:
            ext = os.path.splitext(image.filename)[1]
            # Use a different prefix? e.g., found_report_
            unique_fn = f"found_report_{uuid.uuid4()}{ext}"
            file_path = os.path.join(IMAGE_DIR, unique_fn)
            with open(file_path, "wb") as buffer:
                await image.seek(0); shutil.copyfileobj(image.file, buffer)
            saved_image_filenames.append(unique_fn)
            logger.info(f"Saved found item image: {unique_fn}")
        except Exception as e: logger.error(f"Failed save found item image {image.filename}: {e}", exc_info=True)
        finally: await image.close()

    # --- Data Validation & Model Creation ---
    item_db: Optional[FoundItemDB] = None
    try:
        date_found = datetime.fromisoformat(date_found_str.replace("Z", "+00:00"))
        # Basic validation for finder_contact if provided (could enhance)
        if finder_contact and '@' not in finder_contact and not finder_contact.replace('+','').isdigit():
             logger.warning(f"Potentially invalid finder_contact format: {finder_contact}")
             # Decide if we should raise error or just accept it

        item_data = FoundItemCreate(
            description=description, date_found=date_found, finder_contact=finder_contact,
            country=country, state=state, city=city,
            image_filenames=saved_image_filenames
        )
        item_db = FoundItemDB(**item_data.dict())

    except (p.ValidationError, ValueError) as e:
        logger.warning(f"Validation error creating found item report: {e}")
        detail = e.errors() if isinstance(e, p.ValidationError) else f"Invalid date format: {date_found_str}"
        raise HTTPException(status_code=422, detail=detail)
    if item_db is None: raise HTTPException(status_code=500, detail="Item data processing error.")

    # --- DB Insert ---
    try:
        # Note: No HttpUrl conversion needed here as finder_contact is just str
        insert_result = await db.found_items.insert_one(item_db.dict(by_alias=True))
        if not insert_result.inserted_id:
             raise HTTPException(status_code=500, detail="Failed to save found item report.")
        logger.info(f"Successfully inserted found item {item_db.id} into database.")

        # Fetch the newly created item from DB to ensure it includes DB-generated fields like _id
        created_item_doc = await db.found_items.find_one({"_id": insert_result.inserted_id})
        if not created_item_doc:
            # Log the error for investigation
            logger.error(f"Failed to fetch newly created found item {insert_result.inserted_id} from database.")
            raise HTTPException(status_code=500, detail="Failed to retrieve created found item report after saving.")

        logger.info(f"Successfully retrieved created found item {insert_result.inserted_id} for response.")
        # Return the document fetched from DB, which should match FoundItemPublicResponse
        return created_item_doc

    except Exception as e:
        logger.error(f"Database error inserting found item: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database error occurred while saving report.")


@router.get("", response_model=List[FoundItemPublicResponse])
async def list_public_found_items(
    skip: int = f.Query(0, ge=0), limit: int = f.Query(10, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Retrieve a list of publicly viewable found items."""
    logger.debug(f"Fetching public found items list: skip={skip}, limit={limit}")
    items_cursor = db.found_items.find().sort("created_at", -1).skip(skip).limit(limit)
    items = await items_cursor.to_list(length=limit)
    return items


@router.get("/{item_id}", response_model=FoundItemPublicResponse)
async def get_public_found_item(item_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Retrieve public details for a specific found item."""
    logger.debug(f"Attempting to fetch public found item {item_id}")
    try: uuid.UUID(item_id)
    except ValueError: raise HTTPException(status_code=400, detail="Invalid item ID format.")

    item = await db.found_items.find_one({"_id": item_id})
    if item is None: raise HTTPException(status_code=404, detail="Found item not found.")

    logger.info(f"Successfully retrieved public found item {item_id}.")
    return item


# TODO: Add recommendation logic/endpoints (Phase 10)