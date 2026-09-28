import { createContext, useContext, useState, useEffect } from "react";

const PresetsContext = createContext();

export const PresetsProvider = ({ children }) => {
  const [presets, setPresets] = useState([]);

  const fetchPresets = async () => {
    try {
      const data = await window.api.getPresets();
      setPresets(data || []);
      //! add to context
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
