// En Docker, esto se inyecta via EXPO_PUBLIC_API_URL en docker-compose.yml
// Para desarrollo local, podés cambiarlo acá directamente.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
