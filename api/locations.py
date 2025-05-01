import fastapi as f
from fastapi import HTTPException, Query
from typing import List, Dict, Any
import datetime # Import standard datetime

from helpers.logger import logger
from helpers import location_client # Import our client functions

router = f.APIRouter(
    prefix="/api/locations",
    tags=["Locations"],
)

# Cache for location data (simple in-memory example)
# Consider using a more robust cache like Redis in production
_location_cache = {}
_CACHE_TTL_SECONDS = 3600 # Cache for 1 hour

async def _get_with_cache(key: str, fetch_func, *args, **kwargs):
    """Helper to get data from cache or fetch and cache it."""
    now = datetime.datetime.utcnow().timestamp() # Use standard datetime
    cached_item = _location_cache.get(key)

    if cached_item and (now - cached_item['timestamp'] < _CACHE_TTL_SECONDS):
        logger.debug(f"Cache hit for location data: {key}")
        return cached_item['data']

    logger.debug(f"Cache miss or expired for location data: {key}. Fetching...")
    data = await fetch_func(*args, **kwargs)
    if data is not None:
         _location_cache[key] = {'data': data, 'timestamp': now}
         logger.debug(f"Cached new location data for: {key}")
    return data


@router.get("/countries", response_model=List[Dict[str, Any]])
async def get_countries_list():
    """Retrieve the list of countries."""
    countries = await _get_with_cache("countries", location_client.get_countries)
    # countries = await location_client.get_countries() # Without cache
    if countries is None:
        raise HTTPException(status_code=503, detail="Failed to retrieve country data from external service.")
    return countries

@router.get("/states", response_model=List[Dict[str, Any]])
async def get_states_list(country: str = Query(..., description="Name of the country to get states for")):
    """Retrieve the list of states for a specific country."""
    cache_key = f"states_{country.lower()}"
    states = await _get_with_cache(cache_key, location_client.get_states_in_country, country)
    # states = await location_client.get_states_in_country(country) # Without cache
    if states is None:
        raise HTTPException(status_code=503, detail=f"Failed to retrieve state data for country '{country}' from external service.")
    return states

@router.get("/cities", response_model=List[Dict[str, Any]])
async def get_cities_list(
    country: str = Query(..., description="Name of the country"),
    state: str = Query(..., description="Name of the state")
):
    """Retrieve the list of cities for a specific country and state."""
    cache_key = f"cities_{country.lower()}_{state.lower()}"
    cities = await _get_with_cache(cache_key, location_client.get_cities_in_state, country, state)
    # cities = await location_client.get_cities_in_state(country, state) # Without cache
    if cities is None:
         raise HTTPException(status_code=503, detail=f"Failed to retrieve city data for state '{state}', country '{country}' from external service.")
    return cities