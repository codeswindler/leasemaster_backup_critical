import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface FilterContextType {
  selectedAgentId: string | null;
  selectedLandlordId: string | null;
  selectedPropertyId: string | null;
  setSelectedAgentId: (id: string | null) => void;
  setSelectedLandlordId: (id: string | null) => void;
  setSelectedPropertyId: (id: string | null) => void;
  clearFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedAgentId, setSelectedAgentIdState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedAgentId");
    }
    return null;
  });

  const [selectedLandlordId, setSelectedLandlordIdState] = useState<string | null>(() => {
    // Don't load from localStorage if user is admin (will be cleared on auth check)
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedLandlordId");
    }
    return null;
  });

  const [selectedPropertyId, setSelectedPropertyIdState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedPropertyId");
    }
    return null;
  });
  
  // Clear all filters
  const clearFilters = () => {
    setSelectedAgentIdState(null);
    setSelectedLandlordIdState(null);
    setSelectedPropertyIdState(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("selectedAgentId");
      localStorage.removeItem("selectedLandlordId");
      localStorage.removeItem("selectedPropertyId");
    }
  };

  // Sync state with localStorage
  useEffect(() => {
    if (selectedAgentId) {
      localStorage.setItem("selectedAgentId", selectedAgentId);
    } else {
      localStorage.removeItem("selectedAgentId");
    }
  }, [selectedAgentId]);

  useEffect(() => {
    if (selectedLandlordId) {
      localStorage.setItem("selectedLandlordId", selectedLandlordId);
    } else {
      localStorage.removeItem("selectedLandlordId");
    }
  }, [selectedLandlordId]);

  useEffect(() => {
    if (selectedPropertyId) {
      localStorage.setItem("selectedPropertyId", selectedPropertyId);
    } else {
      localStorage.removeItem("selectedPropertyId");
    }
  }, [selectedPropertyId]);

  const setSelectedLandlordId = (id: string | null) => {
    setSelectedLandlordIdState(id);
    // When landlord changes, clear property selection
    if (id !== selectedLandlordId) {
      setSelectedPropertyIdState(null);
      localStorage.removeItem("selectedPropertyId");
    }
  };

  const setSelectedAgentId = (id: string | null) => {
    setSelectedAgentIdState(id);
    if (id !== selectedAgentId) {
      setSelectedLandlordIdState(null);
      setSelectedPropertyIdState(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("selectedLandlordId");
        localStorage.removeItem("selectedPropertyId");
      }
    }
  };

  const setSelectedPropertyId = (id: string | null) => {
    setSelectedPropertyIdState(id);
  };

  return (
    <FilterContext.Provider
      value={{
        selectedAgentId,
        selectedLandlordId,
        selectedPropertyId,
        setSelectedAgentId,
        setSelectedLandlordId,
        setSelectedPropertyId,
        clearFilters,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error("useFilter must be used within a FilterProvider");
  }
  return context;
}

