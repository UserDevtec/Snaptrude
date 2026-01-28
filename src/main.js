import "./style.css";
import * as OBC from "@thatopen/components";

const app = document.querySelector("#app");

app.innerHTML = `
  <div class="acc-app">
    <header class="acc-topbar">
      <div class="topbar-left">
        <button class="topbar-pill" type="button">
          Viewing 2 models (Unsaved View)
          <span class="caret">▾</span>
        </button>
        <button class="topbar-action" type="button">Save view</button>
      </div>
      <div class="topbar-right">
        <button class="topbar-action" type="button">Save to Docs</button>
        <button class="topbar-icon" type="button" aria-label="Close">✕</button>
      </div>
    </header>

    <aside class="acc-nav">
      <button class="nav-btn active" type="button" title="Models">⬛</button>
      <button class="nav-btn" type="button" title="Views">◧</button>
      <button class="nav-btn" type="button" title="Issues">●</button>
      <button class="nav-btn" type="button" title="Sheets">▦</button>
      <button class="nav-btn" type="button" title="Settings">⚙</button>
    </aside>

    <aside class="acc-left-panel">
      <div class="panel-tabs">
        <button class="tab active" type="button">Models</button>
        <button class="tab" type="button">Transform</button>
      </div>
      <div class="panel-content">
        <div class="panel-list">
          <div class="panel-item">
            <div class="item-title">Snowdon Towers Sample Architectural.rvt</div>
            <div class="item-sub">9 Nov 2023 13:54</div>
          </div>
          <div class="panel-item">
            <div class="item-title">Snowdon Towers Sample Electrical.rvt</div>
            <div class="item-sub">9 Nov 2023 13:53</div>
          </div>
        </div>
      </div>
      <div class="panel-footer">
        <button class="panel-primary" type="button">Select models</button>
      </div>
    </aside>

    <main class="acc-stage">
      <div class="viewer-wrap" id="viewerWrap">
        <div id="viewer" class="viewer"></div>
        <div id="viewerOverlay" class="viewer-overlay idle">
          <div class="overlay-idle">
            <p class="overlay-title">Upload bestand of selecteer bestand</p>
            <label class="file">
              <input id="fileInput" type="file" accept=".ifc,.frag" />
              Bestand selecteren
            </label>
            <p class="overlay-hint">Sleep hier een .ifc of .frag bestand.</p>
            <p class="upload-status" id="statusText">Nog geen bestand geladen.</p>
          </div>
          <div class="overlay-busy">
            <span class="spinner"></span>
            <span id="overlayText">Bezig met laden...</span>
          </div>
        </div>

      </div>

      <div class="acc-toolbar">
        <button class="tool active" type="button" title="Orbit">⟳</button>
        <button class="tool" type="button" title="Pan">✋</button>
        <button class="tool" type="button" title="Zoom">🔍</button>
        <button class="tool" type="button" title="Fit">⛶</button>
        <button class="tool" type="button" title="Section">▯</button>
        <button class="tool" type="button" title="Measure">📏</button>
        <button class="tool" type="button" title="Settings">⚙</button>
      </div>
    </main>

    
  </div>
`;

const elements = {
  fileInput: document.getElementById("fileInput"),
  statusText: document.getElementById("statusText"),
  viewerWrap: document.getElementById("viewerWrap"),
  overlay: document.getElementById("viewerOverlay"),
  overlayText: document.getElementById("overlayText"),
  viewer: document.getElementById("viewer")
};

const state = {
  fragBuffer: null,
  downloadName: "model.frag"
};

const baseUrl = import.meta.env.BASE_URL || "/";
const publicBase = new URL(baseUrl, window.location.href);
const workerUrl = new URL("worker.mjs", publicBase).href;
const wasmPath = new URL("wasm/", publicBase).href;

const components = new OBC.Components();
const worlds = components.get(OBC.Worlds);
const world = worlds.create();

world.scene = new OBC.SimpleScene(components);
world.scene.setup();

world.renderer = new OBC.SimpleRenderer(components, elements.viewer);
world.camera = new OBC.OrthoPerspectiveCamera(components);

world.camera.three.near = 0.05;
world.camera.three.far = 10000;
world.camera.three.updateProjectionMatrix();

world.camera.controls.minDistance = 0.5;
world.camera.controls.maxDistance = 8000;
world.camera.controls.dollySpeed = 2.4;
world.camera.controls.zoomSpeed = 2.0;

await world.camera.controls.setLookAt(18, 12, 18, 0, 0, 0);
components.init();


const resizeViewer = () => {
  world.renderer.resize();
};

const resizeObserver = new ResizeObserver(() => {
  resizeViewer();
});
resizeObserver.observe(elements.viewerWrap);

const grids = components.get(OBC.Grids);
const grid = grids.create(world);
grid.visible = true;

const fragments = components.get(OBC.FragmentsManager);
fragments.init(workerUrl);

world.camera.controls.addEventListener("rest", () => fragments.core.update(true));

fragments.list.onItemSet.add(({ value: model }) => {
  model.useCamera(world.camera.three);
  world.scene.three.add(model.object);
  fragments.core.update(true);
});

const ifcLoader = components.get(OBC.IfcLoader);

const setOverlay = (text, busy = false, show = true) => {
  if (!show) {
    elements.overlay.classList.add("hidden");
    return;
  }

  elements.overlayText.textContent = text;
  elements.overlay.classList.toggle("idle", !busy);
  elements.overlay.classList.toggle("busy", busy);
  elements.overlay.classList.remove("hidden");
};

const setStatus = (text) => {
  elements.statusText.textContent = text;
};

const clearModels = async () => {
  for (const [id, model] of fragments.list) {
    world.scene.three.remove(model.object);
    await fragments.core.disposeModel(id);
  }
  state.fragBuffer = null;
  state.downloadName = "model.frag";
};

const ensureIfcLoader = async () => {
  await ifcLoader.setup({
    autoSetWasm: false,
    wasm: {
      path: wasmPath,
      absolute: true
    }
  });
};

const loadFragBuffer = async (buffer, name) => {
  const modelId = `${name}-${Date.now()}`;
  await fragments.core.load(buffer, {
    modelId,
    camera: world.camera.three
  });
};

const loadFragFile = async (file) => {
  await clearModels();
  setOverlay("Fragment laden...", true, true);
  setStatus("Fragment wordt geladen.");

  const buffer = await file.arrayBuffer();
  await loadFragBuffer(buffer, "frag");

  state.fragBuffer = buffer;
  state.downloadName = file.name;

  updateStats();
  setStatus("Fragment geladen.");
  setOverlay("", false, false);
};

const loadIfcFile = async (file) => {
  await clearModels();
  setOverlay("IFC laden...", true, true);
  setStatus("IFC wordt geladen.");

  await ensureIfcLoader();

  const buffer = new Uint8Array(await file.arrayBuffer());
  const modelId = `ifc-${Date.now()}`;

  const model = await ifcLoader.load(buffer, true, modelId);

  setStatus("IFC geladen. Converteren naar fragments op de achtergrond...");
  setOverlay("Converteer IFC naar fragments...", true, true);

  const fragBuffer = await model.getBuffer();
  state.fragBuffer = fragBuffer;
  state.downloadName = file.name.replace(/\\.ifc$/i, ".frag");

  world.scene.three.remove(model.object);
  await fragments.core.disposeModel(modelId);

  await loadFragBuffer(fragBuffer, "ifc-frag");
  setStatus("IFC omgezet naar fragments en geladen.");
  setOverlay("", false, false);
};

const handleFile = async (file) => {
  if (!file) return;

  const extension = file.name.toLowerCase();
  try {
    if (extension.endsWith(".frag")) {
      await loadFragFile(file);
    } else if (extension.endsWith(".ifc")) {
      await loadIfcFile(file);
    } else {
      setStatus("Onbekend bestandstype. Gebruik .ifc of .frag.");
    }
  } catch (error) {
    console.error(error);
    setStatus("Er ging iets mis bij het laden van het bestand.");
    setOverlay("Laden mislukt", false, true);
  }
};

const setupDropzone = () => {
  const { viewerWrap } = elements;

  const setDragging = (dragging) => {
    viewerWrap.classList.toggle("dragging", dragging);
  };

  const onDragOver = (event) => {
    event.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => {
    setDragging(false);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const [file] = event.dataTransfer.files;
    handleFile(file);
  };

  viewerWrap.addEventListener("dragover", onDragOver);
  viewerWrap.addEventListener("dragleave", onDragLeave);
  viewerWrap.addEventListener("drop", onDrop);
};

setupDropzone();

elements.fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  handleFile(file);
});

window.addEventListener("resize", resizeViewer);

setOverlay("Upload bestand of selecteer bestand", false, true);

