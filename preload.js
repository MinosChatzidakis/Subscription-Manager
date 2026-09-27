const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  //*clients
  getClients: () => ipcRenderer.invoke("clients:getAll"),
  addClient: (data) => ipcRenderer.invoke("clients:add", data),
  updateClient: (data) => ipcRenderer.invoke("clients:update", data),
  deleteClient: (id) => ipcRenderer.invoke("clients:delete", id),

  //*subscriptions
  getSubscriptions: () => ipcRenderer.invoke("subscriptions:getAll"),
  addSubscription: (data) => ipcRenderer.invoke("subscriptions:add", data),
  updateSubscription: (data) =>
    ipcRenderer.invoke("subscriptions:update", data),
  deleteSubscription: (id) => ipcRenderer.invoke("subscriptions:delete", id),

  //*available_services
  getServices: () => ipcRenderer.invoke("available_services:getAll"),
  createService: (data) => ipcRenderer.invoke("available_services:add", data),
  updateService: (data) =>
    ipcRenderer.invoke("available_services:update", data),
  deleteService: (id) => ipcRenderer.invoke("available_services:delete", id),

  //*status changes
  getStatusChanges: (id) =>
    ipcRenderer.invoke("statusChanges:getSubscription", id),

  openLink: (url) => ipcRenderer.invoke("utils:openLink", url),
});
