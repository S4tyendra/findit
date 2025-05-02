import fastapi as f
from fastapi import HTTPException, Query
from typing import List, Dict, Any
import datetime
import motor.motor_asyncio
from bson import ObjectId

from helpers.logger import logger

from config import Config

config = Config() 
MONGODB_URL = config.MONGO_WCA
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.WorldDB

router = f.APIRouter(
    prefix="/api/locations",
    tags=["Locations"],
)




def sanitize(text: str) -> str:
    """Sanitize input text by removing special characters."""
    if not text:
        return ""
    text = text.lower()
    for char in ["'", ".", "-", "(", ")", "/"]:
        text = text.replace(char, "")
    return text

@router.get("/countries", response_model=List[Dict[str, Any]])
async def get_countries_list():
    """Retrieve the list of countries."""
    try:
        countries = db.countries.find()
        country_list = [country async for country in countries if '_id' in country]
        country_list = [{**country, '_id': str(country['_id'])} for country in country_list]
        return country_list
    except Exception as e:
        logger.error(f"Failed to retrieve countries: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve country data from database.")

@router.get("/states", response_model=List[Dict[str, Any]])
async def get_states_list(country: str = Query(..., description="Name of the country to get states for")):
    """Retrieve the list of states for a specific country."""
    try:
        country = sanitize(country)
        states = db.state.find({"country_name": {"$regex": country, "$options": "i"}})
        state_list = [state async for state in states if '_id' in state]
        if len(state_list) == 0:
            raise HTTPException(status_code=404, detail="Country not found")
        state_list = [{**state, '_id': str(state['_id'])} for state in state_list]
        return state_list
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve states: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve state data from database.")

@router.get("/cities", response_model=List[Dict[str, Any]])
async def get_cities_list(
    country: str = Query(..., description="Name of the country"),
    state: str = Query(..., description="Name of the state")
):
    """Retrieve the list of cities for a specific country and state."""
    try:
        country = sanitize(country)
        state = sanitize(state)
        cities = db.cities.find({
            "country_name": {"$regex": country, "$options": "i"},
            "state_name": {"$regex": state, "$options": "i"}
        })
        cities_list = [city async for city in cities if "_id" in city]
        if len(cities_list) == 0:
            raise HTTPException(status_code=404, detail="Country or state not found")
        cities_list = [{**city, '_id': str(city['_id'])} for city in cities_list]
        return cities_list
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve cities: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve city data from database.")