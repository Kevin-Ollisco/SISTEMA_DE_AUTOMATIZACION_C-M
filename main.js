// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
require('./backend/server.js');

function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  ventana.loadURL('http://localhost:3000/login.html');
}

app.whenReady().then(() => {
  crearVentana();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      crearVentana();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
