/**
 * Utility functions for date handling and parsing
 */

/**
 * Parses a date string or Excel numeric date into a formatted DD/MM/YYYY string.
 * @param {string|number} dateValue - The date value to parse.
 * @returns {string} Formatted date string (DD/MM/YYYY) or empty string if invalid.
 */
export const formatToDDMMYYYY = (dateValue) => {
    if (!dateValue) return '';

    let str = String(dateValue).trim();

    // Handle Excel numeric dates (e.g., 45678)
    if (!isNaN(str) && !str.includes('/')) {
        try {
            const fechaObj = new Date((Number(str) - 25569) * 86400000);
            return fechaObj.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (e) {
            console.warn('Error parsing Excel date:', dateValue);
            return '';
        }
    }

    // Handle DD/MM/YYYY or D/M/YYYY strings
    if (str.includes('/')) {
        try {
            const parts = str.split('/');
            if (parts.length < 2) return '';

            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2] || new Date().getFullYear();

            return `${day}/${month}/${year}`;
        } catch (e) {
            console.warn('Error formatting date string:', dateValue);
            return '';
        }
    }

    return '';
};

/**
 * Gets the current date in DD/MM/YYYY format.
 * @returns {string}
 */
export const getCurrentDateDDMMYYYY = () => {
    return new Date().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

/**
 * Normalizes a day name to a standard format (First letter uppercase, no accents).
 * @param {string} diaStr - Day name (e.g., "Miércoles")
 * @returns {string} Normalized day (e.g., "Miercoles")
 */
export const normalizeDayName = (diaStr) => {
    if (!diaStr) return '';
    const normalized = String(diaStr)
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};
