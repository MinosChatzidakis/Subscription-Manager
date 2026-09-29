"use client";
import { useState } from "react";
import Modal from "../Components/Modal";
import { usePresets } from "../Context/PresetsContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "../page";
import { apiFetch } from "../utils/dateutils";

const SettingsPage = () => {
  const DEFAULT_SERVICE = {
    service_name: "",
    provider_name: "",
    frequency: "yearly",
    amount: 0,
    services: [],
    url: "",
  };
  const AVAILABLE_SERVICES = [
    "Cookies",
    "Hosting",
    "Domain",
    "Maintenance",
    "SEO",
  ];

  const { presets, setPresets, fetchPresets } = usePresets();
  const router = useRouter();

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
  const handleOpenEditModal = (preset) => {
    setEditingId(preset.id);
    setForm({
      service_name: preset.service_name || "",
      provider_name: preset.provider_name || "",
      amount: preset.amount || 0,
      frequency: preset.frequency || "",
      services: preset.services || [],
      url: preset.url || "",
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
        await apiFetch("/api/presets", {
          method: "PUT",
          body: JSON.stringify({
            id: editingId,
            service_name: form.service_name.trim() || "",
            provider_name: form.provider_name.trim() || "",
            amount: form.amount || 0,
            frequency: form.frequency.trim() || "",
            services: form.services || [],
            url: form.url.trim() || "",
          }),
        });
      } else {
        // a new service has been added
        await apiFetch("/api/presets", {
          method: "POST",
          body: JSON.stringify({
            service_name: form.service_name.trim() || "",
            provider_name: form.provider_name.trim() || "",
            amount: form.amount || 0,
            frequency: form.frequency.trim() || "",
            services: form.services || [],
            url: form.url.trim() || "",
          }),
        });
      }

      fetchPresets(); //refresh
      handleCloseModal();
    } catch (err) {
      console.error("Failed to save service:", err);
      alert("Error saving service. Check logs.");
    }
  };
  function handleServiceToggle(service) {
    setForm((prev) => {
      const currentServices = Array.isArray(prev?.services)
        ? prev.services
        : [];
      if (currentServices.includes(service)) {
        return {
          ...prev,
          services: currentServices.filter((s) => s !== service),
        };
      }
      return {
        ...prev,
        services: [...currentServices, service],
      };
    });
  }
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this service?"))
      return;
    try {
      await apiFetch(`/api/presets?id=${id}`, { method: "DELETE" });

      fetchPresets();
    } catch (err) {
      console.error("Failed to delete service:", err);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h2>Service Settings</h2>

      {/* service List */}
      <div style={{ marginBottom: "20px" }}>
        {presets.length === 0 ? (
          <p>No presets configured yet.</p>
        ) : (
          presets.map((preset) => (
            <div
              key={preset.id}
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
                <strong>{`${preset.service_name} (${preset.provider_name})`}</strong>
                <div style={{ fontSize: "0.85em", color: "#666" }}>
                  {preset.url}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => handleOpenEditModal(preset)}>
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(preset.id)}
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
      <Link href="/">Home Screen</Link>

      {/* Modal */}
      {isModalOpen && (
        <Modal
          closeModal={() => setIsModalOpen(false)}
          onSave={handleSave}
          message={editingId !== null ? "Edit Service" : "Add Service"}
          saveMessage={editingId !== null ? "Save Changes" : "Create"}
        >
          <label className="form-label">Preset Name</label>
          <input
            type="text"
            value={form.service_name}
            onChange={(e) => setForm({ ...form, service_name: e.target.value })}
            placeholder="e.g. Cookies, Domain etc"
            className="form-input"
            required
          />
          {/* Select services */}
          <label className="form-label">Services</label>
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "12px",
            }}
          >
            {AVAILABLE_SERVICES.map((service) => (
              <label
                key={service}
                style={{
                  color: "#fff",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <input
                  type="checkbox"
                  checked={form?.services?.includes(service)}
                  onChange={() => handleServiceToggle(service)}
                />
                {service}
              </label>
            ))}
          </div>

          <label className="form-label">Provider</label>
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
