import { useState, useEffect } from "react";
import Modal from "../Components/Modal";
import "./SubscriptionsPage.css";
import { useServices } from "../Context/ServicesContext";
import { useNavigate } from "react-router-dom";

const SettingsPage = () => {
  const DEFAULT_SERVICE = {
    service_name: "",
    provider_name: "",
    frequency: "yearly",
    amount: 0,
    url: "",
  };

  const { services, setServices, fetchServices } = useServices();
  const navigate = useNavigate();

  const [form, setForm] = useState(DEFAULT_SERVICE);
  const [editingId, setEditingId] = useState(null); // null when creating, number/string when editing
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 2. Open modal for Add
  const handleOpenAddModal = () => {
    setEditingId(null);
    setForm(DEFAULT_SERVICE);
    setIsModalOpen(true);
  };

  // 3. Open modal for Edit
  const handleOpenEditModal = (service) => {
    setEditingId(service.id);
    setForm({
      service_name: service.service_name || "",
      provider_name: service.provider_name || "",
      amount: service.amount || 0,
      frequency: service.frequency || "",
      url: service.url || "",
    });
    setIsModalOpen(true);
  };

  // 4. Close modal and reset form
  const handleCloseModal = () => {
    setForm(DEFAULT_SERVICE);
    setEditingId(null);
    setIsModalOpen(false);
  };

  // 5. Submit handler
  const handleSave = async (e) => {
    e.preventDefault();

    try {
      if (editingId !== null) {
        // a service has been edited
        // UPDATE in SQLite: send id + payload
        await window.api.updateService({
          id: editingId,
          service_name: form.service_name.trim() || "",
          provider_name: form.provider_name.trim() || "",
          amount: form.amount || 0,
          frequency: form.frequency.trim() || "",
          url: form.url.trim() || "",
        });
      } else {
        // a new service has been added
        await window.api.createService({
          service_name: form.service_name.trim() || "",
          provider_name: form.provider_name.trim() || "",
          amount: form.amount || 0,
          frequency: form.frequency.trim() || "",
          url: form.url.trim() || "",
        });
      }

      fetchServices(); //refresh
      handleCloseModal();
    } catch (err) {
      console.error("Failed to save service:", err);
      alert("Error saving service. Check logs.");
    }
  };

  // 6. Delete handler
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this service?"))
      return;
    try {
      await window.api.deleteService(id);
      fetchServices();
    } catch (err) {
      console.error("Failed to delete service:", err);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h2>Service Settings</h2>

      {/* service List */}
      <div style={{ marginBottom: "20px" }}>
        {services.length === 0 ? (
          <p>No services configured yet.</p>
        ) : (
          services.map((service) => (
            <div
              key={service.id}
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
                <strong>{`${service.service_name} (${service.provider_name})`}</strong>
                <div style={{ fontSize: "0.85em", color: "#666" }}>
                  {service.url}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => handleOpenEditModal(service)}>
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
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
      <button onClick={handleOpenAddModal}>Add Service</button>
      <button onClick={() => navigate("/")}>Home Screen</button>

      {/* Modal */}
      {isModalOpen && (
        <Modal
          closeModal={() => setIsModalOpen(false)}
          onSave={handleSave}
          message={editingId !== null ? "Edit Service" : "Add Service"}
          saveMessage={editingId !== null ? "Save Changes" : "Create"}
        >
          <label className="form-label">Service Name</label>
          <input
            type="text"
            value={form.service_name}
            onChange={(e) => setForm({ ...form, service_name: e.target.value })}
            placeholder="e.g. Cookies, Domain etc"
            className="form-input"
            required
          />

          <label className="form-label">service Name</label>
          <input
            type="text"
            value={form.provider_name}
            onChange={(e) =>
              setForm({ ...form, provider_name: e.target.value })
            }
            placeholder="e.g.Cloudfare"
            className="form-input"
            required
          />

          <label className="form-label">amount</label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="form-input"
            required
          />

          <label className="form-label">Frequency</label>
          <select
            value={form.frequency || ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                frequency: e.target.value,
              }))
            }
            className="form-input"
          >
            {["monthly", "anualy", "bi-anualy"].map((f) => {
              return (
                <option key={`frequency: ${f}`} value={f}>
                  {f}
                </option>
              );
            })}
          </select>

          <label className="form-label">URL</label>
          <input
            type="text"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://api.example.com"
            className="form-input"
          />
        </Modal>
      )}
    </div>
  );
};

export default SettingsPage;
