import { useMemo } from "react";
import { useAuth } from "../context/useAuth";

/**
 * Hook to determine if a user's profile is complete.
 * A profile is considered complete if the user can upload datasets.
 * This is the single source of truth for profile completion across the app.
 *
 * @returns {boolean} true if profile is complete (user is a researcher), false otherwise
 */
export function useProfileComplete() {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) return false;
    
    return Boolean(
      user?.can_upload_datasets ||
      user?.profile?.can_upload_datasets ||
      user?.profile_complete ||
      user?.profile?.profile_complete ||
      user?.is_profile_complete
    );
  }, [user]);
}
