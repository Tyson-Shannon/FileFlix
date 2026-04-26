//bridge
const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

let configPath = null;
ipcRenderer.invoke('get-config-path').then(p => {
  configPath = p;
});

function scanDirectory(dir) {
  let results = [];

  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      results = results.concat(scanDirectory(fullPath));
    } else if (/\.(mp4|mkv|webm|avi)$/i.test(fullPath)) {
      results.push(fullPath);
    }
  });

  return results;
}

contextBridge.exposeInMainWorld('fileflixAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  scanFolder: (folderPath) => scanDirectory(folderPath),

  readJSON: (filePath) => {
    try {
      if (!fs.existsSync(filePath)) return null;
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  writeJSON: (filePath, data) => {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error(e);
    }
  },

  joinPath: (...args) => path.join(...args),

  saveLastFolder: (folderPath) => {
    try {
      let config = {};

      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }

      config.lastFolder = folderPath;

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (e) {
      console.error(e);
    }
  },

  getLastFolder: () => {
    try {
      if (!fs.existsSync(configPath)) return null;

      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config.lastFolder || null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  folderExists: (folderPath) => {
    try {
      return fs.existsSync(folderPath);
    } catch {
      return false;
    }
  }
});