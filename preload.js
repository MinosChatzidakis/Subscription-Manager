const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getClients: () => ipcRenderer.invoke("clients:getAll"),
  addClient: (data) => ipcRenderer.invoke("clients:add", data),
  deleteClient: (id) => ipcRenderer.invoke("client:delete", id),
  getSubscriptions: () => ipcRenderer.invoke("subscriptions:getAll"),
  addSubscription: (data) => ipcRenderer.invoke("subscriptions:add", data),
  deleteSubscription: (id) => ipcRenderer.invoke("subscriptions:delete", id),
  openLink: (url) => ipcRenderer.invoke("utils:openLink", url),
});
