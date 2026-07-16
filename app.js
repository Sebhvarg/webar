// Application State & WebAR Control Logic

const state = {
  arStarted: false,
  activeModelId: 'robot', // Default model/marker
  markerVisible: false,
  modelLoaded: false,
  modelAnchored: false,
  initialPitch: null,
  tiltThreshold: 15, // Degrees tilt up to trigger anchor
  models: {
    robot: {
      name: 'Robot Imperial',
      markerPreset: 'hiro',
      modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/RobotExpressive/glTF-Binary/RobotExpressive.glb',
      scale: '0.3 0.3 0.3',
      position: '0 0 0',
      rotation: '0 180 0',
      emoji: '🤖'
    },
    spaceship: {
      name: 'Nave Espacial',
      markerPreset: 'kanji',
      modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb', // A nice simple duck glb as fallback spaceship, or we can use another gltf
      scale: '0.5 0.5 0.5',
      position: '0 0 0',
      rotation: '0 0 0',
      emoji: '🦆'
    }
  }
};

// UI Elements
const welcomeScreen = document.getElementById('welcome-screen');
const startBtn = document.getElementById('start-btn');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const instructionBanner = document.getElementById('instruction-banner');
const instructionText = document.getElementById('instruction-title');
const instructionSubtext = document.getElementById('instruction-desc');
const modelListContainer = document.getElementById('model-list');
const resetBtn = document.getElementById('reset-btn');
const deviceTiltBtn = document.getElementById('device-tilt-btn');

// Start AR Experience
startBtn.addEventListener('click', async () => {
  // Request Device Orientation permission if on iOS 13+
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const permissionState = await DeviceOrientationEvent.requestPermission();
      if (permissionState === 'granted') {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    } catch (error) {
      console.warn("Could not request DeviceOrientation permission:", error);
    }
  } else {
    window.addEventListener('deviceorientation', handleOrientation);
  }

  // Hide welcome screen and show AR elements
  welcomeScreen.style.opacity = '0';
  setTimeout(() => {
    welcomeScreen.style.display = 'none';
  }, 500);

  // Initialize AR.js Scene
  initializeAR();
});

function initializeAR() {
  state.arStarted = true;
  statusDot.classList.add('active');
  statusText.textContent = 'AR Activo - Escaneando';
  
  // Dynamically set up the scene
  setupScene();
}

// Generate models selector UI list
function buildSelectorUI() {
  modelListContainer.innerHTML = '';
  Object.keys(state.models).forEach(key => {
    const model = state.models[key];
    const card = document.createElement('div');
    card.className = `model-card glass interactive ${state.activeModelId === key ? 'active' : ''}`;
    card.innerHTML = `
      <div class="model-icon">${model.emoji}</div>
      <div class="model-name">${model.name}</div>
      <div class="model-marker-info">Marcador: ${model.markerPreset.toUpperCase()}</div>
    `;
    card.addEventListener('click', () => {
      if (state.activeModelId === key) return;
      selectModel(key);
    });
    modelListContainer.appendChild(card);
  });
}

function selectModel(modelId) {
  // Update state
  state.activeModelId = modelId;
  resetExperience();
  buildSelectorUI();
  
  // Re-configure scene for active model
  setupScene();
}

function setupScene() {
  // Clean existing scene elements if any, or create/reset markers
  const sceneEl = document.querySelector('a-scene');
  if (!sceneEl) return;

  // Find or create current active marker entity
  let currentMarker = document.getElementById('active-marker-entity');
  if (currentMarker) {
    currentMarker.parentNode.removeChild(currentMarker);
  }

  // Create new active marker based on selected preset
  const modelConfig = state.models[state.activeModelId];
  currentMarker = document.createElement('a-marker');
  currentMarker.setAttribute('id', 'active-marker-entity');
  currentMarker.setAttribute('preset', modelConfig.markerPreset);
  currentMarker.setAttribute('registerevents', '');

  // Add the 3D model entity
  const modelEl = document.createElement('a-entity');
  modelEl.setAttribute('id', 'ar-model');
  modelEl.setAttribute('gltf-model', `url(${modelConfig.modelUrl})`);
  modelEl.setAttribute('scale', modelConfig.scale);
  modelEl.setAttribute('position', modelConfig.position);
  modelEl.setAttribute('rotation', modelConfig.rotation);
  
  // Add animation mixing to model if robot is expressive
  if (state.activeModelId === 'robot') {
    modelEl.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');
  }

  currentMarker.appendChild(modelEl);
  sceneEl.appendChild(currentMarker);

  // Status updates
  statusText.textContent = `Escaneando marcador [${modelConfig.markerPreset.toUpperCase()}]`;
}

// Reset AR tracking and model anchoring
function resetExperience() {
  state.markerVisible = false;
  state.modelLoaded = false;
  state.modelAnchored = false;
  state.initialPitch = null;
  
  hideInstruction();

  // If model was anchored to the scene, put it back or remove it
  const anchoredModel = document.getElementById('anchored-model');
  if (anchoredModel) {
    anchoredModel.parentNode.removeChild(anchoredModel);
  }
  
  setupScene();
  statusText.textContent = `Escaneando marcador [${state.models[state.activeModelId].markerPreset.toUpperCase()}]`;
}

resetBtn.addEventListener('click', resetExperience);

// Handle manual anchor override
deviceTiltBtn.addEventListener('click', () => {
  if (state.modelLoaded && !state.modelAnchored) {
    anchorModel();
  }
});

// A-Frame Custom Component to register events
AFRAME.registerComponent('registerevents', {
  init: function () {
    const marker = this.el;
    
    marker.addEventListener('markerFound', () => {
      state.markerVisible = true;
      statusText.textContent = 'Marcador detectado';
      
      // Simulating model loading (standard loading events can be messy, wait 1s for model to load)
      setTimeout(() => {
        state.modelLoaded = true;
        showInstruction(
          'MUEVA EL CELULAR HACIA ARRIBA',
          'Tensa el dispositivo hacia el cielo para fijar el modelo 3D.'
        );
      }, 1000);
    });

    marker.addEventListener('markerLost', () => {
      state.markerVisible = false;
      if (!state.modelAnchored) {
        statusText.textContent = 'Buscando marcador...';
        hideInstruction();
      }
    });
  }
});

// Device Orientation Handling for Tilt-Up Action
function handleOrientation(event) {
  if (!state.modelLoaded || state.modelAnchored) return;

  const pitch = event.beta; // rotation around X axis [-180, 180]
  
  if (pitch === null) return;

  if (state.initialPitch === null) {
    state.initialPitch = pitch;
    return;
  }

  // Calculate change in tilt. Tilting phone up increases/decreases pitch depending on orientation.
  // Generally, holding phone up tilts screen away from you, modifying pitch.
  // We can track if pitch changes significantly (e.g. by state.tiltThreshold)
  const diff = Math.abs(pitch - state.initialPitch);
  
  if (diff > state.tiltThreshold) {
    anchorModel();
  }
}

// Anchor the model in space relative to the scene coordinate system
function anchorModel() {
  if (state.modelAnchored) return;
  
  const modelEl = document.getElementById('ar-model');
  if (!modelEl) return;

  const sceneEl = document.querySelector('a-scene');
  
  // Get current world coordinates of the model
  const worldPos = new THREE.Vector3();
  modelEl.object3D.getWorldPosition(worldPos);

  const worldRot = new THREE.Quaternion();
  modelEl.object3D.getWorldQuaternion(worldRot);

  const worldScale = new THREE.Vector3();
  modelEl.object3D.getWorldScale(worldScale);

  // Create a new static model outside of the marker parent, directly in the scene
  const staticModel = document.createElement('a-entity');
  staticModel.setAttribute('id', 'anchored-model');
  staticModel.setAttribute('gltf-model', `url(${state.models[state.activeModelId].modelUrl})`);
  
  // Set scale
  staticModel.setAttribute('scale', `${worldScale.x} ${worldScale.y} ${worldScale.z}`);

  // Place it slightly in front of camera or at its tracked world position
  // In standard AR.js camera is at 0 0 0, marker moves. Let's place it at the captured world coordinates!
  staticModel.setAttribute('position', `${worldPos.x} ${worldPos.y} ${worldPos.z}`);
  
  sceneEl.appendChild(staticModel);
  
  // Copy exact rotation
  staticModel.object3D.quaternion.copy(worldRot);

  // Hide the original marker model
  modelEl.setAttribute('visible', 'false');

  // Mark as anchored
  state.modelAnchored = true;
  statusText.textContent = 'Modelo Fijado en el Espacio';
  
  showInstruction(
    'MODELO ANCLADO',
    'El modelo ahora está fijo en la habitación. ¡Muévete alrededor!'
  );
  
  // Automatically clear instruction banner after 3 seconds
  setTimeout(() => {
    if (state.modelAnchored) {
      hideInstruction();
    }
  }, 4000);
}

// Banner controls
function showInstruction(title, desc) {
  instructionText.textContent = title;
  instructionSubtext.textContent = desc;
  instructionBanner.classList.add('visible');
}

function hideInstruction() {
  instructionBanner.classList.remove('visible');
}

// Initialize selector on page load
buildSelectorUI();
