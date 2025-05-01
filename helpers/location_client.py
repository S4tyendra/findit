import httpx
from typing import List, Dict, Any, Optional

from config import Config
from helpers.logger import logger

config = Config()

API_BASE_URL = config.LOCATION_API_BASE_URL
API_KEY = config.LOCATION_API_KEY
HEADERS = {"X-API-KEY": API_KEY}

# Use a single httpx client for connection pooling and efficiency
# Consider lifespan management for the client if used heavily across requests
# For simplicity here, we create it per function call, but a shared client is better practice.

async def get_countries() -> Optional[List[Dict[str, Any]]]:
    """Fetches the list of countries from the external API."""
    endpoint = "/countrieslist"
    url = f"{API_BASE_URL}{endpoint}"
    logger.debug(f"Fetching countries from {url}")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client: # 10 second timeout
            response = await client.get(url, headers=HEADERS)
            response.raise_for_status() # Raise exception for 4xx/5xx errors
            countries = response.json()
            logger.info(f"Successfully fetched {len(countries)} countries.")
            return countries
    except httpx.RequestError as e:
        logger.error(f"Error fetching countries: Request failed {e.request.url!r} - {e}")
    except httpx.HTTPStatusError as e:
        logger.error(f"Error fetching countries: HTTP Status {e.response.status_code} for {e.request.url!r}")
    except Exception as e:
        logger.error(f"Unexpected error fetching countries: {e}", exc_info=True)
    return None # Return None on failure

async def get_states_in_country(country_name: str) -> Optional[List[Dict[str, Any]]]:
    """Fetches the list of states for a given country from the external API."""
    endpoint = "/getstatesincountry"
    url = f"{API_BASE_URL}{endpoint}"
    params = {"country": country_name}
    logger.debug(f"Fetching states for country '{country_name}' from {url}")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=HEADERS, params=params)
            response.raise_for_status()
            states = response.json()
            logger.info(f"Successfully fetched {len(states)} states for country '{country_name}'.")
            return states
    except httpx.RequestError as e:
        logger.error(f"Error fetching states for {country_name}: Request failed {e.request.url!r} - {e}")
    except httpx.HTTPStatusError as e:
        logger.error(f"Error fetching states for {country_name}: HTTP Status {e.response.status_code} for {e.request.url!r}")
    except Exception as e:
         logger.error(f"Unexpected error fetching states for {country_name}: {e}", exc_info=True)
    return None

async def get_cities_in_state(country_name: str, state_name: str) -> Optional[List[Dict[str, Any]]]:
    """Fetches the list of cities for a given country and state from the external API."""
    endpoint = "/getcitiesinstate"
    url = f"{API_BASE_URL}{endpoint}"
    params = {"country": country_name, "state": state_name}
    logger.debug(f"Fetching cities for state '{state_name}', country '{country_name}' from {url}")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=HEADERS, params=params)
            response.raise_for_status()
            cities = response.json()
            logger.info(f"Successfully fetched {len(cities)} cities for state '{state_name}', country '{country_name}'.")
            return cities
    except httpx.RequestError as e:
         logger.error(f"Error fetching cities for {state_name}/{country_name}: Request failed {e.request.url!r} - {e}")
    except httpx.HTTPStatusError as e:
         logger.error(f"Error fetching cities for {state_name}/{country_name}: HTTP Status {e.response.status_code} for {e.request.url!r}")
    except Exception as e:
         logger.error(f"Unexpected error fetching cities for {state_name}/{country_name}: {e}", exc_info=True)
    return None