import fastapi as f
from fastapi import UploadFile, File, Form, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Annotated, Optional
from datetime import datetime
import pydantic as p
import uuid
import os
import shutil # For file operations

from models.item import LostItemCreate, LostItemDB, LostItemManagementResponse, LostItemPublicResponse, ItemFoundPayload, LostItemUpdate # Import update model
from db_setup import get_db, config
from helpers.logger import logger
from helpers.email_utils import send_email # Import the email sending function

# Define the base directory for image storage relative to the project root
IMAGE_DIR = "images"
# Ensure the image directory exists
os.makedirs(IMAGE_DIR, exist_ok=True)

router = f.APIRouter(
    prefix="/api/items",
    tags=["Items"],
)

@router.post("", response_model=LostItemManagementResponse, status_code=f.status.HTTP_201_CREATED)
async def create_lost_item(
    description: Annotated[str, Form(min_length=10, max_length=1000)],
    reporter_email: Annotated[p.EmailStr, Form()],
    date_lost_str: Annotated[str, Form(alias="date_lost")], # Receive as string first
    product_link_str: Annotated[Optional[str], Form(alias="product_link")] = None,
    country: Annotated[Optional[str], Form()] = None, # Add location fields
    state: Annotated[Optional[str], Form()] = None,
    city: Annotated[Optional[str], Form()] = None,
    images: Annotated[List[UploadFile], File(description="Up to 5 images of the lost item")] = [],
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Report a new lost item. Requires description, reporter email, date lost.
    Optionally accepts a product link and up to 5 images.
    """
    logger.info(f"Received request to create lost item from {reporter_email}")

    if len(images) > 5:
        raise HTTPException(status_code=400, detail="Maximum of 5 images allowed.")

    # --- P1_4: Image Saving ---
    saved_image_filenames = []
    for image in images:
        # Basic validation (optional): Check content type
        allowed_content_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
        if image.content_type not in allowed_content_types:
            logger.warning(f"Skipping file with disallowed content type: {image.filename} ({image.content_type})")
            continue # Skip this file

        # Ensure filename exists before processing
        if not image.filename:
            logger.warning("Skipping uploaded file with no filename.")
            continue

        try:
            # Generate a unique filename while preserving the extension
            file_extension = os.path.splitext(image.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(IMAGE_DIR, unique_filename)

            # Save the file (using standard blocking I/O for now, consider aiofiles for performance)
            with open(file_path, "wb") as buffer:
                # Ensure the UploadFile pointer is at the beginning
                await image.seek(0)
                # Copy file content
                shutil.copyfileobj(image.file, buffer)

            saved_image_filenames.append(unique_filename)
            logger.info(f"Successfully saved image: {unique_filename} (original: {image.filename})")

        except Exception as e:
            logger.error(f"Failed to save image {image.filename}: {e}", exc_info=True)
            # Depending on requirements, you might raise an HTTP Exception here
            # For now, we log the error and continue, potentially with fewer images saved.
        finally:
            await image.close() # Ensure file is closed

    # Check if at least one image was expected but none were saved (optional strict check)
    # if images and not saved_image_filenames:
    #    raise HTTPException(status_code=500, detail="Failed to save uploaded image(s).")

    # --- Data Validation and Model Creation ---
    try:
        # Parse date string
        date_lost = datetime.fromisoformat(date_lost_str.replace("Z", "+00:00")) # Handle ISO format
        # Parse product link if provided
        product_link: Optional[p.HttpUrl] = None
        if product_link_str:
            product_link = p.parse_obj_as(p.HttpUrl, product_link_str) # Parse only if string is provided

        item_data = LostItemCreate(
            description=description,
            reporter_email=reporter_email,
            date_lost=date_lost,
            product_link=product_link,
            image_filenames=saved_image_filenames, # Use the filenames of actually saved images
            country=country, # Add location fields
            state=state,
            city=city
        )
        # Create the DB model instance (generates id, token, created_at)
        item_db = LostItemDB(**item_data.dict())

    except p.ValidationError as e:
        logger.warning(f"Validation error creating item: {e}")
        raise HTTPException(status_code=422, detail=e.errors())
    except ValueError as e: # For date parsing errors
         logger.warning(f"Date parsing error: {e}")
         raise HTTPException(status_code=422, detail=f"Invalid date format for 'date_lost': {date_lost_str}. Use ISO 8601 format.")


    # --- Database Insertion and Email Sending ---
    try:
        # Convert complex types like HttpUrl to string before DB insertion
        item_dict_for_db = item_db.dict(by_alias=True)
        if item_dict_for_db.get("product_link"):
             item_dict_for_db["product_link"] = str(item_dict_for_db["product_link"])

        insert_result = await db.lost_items.insert_one(item_dict_for_db)
        if not insert_result.inserted_id:
            logger.error("Failed to insert item into database.")
            # Consider cleaning up saved images if DB insert fails? (Optional)
            raise HTTPException(status_code=500, detail="Failed to save item report.")
        logger.info(f"Successfully inserted item {item_db.id} into database.")

        # --- P1_5: Send Management Email ---
        # Construct the management link (Use frontend base URL - potentially move to config)
        # Assuming default Next.js port 3000 if fend runs locally, adjust if different
        frontend_base_url = "http://localhost:3000" # Hardcoded for now
        management_link = f"{frontend_base_url}/manage/{item_db.id}?token={item_db.management_token}"
        email_subject = "Your Lost Item Report"
        email_body = (
            f"Thank you for reporting your lost item.\n\n"
            f"Description: {item_db.description}\n\n"
            f"You can view and manage your report using this link:\n{management_link}\n\n"
            f"Please keep this link secure."
        )

        email_sent = send_email(
            to_email=item_db.reporter_email,
            subject=email_subject,
            body=email_body
        )

        if not email_sent:
            # Log the failure, but still return success to the user as the item was saved.
            # Email failure might be temporary or due to config issues.
            logger.error(f"Failed to send management email for item {item_db.id} to {item_db.reporter_email}. Item still created.")
        else:
             logger.info(f"Management email sent successfully for item {item_db.id}")


        # Return the full management response, including the token for the initial response
        return item_db

    except Exception as e:
        # Log exception safely using its string representation
        logger.error(f"Database error inserting item: {str(e)}", exc_info=True)
        # Consider cleaning up saved images if DB insert fails?
        raise HTTPException(status_code=500, detail="Database error occurred while saving item.")


@router.get("/{item_id}/manage", response_model=LostItemManagementResponse)
async def get_item_for_management(
    item_id: str,
    token: str = f.Query(..., description="Management token required for access"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Retrieve a specific lost item's details for management purposes.
    Requires the item ID and a valid management token.
    """
    logger.debug(f"Attempting to fetch item {item_id} for management with token {token[:4]}...") # Log safely

    # Validate if item_id looks like a UUID (basic check)
    try:
        uuid.UUID(item_id)
    except ValueError:
        logger.warning(f"Invalid item_id format received: {item_id}")
        raise HTTPException(status_code=400, detail="Invalid item ID format.")

    item = await db.lost_items.find_one({"_id": item_id, "management_token": token})

    if item is None:
        # Log the failure potentially check if item exists without matching token for better logging
        item_exists = await db.lost_items.find_one({"_id": item_id})
        if item_exists:
             logger.warning(f"Management access denied for item {item_id}: Invalid token.")
             raise HTTPException(status_code=403, detail="Invalid management token.")
        else:
             logger.warning(f"Management access denied: Item {item_id} not found.")
             raise HTTPException(status_code=404, detail="Item not found.")

    logger.info(f"Successfully retrieved item {item_id} for management.")
    # Pydantic automatically handles the conversion from dict to response model
    return item


@router.get("/{item_id}", response_model=LostItemPublicResponse)
async def get_public_item(
    item_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Retrieve public details for a specific lost item.
    """
    logger.debug(f"Attempting to fetch public item {item_id}")

    # Validate if item_id looks like a UUID (basic check)
    try:
        uuid.UUID(item_id)
    except ValueError:
        logger.warning(f"Invalid public item_id format received: {item_id}")
        raise HTTPException(status_code=400, detail="Invalid item ID format.")

    item = await db.lost_items.find_one({"_id": item_id})

    if item is None:
        logger.warning(f"Public item {item_id} not found.")
        raise HTTPException(status_code=404, detail="Item not found.")

    logger.info(f"Successfully retrieved public item {item_id}.")
    # Pydantic automatically handles filtering fields based on the response_model
    return item


@router.get("", response_model=List[LostItemPublicResponse])
async def list_public_items(
    skip: int = f.Query(0, ge=0, description="Number of items to skip"),
    limit: int = f.Query(10, ge=1, le=100, description="Maximum number of items to return"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Retrieve a list of publicly viewable lost items with pagination.
    """
    logger.debug(f"Fetching public items list: skip={skip}, limit={limit}")
    items_cursor = db.lost_items.find().sort("created_at", -1).skip(skip).limit(limit) # Sort by newest first
    items = await items_cursor.to_list(length=limit)

    # The response_model List[LostItemPublicResponse] handles filtering
    return items


@router.post("/{item_id}/found", status_code=f.status.HTTP_204_NO_CONTENT)
async def report_item_found(
    item_id: str,
    payload: ItemFoundPayload,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Endpoint for someone to report that they have found a specific lost item.
    Updates the item record and notifies the original reporter via email.
    """
    logger.info(f"Received 'found' report for item {item_id} from contact: {payload.finder_contact}")

    # Validate if item_id looks like a UUID
    try:
        uuid.UUID(item_id)
    except ValueError:
        logger.warning(f"Invalid item_id format for 'found' report: {item_id}")
        raise HTTPException(status_code=400, detail="Invalid item ID format.")

    # --- Find the Original Item ---
    item = await db.lost_items.find_one({"_id": item_id})
    if item is None:
        logger.warning(f"'Found' report failed: Item {item_id} not found.")
        raise HTTPException(status_code=404, detail="Item not found.")

    # Check if item was already marked as found (optional)
    if item.get("found_at"):
         logger.info(f"Item {item_id} was already reported as found on {item['found_at']}. Ignoring new report.")
         # Return success even if already found, to avoid leaking info
         return f.Response(status_code=f.status.HTTP_204_NO_CONTENT)

    # --- Update Item Record ---
    update_data = {
        "$set": {
            "found_by_contact": payload.finder_contact,
            "found_at": datetime.utcnow()
        }
    }
    update_result = await db.lost_items.update_one({"_id": item_id}, update_data)

    if update_result.modified_count == 0:
        # This shouldn't happen if find_one succeeded, but check anyway
        logger.error(f"Failed to update item {item_id} as found in database.")
        raise HTTPException(status_code=500, detail="Failed to update item status.")

    logger.info(f"Successfully marked item {item_id} as found by {payload.finder_contact}.")

    # --- P3_4: Notify Original Reporter ---
    reporter_email = item.get("reporter_email")
    item_description = item.get("description", "N/A")

    if reporter_email:
        email_subject = f"Good News! Your Lost Item May Have Been Found!"
        email_body = (
            f"Someone has reported finding an item matching the description:\n\n"
            f"'{item_description}'\n\n"
            f"They provided the following contact information:\n"
            f"{payload.finder_contact}\n\n"
            f"Please reach out to them to arrange the return. Remember to be cautious when meeting strangers.\n\n"
            f"Item ID: {item_id}"
        )
        email_sent = send_email(
            to_email=reporter_email,
            subject=email_subject,
            body=email_body
        )
        if not email_sent:
            logger.error(f"Failed to send 'found' notification email to {reporter_email} for item {item_id}.")
            # Log failure, but the primary action (marking as found) succeeded.
    else:
        logger.warning(f"Cannot send 'found' notification for item {item_id}: Reporter email not found in record.")

    # Return 204 No Content on success
    return f.Response(status_code=f.status.HTTP_204_NO_CONTENT)


@router.put("/{item_id}/manage", response_model=LostItemManagementResponse)
async def update_managed_item(
    item_id: str,
    update_data: LostItemUpdate,
    token: str = f.Query(..., description="Management token required for update"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Update details of a specific lost item using its management token.
    Only fields provided in the request body will be updated.
    """
    logger.info(f"Attempting update for item {item_id} with token {token[:4]}...")

    # --- Verify Token and Find Item ---
    # Validate if item_id looks like a UUID
    try:
        uuid.UUID(item_id)
    except ValueError:
        logger.warning(f"Invalid item_id format for update: {item_id}")
        raise HTTPException(status_code=400, detail="Invalid item ID format.")

    item = await db.lost_items.find_one({"_id": item_id, "management_token": token})
    if item is None:
        # Check if item exists without matching token for better logging
        item_exists = await db.lost_items.find_one({"_id": item_id})
        if item_exists:
             logger.warning(f"Update access denied for item {item_id}: Invalid token.")
             raise HTTPException(status_code=403, detail="Invalid management token.")
        else:
             logger.warning(f"Update failed: Item {item_id} not found.")
             raise HTTPException(status_code=404, detail="Item not found.")

    # --- Prepare Update Operation ---
    # Create update dict excluding unset fields (None values)
    # Use exclude_unset=True in the model's Config or here
    update_payload = update_data.dict(exclude_unset=True)

    # Optional: Handle specific fields like product_link (allow setting to null/empty)
    # If 'product_link' is explicitly provided as null/empty in request, need to handle it.
    # Pydantic v1/v2 handle this differently. For now, assume exclude_unset works.
    # If product_link needs to be explicitly removed:
    # if 'product_link' in update_data.__fields_set__ and update_data.product_link is None:
    #     update_payload['product_link'] = None # Ensure None gets set

    if not update_payload:
        logger.info(f"No update data provided for item {item_id}. Returning current data.")
        # No changes needed, maybe return 304 Not Modified or just current data?
        # Return current data for simplicity. Convert DB dict to response model.
        return LostItemManagementResponse(**item)


    # --- Perform Update ---
    try:
        update_result = await db.lost_items.update_one(
            {"_id": item_id},
            {"$set": update_payload}
        )

        if update_result.matched_count == 0:
             # Should not happen if find_one worked, but safety check
             logger.error(f"Update failed: Item {item_id} disappeared before update.")
             raise HTTPException(status_code=404, detail="Item not found during update.")

        # Fetch the updated document to return it
        updated_item = await db.lost_items.find_one({"_id": item_id})
        if not updated_item:
             logger.error(f"Failed to fetch item {item_id} after update.")
             raise HTTPException(status_code=500, detail="Failed to retrieve item after update.")

        logger.info(f"Successfully updated item {item_id}.")
        return updated_item # Pydantic handles conversion to response model

    except Exception as e:
        logger.error(f"Database error updating item {item_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database error occurred during update.")


@router.delete("/{item_id}/manage", status_code=f.status.HTTP_204_NO_CONTENT)
async def delete_managed_item(
    item_id: str,
    token: str = f.Query(..., description="Management token required for deletion"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Delete a specific lost item using its management token.
    Also deletes associated images from storage.
    """
    logger.info(f"Attempting deletion for item {item_id} with token {token[:4]}...")

    # --- Verify Token and Find Item ---
    # Validate if item_id looks like a UUID
    try:
        uuid.UUID(item_id)
    except ValueError:
        logger.warning(f"Invalid item_id format for delete: {item_id}")
        raise HTTPException(status_code=400, detail="Invalid item ID format.")

    item = await db.lost_items.find_one({"_id": item_id, "management_token": token})
    if item is None:
        # Check if item exists without matching token for better logging
        item_exists = await db.lost_items.find_one({"_id": item_id})
        if item_exists:
             logger.warning(f"Delete access denied for item {item_id}: Invalid token.")
             raise HTTPException(status_code=403, detail="Invalid management token.")
        else:
             logger.warning(f"Delete failed: Item {item_id} not found.")
             raise HTTPException(status_code=404, detail="Item not found.")

    # --- Delete Images ---
    image_filenames = item.get("image_filenames", [])
    if image_filenames:
        logger.debug(f"Deleting images for item {item_id}: {image_filenames}")
        for filename in image_filenames:
            try:
                file_path = os.path.join(IMAGE_DIR, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)
                    logger.info(f"Deleted image file: {file_path}")
                else:
                     logger.warning(f"Image file not found for deletion: {file_path}")
            except Exception as e:
                # Log error but continue deletion process
                 logger.error(f"Error deleting image file {filename} for item {item_id}: {e}", exc_info=True)

    # --- Delete Database Record ---
    try:
        delete_result = await db.lost_items.delete_one({"_id": item_id})

        if delete_result.deleted_count == 0:
            # Should not happen if find_one worked, but safety check
            logger.error(f"Delete failed: Item {item_id} disappeared before delete operation.")
            # Already checked existence, so maybe return 204 anyway or 500? Let's return 204 as the goal is achieved.
            pass # Logged error, proceed to return success

        logger.info(f"Successfully deleted item {item_id} from database.")
        # Return 204 No Content on success
        return f.Response(status_code=f.status.HTTP_204_NO_CONTENT)

    except Exception as e:
        logger.error(f"Database error deleting item {item_id}: {e}", exc_info=True)
        # Image deletion might have partially succeeded. State is inconsistent.
        raise HTTPException(status_code=500, detail="Database error occurred during deletion.")