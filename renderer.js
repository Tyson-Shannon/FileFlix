const filePicker = document.getElementById('filePicker');
const player = document.getElementById('player');

let libraryTree = {};
let currentPath = [];

//current folder
function getCurrentNode() {
  let node = libraryTree;
  for (const part of currentPath) {
    node = node[part];
  }
  return node;
}


filePicker.addEventListener('change', (event) => {
  const files = Array.from(event.target.files)
    .filter(f => f.type.startsWith('video/'));
  libraryTree = buildLibraryTree(files);
  currentPath = []; // reset navigation
  renderView();
});


function buildLibraryTree(files) {
  const tree = {};

  files.forEach(file => {
    const parts = file.webkitRelativePath.split('/');

    let current = tree;

    // walk through folder path (except last item = file)
    for (let i = 0; i < parts.length - 1; i++) {
      const folder = parts[i];
      if (!current[folder]) {
        current[folder] = {};
      }
      current = current[folder];
    }

    // last item = file (video)
    const fileName = parts[parts.length - 1];

    if (!current._files) {
      current._files = [];
    }

    current._files.push(file);
  });

  return tree;
}


function renderView() {
  const container = document.getElementById("library");
  container.innerHTML = "";

  const node = getCurrentNode();

  // Breadcrumb UI (path navigation)
  const breadcrumb = document.createElement("div");
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
  
    card.textContent = file.name;
  
    card.onclick = () => {
      const player = document.getElementById("player");
      player.src = URL.createObjectURL(file);
      player.play();
    };
  
    container.appendChild(card);
    });
  }
}