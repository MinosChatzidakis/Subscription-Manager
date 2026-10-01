"use client";
import { useState } from "react";
import Modal from "../Components/Modal";
import { usePresets } from "../contexts/PresetsContext";
import Link from "next/link";
import { apiFetch } from "../utils/api";

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

  const [form, setForm] = useState(DEFAULT_SERVICE);
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setForm(DEFAULT_SERVICE);
    setIsModalOpen(true);
  };

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

  const handleCloseModal = () => {
    setForm(DEFAULT_SERVICE);
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId !== null) {
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
      fetchPresets();
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
    <div className="main-content">
      <div className="settings-container">
        <div className="settings-header">
          <h2>Service Settings</h2>
          <div className="header-actions">
            <button className="action-add-btn" onClick={handleOpenAddModal}>
              + Add Service
            </button>
            <Link
              href="/"
              className="cancel-btn link-style"
              style={{ textDecoration: "none" }}
            >
              Home Screen
            </Link>
          </div>
        </div>

        {/* Service List */}
        <div className="preset-list">
          {presets.length === 0 ? (
            <div className="empty-state">No presets configured yet.</div>
          ) : (
            presets.map((preset) => (
              <div key={preset.id} className="preset-card">
                <div className="preset-info">
                  <span className="preset-title">
                    {preset.service_name}{" "}
                    <span className="preset-provider">
                      ({preset.provider_name})
                    </span>
                  </span>
                  <span className="preset-url">
                    {preset.url || "No URL provided"}
                  </span>

                  {preset.services && preset.services.length > 0 && (
                    <div className="preset-tags">
                      {preset.services.map((s) => (
                        <span key={s} className="tag">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="preset-actions">
                  <button
                    className="secondary-btn"
                    onClick={() => handleOpenEditModal(preset)}
                  >
                    Edit
                  </button>
                  <button
                    className="delete-btn-text"
                    onClick={() => handleDelete(preset.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal (Reverted exactly to your original code) */}
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
              onChange={(e) =>
                setForm({ ...form, service_name: e.target.value })
              }
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
    </div>
  );
};

export default SettingsPage;
