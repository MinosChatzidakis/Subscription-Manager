"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "../utils/api";

const PresetsContext = createContext();

export const PresetsProvider = ({ children }) => {
  const [presets, setPresets] = useState([]);

  const fetchPresets = async () => {
    try {
      const data = await apiFetch("/api/presets");
      setPresets(data || []);
    } catch (err) {
      console.error("Failed to load presets:", err);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  return (
    <PresetsContext.Provider value={{ presets, setPresets, fetchPresets }}>
      {children}
    </PresetsContext.Provider>
  );
};

export const usePresets = () => useContext(PresetsContext);
