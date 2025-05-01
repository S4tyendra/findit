import React, { useState, useEffect, useCallback } from 'react';
import { getCountries, getStates, getCities } from '@/lib/apiClient';
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton"; // For loading states

// Debounce function to prevent rapid API calls while typing (if needed, e.g., for search inputs)
// function debounce(func, wait) {
//   let timeout;
//   return function executedFunction(...args) {
//     const later = () => {
//       clearTimeout(timeout);
//       func(...args);
//     };
//     clearTimeout(timeout);
//     timeout = setTimeout(later, wait);
//   };
// }

const LocationSelector = ({ onLocationChange, initialLocation = {} }) => {
    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);

    const [selectedCountry, setSelectedCountry] = useState(initialLocation.country || '');
    const [selectedState, setSelectedState] = useState(initialLocation.state || '');
    const [selectedCity, setSelectedCity] = useState(initialLocation.city || '');

    const [isLoadingCountries, setIsLoadingCountries] = useState(true);
    const [isLoadingStates, setIsLoadingStates] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);

    const [error, setError] = useState(null);

    // Fetch countries on mount
    useEffect(() => {
        setIsLoadingCountries(true);
        setError(null);
        getCountries()
            .then(data => setCountries(data || []))
            .catch(err => {
                console.error("Failed to fetch countries:", err);
                setError("Could not load countries.");
            })
            .finally(() => setIsLoadingCountries(false));
    }, []);

    // Fetch states when country changes
    useEffect(() => {
        if (selectedCountry) {
            setIsLoadingStates(true);
            setStates([]); // Clear previous states
            setCities([]); // Clear cities
            setSelectedState(''); // Reset state selection
            setSelectedCity(''); // Reset city selection
            setError(null);

            getStates(selectedCountry)
                .then(data => setStates(data || []))
                .catch(err => {
                    console.error(`Failed to fetch states for ${selectedCountry}:`, err);
                    setError(`Could not load states for ${selectedCountry}.`);
                })
                .finally(() => setIsLoadingStates(false));
        } else {
            setStates([]);
            setCities([]);
            setSelectedState('');
            setSelectedCity('');
        }
    }, [selectedCountry]);

    // Fetch cities when state changes
    useEffect(() => {
        if (selectedCountry && selectedState) {
            setIsLoadingCities(true);
            setCities([]); // Clear previous cities
            setSelectedCity(''); // Reset city selection
            setError(null);

            getCities(selectedCountry, selectedState)
                .then(data => setCities(data || []))
                .catch(err => {
                    console.error(`Failed to fetch cities for ${selectedState}, ${selectedCountry}:`, err);
                    setError(`Could not load cities for ${selectedState}.`);
                })
                .finally(() => setIsLoadingCities(false));
        } else {
             setCities([]);
             setSelectedCity('');
        }
    }, [selectedState, selectedCountry]); // Depends on both

    // Notify parent component when location changes
    useEffect(() => {
        onLocationChange({
            country: selectedCountry,
            state: selectedState,
            city: selectedCity,
        });
    }, [selectedCountry, selectedState, selectedCity, onLocationChange]);

    const handleCountryChange = (value) => {
        setSelectedCountry(value === 'none' ? '' : value);
        // State/City resets are handled by the useEffect hook for selectedCountry
    };
     const handleStateChange = (value) => {
        setSelectedState(value === 'none' ? '' : value);
         // City resets are handled by the useEffect hook for selectedState
    };
     const handleCityChange = (value) => {
        setSelectedCity(value === 'none' ? '' : value);
    };


    return (
        <div className="space-y-4">
             {error && <p className="text-red-500 text-sm">{error}</p>}
            <div>
                <Label htmlFor="country-select">Country</Label>
                {isLoadingCountries ? (
                     <Skeleton className="h-10 w-full mt-1" />
                 ) : (
                    <Select
                        value={selectedCountry || 'none'}
                        onValueChange={handleCountryChange}
                        disabled={isLoadingCountries || countries.length === 0}
                        name="country" // Add name for potential form association
                    >
                        <SelectTrigger id="country-select" className="mt-1">
                            <SelectValue placeholder="Select Country..." />
                        </SelectTrigger>
                        <SelectContent>
                             <SelectItem value="none" disabled={!!selectedCountry}>Select Country...</SelectItem>
                            {countries.map(country => (
                                <SelectItem key={country.id || country.name} value={country.name}>
                                    {country.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 )}
            </div>

            <div>
                <Label htmlFor="state-select">State / Region</Label>
                {isLoadingStates ? (
                     <Skeleton className="h-10 w-full mt-1" />
                 ) : (
                    <Select
                        value={selectedState || 'none'}
                        onValueChange={handleStateChange}
                        disabled={!selectedCountry || isLoadingStates || states.length === 0}
                        name="state"
                    >
                        <SelectTrigger id="state-select" className="mt-1">
                            <SelectValue placeholder="Select State / Region..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none" disabled={!!selectedState}>Select State / Region...</SelectItem>
                            {states.map(state => (
                                <SelectItem key={state.id || state.name} value={state.name}>
                                    {state.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 )}
            </div>

             <div>
                <Label htmlFor="city-select">City</Label>
                 {isLoadingCities ? (
                     <Skeleton className="h-10 w-full mt-1" />
                 ) : (
                    <Select
                        value={selectedCity || 'none'}
                        onValueChange={handleCityChange}
                        disabled={!selectedState || isLoadingCities || cities.length === 0}
                        name="city"
                    >
                        <SelectTrigger id="city-select" className="mt-1">
                            <SelectValue placeholder="Select City..." />
                        </SelectTrigger>
                        <SelectContent>
                             <SelectItem value="none" disabled={!!selectedCity}>Select City...</SelectItem>
                            {cities.map(city => (
                                <SelectItem key={city.id || city.name} value={city.name}>
                                    {city.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 )}
            </div>
        </div>
    );
};

export default LocationSelector;