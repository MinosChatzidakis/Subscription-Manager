import { useState, useEffect } from "react";
import Modal from "../Components/Modal";
import "./SubscriptionsPage.css";
import { useProviders } from "../Context/providersContext";
import { useNavigate } from "react-router-dom";

const SettingsPage = () => {
  const DEFAULT_PROVIDER = {
    name: "",
    url: "",
  };

  const { providers, setProviders, fetchProviders } = useProviders();
  const navigate = useNavigate();

  const [form, setForm] = useState(DEFAULT_PROVIDER);
  const [editingId, setEditingId] = useState(null); // null when creating, number/string when editing
  const [isModalOpen, setIsModalOpen] = useState(false);

  /*   // 1. Fetch initial providers from SQLite via IPC
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
  }, []); */

  // 2. Open modal for Add
  const handleOpenAddModal = () => {
    setEditingId(null);
    setForm(DEFAULT_PROVIDER);
    setIsModalOpen(true);
  };

  // 3. Open modal for Edit
  const handleOpenEditModal = (provider) => {
    setEditingId(provider.id);
    setForm({
      name: provider.name,
      url: provider.url,
    });
    setIsModalOpen(true);
  };

  // 4. Close modal and reset form
  const handleCloseModal = () => {
    setForm(DEFAULT_PROVIDER);
    setEditingId(null);
    setIsModalOpen(false);
  };

  // 5. Submit handler
  const handleSave = async (e) => {
    e.preventDefault();

    try {
      if (editingId !== null) {
        // a provider has been edited
        // UPDATE in SQLite: send id + payload
        await window.api.updateProvider({
          id: editingId,
          name: form.name.trim(),
          url: form.url.trim(),
        });
      } else {
        // a new provider has been added
        await window.api.createProvider({
          name: form.name.trim(),
          url: form.url.trim(),
        });
      }

      fetchProviders(); //refresh
      handleCloseModal();
    } catch (err) {
      console.error("Failed to save provider:", err);
      alert("Error saving provider. Check logs.");
    }
  };

  // 6. Delete handler
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this provider?"))
      return;
    try {
      await window.api.deleteProvider(id);
      fetchProviders();
    } catch (err) {
      console.error("Failed to delete provider:", err);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h2>Provider Settings</h2>

      {/* Provider List */}
      <div style={{ marginBottom: "20px" }}>
        {providers.length === 0 ? (
          <p>No providers configured yet.</p>
        ) : (
          providers.map((provider) => (
            <div
              key={provider.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                marginBottom: "8px",
              }}
            >
              <div>
                <strong>{provider.name}</strong>
                <div style={{ fontSize: "0.85em", color: "#666" }}>
                  {provider.url}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => handleOpenEditModal(provider)}>
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(provider.id)}
                  style={{ color: "red" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Button */}
      <button onClick={handleOpenAddModal}>Add Provider</button>
      <button onClick={() => navigate("/")}>Home Screen</button>

      {/* Modal */}
      {isModalOpen && (
        <Modal
          closeModal={() => setIsModalOpen(false)}
          onSave={handleSave}
          message={editingId !== null ? "Edit Provider" : "Add Provider"}
          saveMessage={editingId !== null ? "Save Changes" : "Create"}
        >
          <label className="form-label">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. AWS SNS, Twilio"
            /* style={{
              width: "100%",
              padding: "8px",
              boxSizing: "border-box",
            }} */
            className="form-input"
            required
          />

          <label className="form-label">URL</label>
          <input
            type="text"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://api.example.com"
            /* style={{
              width: "100%",
              padding: "8px",
              boxSizing: "border-box",
            }} */
            className="form-input"
            required
          />
        </Modal>
      )}
    </div>
  );
};

export default SettingsPage;
