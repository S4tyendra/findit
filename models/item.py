import pydantic as p
from typing import Optional, List
from datetime import datetime
import uuid

class LostItemBase(p.BaseModel):
    description: str = p.Field(..., min_length=10, max_length=1000)
    reporter_email: p.EmailStr
    date_lost: datetime
    product_link: Optional[p.HttpUrl] = None
    image_filenames: List[str] = p.Field(default_factory=list, max_length=5) # Store filenames, not full paths initially
    # Location fields will be added later (Phase 4)
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None

class LostItemCreate(LostItemBase):
    # Fields specific to creation via API, if any, would go here
    # For now, it's the same as base
    pass

class LostItemDB(LostItemBase):
    id: str = p.Field(default_factory=lambda: str(uuid.uuid4()), alias="_id") # Use UUID for primary key
    management_token: str = p.Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = p.Field(default_factory=datetime.utcnow)
    # Details added when someone reports finding the item
    found_by_contact: Optional[str] = None # Store finder's email/whatsapp/etc.
    found_at: Optional[datetime] = None    # Timestamp when reported found

    class Config:
        allow_population_by_field_name = True # Allows using '_id' when populating from DB
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            uuid.UUID: str,
        }


class LostItemPublicResponse(p.BaseModel):
    id: str = p.Field(..., alias="_id")
    description: str
    date_lost: datetime
    product_link: Optional[p.HttpUrl] = None
    image_filenames: List[str]
    # Location fields
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    created_at: datetime

    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

class LostItemManagementResponse(LostItemDB):
    # For the management view, we can return everything in the DB model
    # No need to hide the management token here as it's required for auth
    pass
# --- Payload Model for Found Endpoint ---

class ItemFoundPayload(p.BaseModel):
    """Payload for reporting an item as found."""
    finder_contact: str = p.Field(..., min_length=5, max_length=200, description="Contact info of the finder (e.g., email, phone, message)")

# --- Payload Model for Update Endpoint ---

class LostItemUpdate(p.BaseModel):
    """
    Defines the fields that can be updated for a lost item.
    All fields are optional.
    """
    description: Optional[str] = p.Field(None, min_length=10, max_length=1000)
    # reporter_email: Optional[p.EmailStr] = None # Typically email shouldn't change? Or maybe allow? Let's disallow for now.
    date_lost: Optional[datetime] = None
    product_link: Optional[p.HttpUrl] = None # Allow updating/adding/removing link
    # image_filenames: Optional[List[str]] = p.Field(None, max_length=5) # Image updates might be complex, handle separately? Or allow replacing list? Let's skip direct filename update for now.
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    # We don't allow updating found status via this endpoint

    class Config:
        # Allow extra fields to be ignored
        extra = 'ignore'
        # Handle None values correctly when building update dict
        exclude_unset = True # Important for building $set update
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
        }