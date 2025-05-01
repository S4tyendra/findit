import fastapi as f
from fastapi import UploadFile, File, Form, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Annotated, Optional
from datetime import datetime
import pydantic as p
import uuid
import os
import shutil # For file operations

# Import models
from models.item import (
    LostItemCreate, LostItemDB, LostItemManagementResponse,
    LostItemPublicResponse, ItemFoundPayload, LostItemUpdate,
    FoundReportDetail
)
# Import newly created FoundItem models (though not used in this router)
from models.found_item import (
    FoundItemCreate, FoundItemDB, FoundItemPublicResponse
)
from db_setup import get_db, config # Import config object directly
from helpers.logger import logger
from helpers.email_utils import send_email

# Define the base directory for image storage relative to the project root
IMAGE_DIR = "images"
# Ensure the image directory exists
os.makedirs(IMAGE_DIR, exist_ok=True)

router = f.APIRouter(
    prefix="/api/items",
    tags=["Lost Items"],
)

# --- POST /api/items (Create Lost Item) ---
@router.post("", response_model=LostItemManagementResponse, status_code=f.status.HTTP_201_CREATED)
async def create_lost_item(
    description: Annotated[str, Form(min_length=10, max_length=1000)],
    reporter_email: Annotated[p.EmailStr, Form()],
    date_lost_str: Annotated[str, Form(alias="date_lost")],
    product_link_str: Annotated[Optional[str], Form(alias="product_link")] = None,
    country: Annotated[Optional[str], Form()] = None,
    state: Annotated[Optional[str], Form()] = None,
    city: Annotated[Optional[str], Form()] = None,
    images: Annotated[List[UploadFile], File(description="Up to 5 images of the lost item")] = [],
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """ Create a new lost item report. """
    logger.info(f"Received request to create lost item from {reporter_email}")
    if len(images) > 5: raise HTTPException(status_code=400, detail="Maximum of 5 images allowed.")

    saved_image_filenames = []
    for image in images: # Image Saving Loop
        if not image.filename: continue
        allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
        if image.content_type not in allowed_types: continue
        try:
            ext = os.path.splitext(image.filename)[1]
            unique_fn = f"{uuid.uuid4()}{ext}"
            file_path = os.path.join(IMAGE_DIR, unique_fn)
            with open(file_path, "wb") as buffer:
                await image.seek(0); shutil.copyfileobj(image.file, buffer)
            saved_image_filenames.append(unique_fn)
            logger.info(f"Saved image: {unique_fn}")
        except Exception as e: logger.error(f"Failed to save image {image.filename}: {e}", exc_info=True)
        finally: await image.close()

    item_db: Optional[LostItemDB] = None
    try: # Data Validation & Model Creation
        date_lost = datetime.fromisoformat(date_lost_str.replace("Z", "+00:00"))
        product_link: Optional[p.HttpUrl] = None
        if product_link_str: product_link = p.parse_obj_as(p.HttpUrl, product_link_str)
        item_data = LostItemCreate(
            description=description, reporter_email=reporter_email, date_lost=date_lost,
            product_link=product_link, image_filenames=saved_image_filenames,
            country=country, state=state, city=city
        )
        item_db = LostItemDB(**item_data.dict())
    except (p.ValidationError, ValueError) as e:
        logger.warning(f"Validation error creating item: {e}")
        detail = e.errors() if isinstance(e, p.ValidationError) else f"Invalid date format: {date_lost_str}"
        raise HTTPException(status_code=422, detail=detail)
    if item_db is None: raise HTTPException(status_code=500, detail="Item data processing error.")

    try: # DB Insert & Email
        item_dict_for_db = item_db.dict(by_alias=True)
        if item_dict_for_db.get("product_link"): item_dict_for_db["product_link"] = str(item_dict_for_db["product_link"])
        insert_result = await db.lost_items.insert_one(item_dict_for_db)
        if not insert_result.inserted_id: raise HTTPException(status_code=500, detail="Failed to save item report.")
        logger.info(f"Inserted item {item_db.id} into database.")

        mgmt_link = f"{config.FRONTEND_BASE_URL}/manage/{item_db.id}?token={item_db.management_token}"
        email_subj = "Your Lost Item Report"
        email_body = f"Report details:\nDesc: {item_db.description}\nManage: {mgmt_link}\nKeep link secure."
        email_sent = send_email(to_email=item_db.reporter_email, subject=email_subj, body=email_body)
        if not email_sent: logger.error(f"Failed management email item {item_db.id} to {item_db.reporter_email}.")
        else: logger.info(f"Management email sent for item {item_db.id}")
        return item_db
    except Exception as e:
        logger.error(f"Database error inserting item: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database error during save.")

# --- GET /api/items/{item_id}/manage ---
@router.get("/{item_id}/manage", response_model=LostItemManagementResponse)
async def get_item_for_management(item_id: str, token: str = f.Query(...), db: AsyncIOMotorDatabase = Depends(get_db)):
    """ Retrieve item details for management. """
    try: uuid.UUID(item_id)
    except ValueError: raise HTTPException(status_code=400, detail="Invalid item ID format.")
    item = await db.lost_items.find_one({"_id": item_id, "management_token": token})
    if item is None:
        exists = await db.lost_items.count_documents({"_id": item_id}) > 0
        if exists: raise HTTPException(status_code=403, detail="Invalid token.")
        else: raise HTTPException(status_code=404, detail="Item not found.")
    return item

# --- GET /api/items/{item_id} ---
@router.get("/{item_id}", response_model=LostItemPublicResponse)
async def get_public_item(item_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """ Retrieve public item details. """
    try: uuid.UUID(item_id)
    except ValueError: raise HTTPException(status_code=400, detail="Invalid item ID format.")
    item = await db.lost_items.find_one({"_id": item_id})
    if item is None: raise HTTPException(status_code=404, detail="Item not found.")
    return item

# --- GET /api/items ---
@router.get("", response_model=List[LostItemPublicResponse])
async def list_public_items(skip: int = f.Query(0, ge=0), limit: int = f.Query(10, ge=1, le=100), db: AsyncIOMotorDatabase = Depends(get_db)):
    """ List public items with pagination. """
    items_cursor = db.lost_items.find().sort("created_at", -1).skip(skip).limit(limit)
    items = await items_cursor.to_list(length=limit)
    return items

# --- POST /api/items/{item_id}/found ---
@router.post("/{item_id}/found", status_code=f.status.HTTP_204_NO_CONTENT)
async def report_item_found_detailed(
    item_id: str,
    finder_contact: Annotated[str, Form(min_length=5, max_length=200)],
    finder_description: Annotated[Optional[str], Form(max_length=1000)] = None,
    date_found_str: Annotated[Optional[str], Form(alias="date_found")] = None,
    found_country: Annotated[Optional[str], Form()] = None,
    found_state: Annotated[Optional[str], Form()] = None,
    found_city: Annotated[Optional[str], Form()] = None,
    finder_images: Annotated[List[UploadFile], File(description="Up to 5 images from finder")] = [],
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """ Report finding a specific lost item with details. """
    logger.info(f"Received detailed 'found' report for item {item_id}")
    try: uuid.UUID(item_id)
    except ValueError: raise HTTPException(status_code=400, detail="Invalid item ID format.")

    lost_item = await db.lost_items.find_one({"_id": item_id})
    if lost_item is None: raise HTTPException(status_code=404, detail="Lost item not found.")
    if len(finder_images) > 5: raise HTTPException(status_code=400, detail="Max 5 finder images.")

    finder_saved_filenames = [] # Save finder images
    for image in finder_images:
        if not image.filename: continue
        allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
        if image.content_type not in allowed_types: continue
        try:
            ext = os.path.splitext(image.filename)[1]
            unique_fn = f"found_{uuid.uuid4()}{ext}"
            file_path = os.path.join(IMAGE_DIR, unique_fn)
            with open(file_path, "wb") as buffer:
                await image.seek(0); shutil.copyfileobj(image.file, buffer)
            finder_saved_filenames.append(unique_fn)
        except Exception as e: logger.error(f"Failed save finder image {image.filename}: {e}", exc_info=True)
        finally: await image.close()

    try: # Create FoundReportDetail object
        date_found = datetime.fromisoformat(date_found_str.replace("Z", "+00:00")) if date_found_str else None
        found_report = FoundReportDetail(
            finder_contact=finder_contact, finder_description=finder_description, date_found=date_found,
            found_country=found_country, found_state=found_state, found_city=found_city,
            finder_image_filenames=finder_saved_filenames
        )
    except (p.ValidationError, ValueError) as e:
        detail = e.errors() if isinstance(e, p.ValidationError) else "Invalid date format found."
        raise HTTPException(status_code=422, detail=detail)

    # Add report to DB
    update_result = await db.lost_items.update_one({"_id": item_id}, {"$push": {"found_reports": found_report.dict()}})
    if update_result.modified_count == 0: raise HTTPException(status_code=404, detail="Item not found during update.")
    logger.info(f"Added found report to item {item_id}.")

    # Notify original reporter
    reporter_email = lost_item.get("reporter_email")
    if reporter_email:
        email_subj = f"Update: Possible Match for Your Lost Item!"
        location_str = ', '.join(filter(None, [found_report.found_city, found_report.found_state, found_report.found_country])) or 'N/A'
        email_body = (f"Finder Report:\nContact: {found_report.finder_contact}\n"
                      f"Date Found: {found_report.date_found.strftime('%Y-%m-%d') if found_report.date_found else 'N/A'}\n"
                      f"Location: {location_str}\nDesc: {found_report.finder_description or 'N/A'}\n"
                      f"Images: {len(found_report.finder_image_filenames)}\n---\n"
                      f"Your Item Desc: '{lost_item.get('description', 'N/A')}'\n"
                      f"Please contact finder if match. Be cautious.\nID: {item_id}")
        email_sent = send_email(to_email=reporter_email, subject=email_subj, body=email_body)
        if not email_sent: logger.error(f"Failed 'found' email to {reporter_email} item {item_id}.")
    else: logger.warning(f"Cannot send 'found' email item {item_id}: No reporter email.")
    return f.Response(status_code=f.status.HTTP_204_NO_CONTENT)

# --- PUT /api/items/{item_id}/manage ---
@router.put("/{item_id}/manage", response_model=LostItemManagementResponse)
async def update_managed_item(item_id: str, update_data: LostItemUpdate, token: str = f.Query(...), db: AsyncIOMotorDatabase = Depends(get_db)):
    """ Update managed item. """
    try: uuid.UUID(item_id)
    except ValueError: raise HTTPException(status_code=400, detail="Invalid item ID format.")
    item = await db.lost_items.find_one({"_id": item_id, "management_token": token})
    if item is None:
        exists = await db.lost_items.count_documents({"_id": item_id}) > 0
        if exists: raise HTTPException(status_code=403, detail="Invalid token.")
        else: raise HTTPException(status_code=404, detail="Item not found.")

    update_payload = update_data.dict(exclude_unset=True)
    if not update_payload: return LostItemManagementResponse(**item) # No changes

    try: # Perform update
        update_result = await db.lost_items.update_one({"_id": item_id}, {"$set": update_payload})
        if update_result.matched_count == 0: raise HTTPException(status_code=404, detail="Item not found during update.")
        updated_item = await db.lost_items.find_one({"_id": item_id})
        if not updated_item: raise HTTPException(status_code=500, detail="Failed retrieve after update.")
        logger.info(f"Updated item {item_id}.")
        return updated_item
    except Exception as e:
        logger.error(f"DB error updating item {item_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="DB error during update.")

# --- DELETE /api/items/{item_id}/manage ---
@router.delete("/{item_id}/manage", status_code=f.status.HTTP_204_NO_CONTENT)
async def delete_managed_item(item_id: str, token: str = f.Query(...), db: AsyncIOMotorDatabase = Depends(get_db)):
    """ Delete managed item and associated images. """
    logger.info(f"Attempting deletion item {item_id} token {token[:4]}...")
    try: uuid.UUID(item_id)
    except ValueError: raise HTTPException(status_code=400, detail="Invalid item ID format.")
    item = await db.lost_items.find_one({"_id": item_id, "management_token": token})
    if item is None:
        exists = await db.lost_items.count_documents({"_id": item_id}) > 0
        if exists: raise HTTPException(status_code=403, detail="Invalid token.")
        else: raise HTTPException(status_code=404, detail="Item not found.")

    # Collect all image filenames (original + all found reports)
    image_filenames = item.get("image_filenames", [])
    for report in item.get("found_reports", []):
        image_filenames.extend(report.get("finder_image_filenames", []))

    # Delete images
    if image_filenames:
        logger.debug(f"Deleting images for item {item_id}: {image_filenames}")
        for filename in image_filenames:
            try: # Correctly structured try/except for file deletion
                file_path = os.path.join(IMAGE_DIR, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)
            except Exception as e:
                 logger.error(f"Error deleting image file {filename}: {e}", exc_info=True)

    # Delete DB record
    try:
        delete_result = await db.lost_items.delete_one({"_id": item_id})
        if delete_result.deleted_count == 0: logger.error(f"Delete failed: Item {item_id} missing.")
        logger.info(f"Deleted item {item_id} from database.")
        return f.Response(status_code=f.status.HTTP_204_NO_CONTENT)
    except Exception as e:
        logger.error(f"DB error deleting item {item_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="DB error during deletion.")

# Note: Standalone Found Item endpoints (Phase 8+) will go in a separate router/file.