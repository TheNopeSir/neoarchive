/**
 * PostgreSQL API Client (previously Supabase)
 * Now using REST API to connect to PostgreSQL backend
 */
import * as apiClient from './apiClient';

// Export API client as if it were Supabase client
// This maintains compatibility with existing code
export const supabase = {
    from: apiClient.from,
    auth: apiClient.auth,
};

// Export sync function for direct use
export { syncAllData } from './apiClient';
