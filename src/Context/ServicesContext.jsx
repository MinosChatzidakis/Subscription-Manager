import { createContext, useContext, useState, useEffect } from "react";

const ServicesContext = createContext();

export const ServicesProvider = ({ children }) => {
  const [services, setServices] = useState([]);

  const fetchServices = async () => {
    try {
      const data = await window.api.getServices();
      setServices(data || []);
      //! add to context
    } catch (err) {
      console.error("Failed to load services:", err);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <ServicesContext.Provider value={{ services, setServices, fetchServices }}>
      {children}
    </ServicesContext.Provider>
  );
};

export const useServices = () => useContext(ServicesContext);
