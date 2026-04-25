//frontend
const filePicker = document.getElementById('filePicker');
const player = document.getElementById('player');

window.addEventListener("DOMContentLoaded", () => {
  const openFolderBtn = document.getElementById('openFolder');

  openFolderBtn.addEventListener('click', () => {
    selectFolderAndLoad();
  });
});

let libraryTree = {};
let currentPath = [];
let currentFile = null;

let rootFolder = null;
let progressFilePath = null;
let progressData = {};

let lastSave = 0;

let fileMap = {};

//save video progress
player.ontimeupdate = () => {
  if (!currentFile) return;
  const now = Date.now();
  if (now - lastSave > 2000) { // every 2 seconds
    saveProgress(currentFile, player.currentTime, player.duration);
    lastSave = now;
  }
};

//current folder
function getCurrentNode() {
  let node = libraryTree;
  for (const part of currentPath) {
    node = node[part];
  }
  return node;
}


async function selectFolderAndLoad() {
  const folderPath = await window.fileflixAPI.selectFolder();
  if (!folderPath) return;
  rootFolder = folderPath;
  progressFilePath = rootFolder + "/.fileflix.json";
  // load saved progress
  progressData = window.fileflixAPI.readJSON(progressFilePath) || {};
  // scan filesystem
  const filePaths = window.fileflixAPI.scanFolder(folderPath);
  // build file map
  fileMap = {};
  filePaths.forEach(fp => {
    fileMap[fp] = fp;
  });
  // build tree
  libraryTree = buildTreeFromPaths(filePaths, folderPath);
  currentPath = [];
  renderView();
}


function buildTreeFromPaths(paths, root) {
  const tree = {};

  paths.forEach(fullPath => {
    const relativePath = fullPath.substring(root.length + 1);
    const parts = relativePath.split(/[\\/]/);

    let current = tree;

    for (let i = 0; i < parts.length - 1; i++) {
      const folder = parts[i];

      if (!current[folder]) {
        current[folder] = {};
      }

      current = current[folder];
    }

    if (!current._files) {
      current._files = [];
    }

    current._files.push(fullPath);
  });

  return tree;
}


function renderView() {
  const container = document.getElementById("library");
  container.innerHTML = "";

  // Continue watching--
  const continueList = getContinueWatching();

  if (continueList.length > 0) {
    const section = document.createElement("div");
    section.innerHTML = "<h2>Continue Watching</h2>";

    continueList.forEach(item => {
      const btn = document.createElement("div");
      btn.textContent = item.file.split(/[\\/]/).pop();
      btn.className = "video-card";

      btn.onclick = () => {
        const filePath = item.file;
        currentFile = filePath;
        player.src = "file://" + filePath;
        const saved = progressData[filePath];
        const seekAndPlay = () => {
          if (saved) player.currentTime = saved.time;
          player.play();

          player.removeEventListener("loadedmetadata", seekAndPlay);
        };

        player.addEventListener("loadedmetadata", seekAndPlay);
      };

      section.appendChild(btn);
    });

    container.appendChild(section);
  }

  // Choose video--
  const node = getCurrentNode();

  // Breadcrumb UI (path navigation)
  const breadcrumb = document.createElement("div");
  breadcrumb.innerHTML = "<h2>Library</h2>";
  breadcrumb.className = "breadcrumb";
  
  const pathParts = ["Root", ...currentPath];
  
  pathParts.forEach((part, index) => {
    const btn = document.createElement("span");
    btn.textContent = part;
    
    btn.onclick = () => {
      currentPath = pathParts.slice(1, index); 
      renderView();
    };
  
    breadcrumb.appendChild(btn);
  
    if (index < pathParts.length - 1) {
      const sep = document.createElement("span");
      sep.textContent = " > ";
      sep.className = "sep";
      breadcrumb.appendChild(sep);
    }
  });

  container.appendChild(breadcrumb);

  // Folders
  Object.keys(node).forEach(key => {
    if (key === "_files") return;

    const btn = document.createElement("button");
    btn.textContent = key;
    btn.className = "folder-button";

    btn.onclick = () => {
      currentPath.push(key);
      renderView();
    };

    container.appendChild(btn);
  });

  // Files in current folder
  if (node._files) {
    node._files.forEach(file => {
    const card = document.createElement("div");
    card.className = "video-card";
  
    card.textContent = file.split(/[\\/]/).pop();
  
    card.onclick = () => {
      currentFile = file;

      player.src = "file://" + file;

      const saved = progressData[file];

      player.onloadedmetadata = () => {
        if (saved) {
          player.currentTime = saved.time;
        }
        player.play();
      };
    };
  
    container.appendChild(card);
    });
  }
}


function saveProgress(file, time, duration) {
  if (!progressFilePath) return;

  progressData[file] = {
    time,
    duration,
    lastWatched: Date.now()
  };

  window.fileflixAPI.writeJSON(progressFilePath, progressData);
}


function getContinueWatching() {
  return Object.entries(progressData)
    .map(([file, info]) => ({ file, ...info }))
    .sort((a, b) => b.lastWatched - a.lastWatched)
    .filter(item => item.time > 10 && item.time < item.duration - 10);
}


function getNextInFolder(currentFile, files) {
  const index = files.findIndex(f => f.name === currentFile.name);
  return files[index + 1] || null;
}