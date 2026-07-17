// Application State & WebAR Control Logic

const state = {
  arStarted: false,
  activeModelId: 'robot', // Default model/marker
  markerVisible: false,
  modelLoaded: false,
  modelAnchored: false,
  initialPitch: null,
  tiltThreshold: 15, // Degrees tilt up to trigger anchor
  interiorActive: false, // For gyroscope parallax effect
  models: {
    robot: {
      name: 'Choza RealAlto',
      markerPreset: 'hiro',
      type: 'image',
      url: 'assets/img/choza.png',
      width: 2.37,
      height: 1,
      scale: '1.5 1.5 1.5',
      position: '0 0.01 0',
      rotation: '-90 0 0',
      emoji: '🛖'
    },
    spaceship: {
      name: 'Nave Espacial',
      markerPreset: 'kanji',
      modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Duck/glTF-Binary/Duck.glb', // A nice simple duck glb as fallback spaceship, or we can use another gltf
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

  // Add the 3D model or 2D image entity
  let modelEl;
  if (modelConfig.type === 'image') {
    modelEl = document.createElement('a-image');
    modelEl.setAttribute('src', modelConfig.url);
    if (modelConfig.width) modelEl.setAttribute('width', modelConfig.width);
    if (modelConfig.height) modelEl.setAttribute('height', modelConfig.height);
  } else {
    modelEl = document.createElement('a-entity');
    modelEl.setAttribute('gltf-model', `url(${modelConfig.modelUrl})`);
    
    // Add animation mixing to model if robot is expressive
    if (state.activeModelId === 'robot') {
      modelEl.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');
    }
  }
  
  modelEl.setAttribute('id', 'ar-model');
  modelEl.setAttribute('scale', modelConfig.scale);
  modelEl.setAttribute('position', modelConfig.position);
  modelEl.setAttribute('rotation', modelConfig.rotation);
  
  // Bind click event for transition zoom-and-fade
  modelEl.classList.add('interactive');
  modelEl.addEventListener('click', startZoomAndFade);

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
  const activeModel = state.models[state.activeModelId];
  const staticModel = document.createElement(activeModel.type === 'image' ? 'a-image' : 'a-entity');
  staticModel.setAttribute('id', 'anchored-model');
  
  if (activeModel.type === 'image') {
    staticModel.setAttribute('src', activeModel.url);
    if (activeModel.width) staticModel.setAttribute('width', activeModel.width);
    if (activeModel.height) staticModel.setAttribute('height', activeModel.height);
  } else {
    staticModel.setAttribute('gltf-model', `url(${activeModel.modelUrl})`);
  }
  
  // Set scale
  staticModel.setAttribute('scale', `${worldScale.x} ${worldScale.y} ${worldScale.z}`);

  // Place it slightly in front of camera or at its tracked world position
  // In standard AR.js camera is at 0 0 0, marker moves. Let's place it at the captured world coordinates!
  staticModel.setAttribute('position', `${worldPos.x} ${worldPos.y} ${worldPos.z}`);
  
  // Bind click event for transition zoom-and-fade
  staticModel.classList.add('interactive');
  staticModel.addEventListener('click', startZoomAndFade);
  
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

// --- Interactive Zoom and Fade Transition Logic ---
let transitioning = false;

function startZoomAndFade(event) {
  if (transitioning) return;
  transitioning = true;

  const el = event.currentTarget;
  
  // Capture initial scale and position
  const currentScale = el.getAttribute('scale') || {x: 1, y: 1, z: 1};
  const startScaleX = currentScale.x;
  const startScaleY = currentScale.y;
  const startScaleZ = currentScale.z;
  
  const currentPos = el.getAttribute('position') || {x: 0, y: 0, z: 0};
  const startPosX = currentPos.x;
  const startPosY = currentPos.y;
  const startPosZ = currentPos.z;

  const duration = 1200; // 1.2 seconds for animation
  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease-in animation curve
    const easeProgress = progress * progress; 
    const zoomFactor = 1 + easeProgress * 5.0; // Zoom up to 6x
    const opacity = 1 - progress;

    // Apply scale zoom
    el.setAttribute('scale', `${startScaleX * zoomFactor} ${startScaleY * zoomFactor} ${startScaleZ * zoomFactor}`);
    
    // Move closer towards the screen
    el.setAttribute('position', `${startPosX} ${startPosY + easeProgress * 0.8} ${startPosZ + easeProgress * 2.5}`);
    
    // Apply material opacity fadeout
    el.setAttribute('material', `opacity: ${opacity}`);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      showInteriorOverlay();
    }
  }

  requestAnimationFrame(animate);
}

function showInteriorOverlay() {
  // Hide UI HUD and A-Frame scene
  const uiContainer = document.getElementById('ui-container');
  const sceneEl = document.querySelector('a-scene');
  
  if (uiContainer) uiContainer.style.display = 'none';
  if (sceneEl) sceneEl.style.display = 'none';
  
  // Display fullscreen interior overlay
  const interiorOverlay = document.getElementById('interior-overlay');
  const interiorBg = document.getElementById('interior-bg');
  
  if (interiorOverlay) {
    interiorOverlay.style.display = 'block';
    interiorBg.style.backgroundImage = "url('assets/img/interiorchoza.png')";
    state.interiorActive = true;
  }
}

// Setup Interior Overlay Interactive Actions
document.addEventListener('DOMContentLoaded', () => {
  const valdiviaBtn = document.getElementById('valdivia-btn');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const interiorBg = document.getElementById('interior-bg');
  const modelModal = document.getElementById('model-modal');

  if (valdiviaBtn) {
    valdiviaBtn.addEventListener('click', () => {
      interiorBg.classList.add('blurred');
      modelModal.classList.add('visible');
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      modelModal.classList.remove('visible');
      interiorBg.classList.remove('blurred');
    });
  }
});

// Gyroscope-based Parallax tilt effect for interior background
window.addEventListener('deviceorientation', (event) => {
  if (!state.interiorActive) return;

  const tiltX = event.gamma; // Left/Right tilt [-90, 90]
  const tiltY = event.beta;  // Front/Back tilt [-180, 180]

  if (tiltX === null || tiltY === null) return;

  // Base portrait holding angles: gamma = 0, beta = 75
  const maxOffset = 50; // max shift in pixels
  const targetX = -(tiltX / 30) * maxOffset;
  const targetY = -((tiltY - 75) / 25) * maxOffset;

  // Clamp boundaries to prevent image edges from showing
  const clampedX = Math.max(-maxOffset, Math.min(maxOffset, targetX));
  const clampedY = Math.max(-maxOffset, Math.min(maxOffset, targetY));

  const interiorBg = document.getElementById('interior-bg');
  if (interiorBg) {
    // scale(1.15) provides extra padding room for movement without revealing borders
    interiorBg.style.transform = `translate(${clampedX}px, ${clampedY}px) scale(1.15)`;
  }
});

// Initialize selector on page load
buildSelectorUI();
