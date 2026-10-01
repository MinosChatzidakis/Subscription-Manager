"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePresets } from "./contexts/PresetsContext";
import Modal from "@/app/components/Modal";
import { formatDate, calculateNextDueDate } from "./utils/dateutils";
import { apiFetch } from "./utils/api";

export default function App() {
  const [clients, setClients] = useState([]);
  const [subs, setSubs] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("all");

  const { presets } = usePresets();
  const router = useRouter();

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
  const [initialClient, setInitialClient] = useState(null);

  const getDefaultSub = () => {
    const today = formatDate(new Date());

    return {
      provider_name: "",
      preset_id: "",
      client_id: "",
      services: [],
      amount: 0,
      frequency: "monthly",
      start_date: today,
      next_due_date: calculateNextDueDate(today, "monthly"),
      billing_url: "",
      status: "ACTIVE",
      payment_status: "",
      notes: "",
    };
  };
  const [subscription, setSubscription] = useState(getDefaultSub());
  const [initialSubscription, setInitialSubscription] = useState(null);

  const hasSubscriptionChanged = () => {
    if (!subscription || !initialSubscription) return false;

    // Check all standard text/date fields
    const standardFields = [
      "provider_name",
      "preset_id",
      "client_id",
      "frequency",
      "start_date",
      "next_due_date",
      "billing_url",
      "status",
      "payment_status",
      "notes",
    ];

    for (const key of standardFields) {
      if (subscription[key] !== initialSubscription[key]) return true;
    }

    // 2. Check amount (safely handles string vs number)
    if (Number(subscription.amount) !== Number(initialSubscription.amount)) {
      return true;
    }

    // 3. Check services array (order-independent)
    const currentServices = subscription.services || [];
    const initServices = initialSubscription.services || [];

    if (currentServices.length !== initServices.length) return true;

    // Since lengths are identical, if any current service is missing from the initial list, it changed.
    const hasDifferentServices = currentServices.some(
      (service) => !initServices.includes(service),
    );

    if (hasDifferentServices) return true;

    return false;
  };

  const hasClientChanged = () => {
    if (!client || !initialClient) return false;

    const clientFields = ["name", "logo_url", "url"];

    for (const key of clientFields) {
      if (client[key] !== initialClient[key]) return true;
    }

    return false;
  };

  const [statusChanges, setStatusChanges] = useState([]);

  const handleOpenStatusModal = async (subId) => {
    setEditingSubId(subId);
    try {
      const data = await apiFetch("/api/statusChanges", {
        method: "POST",
        body: JSON.stringify({ subId }),
      });
      setStatusChanges(data || []);
      setIsStatusModalOpen(true);
    } catch (err) {
      console.error("Failed to load status history:", err);
      window.alert("Something went wrong, please try again later");
    }
  };

  const getPresetById = (id) => presets.find((p) => p.id === id);

  async function refreshData() {
    try {
      const [fetchedClients, fetchedSubs] = await Promise.all([
        apiFetch("/api/clients"),
        apiFetch("/api/subscriptions"),
      ]);
      setClients(fetchedClients || []);
      setSubs(fetchedSubs || []);
    } catch (err) {
      console.error("Failed to load data:", err);
      window.alert("Failed to refresh data. Please check your connection.");
    }
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
  const AVAILABLE_STATUS = ["ACTIVE", "CANCELED", "RENEWAL COMING UP"];
  const AVAILABLE_PAYMENT_STATUS = ["PENDING", "INVOICE ISSUED", "PAID"];

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
      return { ...prev, services: [...currentServices, service] };
    });
  }

  const handleHeaderClick = (columnKey) => {
    if (sortBy === columnKey) {
      setSortOrder((prev) => prev * -1);
    } else {
      setSortBy(columnKey);
      setSortOrder(1);
    }
  };

  // --- CLIENT ACTIONS ---
  function openCreateClientModal() {
    setEditingClientId(null);
    setClient(DEFAULT_CLIENT);
    setInitialClient(DEFAULT_CLIENT); // Capture baseline for creating
    setIsClientModalOpen(true);
  }

  function openEditClientModal(c, e) {
    e.stopPropagation();
    setEditingClientId(c.id);

    // Construct the clean object first
    const clientData = {
      name: c.name || "",
      logo_url: c.logo_url || "",
      url: c.url || "",
    };

    setClient(clientData);
    setInitialClient(clientData); // Now they match perfectly
    setIsClientModalOpen(true);
  }

  async function handleSaveClient(e) {
    e.preventDefault();
    const hasChanges = hasClientChanged();

    if (!hasChanges) {
      setIsSubModalOpen(false); // Close without saving
      return;
    }
    try {
      const payload = {
        name: client.name,
        logo_url: client.logo_url || null,
        url: client.url || null,
      };

      if (editingClientId) payload.id = editingClientId;

      await apiFetch("/api/clients", {
        method: editingClientId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      setClient(DEFAULT_CLIENT);
      setEditingClientId(null);
      setIsClientModalOpen(false);
      refreshData();
    } catch (err) {
      console.error("Failed to save client:", err);
      window.alert("Something went wrong, please try again later");
    }
  }

  async function handleDeleteClient(id, e) {
    e.stopPropagation();
    if (subs.some((s) => s.client_id === id)) {
      window.alert(
        "Cannot delete this client as they have active subscriptions",
      );
      return;
    }
    if (!window.confirm("Are you sure you want to delete this client?")) return;

    try {
      // Updated to use URL parameter instead of body
      await apiFetch(`/api/clients?id=${id}`, { method: "DELETE" });
      if (selectedClientId === id) {
        setSelectedClientId("all");
      }
      refreshData();
    } catch (err) {
      console.error("Failed to delete client:", err);
      window.alert("Something went wrong deleting the client.");
    }
  }

  // --- SUBSCRIPTION ACTIONS ---
  function openCreateSubModal() {
    setEditingSubId(null);

    // Construct the clean object first
    const newSubData = {
      ...getDefaultSub(),
      client_id: selectedClientId !== "all" ? selectedClientId : "",
    };

    setSubscription(newSubData);
    setInitialSubscription(newSubData); // Capture baseline for creating
    setIsSubModalOpen(true);
  }

  function openEditSubModal(s) {
    setEditingSubId(s.id);

    // Construct the clean object first
    const subData = {
      provider_name: s.provider_name || "",
      preset_id: s.preset_id || "",
      client_id: s.client_id || "",
      services: Array.isArray(s.services) ? s.services : [],
      amount: s.amount || 0,
      frequency: s.frequency || "monthly",
      start_date: s.start_date || "",
      next_due_date: s.next_due_date || "",
      billing_url: s.billing_url || "",
      status: s.status?.toUpperCase() || "ACTIVE",
      payment_status: s.payment_status?.toUpperCase() || "",
      notes: s.notes || "",
    };

    setSubscription(subData);
    setInitialSubscription(subData); // Now they match perfectly
    setIsSubModalOpen(true);
  }

  async function handleSaveSub(e) {
    e.preventDefault();

    const hasChanges = hasSubscriptionChanged();

    if (!hasChanges) {
      setIsSubModalOpen(false); // Close without saving
      return;
    }

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
      payment_status: subscription.payment_status || "",
      notes: subscription.notes || "",
    };

    if (editingSubId) payload.id = editingSubId;

    try {
      await apiFetch("/api/subscriptions", {
        method: editingSubId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      setSubscription(getDefaultSub());
      setEditingSubId(null);
      setIsSubModalOpen(false);
      refreshData();
    } catch (err) {
      console.error("Failed to save subscription:", err);
      window.alert("Failed to save subscription.");
    }
  }

  async function handleDeleteSub(id) {
    if (!window.confirm("Delete this subscription?")) return;
    try {
      await apiFetch(`/api/subscriptions?id=${id}`, { method: "DELETE" });
      refreshData();
    } catch (err) {
      console.error("Failed to delete subscription:", err);
      window.alert("Failed to delete subscription.");
    }
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

        <div
          style={{
            padding: "16px",
            borderTop: "1px solid #334155",
            marginTop: "auto",
          }}
        >
          <button
            onClick={() => router.push("/settings")}
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
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubs.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
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
                      return ((a.amount || 0) - (b.amount || 0)) * sortOrder;
                    }
                    return (
                      String(a[sortBy] ?? "").localeCompare(
                        String(b[sortBy] ?? ""),
                      ) * sortOrder
                    );
                  })
                  .map((s) => {
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
                            if (s.client_url)
                              window.open(
                                s.client_url,
                                "_blank",
                                "noopener,noreferrer",
                              );
                          }}
                        >
                          {s.client_name || "Unassigned / Personal"}
                        </td>
                        <td
                          className={s.url ? "link-style" : ""}
                          onClick={() => {
                            if (s.url)
                              window.open(
                                s.url,
                                "_blank",
                                "noopener,noreferrer",
                              );
                          }}
                        >
                          {s.provider_name || "-"}
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
                          onClick={() => handleOpenStatusModal(s.id)}
                        >
                          {(s.payment_status
                            ? `${s.status} - ${s.payment_status}`
                            : s.status) || "-"}
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

      {/* ----------------- CLIENT MODAL ----------------- */}
      {isClientModalOpen && (
        <Modal
          closeModal={() => setIsClientModalOpen(false)}
          onSave={handleSaveClient}
          message={editingClientId ? "Edit Client" : "Add Client"}
          saveMessage={editingClientId ? "Save Changes" : "Create Client"}
          disableSubmit={!hasClientChanged()}
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

      {/* ----------------- SUBSCRIPTION MODAL ----------------- */}
      {isSubModalOpen && (
        <Modal
          closeModal={() => {
            setIsSubModalOpen(false);
          }}
          onSave={handleSaveSub}
          message={editingSubId ? "Edit Subscription" : "Add Subscription"}
          saveMessage={editingSubId ? "Save Changes" : "Track Subscription"}
          disableSubmit={!hasSubscriptionChanged()}
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

          <label className="form-label">Provider</label>
          <input
            type="text"
            className="form-input"
            value={subscription.provider_name || ""}
            onChange={(e) =>
              setSubscription((prev) => ({
                ...prev,
                provider_name: e.target.value,
              }))
            }
            //no reason for a placeholder since preset selection populates this field. If it is empty it means a preset has not been selected
          />

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
            {/* amount */}
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

            {/* frequency */}
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
            onChange={(e) => {
              setSubscription((prev) => ({
                ...prev,
                start_date: e.target.value,
                next_due_date: calculateNextDueDate(
                  //automatically fill next due date
                  e.target.value,
                  subscription.frequency,
                ),
              }));
            }}
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
            onChange={(e) =>
              setSubscription((prev) => ({
                ...prev,
                status: e.target.value,
              }))
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

          {/* payment status */}
          <label className="form-label">Payment Status</label>
          <select
            value={subscription.payment_status}
            onChange={(e) =>
              setSubscription((prev) => ({
                ...prev,
                payment_status: e.target.value,
              }))
            }
            className="form-input"
          >
            <option key={"default"} value={""}>
              - (Leave blank if this is a new subscription)
            </option>
            {AVAILABLE_PAYMENT_STATUS.map((status) => {
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

      {/* ----------------- STATUS MODAL ----------------- */}
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
