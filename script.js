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

const miniGameModal = document.getElementById('minigame-modal');
const miniGameTitle = document.getElementById('minigame-title');
const miniGameInstructions = document.getElementById('minigame-instructions');
const miniGameArea = document.getElementById('minigame-area');
const miniGameFeedback = document.getElementById('minigame-feedback');
const closeModalBtn = document.getElementById('closeModalBtn');

const { jsPDF } = window.jspdf;

const TOTAL_SYSTEMS = 12;
const SYSTEM_NAMES = ["Alpha Centauri", "Sirius", "Proxima Centauri", "Barnard's Star", "Wolf 359", "Lalande 21185", "Epsilon Eridani", "Tau Ceti", "Gliese 581", "Kepler-186f", "TRAPPIST-1", "Vega"];
const MINIGAME_TYPES = ['pattern', 'qte'];

let userName = '';
let scannedSystems = {};
let systemsData = [];
let currentTargetSystem = null;
let activeMiniGame = null;
let gameInProgress = false;


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
     logMessage("Progress saved.", "system");
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
            logMessage("Saved progress loaded.", "system");
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
     userName = '';
     scannedSystems = {};
     systemsData = [];
     currentTargetSystem = null;
     activeMiniGame = null;
     gameInProgress = false;
     starMapContainer.innerHTML = '<div class="map-background"></div>';
     consoleOutput.innerHTML = '';
     localStorage.removeItem('cosmicCartographerState');
     updateProgress();
}


function initializeGameInterface() {
    userDesignationDisplay.textContent = `Trainee: ${userName}`;
    gameInProgress = true;
    starMapContainer.innerHTML = '<div class="map-background"></div>';
    consoleOutput.innerHTML = '';
    scannedSystems = {};
    systemsData = [];
    generateStarMap();
    logMessage(`Mission started for Trainee ${userName}. Begin scanning Sector 7G.`, "system");
    updateProgress();
    saveProgress();
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
        icon.className = 'fas fa-question-circle';
        systemDiv.appendChild(icon);

        const systemInfo = { id: systemId, name: systemName, element: systemDiv, scanned: false };
        systemsData.push(systemInfo);

        systemDiv.addEventListener('click', () => handleSystemClick(systemInfo));
        starMapContainer.appendChild(systemDiv);
    }
     if(systemsData.length > 0) {
        logMessage(`Generated ${TOTAL_SYSTEMS} target systems in Sector 7G.`, "system");
     }
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
     if (miniGameModal.classList.contains('active')) {
         logMessage("Scanning procedure already in progress.", "error");
         return;
     }

    logMessage(`Initiating scan for ${systemInfo.name} (${systemInfo.id})...`, "command");
    currentTargetSystem = systemInfo;
    systemInfo.element.classList.add('scanning');

    const gameType = MINIGAME_TYPES[Math.floor(Math.random() * MINIGAME_TYPES.length)];

    setTimeout(() => {
        launchMiniGame(gameType);
    }, 1500);
}

function launchMiniGame(type) {
    miniGameFeedback.textContent = '';
    miniGameFeedback.className = 'feedback-message';
    miniGameArea.innerHTML = '';
    closeModalBtn.style.display = 'none';

    logMessage(`Scanner requires manual calibration. Procedure: ${type.toUpperCase()}`, "system");

    if (type === 'pattern') {
        setupPatternGame();
    } else if (type === 'qte') {
        setupQTEGame();
    }

    miniGameModal.classList.add('active');
}

function handleMiniGameResult(success) {
    if (activeMiniGame) {
        clearTimeout(activeMiniGame.timeoutId);
        clearInterval(activeMiniGame.intervalId);
        activeMiniGame = null;
    }


    miniGameModal.classList.remove('active');

    if (currentTargetSystem && currentTargetSystem.element) {
         currentTargetSystem.element.classList.remove('scanning');

        if (success) {
            const systemId = currentTargetSystem.id;
            const systemName = currentTargetSystem.name;
            const scanData = `Anomalous energy readings detected. Possible ${['mineral deposits', 'gas giant', 'uninhabited planet', 'asteroid field', 'derelict vessel'][Math.floor(Math.random() * 5)]}.`;

            scannedSystems[systemId] = { name: systemName, data: scanData };
            const sysData = systemsData.find(s => s.id === systemId);
             if(sysData) sysData.scanned = true;

            logMessage(`Scan successful for ${systemName}! ${scanData}`, "scan-success");
            saveProgress();
        } else {
            logMessage(`Scan failed for ${currentTargetSystem.name}. Calibration required. Try again.`, "scan-fail");
        }
    } else {
        logMessage("Error: Target system lost during scan.", "error");
    }

    currentTargetSystem = null;
    updateProgress();
}


function setupPatternGame() {
    miniGameTitle.textContent = 'Pattern Calibration';
    miniGameInstructions.textContent = 'Observe the pattern, then replicate it by clicking the cells.';
    miniGameArea.innerHTML = `
        <div class="pattern-display">Pattern: <span id="pattern-sequence"></span></div>
        <div class="pattern-grid" id="pattern-input-grid"></div>
        <button id="submitPatternBtn" class="btn btn-primary btn-small">Confirm Pattern</button>
    `;

    const gridSize = 3;
    const sequenceLength = 4;
    let targetPattern = [];
    let userPattern = [];

    while (targetPattern.length < sequenceLength) {
        const randomIndex = Math.floor(Math.random() * (gridSize * gridSize));
        if (!targetPattern.includes(randomIndex)) {
            targetPattern.push(randomIndex);
        }
    }

    const gridCells = [];
    const inputGrid = document.getElementById('pattern-input-grid');
    if (!inputGrid) return;
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

    activeMiniGame = {};
    activeMiniGame.intervalId = setInterval(() => {
        if(flashCount >= targetPattern.length) {
            clearInterval(activeMiniGame.intervalId);
            miniGameInstructions.textContent = 'Now, replicate the pattern.';
            inputGrid.style.pointerEvents = 'auto';
             gridCells.forEach(cell => {
                 cell.onclick = () => {
                     const index = parseInt(cell.dataset.index);
                     if (userPattern.length < sequenceLength && !userPattern.includes(index)) {
                         userPattern.push(index);
                         cell.classList.add('user-selected');
                         if(userPattern.length === sequenceLength) {
                            document.getElementById('submitPatternBtn').style.opacity = 1;
                            document.getElementById('submitPatternBtn').disabled = false;
                         }
                     } else if (userPattern.includes(index)){
                        userPattern = userPattern.filter(item => item !== index);
                        cell.classList.remove('user-selected');
                        document.getElementById('submitPatternBtn').style.opacity = 0.5;
                        document.getElementById('submitPatternBtn').disabled = true;
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
            activeMiniGame.timeoutId = setTimeout(() => {
                 if(gridCells[indexToFlash]) gridCells[indexToFlash].classList.remove('active');
                 flashCount++;
            }, 400);
        } else {
             clearInterval(activeMiniGame.intervalId);
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
    if(!indicator || !target || !qteButton) return;

    const targetWidth = Math.random() * 10 + 10;
    const targetLeft = Math.random() * (75 - targetWidth);
    target.style.width = `${targetWidth}%`;
    target.style.left = `${targetLeft}%`;

    const animationDuration = Math.random() * 1 + 1.5;
    indicator.style.animation = `qte-move ${animationDuration}s linear 1 forwards`;

    qteButton.disabled = false;
    let qtePressed = false;
    activeMiniGame = {};

    qteButton.onclick = () => {
        if(qtePressed) return;
        qtePressed = true;
        qteButton.disabled = true;
        indicator.style.animationPlayState = 'paused';
        clearTimeout(activeMiniGame.timeoutId);

        const indicatorRect = indicator.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
         const containerRect = indicator.parentElement.getBoundingClientRect();
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
             setTimeout(() => handleMiniGameResult(false), 1500);
        }
    }, animationDuration * 1000 + 100);
}


function completeMission() {
    gameInProgress = false;
    logMessage("All systems mapped! Mission successful!", "system");

    certUserNameDisplay.textContent = userName;
    certName.textContent = userName;
    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    certDate.textContent = `On Stardate ${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')} (Earth Date: ${dateString})`;

    // Only save progress *if* mission was successfully completed by reaching this state
    if(Object.keys(scannedSystems).length === TOTAL_SYSTEMS) {
         saveProgress();
    }

    showScreen(completionScreen);
}


async function downloadCertificate() {
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


function initializeApp() {
     const loaded = loadProgress();

     if (loaded && gameInProgress) {
         logMessage("Resuming mission...", "system");
         userDesignationDisplay.textContent = `Trainee: ${userName}`;
         generateStarMap();
         updateProgress();
         showScreen(gameScreen);
     } else if (loaded && !gameInProgress && Object.keys(scannedSystems).length === TOTAL_SYSTEMS) {
         logMessage("Mission already completed. Displaying certificate.", "system");
          completeMission();
     }
      else {
          resetGameData();
          logMessage("Ready for new mission.", "system");
          showScreen(welcomeScreen);
      }

    startMissionBtn.addEventListener('click', () => {
        if (validateName()) {
            userName = userNameInput.value.trim();
            initializeGameInterface();
        }
    });

    resetProgressBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to reset all progress for this mission?")) {
             logMessage("Mission progress has been reset.", "system");
             // Keep the current user name, but reset game state
             const currentUserName = userName; // Save current name
             resetGameData(); // Clears name internally
             userName = currentUserName; // Restore name
             userNameInput.value = userName; // Update input field too
             initializeGameInterface(); // Start a fresh game interface with the same name
        }
    });


    downloadCertBtn.addEventListener('click', downloadCertificate);

    startNewMissionBtn.addEventListener('click', () => {
         resetGameData();
         userNameInput.value = '';
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

initializeApp();