import axios from "axios";
import { env } from "./env";
export function createApiClient(getToken) {
    const client = axios.create({
        baseURL: `${env.VITE_API_URL}/api`,
    });
    client.interceptors.request.use((config) => {
        const token = getToken();
        if (token) {
            config.headers = config.headers ?? {};
            config.headers.authorization = `Bearer ${token}`;
        }
        return config;
    });
    return client;
}
