const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getClients: () => ipcRenderer.invoke("clients:getAll"),
  addClient: (data) => ipcRenderer.invoke("clients:add", data),
  updateClient: (data) => ipcRenderer.invoke("clients:update", data),
  deleteClient: (id) => ipcRenderer.invoke("clients:delete", id),

  getSubscriptions: () => ipcRenderer.invoke("subscriptions:getAll"),
  addSubscription: (data) => ipcRenderer.invoke("subscriptions:add", data),
  updateSubscription: (data) =>
    ipcRenderer.invoke("subscriptions:update", data),
  deleteSubscription: (id) => ipcRenderer.invoke("subscriptions:delete", id),

  openLink: (url) => ipcRenderer.invoke("utils:openLink", url),
});
