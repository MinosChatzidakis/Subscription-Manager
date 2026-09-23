// src/App.jsx
import React, { useState, useEffect } from "react";
import "./App.css"; // Ensure you import the new CSS file!

export default function App() {
  const [clients, setClients] = useState([]);
  const [subs, setSubs] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("all"); //the id of the client whose subscriptions we see

  // Modal toggles
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  // Client form state
  const DEFAULT_CLIENT = { name: "", logo_url: "" };
  const [client, setClient] = useState(DEFAULT_CLIENT);

  const DEFAULT_SUB = {
    provider: "",
    client_id: "",
    services: [],
    amount: 0,
    frequency: "",
    start_date: "",
    next_due_date: null,
    cancellationUrl: "",
    billing_url: "",
    cancellation_url: "",
    status: "ACTIVE",
    notes: "",
  };
  // Subscription form state
  const [subscription, setSubscription] = useState(DEFAULT_SUB);

  async function refreshData() {
    const [c, s] = await Promise.all([
      window.api.getClients(),
      window.api.getSubscriptions(),
    ]);
    setClients(c);
    setSubs(s);
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
  async function handleAddClient(e) {
    e.preventDefault();
    await window.api.addClient({
      name: client.name,
      //contact_email: clientEmail,
      logo_url: client.logo || null,
    });
    setClient({});
    setIsClientModalOpen(false);
    refreshData();
  }

  async function handleDeleteClient(id) {
    e.preventDefault();
    await window.api.deleteClient(id);
    refreshData();
  }

  async function handleAddSub(e) {
    e.preventDefault(); // do not reload -- remove it and every time a form is submitted, the app will restart
    await window.api.addSubscription({
      provider: subscription.provider,
      client_id: subscription.client || null,
      services: subscription.services, //?.join(" ,"),
      amount: parseFloat(subscription.amount),
      frequency: subscription.frequency,
      start_date: subscription.start_date,
      next_due_date: subscription.due_date,
      billing_url: subscription.billing_url,
      cancellationUrl: subscription.cancellationUrl,
      //status????
      notes: subscription.notes || "",
    });
    setSubscription(DEFAULT_SUB);
    setIsSubModalOpen(false);
    refreshData();
  }

  async function handleDeleteSub(id) {
    await window.api.deleteSubscription(id);
    refreshData();
  }

  // Filter subscriptions based on the selected sidebar client
  const filteredSubs =
    selectedClientId === "all"
      ? subs
      : subs.filter((s) => s.client_id === selectedClientId);

  return (
    <div className="app-container">
      {/* ----------------- LEFT SIDEBAR: CLIENTS ----------------- */}
      <aside className="sidebar">
        <div className="header-section">
          <h2 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 700 }}>
            Clients
          </h2>
          <button
            onClick={() => setIsClientModalOpen(true)} //open new client modal
            className="icon-add-btn"
            title="Add New Client"
          >
            +
          </button>
        </div>

        <div className="client-list">
          {/* "All" Filter Option */}
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

          {/* Individual Client List */}
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
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="avatar-fallback"
                  style={{
                    display: c.logo_url ? "none" : "flex",
                  }}
                >
                  {c.name.slice(0, 2).toUpperCase()}
                </div>

                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div className="truncate">{c.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    {clientSubCount}
                    {clientSubCount === 1 ? "subscription" : "subscriptions"}
                  </div>
                </div>
              </div>
            );
          })}
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
          <button
            onClick={() => {
              // Pre-select the active client in the form if one is highlighted
              if (selectedClientId !== "all")
                setSubscription((prev) => ({
                  ...prev,
                  client: selectedClientId, //pre-fill the client id for this new subscription
                }));
              setIsSubModalOpen(true);
            }}
            className="action-add-btn"
          >
            + Add Subscription
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>SERVICE</th>
                <th>ASSIGNED CLIENT</th>
                <th>PROVIDER</th>
                <th>COST</th>
                <th>START DATE</th>
                <th>NEXT DUE</th>
                <th>NOTES</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubs.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
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
                filteredSubs.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>
                        {Array.isArray(s.services) && s.services.length > 0
                          ? s.services.join(", ")
                          : s.provider || "Subscription"}
                      </strong>
                    </td>
                    <td style={{ color: "#94a3b8", flexDirection: "row" }}>
                      {s.client_name || "Unassigned / Personal"}
                      {s.client_logo}
                    </td>
                    <td
                      onClick={() =>
                        s.billing_url && window.api.openLink(s.billing_url)
                      }
                      style={{ color: "#94a3b8" }}
                    >
                      {s.provider || "-"}
                    </td>
                    <td>
                      ${Number(s.amount).toFixed(2)}{" "}
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        / {s.frequency}
                      </span>
                    </td>
                    <td>{s.start_date}</td>
                    <td>{s.next_due_date}</td>
                    <td>{s.notes}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteSub(s.id)}
                        className="delete-btn"
                        title="Delete subscription"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* ----------------- MODAL: ADD CLIENT ----------------- */}
      {isClientModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Add New Client</h3>
              <button
                onClick={() => setIsClientModalOpen(false)} // close modal
                className="close-btn"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddClient}>
              <label className="form-label">Client Name *</label>
              {/* CLIENT NAME */}
              <input
                placeholder="e.g. Acme Studio"
                value={client.name}
                onChange={(e) =>
                  setClient((prev) => ({ ...prev, name: e.target.value }))
                }
                required
                className="form-input"
              />
              {/* CLIENT LOGO -- MAYBE GET IT AUTOMATICALLY */}
              <label className="form-label">Logo Image URL (Optional)</label>
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                value={client.logo}
                onChange={(e) =>
                  setClient((prev) => ({ ...prev, logo_url: e.target.value }))
                }
                className="form-input"
              />
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: ADD SUBSCRIPTION ----------------- */}
      {isSubModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Add Subscription</h3>
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddSub}>
              {/* CLIENT */}
              <label className="form-label">Assign Client</label>
              <select
                value={subscription.client}
                onChange={(e) =>
                  setSubscription((prev) => ({
                    ...prev,
                    client: e.target.value,
                  }))
                }
                className="form-input"
              >
                <option value="">None (Personal / Unassigned)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* SERVICE TYPE */}

              <label className="form-label">Service Name *</label>
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

              {/* SUBSCRIPTION AMOUNT */}
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

                {/* SUBSCRIPTION FREQUENCY */}
                <div>
                  <label className="form-label">Frequency</label>
                  <select
                    value={subscription.frequency}
                    onChange={(e) =>
                      setSubscription((prev) => ({
                        ...prev,
                        frequency: e.target.value,
                      }))
                    }
                    className="form-input"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              {/* START DATE */}
              <label className="form-label">Start Date *</label>
              <input
                type="date"
                value={subscription.start_date}
                onChange={(e) =>
                  setSubscription((prev) => ({
                    ...prev,
                    start_date: e.target.value,
                  }))
                }
                required
                className="form-input"
              />

              {/* NEXT BILLING */}
              <label className="form-label">Next Renewal Date *</label>
              <input
                type="date"
                value={subscription.due_date}
                onChange={(e) =>
                  setSubscription((prev) => ({
                    ...prev,
                    due_date: e.target.value,
                  }))
                }
                required
                className="form-input"
              />

              {/* NOTES */}
              <label className="form-label">Notes</label>
              <input
                type="text"
                value={subscription.notes}
                onChange={(e) =>
                  setSubscription((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                required
                className="form-input"
              />

              {/* Billing URL */}
              <label className="form-label">Billing Portal URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={subscription.billing_url}
                onChange={(e) =>
                  setSubscription((prev) => ({
                    ...prev,
                    billing_url: e.target.value,
                  }))
                }
                className="form-input"
              />
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsSubModalOpen(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Track Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
