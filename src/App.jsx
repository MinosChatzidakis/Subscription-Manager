import { Routes, Route, NavLink } from "react-router-dom";
import SubscriptionsPage from "./pages/SubscriptionsPage"; // Your main dashboard/clients
import SettingsPage from "./pages/Settings"; // Your provider settings page

function App() {
  return (
    <Routes>
      <Route path="/" element={<SubscriptionsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      {/* Fallback route */}
      <Route path="*" element={<div>Page not found</div>} />
    </Routes>
  );
}

export default App;
