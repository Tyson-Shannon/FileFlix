//backend
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: path.join(__dirname, 'img/FileFlix.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: true,
      sandbox: false
    }
  });
  win.removeMenu();
  win.loadFile('index.html');

  //dev debug tools
  //win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (result.canceled) return null;

  return result.filePaths[0];
});