const API_BASE_URL = process.env.REACT_APP_API_URL || '';

export const apiBaseUrl = API_BASE_URL;

export function apiUrl(path: string) {
    if (!path.startsWith('/')) {
        return `${API_BASE_URL}/${path}`;
    }
    return `${API_BASE_URL}${path}`;
}

export async function apiFetch(input: string, init?: RequestInit) {
    const token = localStorage.getItem("user_login_token");
    return fetch(apiUrl(input), {
        ...init,
        headers: {
            ...(init?.headers as Record<string, string>),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
}