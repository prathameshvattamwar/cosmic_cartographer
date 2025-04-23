// --- DOM Elements ---
const welcomeScreen = document.getElementById('welcome-screen');
const gameScreen = document.getElementById('game-screen');
const completionScreen = document.getElementById('completion-screen');
const screens = [welcomeScreen, gameScreen, completionScreen];

const userNameInput = document.getElementById('userName');
const startMissionBtn = document.getElementById('startMissionBtn');
const nameError = document.getElementById('nameError');

const userDesignationDisplay = document.getElementById('user-designation');
const starMapContainer = document.getElementById('star-map');
const consoleOutput = document.getElementById('console-output');
const progressText = document.getElementById('progress-text');
const progressBar = document.getElementById('progress-bar');
const resetProgressBtn = document.getElementById('resetProgressBtn');

const certUserNameDisplay = document.getElementById('cert-userName-display');
const certName = document.getElementById('cert-name');
const certDate = document.getElementById('cert-date');
const certificatePreview = document.getElementById('certificate-preview');
const downloadCertBtn = document.getElementById('downloadCertBtn');
const startNewMissionBtn = document.getElementById('startNewMissionBtn');

// Instruction Modal Elements
const instructionModal = document.getElementById('instruction-modal');
const instructionTitle = document.getElementById('instruction-title');
const instructionText = document.getElementById('instruction-text');
const instructionVisual = document.getElementById('instruction-visual');
const proceedScanBtn = document.getElementById('proceedScanBtn');

// Mini-Game Modal Elements
const miniGameModal = document.getElementById('minigame-modal');
const miniGameTitle = document.getElementById('minigame-title');
const miniGameInstructions = document.getElementById('minigame-instructions');
const miniGameArea = document.getElementById('minigame-area');
const miniGameFeedback = document.getElementById('minigame-feedback');

// --- jsPDF Setup ---
const { jsPDF } = window.jspdf;

// --- Game Configuration ---
const TOTAL_SYSTEMS = 12;
const SYSTEM_NAMES = ["Alpha Centauri", "Sirius", "Proxima Centauri", "Barnard's Star", "Wolf 359", "Lalande 21185", "Epsilon Eridani", "Tau Ceti", "Gliese 581", "Kepler-186f", "TRAPPIST-1", "Vega"];
const MINIGAME_TYPES = ['pattern', 'qte', 'sequence', 'rapidclick']; // Added new types
const SEQUENCE_LENGTH = 5; // For sequence game
const SEQUENCE_COLORS = ['#ff4136', '#0074d9', '#2ecc40', '#ffdc00', '#b10dc9']; // Red, Blue, Green, Yellow, Purple
const RAPID_CLICK_TARGET = 15; // Clicks needed
const RAPID_CLICK_TIME = 5; // Seconds allowed

// --- Game State Variables ---
let userName = '';
let scannedSystems = {};
let systemsData = [];
let currentTargetSystem = null;
let activeMiniGame = { // Use an object to hold different timer types
    timeoutId: null,
    intervalId: null,
    currentGameType: null // Store the type for the proceed button
};
let gameInProgress = false;

// --- Functions ---

function showScreen(screenToShow) {
    screens.forEach(screen => {
        if (screen === screenToShow) {
            screen.style.display = 'block';
            setTimeout(() => screen.classList.add('active'), 10);
        } else {
            screen.classList.remove('active');
            const handleTransitionEnd = () => {
                if (!screen.classList.contains('active')) {
                    screen.style.display = 'none';
                }
                screen.removeEventListener('transitionend', handleTransitionEnd);
            };
            screen.addEventListener('transitionend', handleTransitionEnd);
             setTimeout(() => {
                 if (!screen.classList.contains('active')) screen.style.display = 'none';
             }, 600);
        }
    });
}

function logMessage(message, type = 'info') {
    const p = document.createElement('p');
    p.textContent = message;
    p.className = `console-message ${type}`;
    consoleOutput.appendChild(p);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function updateProgress() {
    const scannedCount = Object.keys(scannedSystems).length;
    const percentage = (scannedCount / TOTAL_SYSTEMS) * 100;
    progressText.textContent = `Systems Scanned: ${scannedCount} / ${TOTAL_SYSTEMS}`;
    progressBar.style.width = `${percentage}%`;

    systemsData.forEach(sys => {
        if (sys.element) {
            if (scannedSystems[sys.id]) {
                sys.element.classList.add('scanned');
                sys.element.classList.remove('scanning');
                 const icon = sys.element.querySelector('i');
                 if (icon) icon.className = 'fas fa-check-circle';
            } else {
                 sys.element.classList.remove('scanned');
                  const icon = sys.element.querySelector('i');
                  if (icon) icon.className = 'fas fa-question-circle';
            }
        }
    });

    if (scannedCount === TOTAL_SYSTEMS && gameInProgress) {
        completeMission();
    }
}

function saveProgress() {
    const gameState = {
        userName: userName,
        scannedSystems: scannedSystems,
        gameInProgress: gameInProgress
    };
    localStorage.setItem('cosmicCartographerState', JSON.stringify(gameState));
     // Only log saving if the game is actually running to avoid spam on load
     if(gameInProgress) logMessage("Progress saved.", "system");
}

function loadProgress() {
    const savedState = localStorage.getItem('cosmicCartographerState');
    if (savedState) {
        try {
            const gameState = JSON.parse(savedState);
            userName = gameState.userName || '';
            scannedSystems = gameState.scannedSystems || {};
            gameInProgress = gameState.gameInProgress || false;

            if (userName) {
                 userNameInput.value = userName;
            }
            // Don't log here, wait until initialization logic decides what to do
             return true;
        } catch (error) {
            logMessage("Error loading saved progress. Starting fresh.", "error");
            localStorage.removeItem('cosmicCartographerState');
            return false;
        }
    }
    return false;
}

function resetGameData() {
     scannedSystems = {};
     systemsData = [];
     currentTargetSystem = null;
     clearActiveMiniGame(); // Ensure timers are cleared
     gameInProgress = false; // Set game to inactive before potentially starting again
     starMapContainer.innerHTML = '<div class="map-background"></div>';
     consoleOutput.innerHTML = ''; // Clear console only on full reset or new game start
     localStorage.removeItem('cosmicCartographerState');
     updateProgress();
}

// Modified function to handle starting/restarting the game interface
function initializeGameInterface() {
    userDesignationDisplay.textContent = `Trainee: ${userName}`;
    gameInProgress = true; // Mark game as active *now*
    // Clear previous state except maybe user name which is already set
    scannedSystems = {};
    systemsData = [];
    starMapContainer.innerHTML = '<div class="map-background"></div>'; // Clear map
    consoleOutput.innerHTML = ''; // Clear console for new mission
    logMessage(`Mission started for Trainee ${userName}. Begin scanning Sector 7G.`, "system");
    generateStarMap(); // Generate new systems
    updateProgress(); // Set progress bar to 0
    saveProgress(); // Save initial state
    showScreen(gameScreen);
}


function validateName() {
    if (userNameInput.value.trim() === '') {
        nameError.textContent = 'Please enter your designation!';
        nameError.classList.add('show');
        userNameInput.focus();
        return false;
    }
    nameError.textContent = '';
    nameError.classList.remove('show');
    return true;
}

function generateStarMap() {
     systemsData = [];
    for (let i = 0; i < TOTAL_SYSTEMS; i++) {
        const systemId = `sys-${i}`;
        const systemName = SYSTEM_NAMES[i % SYSTEM_NAMES.length] || `System ${i + 1}`;

        const systemDiv = document.createElement('div');
        systemDiv.className = 'star-system';
        systemDiv.id = systemId;
        systemDiv.title = `Scan ${systemName}`;

        const icon = document.createElement('i');
        // Set icon based on loaded state if applicable
        icon.className = scannedSystems[systemId] ? 'fas fa-check-circle' : 'fas fa-question-circle';
        systemDiv.appendChild(icon);

        const systemInfo = { id: systemId, name: systemName, element: systemDiv, scanned: !!scannedSystems[systemId] };
        systemsData.push(systemInfo);

        // Add scanned class if loaded from progress
        if (systemInfo.scanned) {
            systemDiv.classList.add('scanned');
        }

        systemDiv.addEventListener('click', () => handleSystemClick(systemInfo));
        starMapContainer.appendChild(systemDiv);
    }
     // Only log generation if actually starting a new game interface
     // (Avoids duplicate message on load)
     if(systemsData.length > 0 && !loadProgress.called) { // Need a flag or better logic here
        // Let's log generation inside initializeGameInterface instead.
     }
      loadProgress.called = false; // Reset flag
}

function handleSystemClick(systemInfo) {
    if (!gameInProgress) {
        logMessage("Mission not active. Please start first.", "error");
        return;
    }
    if (scannedSystems[systemInfo.id]) {
        logMessage(`System ${systemInfo.name} (${systemInfo.id}) already scanned. Data: ${scannedSystems[systemInfo.id].data}`, "info");
        return;
    }
    // Check if any modal is already active
     if (miniGameModal.classList.contains('active') || instructionModal.classList.contains('active')) {
         logMessage("Procedure already in progress.", "error");
         return;
     }

    logMessage(`Initiating scan for ${systemInfo.name} (${systemInfo.id})...`, "command");
    currentTargetSystem = systemInfo;
    systemInfo.element.classList.add('scanning');

    const gameType = MINIGAME_TYPES[Math.floor(Math.random() * MINIGAME_TYPES.length)];
    activeMiniGame.currentGameType = gameType; // Store the upcoming game type

    // Show instruction popup first
    showInstructionPopup(gameType);
}

function showInstructionPopup(gameType) {
    let instructions = '';
    let visualHTML = '';

    instructionTitle.innerHTML = `<i class="fas fa-info-circle"></i> Upcoming Scan: ${gameType.charAt(0).toUpperCase() + gameType.slice(1)} Calibration`;

    switch (gameType) {
        case 'pattern':
            instructions = 'Memorize the highlighted pattern on the grid, then replicate it exactly.';
            visualHTML = `
                <span>Example:</span>
                <div class="visual-grid">
                    <div class="visual-cell"></div><div class="visual-cell highlight">X</div><div class="visual-cell"></div>
                    <div class="visual-cell highlight">X</div><div class="visual-cell"></div><div class="visual-cell"></div>
                    <div class="visual-cell"></div><div class="visual-cell"></div><div class="visual-cell highlight">X</div>
                </div>`;
            break;
        case 'qte':
            instructions = 'Press the button precisely when the moving indicator enters the highlighted target zone.';
            visualHTML = `
                <span>Example:</span>
                <div class="visual-qte-bar">
                    <span class="visual-qte-indicator">></span>
                    <span class="visual-qte-target"></span>
                      Target Zone
                </div>`;
            break;
        case 'sequence':
            instructions = `A sequence of ${SEQUENCE_LENGTH} colors will flash. Click the colored buttons in the same order.`;
             visualHTML = `
                <span>Example Input:</span>
                <div class="visual-sequence">
                    <div class="visual-sequence-item" style="background-color: ${SEQUENCE_COLORS[0]};"></div>
                    <div class="visual-sequence-item" style="background-color: ${SEQUENCE_COLORS[1]};"></div>
                    <div class="visual-sequence-item" style="background-color: ${SEQUENCE_COLORS[2]};"></div>
                    ...
                </div>`;
            break;
        case 'rapidclick':
            instructions = `Click the target button ${RAPID_CLICK_TARGET} times before the timer runs out!`;
            visualHTML = `
                <span>Example:</span>
                <div>
                    <span class="visual-click-target">Click Me!</span>
                    <span> / Time: 5.0s</span>
                </div>`;
            break;
        default:
            instructions = 'Prepare for an unknown calibration procedure.';
            visualHTML = '<span>No visual example available.</span>';
    }

    instructionText.textContent = instructions;
    instructionVisual.innerHTML = visualHTML;
    instructionModal.classList.add('active');
}

// Event listener for the "Proceed" button in the instruction modal
proceedScanBtn.onclick = () => {
    instructionModal.classList.remove('active');
    // Add a tiny delay to allow the instruction modal to fade slightly
    setTimeout(() => {
        if (activeMiniGame.currentGameType) {
            launchMiniGame(activeMiniGame.currentGameType);
        } else {
            logMessage("Error: Could not determine scan type.", "error");
             if (currentTargetSystem && currentTargetSystem.element) {
                currentTargetSystem.element.classList.remove('scanning'); // Stop visual scan
            }
        }
    }, 150); // 150ms delay
};


function launchMiniGame(type) {
    miniGameFeedback.textContent = '';
    miniGameFeedback.className = 'feedback-message';
    miniGameArea.innerHTML = '';

    logMessage(`Scanner requires manual calibration. Procedure: ${type.toUpperCase()}`, "system");

    // Setup based on type
    if (type === 'pattern') setupPatternGame();
    else if (type === 'qte') setupQTEGame();
    else if (type === 'sequence') setupSequenceGame();
    else if (type === 'rapidclick') setupRapidClickGame();
    else {
        logMessage(`Unknown minigame type: ${type}`, "error");
        handleMiniGameResult(false); // Fail instantly if game type is wrong
        return;
    }

    miniGameModal.classList.add('active');
}

function clearActiveMiniGame() {
    if (activeMiniGame) {
        clearTimeout(activeMiniGame.timeoutId);
        clearInterval(activeMiniGame.intervalId);
    }
    activeMiniGame = { timeoutId: null, intervalId: null, currentGameType: null }; // Reset
}

function handleMiniGameResult(success) {
    clearActiveMiniGame(); // Clear any running timers/intervals from the game
    miniGameModal.classList.remove('active'); // Hide the main game modal

    if (currentTargetSystem && currentTargetSystem.element) {
         currentTargetSystem.element.classList.remove('scanning'); // Stop scanning visual

        if (success) {
            const systemId = currentTargetSystem.id;
            const systemName = currentTargetSystem.name;
            const scanData = `Scan complete. Detected characteristics: ${['Stable Orbit', 'High Radiation', 'Trace Organics', 'Metallic Asteroids', 'Subspace Anomaly'][Math.floor(Math.random() * 5)]}.`;

            scannedSystems[systemId] = { name: systemName, data: scanData };
            const sysData = systemsData.find(s => s.id === systemId);
             if(sysData) sysData.scanned = true;

            logMessage(`Scan successful for ${systemName}! ${scanData}`, "scan-success");
            saveProgress();
        } else {
            logMessage(`Scan failed for ${currentTargetSystem.name}. Calibration unstable. Try again.`, "scan-fail");
        }
    } else {
        // This case might happen if the user somehow closes things unexpectedly
        logMessage("Error: Target system lost during scan.", "error");
    }

    currentTargetSystem = null; // Clear target regardless of success/fail
    updateProgress(); // Update UI and check for completion
}


// --- Mini-Game Implementations (Keep Pattern and QTE, add Sequence and RapidClick) ---

function setupPatternGame() {
    miniGameTitle.textContent = 'Pattern Calibration';
    miniGameInstructions.textContent = 'Observe the pattern, then replicate it by clicking the cells.';
    miniGameArea.innerHTML = `
        <div class="pattern-display">Pattern: <span id="pattern-sequence"></span></div>
        <div class="pattern-grid" id="pattern-input-grid"></div>
        <button id="submitPatternBtn" class="btn btn-primary btn-small">Confirm Pattern</button>
    `;

    const gridSize = 3;
    const gameSequenceLength = 4; // Use a specific constant if needed
    let targetPattern = [];
    let userPattern = [];

    while (targetPattern.length < gameSequenceLength) {
        const randomIndex = Math.floor(Math.random() * (gridSize * gridSize));
        if (!targetPattern.includes(randomIndex)) {
            targetPattern.push(randomIndex);
        }
    }

    const gridCells = [];
    const inputGrid = document.getElementById('pattern-input-grid');
    if (!inputGrid) return handleMiniGameResult(false); // Safety check
    inputGrid.style.gridTemplateColumns = `repeat(${gridSize}, 40px)`;

    for (let i = 0; i < gridSize * gridSize; i++) {
        const cell = document.createElement('div');
        cell.className = 'pattern-cell';
        cell.dataset.index = i;
        inputGrid.appendChild(cell);
        gridCells.push(cell);
    }

    let flashCount = 0;
    miniGameInstructions.textContent = 'Memorize the pattern...';
    inputGrid.style.pointerEvents = 'none';
    clearActiveMiniGame(); // Clear previous before setting new

    activeMiniGame.intervalId = setInterval(() => {
        if(flashCount >= targetPattern.length) {
            clearInterval(activeMiniGame.intervalId);
            activeMiniGame.intervalId = null; // Mark as cleared
            miniGameInstructions.textContent = 'Now, replicate the pattern.';
            inputGrid.style.pointerEvents = 'auto';
             gridCells.forEach(cell => {
                 cell.onclick = () => {
                     const index = parseInt(cell.dataset.index);
                     if (userPattern.length < gameSequenceLength && !userPattern.includes(index)) {
                         userPattern.push(index);
                         cell.classList.add('user-selected');
                         if(userPattern.length === gameSequenceLength) {
                            const submitBtn = document.getElementById('submitPatternBtn');
                            if(submitBtn) {
                                submitBtn.style.opacity = 1;
                                submitBtn.disabled = false;
                            }
                         }
                     } else if (userPattern.includes(index)){
                        userPattern = userPattern.filter(item => item !== index);
                        cell.classList.remove('user-selected');
                        const submitBtn = document.getElementById('submitPatternBtn');
                        if (submitBtn) {
                            submitBtn.style.opacity = 0.5;
                            submitBtn.disabled = true;
                        }
                     }
                 };
             });
            const submitBtn = document.getElementById('submitPatternBtn');
            if(submitBtn) {
                submitBtn.style.opacity = 0.5;
                submitBtn.disabled = true;
            }
             return;
        }

        const indexToFlash = targetPattern[flashCount];
        if (gridCells[indexToFlash]) {
            gridCells[indexToFlash].classList.add('active');
            // Store timeout ID in the shared activeMiniGame object
            activeMiniGame.timeoutId = setTimeout(() => {
                 if(gridCells[indexToFlash]) gridCells[indexToFlash].classList.remove('active');
                 flashCount++;
                 activeMiniGame.timeoutId = null; // Clear specific timeout ref
            }, 400);
        } else {
             clearInterval(activeMiniGame.intervalId);
             activeMiniGame.intervalId = null;
        }
    }, 600);

    const submitBtn = document.getElementById('submitPatternBtn');
     if(submitBtn){
        submitBtn.onclick = () => {
            const success = JSON.stringify(targetPattern) === JSON.stringify(userPattern);
            miniGameFeedback.textContent = success ? 'Pattern Matched!' : 'Pattern Incorrect.';
            miniGameFeedback.className = `feedback-message ${success ? 'success' : 'error'}`;
            submitBtn.disabled = true;
            setTimeout(() => handleMiniGameResult(success), success ? 1000 : 1500);
        };
        submitBtn.style.opacity = 0.5;
        submitBtn.disabled = true;
     } else {
        handleMiniGameResult(false); // Fail if button doesn't exist
     }
}

function setupQTEGame() {
    miniGameTitle.textContent = 'Timing Calibration';
    miniGameInstructions.textContent = 'Hit the button when the indicator enters the green zone!';
    miniGameArea.innerHTML = `
        <div class="qte-bar-container">
            <div class="qte-target-zone" id="qte-target"></div>
            <div class="qte-indicator" id="qte-indicator"></div>
        </div>
        <button id="qte-button" class="btn btn-secondary btn-glow">Calibrate!</button>
    `;

    const indicator = document.getElementById('qte-indicator');
    const target = document.getElementById('qte-target');
    const qteButton = document.getElementById('qte-button');
    if(!indicator || !target || !qteButton) return handleMiniGameResult(false);

    const targetWidth = Math.random() * 10 + 10;
    const targetLeft = Math.random() * (75 - targetWidth);
    target.style.width = `${targetWidth}%`;
    target.style.left = `${targetLeft}%`;

    const animationDuration = Math.random() * 1 + 1.5;
    indicator.style.animation = `qte-move ${animationDuration}s linear 1 forwards`;

    qteButton.disabled = false;
    let qtePressed = false;
    clearActiveMiniGame();

    qteButton.onclick = () => {
        if(qtePressed) return;
        qtePressed = true;
        qteButton.disabled = true;
        indicator.style.animationPlayState = 'paused';
        clearTimeout(activeMiniGame.timeoutId); // Clear the timeout fail condition
        activeMiniGame.timeoutId = null;

        const indicatorRect = indicator.getBoundingClientRect();
         const containerRect = indicator.parentElement.getBoundingClientRect();
         // Check if container has width, otherwise calculation is impossible
         if (containerRect.width === 0) return handleMiniGameResult(false);
         const indicatorLeftPercent = ((indicatorRect.left - containerRect.left) / containerRect.width) * 100;

        const success = indicatorLeftPercent >= targetLeft && indicatorLeftPercent <= (targetLeft + targetWidth);

        miniGameFeedback.textContent = success ? 'Calibration Lock Acquired!' : 'Timing Mismatch!';
        miniGameFeedback.className = `feedback-message ${success ? 'success' : 'error'}`;
        setTimeout(() => handleMiniGameResult(success), success ? 1000 : 1500);
    };

    activeMiniGame.timeoutId = setTimeout(() => {
        if (!qtePressed) {
             indicator.style.animationPlayState = 'paused';
             qteButton.disabled = true;
             miniGameFeedback.textContent = 'Calibration Timed Out!';
             miniGameFeedback.className = 'feedback-message error';
             activeMiniGame.timeoutId = null; // Mark as cleared
             setTimeout(() => handleMiniGameResult(false), 1500);
        }
    }, animationDuration * 1000 + 100);
}

function setupSequenceGame() {
    miniGameTitle.textContent = 'Sequence Memory Calibration';
    miniGameInstructions.textContent = `Watch the ${SEQUENCE_LENGTH} color sequence, then click the buttons in the same order.`;
    let colorButtonsHTML = '';
    SEQUENCE_COLORS.forEach(color => {
        colorButtonsHTML += `<button class="sequence-color-btn" data-color="${color}" style="background-color: ${color};"></button>`;
    });

    miniGameArea.innerHTML = `
        <div id="sequence-display" class="sequence-display"></div>
        <div class="sequence-colors">${colorButtonsHTML}</div>
    `;

    const displayArea = document.getElementById('sequence-display');
    const colorButtons = miniGameArea.querySelectorAll('.sequence-color-btn');
    if (!displayArea || colorButtons.length !== SEQUENCE_COLORS.length) return handleMiniGameResult(false);

    let targetSequence = [];
    let userSequence = [];

    // Generate target sequence
    for (let i = 0; i < SEQUENCE_LENGTH; i++) {
        targetSequence.push(SEQUENCE_COLORS[Math.floor(Math.random() * SEQUENCE_COLORS.length)]);
    }

    // Flash the sequence
    let flashIndex = 0;
    miniGameInstructions.textContent = 'Memorize the sequence...';
    colorButtons.forEach(btn => btn.disabled = true); // Disable buttons during flash
    clearActiveMiniGame();

    activeMiniGame.intervalId = setInterval(() => {
        if (flashIndex >= targetSequence.length) {
            clearInterval(activeMiniGame.intervalId);
            activeMiniGame.intervalId = null;
            displayArea.innerHTML = ''; // Clear display after flashing
            miniGameInstructions.textContent = 'Now, repeat the sequence.';
            colorButtons.forEach(btn => btn.disabled = false); // Enable buttons
            return;
        }

        displayArea.innerHTML = `<div class="sequence-display-item" style="background-color: ${targetSequence[flashIndex]};"></div>`;
        flashIndex++;

        // Brief pause to see the color, then clear for the next flash (or end)
        activeMiniGame.timeoutId = setTimeout(() => {
            if (flashIndex < targetSequence.length) { // Only clear if not the last item
                 displayArea.innerHTML = '';
            }
            activeMiniGame.timeoutId = null;
        }, 500); // Time color is shown

    }, 800); // Time between flashes

    // Add button listeners
    colorButtons.forEach(btn => {
        btn.onclick = () => {
            const clickedColor = btn.dataset.color;
            userSequence.push(clickedColor);
            // Optional: Visual feedback for click? (e.g., brief scale)
            btn.style.transform = 'scale(1.1)';
            setTimeout(() => btn.style.transform = 'scale(1)', 150);

            // Check if sequence is wrong *immediately* or wait till the end? Let's wait.
            if (userSequence.length === targetSequence.length) {
                // Sequence complete, disable buttons and check
                colorButtons.forEach(b => b.disabled = true);
                const success = JSON.stringify(targetSequence) === JSON.stringify(userSequence);
                miniGameFeedback.textContent = success ? 'Sequence Matched!' : 'Sequence Incorrect!';
                miniGameFeedback.className = `feedback-message ${success ? 'success' : 'error'}`;
                setTimeout(() => handleMiniGameResult(success), success ? 1000 : 1500);
            }
        };
    });
}

function setupRapidClickGame() {
    miniGameTitle.textContent = 'Power Surge Calibration';
    miniGameInstructions.textContent = `Click the button ${RAPID_CLICK_TARGET} times in ${RAPID_CLICK_TIME} seconds!`;
    miniGameArea.innerHTML = `
        <div class="rapid-click-area">
            <button id="clickTargetBtn">Click Fast!</button>
            <div id="clickTimer">${RAPID_CLICK_TIME.toFixed(1)}s</div>
            <div id="clickCounter">Clicks: 0 / ${RAPID_CLICK_TARGET}</div>
        </div>
    `;

    const targetButton = document.getElementById('clickTargetBtn');
    const timerDisplay = document.getElementById('clickTimer');
    const counterDisplay = document.getElementById('clickCounter');
    if(!targetButton || !timerDisplay || !counterDisplay) return handleMiniGameResult(false);

    let clicks = 0;
    let timeLeft = RAPID_CLICK_TIME;
    targetButton.disabled = false;
    clearActiveMiniGame();

    targetButton.onclick = () => {
        clicks++;
        counterDisplay.textContent = `Clicks: ${clicks} / ${RAPID_CLICK_TARGET}`;
        // Optional: Visual feedback on click
        targetButton.style.transform = 'scale(1.05)';
        setTimeout(()=> targetButton.style.transform = 'scale(1)', 50);

        if (clicks >= RAPID_CLICK_TARGET) {
            // Target reached!
            clearInterval(activeMiniGame.intervalId);
            activeMiniGame.intervalId = null;
            targetButton.disabled = true;
            miniGameFeedback.textContent = 'Power Stabilized!';
            miniGameFeedback.className = 'feedback-message success';
            setTimeout(() => handleMiniGameResult(true), 1000);
        }
    };

    // Start the timer
    activeMiniGame.intervalId = setInterval(() => {
        timeLeft -= 0.1;
        timerDisplay.textContent = `${timeLeft.toFixed(1)}s`;

        if (timeLeft <= 0) {
            clearInterval(activeMiniGame.intervalId);
            activeMiniGame.intervalId = null;
            targetButton.disabled = true;
            // Check if target was met JUST as time ran out
            if (clicks >= RAPID_CLICK_TARGET) {
                 miniGameFeedback.textContent = 'Power Stabilized!';
                 miniGameFeedback.className = 'feedback-message success';
                 setTimeout(() => handleMiniGameResult(true), 1000);
            } else {
                 miniGameFeedback.textContent = 'Insufficient Power Output!';
                 miniGameFeedback.className = 'feedback-message error';
                 setTimeout(() => handleMiniGameResult(false), 1500);
            }
        }
    }, 100);
}

// --- Mission Completion ---
function completeMission() {
    gameInProgress = false;
    logMessage("All systems mapped! Mission successful!", "system");

    certUserNameDisplay.textContent = userName;
    certName.textContent = userName;
    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    certDate.textContent = `On Stardate ${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')} (Earth Date: ${dateString})`;

    if(Object.keys(scannedSystems).length === TOTAL_SYSTEMS) {
         saveProgress(); // Save final completed state
    }

    showScreen(completionScreen);
}


// --- Certificate Download (Keep existing) ---
async function downloadCertificate() { /* ... same as before ... */
    logMessage("Generating certificate PDF...", "system");
    certificatePreview.style.transform = 'scale(1.1)';
    certificatePreview.style.transformOrigin = 'top left';
    await new Promise(resolve => requestAnimationFrame(resolve));

    try {
        const canvas = await html2canvas(certificatePreview, {
             scale: 2,
             useCORS: true,
             logging: false,
             backgroundColor: null,
             width: certificatePreview.offsetWidth * 1.1,
             height: certificatePreview.offsetHeight * 1.1,
             windowWidth: document.documentElement.scrollWidth,
             windowHeight: document.documentElement.scrollHeight
        });
        certificatePreview.style.transform = 'scale(1)';

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const margin = 10;
        const availableWidth = pdfWidth - 2 * margin;
        const availableHeight = pdfHeight - 2 * margin;
        const imgRatio = imgProps.width / imgProps.height;
        const pageRatio = availableWidth / availableHeight;

        let finalImgWidth, finalImgHeight;
        if (imgRatio > pageRatio) {
            finalImgWidth = availableWidth;
            finalImgHeight = finalImgWidth / imgRatio;
        } else {
            finalImgHeight = availableHeight;
            finalImgWidth = finalImgHeight * imgRatio;
        }

        const x = margin + (availableWidth - finalImgWidth) / 2;
        const y = margin + (availableHeight - finalImgHeight) / 2;

        pdf.addImage(imgData, 'PNG', x, y, finalImgWidth, finalImgHeight);
        pdf.save(`${userName.replace(/\s+/g, '_')}_Cosmic_Cartographer_Cert.pdf`);
        logMessage("Certificate PDF download initiated.", "info");

    } catch (error) {
        console.error("Error generating PDF:", error);
        logMessage("Error generating PDF. Check console for details.", "error");
        alert("Sorry, there was an error generating the certificate PDF.");
        certificatePreview.style.transform = 'scale(1)';
    }
}

// --- Initialization and Event Listeners ---
function initializeApp() {
     loadProgress.called = true; // Set flag to prevent duplicate log on load
     const loaded = loadProgress();

     if (loaded && gameInProgress) {
         logMessage("Resuming mission...", "system");
         userDesignationDisplay.textContent = `Trainee: ${userName}`;
         generateStarMap(); // Regenerate map visuals
         updateProgress(); // Update progress bar and system states
         showScreen(gameScreen);
     } else if (loaded && !gameInProgress && Object.keys(scannedSystems).length === TOTAL_SYSTEMS) {
         logMessage("Mission already completed. Displaying certificate.", "system");
          completeMission(); // Populate and show certificate
     }
      else {
          // Covers: No saved state, failed load, or saved state was incomplete & not in progress
          resetGameData(); // Ensure clean slate
          logMessage("Ready for new mission.", "system");
          showScreen(welcomeScreen);
      }

    // Event Listeners
    startMissionBtn.addEventListener('click', () => {
        if (validateName()) {
            userName = userNameInput.value.trim();
            // Don't reset game data here, initializeGameInterface handles clearing for a new game
            initializeGameInterface(); // Setup and show game screen
        }
    });

    resetProgressBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to reset all progress for this mission? This cannot be undone.")) {
             logMessage("Mission progress has been reset by user.", "system");
             const currentUserName = userName; // Save current name
             resetGameData(); // Clears name internally too
             userName = currentUserName; // Restore name
             userNameInput.value = userName; // Update input field
             // Start a fresh game interface immediately
             initializeGameInterface();
        }
    });


    downloadCertBtn.addEventListener('click', downloadCertificate);

    startNewMissionBtn.addEventListener('click', () => {
         resetGameData(); // Fully reset everything
         userNameInput.value = ''; // Clear name input field
         logMessage("Ready for new mission.", "system");
         showScreen(welcomeScreen);
    });

     userNameInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            startMissionBtn.click();
        }
    });

}

// --- Start the App ---
initializeApp();
