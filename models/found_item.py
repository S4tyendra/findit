import pydantic as p
from typing import Optional, List
from datetime import datetime
import uuid

# --- Base Model for Found Item Data ---
class FoundItemBase(p.BaseModel):
    description: str = p.Field(..., min_length=10, max_length=1000, description="Description of the item found")
    date_found: datetime
    # Location where the item was found
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    # Contact info of the person who found it (optional, they might just want to report)
    finder_contact: Optional[p.EmailStr | str] = p.Field(None, description="Optional contact email or other info")
    image_filenames: List[str] = p.Field(default_factory=list, max_length=5)

# --- Model for Creating Found Item via API ---
class FoundItemCreate(FoundItemBase):
    pass # Same as base for now

# --- Model for Storing Found Item in DB ---
class FoundItemDB(FoundItemBase):
    id: str = p.Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    created_at: datetime = p.Field(default_factory=datetime.utcnow)
    # Could add status later (e.g., 'reported', 'claimed')
    # claimed_by_lost_item_id: Optional[str] = None # Link if matched later?

    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            uuid.UUID: str,
        }

# --- Model for Public Response ---
class FoundItemPublicResponse(p.BaseModel):
    id: str = p.Field(..., alias="_id")
    description: str
    date_found: datetime
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    image_filenames: List[str]
    created_at: datetime
    # Exclude finder_contact from public view

    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }