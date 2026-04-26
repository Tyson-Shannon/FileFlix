//frontend
const player = document.getElementById('player');
const userSelect = document.getElementById("userSelect");

window.addEventListener("DOMContentLoaded", () => {
  const openFolderBtn = document.getElementById('openFolder');

  openFolderBtn.addEventListener('click', () => {
    selectFolderAndLoad();
  });

  const addUserBtn = document.getElementById("addUserBtn");
  const removeUserBtn = document.getElementById("removeUserBtn");
  const newUserInput = document.getElementById("newUserInput");
  addUserBtn.onclick = () => {
    const name = newUserInput.value.trim();
    if (!name) {
      alert("Enter a username");
      return;
    }
    addUser(name);
    newUserInput.value = ""; // clear input
  };
  removeUserBtn.onclick = () => {
    removeUser(currentUser);
  };
});

userSelect.addEventListener("change", (e) => {
  currentUser = e.target.value;
  renderView();
});

let libraryTree = {};
let currentPath = [];
let currentFile = null;

let rootFolder = null;
let progressFilePath = null;
let progressData = {};

let lastSave = 0;

let fileMap = {};

let currentUser = "default";

let markedComplete = false;


//when episode ends play next
player.onended = () => {
  if (!currentFile || markedComplete) return;

  const next = getNextEpisode(currentFile);

  if (next) {
    playFile(next);
    renderView();
  }
};

//save video progress
player.ontimeupdate = () => {
  if (!currentFile) return;

  const now = Date.now();
  if (now - lastSave < 2000) return;//every 2secs

  const duration = player.duration;
  const time = player.currentTime;

  saveProgress(currentFile, time, duration);

  lastSave = now;
};


function getUserData() {
  if (!progressData.users) progressData.users = {};
  if (!progressData.users[currentUser]) {
    progressData.users[currentUser] = { watchProgress: {} };
  }
  return progressData.users[currentUser].watchProgress;
}


function loadUsers() {
  const users = Object.keys(progressData.users || {});

  userSelect.innerHTML = "";

  users.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u;
    opt.textContent = u;
    userSelect.appendChild(opt);
  });
  userSelect.value = currentUser;
}


function addUser(username) {
  if (!progressData.users) progressData.users = {};
  if (progressData.users[username]) {
    alert("User already exists");
    return;
  }
  progressData.users[username] = {
    watchProgress: {}
  };
  currentUser = username;
  window.fileflixAPI.writeJSON(progressFilePath, progressData);
  loadUsers();
  renderView();
}


function removeUser(username) {
  if (Object.keys(progressData.users).length === 1) {
    alert("Cannot delete the last user");
    return;
  }
  if (!progressData.users[username]) return;
  if (!confirm(`Delete user "${username}"?`)) return;
  delete progressData.users[username];
  // fallback user
  currentUser = Object.keys(progressData.users)[0] || "default";
  window.fileflixAPI.writeJSON(progressFilePath, progressData);
  loadUsers();
  renderView();
}


//current folder
function getCurrentNode() {
  let node = libraryTree;
  for (const part of currentPath) {
    node = node[part];
  }
  return node;
}


function getParentNode(path) {
  let node = libraryTree;

  for (let i = 0; i < path.length - 1; i++) {
    node = node[path[i]];
    if (!node) return null;
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
  // load user
  if (!progressData.users) {
    progressData.users = {
      default: { watchProgress: {} }
    };
  }
  currentUser = Object.keys(progressData.users)[0];
  loadUsers();
  // scan filesystem
  const filePaths = window.fileflixAPI.scanFolder(folderPath);
  // build file map
  fileMap = {};
  filePaths.forEach(fp => {
    fileMap[fp] = fp;
  });
  // build tree
  libraryTree = buildTreeFromPaths(filePaths, folderPath);
  sortTree(libraryTree);
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


function sortTree(node) {
  // sort files in this folder
  if (node._files) {
    node._files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  // recursively sort subfolders
  Object.keys(node).forEach(key => {
    if (key !== "_files") {
      sortTree(node[key]);
    }
  });
}


//play video
function playFile(filePath) {
  currentFile = filePath;
  markedComplete = false;
  player.src = "file://" + filePath;
  const saved = getUserData()[filePath];
  const seekAndPlay = () => {
    if (saved && saved.time > 0) {
      player.currentTime = saved.time;
    }
    player.play();
    player.removeEventListener("loadeddata", seekAndPlay);
  };
  player.addEventListener("loadeddata", seekAndPlay);
}


//renders
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
        playFile(item.file);
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
      playFile(file);
    };
  
    container.appendChild(card);
    });
  }
}


//video has less than 10secs left
function isNearEnd(time, duration) {
  return duration && (duration - time) <= 10;
}


function saveProgress(file, time, duration) {
  if (!progressFilePath) return;

  const userProgress = getUserData();
  //if video near end
  if (!markedComplete && isNearEnd(time, duration)) {
    markedComplete = true;
    delete userProgress[file]; // remove from continue watching
    const next = getNextEpisode(file);
    if (next && next !== file) {
      // add next episode at time 0
      userProgress[next] = {
        time: 0,
        duration: 0,
        lastWatched: Date.now()
      };
    }

    window.fileflixAPI.writeJSON(progressFilePath, progressData);
    renderView();
    return;
  }
  //normal save
  userProgress[file] = {
    time,
    duration,
    lastWatched: Date.now()
  };

  window.fileflixAPI.writeJSON(progressFilePath, progressData);
}


function getContinueWatching() {
  const userProgress = getUserData();
  return Object.entries(userProgress)
    .map(([file, info]) => ({ file, ...info }))
    .sort((a, b) => b.lastWatched - a.lastWatched)
    .filter(item => !item.duration || item.time < item.duration - 10);
}


function getNextInFolder(currentFile, files) {
  const index = files.findIndex(f => f.name === currentFile.name);
  return files[index + 1] || null;
}


function getNextVideo(currentFile, node) {
  const files = node._files;
  if (!files) return null;

  const index = files.findIndex(f => f === currentFile);
  if (index === -1) return null;

  return files[index + 1] || null;
}


function getShowContext(filePath) {
  const parts = filePath.split(/[\\/]/);

  // Example: Show / Season 01 / Episode 01.mp4
  const fileName = parts.pop();
  const season = parts.pop();
  const show = parts.pop();

  return {
    showPath: parts.join("/"),
    show,
    season,
    fileName
  };
}


function getAllSeasons(currentFile) {
  const parts = currentFile.split(/[\\/]/);
  
  const fileName = parts.pop();
  const seasonFolder = parts.pop();
  const showFolder = parts.pop();

  const showNode = libraryTree[showFolder];
  if (!showNode) return [];

  // collect season folders
  const seasons = Object.keys(showNode)
    .filter(k => k !== "_files")
    .sort(); // Season 01, Season 02

  return {
    showNode,
    seasons,
    currentSeason: seasonFolder,
    currentFile
  };
}


function getNextEpisode(filePath) {
  const relative = filePath.replace(rootFolder, "").replace(/^[\\/]/, "");
  const parts = relative.split(/[\\/]/);

  let node = libraryTree;

  // walk to the folder containing the file
  for (let i = 0; i < parts.length - 1; i++) {
    node = node[parts[i]];
    if (!node) return null;
  }

  // same-folder next episode
  if (node._files) {
    const files = node._files;
    const index = files.indexOf(filePath);

    if (index !== -1 && index < files.length - 1) {
      return files[index + 1];
    }
  }

  // move up to parent folder (season logic)
  const parentParts = parts.slice(0, -1);
  const currentFolder = parentParts.pop();

  let parentNode = libraryTree;
  for (const part of parentParts) {
    parentNode = parentNode[part];
    if (!parentNode) return null;
  }

  const folders = Object.keys(parentNode)
    .filter(k => k !== "_files")
    .sort();

  const index = folders.indexOf(currentFolder);

  for (let i = index + 1; i < folders.length; i++) {
    const nextFolder = parentNode[folders[i]];
    if (nextFolder?._files?.length > 0) {
      return nextFolder._files[0];
    }
  }

  return null;
}