import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge
 * @param {...(string|object|array)} inputs - Class names or conditional class objects
 * @returns {string} - Merged and deduplicated class string
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Formats a status string to a standardized format
 * @param {string} status - Status string to format
 * @returns {string} - Formatted status string
 */
export function formatStatus(status) {
    return status ? status.toLowerCase().replace(/\s+/g, "-") : "";
}

/**
 * Checks if a value is empty (null, undefined, empty string, or empty array/object)
 * @param {*} value - Value to check
 * @returns {boolean} - True if empty, false otherwise
 */
export function isEmpty(value) {
    return (
        value === null ||
        value === undefined ||
        value === "" ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === "object" && Object.keys(value).length === 0)
    );
}