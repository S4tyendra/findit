const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * Handles API request execution, error parsing, and response handling.
 * @param {string} endpoint - The API endpoint (e.g., '/items').
 * @param {RequestInit} options - Fetch options (method, headers, body, etc.).
 * @returns {Promise<any>} - The parsed response body.
 * @throws {Error} - Throws an error with details if the request fails.
 */
const fetchApi = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                // Let browser set Content-Type for FormData
                ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
                ...options.headers,
            },
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (parseError) {
                 errorData = { message: response.statusText || `HTTP error! Status: ${response.status}` };
            }
            console.error("API Error Response:", url, errorData);
            // Prioritize backend validation errors if available
            const detailMsg = errorData.detail?.[0]?.msg || errorData.detail;
            const message = errorData.message;
            throw new Error(detailMsg || message || `HTTP error! Status: ${response.status}`);
        }

        // Handle responses with no content
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            return null;
        }

        // Handle potential text responses (though less common for our planned API)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/plain')) {
            return await response.text();
        }

        // Default to JSON parsing
        return await response.json();

    } catch (err) {
        console.error('API Request Failed:', url, err);
        // Ensure err.message exists, provide a fallback
        throw new Error(err.message || 'An unexpected network error occurred.');
    }
};

/**
 * Creates a new lost item report.
 * @param {FormData} formData - The form data including description, email, date, link, and images.
 * @returns {Promise<object>} - The created item data (including management token).
 */
export const createLostItem = async (formData) => {
    return fetchApi('/items', {
        method: 'POST',
        body: formData,
        // Content-Type is automatically set by the browser for FormData
    });
};

/**
 * Gets item details for management using ID and token.
 * @param {string} itemId - The ID of the item.
 * @param {string} token - The management token.
 * @returns {Promise<object>} - The item details.
 */
export const getItemForManagement = async (itemId, token) => {
    if (!itemId || !token) {
        throw new Error("Item ID and token are required for management view.");
    }
    // Token is sent as a query parameter
    const endpoint = `/items/${itemId}/manage?token=${encodeURIComponent(token)}`;
    return fetchApi(endpoint, {
        method: 'GET',
    });
};

/**
 * Gets public item details by ID.
 * @param {string} itemId - The ID of the item.
 * @returns {Promise<object>} - The public item details.
 */
export const getPublicItem = async (itemId) => {
     if (!itemId) {
        throw new Error("Item ID is required for public view.");
    }
    const endpoint = `/items/${itemId}`;
    return fetchApi(endpoint, {
        method: 'GET',
    });
};

/**
 * Lists publicly available items with pagination.
 * @param {number} [skip=0] - Number of items to skip.
 * @param {number} [limit=10] - Max number of items to return.
 * @returns {Promise<Array<object>>} - Array of public item details.
 */
export const listPublicItems = async (skip = 0, limit = 10) => {
    const endpoint = `/items?skip=${skip}&limit=${limit}`;
    return fetchApi(endpoint, {
        method: 'GET',
    });
};

/**
 * Reports an item as found, sending detailed info and images to the backend.
 * @param {string} itemId - The ID of the item found.
 * @param {FormData} formData - The form data including finder contact, description, date, location, images.
 * @returns {Promise<null>} - Resolves on success (204 No Content).
 */
export const notifyFound = async (itemId, formData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/items/${itemId}/found`, {
            method: 'POST',
            body: formData  // FormData will automatically set the correct Content-Type
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || 'Failed to submit found report');
        }
        
        return true;
    } catch (err) {
        console.error('Error submitting found report:', err);
        throw err;
    }
};


// --- Location API Functions ---

/**
 * Gets the list of countries.
 * @returns {Promise<Array<object>>}
 */
export const getCountries = async () => {
    return fetchApi('/locations/countries', { method: 'GET' });
};

/**
 * Gets the list of states for a country.
 * @param {string} countryName - The name of the country.
 * @returns {Promise<Array<object>>}
 */
export const getStates = async (countryName) => {
     if (!countryName) throw new Error("Country name is required to fetch states.");
     const endpoint = `/locations/states?country=${encodeURIComponent(countryName)}`;
     return fetchApi(endpoint, { method: 'GET' });
};

/**
 * Gets the list of cities for a country and state.
 * @param {string} countryName - The name of the country.
 * @param {string} stateName - The name of the state.
 * @returns {Promise<Array<object>>}
 */
export const getCities = async (countryName, stateName) => {
     if (!countryName || !stateName) throw new Error("Country and state names are required to fetch cities.");
     const endpoint = `/locations/cities?country=${encodeURIComponent(countryName)}&state=${encodeURIComponent(stateName)}`;
     return fetchApi(endpoint, { method: 'GET' });
};


// --- Found Item API Functions ---

/**
 * Creates a new standalone found item report.
 * @param {FormData} formData - Form data including description, date_found, location, images, optional contact.
 * @returns {Promise<object>} - The created found item data (public view).
 */
export const createFoundItem = async (formData) => {
     if (!(formData instanceof FormData)) throw new Error("formData must be an instance of FormData.");
     // Basic check for description and date_found
     if (!formData.has('description') || !formData.get('description')) throw new Error("Description is required.");
     if (!formData.has('date_found') || !formData.get('date_found')) throw new Error("Date found is required.");

    return fetchApi('/found-items', { // Use the new prefix
        method: 'POST',
        body: formData,
    });
};

/**
 * Lists publicly available found items with pagination.
 * @param {number} [skip=0] - Number of items to skip.
 * @param {number} [limit=10] - Max number of items to return.
 * @returns {Promise<Array<object>>} - Array of public found item details.
 */
export const listPublicFoundItems = async (skip = 0, limit = 10) => {
    const endpoint = `/found-items?skip=${skip}&limit=${limit}`;
    return fetchApi(endpoint, {
        method: 'GET',
    });
};

/**
 * Gets public found item details by ID.
 * @param {string} itemId - The ID of the found item.
 * @returns {Promise<object>} - The public found item details.
 */
export const getPublicFoundItem = async (itemId) => {
    if (!itemId) {
        throw new Error("Item ID is required for public view.");
    }
    const endpoint = `/found-items/${itemId}`;
    return fetchApi(endpoint, {
        method: 'GET',
    });
};

// --- Lost Item Management Functions ---

/**
 * Updates an item using its management token.
 * @param {string} itemId - The ID of the item to update.
 * @param {string} token - The management token.
 * @param {object} updateData - Object containing fields to update (matching LostItemUpdate model).
 * @returns {Promise<object>} - The updated item data.
 */
export const updateItem = async (itemId, token, updateData) => {
     if (!itemId || !token) throw new Error("Item ID and token required for update.");
     const endpoint = `/items/${itemId}/manage?token=${encodeURIComponent(token)}`;
     return fetchApi(endpoint, {
         method: 'PUT',
         body: JSON.stringify(updateData),
         headers: { 'Content-Type': 'application/json' }
     });
};

/**
 * Deletes an item using its management token.
 * @param {string} itemId - The ID of the item to delete.
 * @param {string} token - The management token.
 * @returns {Promise<null>} - Resolves on success (204 No Content).
 */
export const deleteItem = async (itemId, token) => {
     if (!itemId || !token) throw new Error("Item ID and token required for deletion.");
     const endpoint = `/items/${itemId}/manage?token=${encodeURIComponent(token)}`;
     return fetchApi(endpoint, {
         method: 'DELETE',
     });
};

/**
 * Submit a claim for a found item.
 * @param {string} itemId - The ID of the found item to claim.
 * @param {object} data - The claim data.
 * @param {string} data.ownerEmail - Email of the person claiming ownership.
 * @param {string} data.ownerDescription - Description from the claimant to verify ownership.
 * @returns {Promise<void>} - Resolves when claim is successfully submitted.
 */
export const claimFoundItem = async (itemId, { ownerEmail, ownerDescription }) => {
    return fetchApi(`/found-items/${itemId}/claim`, {
        method: 'POST',
        body: JSON.stringify({
            owner_email: ownerEmail,
            owner_description: ownerDescription
        })
    });
};