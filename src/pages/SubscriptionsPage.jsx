// src/App.jsx
import React, { useState, useEffect } from "react";
import "./SubscriptionsPage.css";
import { useNavigate } from "react-router-dom";
import { usePresets } from "../Context/ServicesContext";
import Modal from "../Components/Modal";

export default function App() {
  const [clients, setClients] = useState([]);
  const [subs, setSubs] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("all");

  const { presets } = usePresets();
  const navigate = useNavigate();

  // Modal toggles
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Tracks edit mode (null = adding new, string ID = updating existing)
  const [editingClientId, setEditingClientId] = useState(null);
  const [editingSubId, setEditingSubId] = useState(null);

  //sort term
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState(1);

  const DEFAULT_CLIENT = { name: "", logo_url: "", url: "" };
  const [client, setClient] = useState(DEFAULT_CLIENT);

  const DEFAULT_SUB = {
    provider_name: "",
    preset_id: "",
    client_id: "",
    services: [],
    amount: 0,
    frequency: "monthly",
    start_date: "",
    next_due_date: "",
    billing_url: "",
    status: "ACTIVE",
    notes: "",
  };
  const [subscription, setSubscription] = useState(DEFAULT_SUB);

  const [statusChanges, setStatusChanges] = useState([]);

  const handleOpenStatusModal = async (subId) => {
    setEditingSubId(subId);

    try {
      const data = await window.api.getStatusChanges(subId);
      setStatusChanges(data || []);
    } catch (err) {
      console.error("Failed to load status history:", err);
      window.alert("Something went wrong, please try again later");
      setIsStatusModalOpen(false);
    }
    setIsStatusModalOpen(true);
  };

  const getPresetById = (id) => presets.find((p) => p.id === id);

  async function refreshData() {
    const [c, s] = await Promise.all([
      window.api.getClients(),
      window.api.getSubscriptions(),
    ]);
    setClients(c || []);
    setSubs(s || []);
  }

  useEffect(() => {
    refreshData();
  }, []);

  const AVAILABLE_SERVICES = [
    "Cookies",
    "Hosting",
    "Domain",
    "Maintenance",
    "SEO",
  ];

  const AVAILABLE_STATUS = [
    "ACTIVE",
    "PAUSED",
    "CANCELED",
    "PAST_DUE",
    "INVOICE_ISSUED",
    "INVOICE_PAID",
  ];

  function handleServiceToggle(service) {
    setSubscription((prev) => {
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

  const handleHeaderClick = (columnKey) => {
    if (sortBy === columnKey) {
      // If clicking the active sort column, invert direction
      setSortOrder((prev) => prev * -1);
    } else {
      // New column: set key and default to ascending
      setSortBy(columnKey);
      setSortOrder(1);
    }
  };

  // --- CLIENT ACTIONS ---
  function openCreateClientModal() {
    setEditingClientId(null);
    setClient(DEFAULT_CLIENT);
    setIsClientModalOpen(true);
  }

  function openEditClientModal(c, e) {
    e.stopPropagation(); // Don't trigger client row selection
    setEditingClientId(c.id);
    setClient({
      name: c.name || "",
      logo_url: c.logo_url || "",
      url: c.url || "",
    });
    setIsClientModalOpen(true);
  }

  const formatDate = (date) => {
    const yyyy = date.getFullYear();

    // Months are 0-indexed in JS (January is 0), so we add 1.
    // padStart(2, '0') ensures months 1-9 become '01'-'09'
    const mm = String(date.getMonth() + 1).padStart(2, "0");

    const dd = String(date.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  };

  // Usage:
  const today = new Date();

  const calculateNextDueDate = (startDateStr, frequency) => {
    if (!startDateStr) return "";

    // Create a date object from the YYYY-MM-DD string
    const [year, month, day] = startDateStr.split("-").map(Number);
    // Note: month is 0-indexed in the Date constructor, so subtract 1
    const nextDate = new Date(year, month - 1, day);

    if (frequency === "anualy") {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else if (frequency === "monthly") {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else {
      nextDate.setFullYear(nextDate.getFullYear() + 2);
    }
    return formatDate(nextDate);
  };

  async function handleSaveClient(e) {
    e.preventDefault();
    if (editingClientId) {
      // if editing save changes
      await window.api.updateClient({
        id: editingClientId,
        name: client.name,
        logo_url: client.logo_url || null,
        url: client.url || null,
      });
    } else {
      //otherwise add client
      await window.api.addClient({
        name: client.name,
        logo_url: client.logo_url || null,
        url: client.url || null,
      });
    }
    setClient(DEFAULT_CLIENT);
    setEditingClientId(null);
    setIsClientModalOpen(false);
    refreshData();
  }

  async function handleDeleteClient(id, e) {
    e.stopPropagation(); // Don't trigger client row selection
    //! delete them and their subscriptions only if they are not active
    if (subs.some((s) => s.client_id === id)) {
      window.alert(
        "Cannot delete this client as they have active subscriptions",
      );
      return;
    }
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    await window.api.deleteClient(id);
    if (selectedClientId === id) {
      setSelectedClientId("all");
    }
    refreshData();
  }

  // --- SUBSCRIPTION ACTIONS ---
  function openCreateSubModal() {
    setEditingSubId(null);
    setSubscription({
      ...DEFAULT_SUB,
      client_id: selectedClientId !== "all" ? selectedClientId : "", // automatically add the selected client's id
    });
    setIsSubModalOpen(true);
  }

  function openEditSubModal(s) {
    setEditingSubId(s.id);
    setSubscription({
      //create shallow copy
      provider_name: s.provider_name || "",
      preset_id: s.preset_id || "",
      client_id: s.client_id || "",
      services: Array.isArray(s.services) ? s.services : [],
      amount: s.amount || 0,
      frequency: s.frequency || "monthly",
      start_date: s.start_date || "",
      next_due_date: s.next_due_date || "",
      billing_url: s.billing_url || "",
      status: s.status || "ACTIVE",
      notes: s.notes || "",
    });
    setIsSubModalOpen(true);
  }

  async function handleSaveSub(e) {
    e.preventDefault();
    console.log(subscription);
    const payload = {
      provider_name: subscription.provider_name || null,
      preset_id: subscription.preset_id || "",
      client_id: subscription.client_id || null,
      services: subscription.services,
      amount: parseFloat(subscription.amount) || 0,
      frequency: subscription.frequency,
      start_date: subscription.start_date,
      next_due_date: subscription.next_due_date,
      billing_url: subscription.billing_url,
      status: subscription.status || "ACTIVE",
      notes: subscription.notes || "",
    };

    if (editingSubId) {
      await window.api.updateSubscription({ id: editingSubId, ...payload });
    } else {
      await window.api.addSubscription(payload);
    }

    setSubscription(DEFAULT_SUB);
    setEditingSubId(null);
    setIsSubModalOpen(false);
    refreshData();
  }

  async function handleDeleteSub(id) {
    if (!window.confirm("Delete this subscription?")) return;
    await window.api.deleteSubscription(id);
    refreshData();
  }

  const filteredSubs =
    selectedClientId === "all"
      ? subs
      : subs.filter((s) => s.client_id === selectedClientId);

  return (
    <div className="app-container">
      {/* ----------------- LEFT SIDEBAR: CLIENTS ----------------- */}
      <aside
        className="sidebar"
        style={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        <div className="header-section">
          <h2 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 700 }}>
            Clients
          </h2>
          <button
            onClick={openCreateClientModal}
            className="icon-add-btn"
            title="Add New Client"
          >
            +
          </button>
        </div>

        {/* 2. Scrollable Middle Section (flex: 1 pushes the bottom container down) */}
        <div className="client-list" style={{ flex: 1, overflowY: "auto" }}>
          <div
            onClick={() => setSelectedClientId("all")}
            className={`client-item ${selectedClientId === "all" ? "active" : ""}`}
          >
            <div className="avatar-fallback">ALL</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>All Clients</div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                {subs.length} total subscriptions
              </div>
            </div>
          </div>

          {clients.map((c) => {
            const clientSubCount = subs.filter(
              (s) => s.client_id === c.id,
            ).length;
            const isSelected = selectedClientId === c.id;

            return (
              <div
                key={c.id}
                onClick={() => setSelectedClientId(c.id)}
                className={`client-item ${isSelected ? "active" : ""}`}
              >
                {c.logo_url ? (
                  <img
                    src={c.logo_url}
                    alt={c.name}
                    className="avatar-img"
                    onError={(e) => {
                      e.target.style.display = "none";
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = "flex";
                      }
                    }}
                  />
                ) : null}
                <div
                  className="avatar-fallback"
                  style={{ display: c.logo_url ? "none" : "flex" }}
                >
                  {c.name.slice(0, 2).toUpperCase()}
                </div>

                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div className="truncate">{c.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    {clientSubCount}{" "}
                    {clientSubCount === 1 ? "subscription" : "subscriptions"}
                  </div>
                </div>

                {/* Client Edit and Delete Actions */}
                <div className="action-buttons">
                  <button
                    onClick={(e) => openEditClientModal(c, e)}
                    className="edit-btn"
                    title="Edit client"
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => handleDeleteClient(c.id, e)}
                    className="delete-btn"
                    title="Delete client"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. Pinned Bottom Action (Outside the map loop) */}
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid #334155",
            marginTop: "auto",
          }}
        >
          <button
            onClick={() => navigate("/settings")}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 12px",
              background: "transparent",
              color: "#cbd5e1",
              border: "1px solid #475569",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            ⚙ Settings
          </button>
        </div>
      </aside>

      {/* ----------------- RIGHT PANEL: SUBSCRIPTIONS ----------------- */}
      <main className="main-content">
        <div className="header-section" style={{ padding: "0 0 20px 0" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", margin: 0, fontWeight: 700 }}>
              {selectedClientId === "all"
                ? "All Subscriptions"
                : clients.find((c) => c.id === selectedClientId)?.name ||
                  "Subscriptions"}
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: 4 }}>
              Showing {filteredSubs.length} subscriptions
            </p>
          </div>
          <button onClick={openCreateSubModal} className="action-add-btn">
            + Add Subscription
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th
                  onClick={() => handleHeaderClick("services_str")}
                  style={sortBy === "services_str" ? { color: "orange" } : {}}
                >
                  PRESET
                </th>
                {/* Fixed: Removed stray parenthesis */}
                <th
                  onClick={() => handleHeaderClick("client_name")}
                  style={sortBy === "client_name" ? { color: "orange" } : {}}
                >
                  ASSIGNED CLIENT
                </th>
                <th
                  onClick={() => handleHeaderClick("provider_name")}
                  style={sortBy === "provider_name" ? { color: "orange" } : {}}
                >
                  PROVIDER
                </th>
                <th
                  onClick={() => handleHeaderClick("amount")}
                  style={sortBy === "amount" ? { color: "orange" } : {}}
                >
                  COST
                </th>
                <th
                  onClick={() => handleHeaderClick("start_date")}
                  style={sortBy === "start_date" ? { color: "orange" } : {}}
                >
                  START DATE
                </th>
                <th
                  onClick={() => handleHeaderClick("next_due_date")}
                  style={sortBy === "next_due_date" ? { color: "orange" } : {}}
                >
                  NEXT DUE
                </th>
                <th
                  onClick={() => handleHeaderClick("status")}
                  style={sortBy === "status" ? { color: "orange" } : {}}
                >
                  STATUS
                </th>
                <th
                  onClick={() => handleHeaderClick("notes")}
                  style={sortBy === "notes" ? { color: "orange" } : {}}
                >
                  NOTES
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSubs.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    style={{
                      textAlign: "center",
                      padding: 32,
                      color: "#64748b",
                    }}
                  >
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                filteredSubs
                  .sort((a, b) => {
                    if (sortBy === "amount") {
                      //compare numerical values
                      return ((a.amount || 0) - (b.amount || 0)) * sortOrder;
                    }

                    return (
                      String(a[sortBy] ?? "").localeCompare(
                        String(b[sortBy] ?? ""),
                      ) * sortOrder
                    );
                  })
                  .map((s) => {
                    console.log(s);
                    return (
                      <tr key={s.id}>
                        <td>
                          <strong>
                            {getPresetById(s.preset_id)?.service_name ||
                              "Custom"}
                          </strong>
                        </td>
                        <td
                          className={s.client_url ? "link-style" : ""}
                          onClick={() => {
                            if (s.client_url) window.api.openLink(s.client_url);
                          }}
                        >
                          {s.client_name || "Unassigned / Personal"}
                        </td>
                        <td
                          className={s.url ? "link-style" : ""}
                          onClick={() => {
                            if (s.url) window.api.openLink(s.url);
                          }}
                        >
                          {s.provider_name}
                        </td>
                        <td>
                          ${Number(s.amount).toFixed(2)}{" "}
                          <span
                            style={{ fontSize: "0.75rem", color: "#64748b" }}
                          >
                            / {s.frequency}
                          </span>
                        </td>
                        <td>{s.start_date || "-"}</td>
                        <td>{s.next_due_date || "-"}</td>
                        <td
                          className="link-style"
                          onClick={() => {
                            handleOpenStatusModal(s.id);
                          }}
                        >
                          {s.status || "-"}
                        </td>
                        <td>{s.notes || "-"}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => openEditSubModal(s)}
                              className="edit-btn"
                              title="Edit subscription"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => handleDeleteSub(s.id)}
                              className="delete-btn"
                              title="Delete subscription"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* ----------------- MODAL: ADD / EDIT CLIENT ----------------- */}
      {isClientModalOpen && (
        <Modal
          closeModal={() => {
            setIsClientModalOpen(false);
          }}
          onSave={handleSaveClient}
          message={editingClientId ? "Edit Client" : "Add Client"}
          saveMessage={editingClientId ? "Save Changes" : "Create Client"}
        >
          <label className="form-label">Client Name *</label>
          <input
            placeholder="e.g. Acme Studio"
            value={client.name}
            onChange={(e) =>
              setClient((prev) => ({ ...prev, name: e.target.value }))
            }
            required
            className="form-input"
          />

          <label className="form-label">Logo Image URL (Optional)</label>
          <input
            type="url"
            placeholder="https://example.com/logo.png"
            value={client.logo_url}
            onChange={(e) =>
              setClient((prev) => ({ ...prev, logo_url: e.target.value }))
            }
            className="form-input"
          />

          <label className="form-label">Client Website URL (Optional)</label>
          <input
            type="url"
            placeholder="https://client.com"
            value={client.url}
            onChange={(e) =>
              setClient((prev) => ({ ...prev, url: e.target.value }))
            }
            className="form-input"
          />
        </Modal>
      )}

      {/* ----------------- MODAL: ADD / EDIT SUBSCRIPTION ----------------- */}
      {isSubModalOpen && (
        <Modal
          closeModal={() => {
            setIsSubModalOpen(false);
          }}
          onSave={handleSaveSub}
          message={editingSubId ? "Edit Subscription" : "Add Subscription"}
          saveMessage={editingSubId ? "Save Changes" : "Track Subscription"}
        >
          <label className="form-label">Assign Client</label>
          <select
            value={subscription.client_id || ""}
            onChange={(e) =>
              setSubscription((prev) => ({
                ...prev,
                client_id: e.target.value,
              }))
            }
            className="form-input"
          >
            <option value="">None (Personal / Unassigned)</option>
            {clients.map((c) => {
              return (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              );
            })}
          </select>

          <label className="form-label">Select Preset</label>
          <select
            value={subscription.preset_id || ""}
            onChange={(e) => {
              //get the preset required
              if (e.target.value === "") {
                setSubscription((prev) => ({
                  ...prev,
                  preset_id: "",
                }));
                return;
              }

              const selectedPreset = presets.find((p) => {
                return p.id === e.target.value;
              });
              const todayf = formatDate(new Date());
              const nextf = calculateNextDueDate(
                todayf,
                selectedPreset?.frequency || "anualy",
              );
              setSubscription((prev) => ({
                ...prev,
                preset_id: selectedPreset.id,
                provider_name: selectedPreset.provider_name,
                services: selectedPreset.services || [],
                amount: selectedPreset.amount || 0,
                frequency: selectedPreset.frequency || "anualy",
                start_date: todayf,
                next_due_date: nextf,
              }));
            }}
            className="form-input"
          >
            <option value="">Custom</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {`${p.service_name} (${p.provider_name})` || ""}
              </option>
            ))}
          </select>

          <label className="form-label">Services *</label>
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
                  checked={subscription?.services?.includes(service)}
                  onChange={() => handleServiceToggle(service)}
                />
                {service}
              </label>
            ))}
          </div>

          <div className="form-row">
            <div>
              <label className="form-label">Amount (€) *</label>
              <input
                type="number"
                step="0.01"
                placeholder="15.00"
                value={subscription.amount}
                onChange={(e) =>
                  setSubscription((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                required
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Frequency</label>
              <select
                value={subscription.frequency}
                onChange={(e) =>
                  setSubscription((prev) => ({
                    ...prev,
                    frequency: e.target.value || "anualy",
                    next_due_date: calculateNextDueDate(
                      prev.start_date,
                      e.target.value || "anualy",
                    ),
                  }))
                }
                className="form-input"
              >
                <option value="monthly">Monthly</option>
                <option value="anualy">Anualy</option>
                <option value="bi-anualy">Bi-anualy</option>
              </select>
            </div>
          </div>

          <label className="form-label">Start Date</label>
          <input
            type="date"
            value={subscription.start_date || ""}
            onChange={(e) =>
              setSubscription((prev) => ({
                ...prev,
                start_date: e.target.value,
              }))
            }
            className="form-input"
          />

          <label className="form-label">Next Renewal Date *</label>
          <input
            type="date"
            value={subscription.next_due_date || ""}
            onChange={(e) =>
              setSubscription((prev) => ({
                ...prev,
                next_due_date: e.target.value,
              }))
            }
            required
            className="form-input"
          />

          {/* Status */}
          <label className="form-label">Status</label>
          <select
            value={subscription.status || ""}
            onChange={
              (e) =>
                setSubscription((prev) => ({
                  ...prev,
                  status: e.target.value,
                }))
              //!log status change
            }
            className="form-input"
          >
            {AVAILABLE_STATUS.map((status) => {
              return (
                <option key={status} value={status}>
                  {status}
                </option>
              );
            })}
          </select>

          <label className="form-label">Notes</label>
          <input
            type="text"
            value={subscription.notes || ""}
            onChange={(e) =>
              setSubscription((prev) => ({
                ...prev,
                notes: e.target.value,
              }))
            }
            className="form-input"
          />
        </Modal>
      )}

      {/* ----------------- MODAL: STATUS ----------------- */}
      {isStatusModalOpen && (
        <Modal
          closeModal={() => {
            setEditingSubId(null);
            setIsStatusModalOpen(false);
            setStatusChanges([]);
          }}
          message="Status History"
          saveMessage="Close"
        >
          {statusChanges.length === 0 ? (
            <p style={{ color: "#94a3b8" }}>No status changes recorded.</p>
          ) : (
            statusChanges.map((change) => (
              <div
                key={change.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid #334155",
                }}
              >
                <span>
                  {change.former_status} &rarr;{" "}
                  <strong>{change.new_status}</strong>
                </span>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  {change.timestamp}
                </span>
              </div>
            ))
          )}
        </Modal>
      )}
    </div>
  );
}
