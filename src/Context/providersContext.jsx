import { createContext, useContext, useState, useEffect } from "react";

const ProvidersContext = createContext();

export const ProvidersProvider = ({ children }) => {
  const [providers, setProviders] = useState([]);

  const fetchProviders = async () => {
    try {
      const data = await window.api.getProviders();
      setProviders(data || []);
      //! add to context
    } catch (err) {
      console.error("Failed to load providers:", err);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  return (
    <ProvidersContext.Provider
      value={{ providers, setProviders, fetchProviders }}
    >
      {children}
    </ProvidersContext.Provider>
  );
};

export const useProviders = () => useContext(ProvidersContext);
