import { useCallback } from "react";
import { useAuth } from "../context/useAuth";
import * as authApi from "../features/accounts/api/authApi";

/**
 * Hook to refresh the user's profile data and update auth context.
 * Call this after updating the profile (e.g., after profile completion)
 * to ensure the sidebar and dashboard redirect logic update immediately.
 */
export function useRefreshProfile() {
  const { user } = useAuth();
  
  return useCallback(async () => {
    try {
      if (!user) return null;
      
      // Fetch latest profile data
      let profile;
      try {
        profile = await authApi.getProfile();
      } catch {
        profile = user;
      }
      
      let completeProfile;
      try {
        completeProfile = await authApi.getCompleteProfile();
      } catch {
        // complete profile may not be available for all account states
      }
      
      const mergedProfile = { ...(profile || {}), ...(completeProfile || {}) };
      
      // Return the merged profile (caller should update auth context with this)
      return mergedProfile;
    } catch (err) {
      console.error("Failed to refresh profile:", err);
      return user;
    }
  }, [user]);
}
