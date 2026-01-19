// 전역 변수
let stages = [];
let missions = [];
let currentStage = null;
let gameState = {
    running: false,
    startTime: 0,
    currentTime: 0,
    animationId: null,
    actualTarget: 0,
    multiTargets: [],
    multiResults: [],
    currentMultiIndex: 0
};

// 데이터 로드
async function loadData() {
    try {
        const [stagesResponse, missionsResponse] = await Promise.all([
            fetch('data/stages.json'),
            fetch('data/missions.json')
        ]);

        stages = await stagesResponse.json();
        missions = await missionsResponse.json();

        initMainScreen();
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        alert('게임 데이터를 불러오는데 실패했습니다.');
    }
}

// 스킨 관리
function getCurrentSkin() {
    const saved = localStorage.getItem(SKIN_KEY);
    return saved || 'default';
}

function setSkin(skinId) {
    localStorage.setItem(SKIN_KEY, skinId);
    applySkin(skinId);
}

function applySkin(skinId) {
    const skin = skins.find(s => s.id === skinId);
    if (!skin) return;

    document.body.style.background = skin.colors.bg;

    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.stroke = skin.colors.circle;
    }

    const progressBg = document.querySelector('.progress-bg');
    if (progressBg) {
        progressBg.style.stroke = skin.colors.circleBg;
    }

    const timerText = document.getElementById('timerText');
    if (timerText) {
        timerText.style.color = skin.colors.timer;
    }
}

function getCurrentMedal(completedCount) {
    if (completedCount >= medals.diamond.requiredMissions) return 'diamond';
    if (completedCount >= medals.gold.requiredMissions) return 'gold';
    if (completedCount >= medals.silver.requiredMissions) return 'silver';
    if (completedCount >= medals.bronze.requiredMissions) return 'bronze';
    return null;
}

function getUnlockedSkins(medal) {
    if (!medal) return skins.filter(s => s.unlockMedal === null);

    const medalOrder = ['bronze', 'silver', 'gold', 'diamond'];
    const medalIndex = medalOrder.indexOf(medal);

    return skins.filter(s => {
        if (!s.unlockMedal) return true;
        const skinMedalIndex = medalOrder.indexOf(s.unlockMedal);
        return skinMedalIndex <= medalIndex;
    });
}

// 통계 관리
function getStats() {
    const saved = localStorage.getItem(STATS_KEY);
    return saved ? JSON.parse(saved) : {
        totalPlays: 0,
        perfectCount: 0,
        currentCombo: 0,
        maxCombo: 0,
        completedMissions: []
    };
}

function saveStats(stats) {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function updateStats(success, diff) {
    const stats = getStats();

    stats.totalPlays++;

    if (success) {
        stats.currentCombo++;
        if (stats.currentCombo > stats.maxCombo) {
            stats.maxCombo = stats.currentCombo;
        }

        if (diff < 0.01) {
            stats.perfectCount++;
        }
    } else {
        stats.currentCombo = 0;
    }

    saveStats(stats);
    checkMissions(stats);
}

function checkMissions(stats) {
    const progress = getProgress();

    missions.forEach(mission => {
        if (stats.completedMissions.includes(mission.id)) return;

        let completed = false;

        switch(mission.type) {
            case 'play_count':
                completed = stats.totalPlays >= mission.target;
                break;
            case 'perfect_timing':
                completed = stats.perfectCount >= mission.target;
                break;
            case 'combo':
                completed = stats.maxCombo >= mission.target;
                break;
            case 'stage_clear':
                completed = progress.cleared.length >= mission.target;
                break;
        }

        if (completed && !stats.completedMissions.includes(mission.id)) {
            stats.completedMissions.push(mission.id);
            saveStats(stats);
            showMissionComplete(mission);
        }
    });
}

function showMissionComplete(mission) {
    const msg = `🎉 미션 완료!\n${mission.reward} ${mission.title}`;
    setTimeout(() => alert(msg), 100);
}

// 진행 상황 관리
function getProgress() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { cleared: [] };
}

function saveProgress(stageId) {
    const progress = getProgress();
    if (!progress.cleared.includes(stageId)) {
        progress.cleared.push(stageId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }
}

function isStageCleared(stageId) {
    return getProgress().cleared.includes(stageId);
}

function canPlayStage(stageId) {
    if (stageId === 1) return true;
    return isStageCleared(stageId - 1);
}

// 화면 전환
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// 메인 화면 초기화
function initMainScreen() {
    const grid = document.getElementById('stageGrid');
    const progress = getProgress();
    const stats = getStats();

    grid.innerHTML = '';
    stages.forEach((stage, index) => {
        const item = document.createElement('li');
        item.className = 'stage-item';

        // 버튼과 상태를 감싸는 컨테이너
        const btnContainer = document.createElement('div');
        btnContainer.className = 'stage-btn-container';

        const btn = document.createElement('button');
        btn.className = 'stage-btn';
        btn.textContent = stage.exam ? (stage.examName || `시험`) : `${stage.id}`;

        if (stage.exam) btn.classList.add('exam');
        if (isStageCleared(stage.id)) btn.classList.add('cleared');
        if (!canPlayStage(stage.id)) {
            btn.classList.add('locked');
            btn.disabled = true;
        }

        btn.onclick = () => startStage(stage.id);

        const statusText = document.createElement('span');
        statusText.className = 'stage-status';
        if (isStageCleared(stage.id)) {
            statusText.textContent = '완료';
        } else if (!canPlayStage(stage.id)) {
            statusText.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                </svg>
            `;
        } else {
            statusText.textContent = '도전';
        }

        btnContainer.appendChild(btn);
        btnContainer.appendChild(statusText);

        // 스테이지 정보
        const infoContainer = document.createElement('div');
        infoContainer.className = 'stage-info';

        let targetText = '';
        if (stage.target === 'random') {
            targetText = `${stage.targetRange[0]}~${stage.targetRange[1]}초`;
        } else {
            targetText = `${stage.target}초`;
        }
        infoContainer.textContent = targetText;

        item.appendChild(btnContainer);
        item.appendChild(infoContainer);
        grid.appendChild(item);
    });

    document.getElementById('progress').textContent = progress.cleared.length;

    const completedCount = stats.completedMissions.length;
    const currentMedal = getCurrentMedal(completedCount);
    const medalDisplay = document.getElementById('medalDisplay');

    if (currentMedal) {
        const medal = medals[currentMedal];
        medalDisplay.textContent = `${medal.emoji} ${medal.name} 메달 (미션 ${completedCount}/${missions.length})`;
    } else {
        medalDisplay.textContent = `메달 없음 (미션 ${completedCount}/${missions.length})`;
    }

    applySkin(getCurrentSkin());
}

// 스테이지 시작
function startStage(stageId) {
    currentStage = stages.find(s => s.id === stageId);
    if (!currentStage) return;

    gameState.running = false;
    gameState.startTime = 0;
    gameState.currentTime = 0;
    if (gameState.animationId) {
        cancelAnimationFrame(gameState.animationId);
    }

    if (currentStage.target === 'random') {
        const min = currentStage.targetRange[0];
        const max = currentStage.targetRange[1];
        gameState.actualTarget = Math.floor(Math.random() * (max - min + 1)) + min;
    } else {
        gameState.actualTarget = currentStage.target;
    }

    if (currentStage.multi) {
        gameState.multiTargets = Array.isArray(currentStage.multi) ?
            [...currentStage.multi] :
            generateRandomMultiTargets();
        gameState.multiResults = [];
        gameState.currentMultiIndex = 0;
    } else {
        gameState.multiTargets = [];
    }

    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('stopBtn').style.display = 'none';
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('backBtn').disabled = false;

    showScreen('gameScreen');
    updateGameUI();
}

function generateRandomMultiTargets() {
    const count = Math.floor(Math.random() * 8) + 5;
    const targets = [];
    for (let i = 0; i < count; i++) {
        const target = (Math.floor(Math.random() * 110) + 10) * 0.5;
        targets.push(target);
    }
    return targets.sort((a, b) => a - b);
}

// 게임 UI 업데이트
function updateGameUI() {
    const stageName = document.getElementById('stageName');
    const stageDesc = document.getElementById('stageDesc');
    const multiTargets = document.getElementById('multiTargets');

    if (currentStage.exam) {
        stageName.textContent = currentStage.examName || `시험 ${currentStage.id}`;
    } else {
        stageName.textContent = `스테이지 ${currentStage.id}`;
    }

    let desc = '';
    if (currentStage.multi) {
        desc = `${gameState.actualTarget}초 동안 ${gameState.multiTargets.join(', ')}초에 정확히 클릭하세요!`;
        multiTargets.style.display = 'block';
        multiTargets.innerHTML = gameState.multiTargets.map((t, i) => `
            <div class="target-item" id="target-${i}">
                <span>${t}초</span>
                <span>대기중</span>
            </div>
        `).join('');
    } else {
        desc = `${currentStage.target === 'random' ? gameState.actualTarget : currentStage.target}초를 정확히 맞춰보세요!`;
        if (currentStage.margin > 0) desc += ` (오차범위 ±${currentStage.margin}초)`;
        if (currentStage.hideAfter) desc += ` (${currentStage.hideAfter}초 후 타이머 숨김)`;
        multiTargets.style.display = 'none';
    }

    stageDesc.textContent = desc;

    const timerText = document.getElementById('timerText');
    timerText.textContent = '0.000';
    timerText.classList.remove('hidden');

    const progressBar = document.getElementById('progressBar');
    progressBar.style.strokeDasharray = CIRCLE_CIRCUMFERENCE;
    progressBar.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
}

// 타이머 업데이트
function updateTimer() {
    if (!gameState.running) return;

    gameState.currentTime = (performance.now() - gameState.startTime) / 1000;
    const timerText = document.getElementById('timerText');
    const progressBar = document.getElementById('progressBar');

    if (currentStage.hideAfter && gameState.currentTime > currentStage.hideAfter) {
        timerText.textContent = '??.??';
        timerText.classList.add('hidden');
    } else {
        timerText.textContent = gameState.currentTime.toFixed(3);
        timerText.classList.remove('hidden');
    }

    const progress = Math.min(gameState.currentTime / gameState.actualTarget, 1);
    const offset = CIRCLE_CIRCUMFERENCE - (progress * CIRCLE_CIRCUMFERENCE);
    progressBar.style.strokeDashoffset = offset;

    if (gameState.currentTime > gameState.actualTarget + 5) {
        stopTimer();
        return;
    }

    gameState.animationId = requestAnimationFrame(updateTimer);
}

function stopTimer() {
    if (!gameState.running) return;

    gameState.running = false;
    cancelAnimationFrame(gameState.animationId);

    if (currentStage.multi) {
        recordMultiTarget();
    } else {
        showResult();
    }
}

// 멀티 타겟 기록
function recordMultiTarget() {
    const targetTime = gameState.multiTargets[gameState.currentMultiIndex];
    const diff = Math.abs(gameState.currentTime - targetTime);
    const success = currentStage.margin === 0 ?
        diff < 0.01 :
        diff <= currentStage.margin;

    gameState.multiResults.push({
        target: targetTime,
        actual: gameState.currentTime,
        diff: diff,
        success: success
    });

    const targetEl = document.getElementById(`target-${gameState.currentMultiIndex}`);
    if (targetEl) {
        targetEl.classList.add(success ? 'success' : 'fail');
        targetEl.querySelector('span:last-child').textContent =
            `${gameState.currentTime.toFixed(3)}초 (${success ? '성공' : '실패'})`;
    }

    gameState.currentMultiIndex++;

    if (gameState.currentMultiIndex >= gameState.multiTargets.length || !success) {
        showResult();
    } else {
        document.getElementById('stopBtn').disabled = false;
        gameState.running = true;
        updateTimer();
    }
}

// 결과 표시
function showResult() {
    let success = false;
    let detail = '';
    let diff = 0;

    if (currentStage.multi) {
        success = gameState.multiResults.every(r => r.success);
        detail = gameState.multiResults.map(r =>
            `${r.target}초: ${r.actual.toFixed(3)}초 (오차 ${r.diff.toFixed(3)}초) - ${r.success ? '✅' : '❌'}`
        ).join('<br>');
        diff = success ? 0 : 999;
    } else {
        diff = Math.abs(gameState.currentTime - gameState.actualTarget);
        success = currentStage.margin === 0 ?
            diff < 0.01 :
            diff <= currentStage.margin;

        detail = `목표: ${gameState.actualTarget}초<br>
                 기록: ${gameState.currentTime.toFixed(3)}초<br>
                 오차: ${diff.toFixed(3)}초`;
    }

    updateStats(success, diff);

    if (currentStage.repeatCount && !success) {
        detail += `<br><br>시험 실패! 다시 도전하세요.`;
    }

    const resultCard = document.getElementById('resultCard');
    const resultIcon = document.getElementById('resultIcon');
    const resultTitle = document.getElementById('resultTitle');
    const resultDetail = document.getElementById('resultDetail');
    const nextBtn = document.getElementById('nextBtn');

    resultCard.className = 'result-card ' + (success ? 'success' : 'fail');
    resultIcon.textContent = success ? '✅' : '❌';
    resultTitle.textContent = success ? '성공!' : '실패!';
    resultDetail.innerHTML = detail;

    if (success) {
        saveProgress(currentStage.id);
        if (currentStage.id < stages.length) {
            nextBtn.style.display = 'inline-block';
        } else {
            nextBtn.style.display = 'none';
        }
    } else {
        nextBtn.style.display = 'none';
    }

    showScreen('resultScreen');
}

// 스킨 화면
function showSkinScreen() {
    const stats = getStats();
    const completedCount = stats.completedMissions.length;
    const currentMedal = getCurrentMedal(completedCount);
    const unlockedSkins = getUnlockedSkins(currentMedal);
    const currentSkinId = getCurrentSkin();

    const currentMedalEl = document.getElementById('currentMedal');
    if (currentMedal) {
        const medal = medals[currentMedal];
        currentMedalEl.textContent = `${medal.emoji} ${medal.name}`;
    } else {
        currentMedalEl.textContent = '없음';
    }

    const skinGrid = document.getElementById('skinGrid');
    skinGrid.innerHTML = skins.map(skin => {
        const unlocked = unlockedSkins.includes(skin);
        const active = skin.id === currentSkinId;

        let unlockText = '';
        if (!unlocked && skin.unlockMedal) {
            const medal = medals[skin.unlockMedal];
            unlockText = `${medal.emoji} ${medal.name} 필요`;
        }

        return `
            <div class="skin-card ${active ? 'active' : ''} ${!unlocked ? 'locked' : ''}"
                 onclick="${unlocked ? `selectSkin('${skin.id}')` : ''}">
                ${!unlocked ? '<div class="skin-locked-icon">🔒</div>' : ''}
                <div class="skin-preview" style="background: ${skin.colors.bg}"></div>
                <div class="skin-name">${skin.name}</div>
                <div class="skin-unlock">${unlockText || (active ? '✓ 사용중' : '클릭하여 적용')}</div>
            </div>
        `;
    }).join('');

    showScreen('skinScreen');
}

function selectSkin(skinId) {
    setSkin(skinId);
    showSkinScreen();
}

// 미션 화면
function showMissionScreen() {
    const stats = getStats();
    const progress = getProgress();

    document.getElementById('totalPlays').textContent = stats.totalPlays;
    document.getElementById('perfectCount').textContent = stats.perfectCount;
    document.getElementById('maxCombo').textContent = stats.maxCombo;

    const missionList = document.getElementById('missionList');
    missionList.innerHTML = missions.map(mission => {
        const completed = stats.completedMissions.includes(mission.id);
        let current = 0;

        switch(mission.type) {
            case 'play_count':
                current = stats.totalPlays;
                break;
            case 'perfect_timing':
                current = stats.perfectCount;
                break;
            case 'combo':
                current = stats.maxCombo;
                break;
            case 'stage_clear':
                current = progress.cleared.length;
                break;
        }

        const progressPercent = Math.min((current / mission.target) * 100, 100);

        return `
            <div class="mission-item ${completed ? 'completed' : ''}">
                ${completed ? '<div class="mission-completed-badge">완료</div>' : ''}
                <div class="mission-header">
                    <div class="mission-title">${mission.title}</div>
                    <div class="mission-reward">${mission.reward}</div>
                </div>
                <div class="mission-description">${mission.description}</div>
                <div class="mission-progress">
                    <div class="mission-progress-bar" style="width: ${progressPercent}%"></div>
                    <div class="mission-progress-text">${current} / ${mission.target}</div>
                </div>
            </div>
        `;
    }).join('');

    showScreen('missionScreen');
}

// 이벤트 리스너
document.addEventListener('DOMContentLoaded', () => {
    // 타이머 시작
    document.getElementById('startBtn').onclick = () => {
        gameState.running = true;
        gameState.startTime = performance.now();
        gameState.currentTime = 0;

        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('stopBtn').style.display = 'inline-block';
        document.getElementById('stopBtn').disabled = false;
        document.getElementById('backBtn').disabled = true;

        updateTimer();
    };

    // 타이머 정지
    document.getElementById('stopBtn').onclick = stopTimer;

    // 버튼 이벤트
    document.getElementById('backBtn').onclick = () => {
        if (gameState.running) {
            if (!confirm('게임을 종료하고 메인으로 돌아가시겠습니까?')) return;
            gameState.running = false;
            cancelAnimationFrame(gameState.animationId);
        }
        initMainScreen();
        showScreen('mainScreen');
    };

    document.getElementById('retryBtn').onclick = () => {
        startStage(currentStage.id);
    };

    document.getElementById('nextBtn').onclick = () => {
        if (currentStage.id < stages.length) {
            startStage(currentStage.id + 1);
        }
    };

    document.getElementById('homeBtn').onclick = () => {
        initMainScreen();
        showScreen('mainScreen');
    };

    // 미션 화면
    document.getElementById('missionBtn').onclick = () => {
        showMissionScreen();
    };

    document.getElementById('missionBackBtn').onclick = () => {
        showScreen('mainScreen');
    };

    // 스킨 화면
    document.getElementById('skinBtn').onclick = () => {
        showSkinScreen();
    };

    document.getElementById('skinBackBtn').onclick = () => {
        initMainScreen();
        showScreen('mainScreen');
    };

    // 데이터 로드 및 초기화
    loadData();
});
