import { useState, useEffect } from "react";

const STORAGE_KEY = "selected_filters";

interface SelectedFilters {
  projectId: string | null;
  centerId: string | null;
  centerManagementProjectId: string | null;
}

export const usePersistedFilters = () => {
  const [filters, setFilters] = useState<SelectedFilters>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error reading persisted filters:", e);
    }
    return { projectId: null, centerId: null, centerManagementProjectId: null };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (e) {
      console.error("Error saving persisted filters:", e);
    }
  }, [filters]);

  const setProjectId = (projectId: string | null) => {
    setFilters(prev => ({ ...prev, projectId }));
  };

  const setCenterId = (centerId: string | null) => {
    setFilters(prev => ({ ...prev, centerId }));
  };

  const setCenterManagementProjectId = (centerManagementProjectId: string | null) => {
    setFilters(prev => ({ ...prev, centerManagementProjectId }));
  };

  return {
    projectId: filters.projectId,
    centerId: filters.centerId,
    centerManagementProjectId: filters.centerManagementProjectId,
    setProjectId,
    setCenterId,
    setCenterManagementProjectId,
  };
};
