const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const apiBaseUrl = API_BASE_URL;

export function apiUrl(path: string) {
    if (!path.startsWith('/')) {
        return `${API_BASE_URL}/${path}`;
    }
    return `${API_BASE_URL}${path}`;
}

export async function apiFetch(input: string, init?: RequestInit) {
    return fetch(apiUrl(input), init);
}
