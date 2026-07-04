const buildingSelector = document.getElementById("buildingSelector");
const floorSelector = document.getElementById("floorSelector");
const pageTitle = document.getElementById("pageTitle");
const yamlFileInput = document.getElementById("yamlFile");
const chooseYamlButton = document.getElementById("chooseYaml");
const instruction = document.getElementById("instruction");
const viewer = document.getElementById("viewer");
let buildings = {};
let cachedYamlText = null;
let cachedIndexText = null;
const AUTO_RELOAD_INTERVAL_MS = 2000;

// Viewer zoom state helpers (shared between tap and swipe handlers)
let viewerScale = 1;
function applyViewerScale(newScale, originXPercent = 50, originYPercent = 50) {
    viewerScale = newScale;
    viewer.style.transformOrigin = `${originXPercent}% ${originYPercent}%`;
    viewer.style.transform = `scale(${viewerScale})`;
}

function resetViewerScale() {
    viewerScale = 1;
    // Force the image back to normal displayed size and center/origin
    viewer.style.transform = 'scale(1)';
    viewer.style.transformOrigin = '50% 50%';
    // Clear any size overrides
    viewer.style.width = '';
    viewer.style.height = '';
    // Force reflow to ensure layout updates
    void viewer.offsetWidth;
}

function populateBuildingSelector(data) {
    buildingSelector.innerHTML = "";
    buildings = data;

    Object.keys(buildings).forEach(key => {
        const building = buildings[key];
        const option = document.createElement("option");
        option.value = key;
        option.textContent = building.label || key;
        buildingSelector.appendChild(option);
    });

    if (buildingSelector.options.length > 0) {
        buildingSelector.dispatchEvent(new Event("change"));
    }
}

function populateFloorSelector(floors) {
    floorSelector.innerHTML = "";

    floors.forEach((floor, index) => {
        const option = document.createElement("option");
        option.value = floor.image || "";
        option.textContent = floor.name || `Floor ${floor.level || index + 1}`;
        floorSelector.appendChild(option);
    });

    if (floorSelector.options.length > 0) {
        floorSelector.dispatchEvent(new Event("change"));
    } else {
        viewer.src = "";
        viewer.alt = "No floor map available.";
    }
}

function updateViewer() {
    const imageUrl = floorSelector.value;
    resetViewerScale();
    viewer.src = imageUrl;
    viewer.alt = imageUrl ? "Floor map" : "No floor map available.";
    viewer.onload = () => {
        // Keep reset state after the image has loaded
        resetViewerScale();
        viewer.onload = null;
    };
}

function setInstructionMessage(html, expanded = false) {
    instruction.innerHTML = html;
    instruction.classList.toggle("expanded", expanded);
}

function getImageUrlsFromBuildings(buildingsData) {
    const urls = [];
    Object.values(buildingsData).forEach(building => {
        if (!building || !Array.isArray(building.floors)) return;
        building.floors.forEach(floor => {
            if (floor && floor.image) {
                urls.push(floor.image);
            }
        });
    });
    return [...new Set(urls)];
}

async function checkImageUrls(urls) {
    const results = await Promise.all(urls.map(url => new Promise(resolve => {
        const probe = new Image();
        probe.onload = () => resolve({ url, ok: true });
        probe.onerror = () => resolve({ url, ok: false });
        probe.src = url;
    })));
    return results.filter(result => !result.ok).map(result => result.url);
}

async function checkAllYamlImages(buildingsData) {
    const urls = getImageUrlsFromBuildings(buildingsData);
    if (urls.length === 0) {
        setInstructionMessage("No floor images were found in the YAML file.");
        return;
    }

    setInstructionMessage("Checking availability for all images in the YAML file...");
    const failedUrls = await checkImageUrls(urls);
    if (failedUrls.length === 0) {
        setInstructionMessage("All images are available.");
    } else {
        const listItems = failedUrls.map(url => `<li>${url}</li>`).join("");
        setInstructionMessage(`Some images could not be loaded:<br><ul>${listItems}</ul>`, true);
    }
}

buildingSelector.addEventListener("change", () => {
    const selectedKey = buildingSelector.value;
    const building = buildings[selectedKey];
    if (!building || !Array.isArray(building.floors)) {
        floorSelector.innerHTML = "";
        viewer.src = "";
        instruction.textContent = "Selected building has no floors defined.";
        return;
    }
    instruction.textContent = "";
    populateFloorSelector(building.floors);
});

floorSelector.addEventListener("change", updateViewer);

function selectOption(selector, index) {
    if (!selector || selector.options.length === 0) return;
    if (index < 0) index = 0;
    if (index >= selector.options.length) index = selector.options.length - 1;
    selector.selectedIndex = index;
    selector.dispatchEvent(new Event("change"));
}

document.addEventListener("keydown", event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const activeTag = document.activeElement?.tagName?.toLowerCase();
    if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") return;

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const current = buildingSelector.selectedIndex;
        const next = event.key === "ArrowRight" ? current + 1 : current - 1;
        selectOption(buildingSelector, next);
        event.preventDefault();
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const current = floorSelector.selectedIndex;
        const next = event.key === "ArrowUp" ? current + 1 : current - 1;
        selectOption(floorSelector, next);
        event.preventDefault();
    }
});

// Touch / swipe support for mobile: map swipes to the same actions as arrow keys.
(function() {
    const SWIPE_THRESHOLD_PX = 40; // minimum distance for a swipe
    let startX = 0, startY = 0, isTouch = false;
    const target = document.getElementById("viewerWrapper") || document;

    function onTouchStart(e) {
        isTouch = true;
        const t = e.touches ? e.touches[0] : e;
        startX = t.clientX;
        startY = t.clientY;
    }

    function onTouchEnd(e) {
        if (!isTouch) return;
        const t = (e.changedTouches && e.changedTouches[0]) || e;
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;

        // Ignore tiny movements
        if (Math.abs(dx) < SWIPE_THRESHOLD_PX && Math.abs(dy) < SWIPE_THRESHOLD_PX) return;

        // Horizontal swipe (buildings)
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) {
                // swipe left -> next building
                resetViewerScale();
                selectOption(buildingSelector, buildingSelector.selectedIndex + 1);
            } else {
                // swipe right -> previous building
                resetViewerScale();
                selectOption(buildingSelector, buildingSelector.selectedIndex - 1);
            }
        } else {
            // Vertical swipe (floors)
            if (dy > 0) {
                // swipe down -> go a floor up (increase index)
                resetViewerScale();
                selectOption(floorSelector, floorSelector.selectedIndex + 1);
            } else {
                // swipe up -> go a floor down (decrease index)
                resetViewerScale();
                selectOption(floorSelector, floorSelector.selectedIndex - 1);
            }
        }

        isTouch = false;
    }

    // Prefer Pointer Events when available, otherwise fall back to touch events
    if (window.PointerEvent) {
        target.addEventListener('pointerdown', e => {
            if (e.pointerType === 'touch') onTouchStart(e);
        }, { passive: true });
        target.addEventListener('pointerup', e => {
            if (e.pointerType === 'touch') onTouchEnd(e);
        }, { passive: true });
        // Prevent default pointermove to stop page scroll while swiping
        target.addEventListener('pointermove', e => {
            if (e.pointerType === 'touch' && isTouch) e.preventDefault();
        }, { passive: false });
    } else {
        target.addEventListener('touchstart', onTouchStart, { passive: true });
        target.addEventListener('touchend', onTouchEnd, { passive: true });
        // Prevent default touchmove to stop page scroll / pull-to-refresh
        target.addEventListener('touchmove', e => {
            if (isTouch) e.preventDefault();
        }, { passive: false });
    }
})();

async function fetchNoCache(path) {
    const response = await fetch(`${path}?_=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Unable to fetch ${path}`);
    }
    return response.text();
}

async function loadYamlText(yamlText, updateCache = true) {
    const data = jsyaml.load(yamlText);
    const parsedBuildings = data.buildings || {};
    const titleText = data.title || "YAML Page Viewer";
    pageTitle.textContent = titleText;
    document.title = titleText;
    if (updateCache) {
        cachedYamlText = yamlText;
    }
    populateBuildingSelector(parsedBuildings);
    await checkAllYamlImages(parsedBuildings);
}

async function cacheCurrentIndexHtml() {
    try {
        cachedIndexText = await fetchNoCache("index.html");
    } catch (error) {
        cachedIndexText = null;
    }
}

async function checkForUpdates() {
    try {
        const [latestYamlText, latestIndexText] = await Promise.all([
            fetchNoCache("floorplan.yaml"),
            fetchNoCache("index.html")
        ]);

        if (cachedYamlText !== null && latestYamlText !== cachedYamlText) {
            console.log("floorplan.yaml changed, reloading page.");
            location.reload();
            return;
        }

        if (cachedIndexText !== null && latestIndexText !== cachedIndexText) {
            console.log("index.html changed, reloading page.");
            location.reload();
        }
    } catch (error) {
        // Ignore polling errors when the app is used over file:// or the server is temporarily unavailable.
    }
}

async function tryFetchYaml() {
    try {
        const response = await fetch("floorplan.yaml");
        if (!response.ok) throw new Error("Network response was not ok");
        const yamlText = await response.text();
        await loadYamlText(yamlText);
        chooseYamlButton.style.display = "none";
        await cacheCurrentIndexHtml();
        setInterval(checkForUpdates, AUTO_RELOAD_INTERVAL_MS);
    } catch (error) {
        instruction.textContent = "Automatic load failed in file:// mode. Click the button and choose floorplan.yaml manually.";
        chooseYamlButton.style.display = "inline-flex";
    }
}

async function loadYamlFromFile(file) {
    const yamlText = await file.text();
    await loadYamlText(yamlText, false);
    instruction.textContent = `Loaded ${file.name} from your local filesystem.`;
}

chooseYamlButton.addEventListener("click", () => yamlFileInput.click());
yamlFileInput.addEventListener("change", event => {
    const file = event.target.files[0];
    if (file) {
        loadYamlFromFile(file);
    }
});

tryFetchYaml();

// Tap / double-tap to zoom: single tap multiplies scale; double-tap divides scale until 1.
(function() {
    const ZOOM_FACTOR = 2;
    const TAP_MAX_DELAY = 300; // ms to detect double-tap
    let lastTap = 0;
    let tapTimer = null;
    function doZoom(newScale, clientX, clientY) {
        const rect = viewer.getBoundingClientRect();
        const clickX = clientX - rect.left;
        const clickY = clientY - rect.top;
        const originX = (clickX / rect.width) * 100;
        const originY = (clickY / rect.height) * 100;
        applyViewerScale(newScale, originX, originY);
    }

    viewer.addEventListener('pointerup', (e) => {
        // ignore non-primary buttons
        if (e.button && e.button !== 0) return;
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || !viewer.src) return;

        const now = Date.now();
        const isDouble = (now - lastTap) <= TAP_MAX_DELAY;
        const clientX = e.clientX;
        const clientY = e.clientY;

        if (isDouble) {
            // double-tap: cancel pending single-tap action, zoom out by factor
            if (tapTimer) {
                clearTimeout(tapTimer);
                tapTimer = null;
            }
            const newScale = Math.max(1, viewerScale / ZOOM_FACTOR);
            doZoom(newScale, clientX, clientY);
            lastTap = 0;
        } else {
            // schedule single-tap action after delay to allow double-tap detection
            lastTap = now;
            tapTimer = setTimeout(() => {
                const newScale = Math.max(0.01, viewerScale * ZOOM_FACTOR);
                doZoom(newScale, clientX, clientY);
                tapTimer = null;
                lastTap = 0;
            }, TAP_MAX_DELAY + 10);
        }
    }, { passive: true });
})();
