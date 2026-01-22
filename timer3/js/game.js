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
            fetch('data/stages-grouped.json'),
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

    // 프로그레스 바는 무지개 그라데이션 사용 (CSS에서 설정)

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

function getUnlockedSkins() {
    return skins;
}

// 게임 데이터 관리 (통합)
function getGameData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const defaultData = {
        stages: {},
        totalPlays: 0,
        perfectCount: 0,
        currentCombo: 0,
        maxCombo: 0,
        // 새로운 필드들
        perfectCombo: 0,        // 오차 0.01 이하 현재 연속
        maxPerfectCombo: 0,     // 오차 0.01 이하 최대 연속
        dailyPlays: {},         // 일일 플레이 { 'YYYY-MM-DD': count }
        maxDailyPlays: 0,       // 최대 일일 플레이
        luckyAchieved: false,   // 7.777초 달성 여부
        zeroDiffAchieved: false, // 오차 0 달성 여부
        firstTryAchieved: false, // 첫 시도 0.05 이하 달성 여부
        completedMissions: []
    };

    if (saved) {
        const data = JSON.parse(saved);
        // 기존 데이터에 새 필드가 없으면 추가
        return { ...defaultData, ...data };
    }
    return defaultData;
}

// 오늘 날짜 문자열 반환
function getTodayString() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function saveGameData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function updateStats(stageId, success, diff, stoppedTime) {
    const data = getGameData();
    const today = getTodayString();
    const roundedDiff = Math.round(diff * 1000) / 1000;

    // 스테이지별 상세 기록
    if (!data.stages[stageId]) {
        data.stages[stageId] = {
            attempts: 0,
            successes: 0,
            failures: 0,
            bestDiff: null,
            failuresBeforeSuccess: 0  // 성공 전 실패 횟수
        };
    }

    const stageData = data.stages[stageId];
    const wasCleared = stageData.successes > 0;  // 이미 클리어한 스테이지인지
    stageData.attempts++;

    if (success) {
        // 첫 시도 성공 체크 (이전에 시도한 적 없고, 오차 0.05 이하)
        if (stageData.attempts === 1 && roundedDiff <= 0.05 && !data.firstTryAchieved) {
            data.firstTryAchieved = true;
        }

        stageData.successes++;
        if (stageData.bestDiff === null || roundedDiff < stageData.bestDiff) {
            stageData.bestDiff = roundedDiff;
        }
    } else {
        stageData.failures++;
        // 성공 전 실패만 카운트
        if (!wasCleared) {
            stageData.failuresBeforeSuccess++;
        }
    }

    // 전체 통계
    data.totalPlays++;

    // 일일 플레이 업데이트
    if (!data.dailyPlays[today]) {
        data.dailyPlays[today] = 0;
    }
    data.dailyPlays[today]++;
    if (data.dailyPlays[today] > data.maxDailyPlays) {
        data.maxDailyPlays = data.dailyPlays[today];
    }

    if (success) {
        data.currentCombo++;
        if (data.currentCombo > data.maxCombo) {
            data.maxCombo = data.currentCombo;
        }

        // 완벽 연속 (오차 0.01 이하)
        if (roundedDiff <= 0.01) {
            data.perfectCount++;
            data.perfectCombo++;
            if (data.perfectCombo > data.maxPerfectCombo) {
                data.maxPerfectCombo = data.perfectCombo;
            }
        } else {
            data.perfectCombo = 0;
        }

        // 오차 0 달성 체크
        if (roundedDiff === 0 && !data.zeroDiffAchieved) {
            data.zeroDiffAchieved = true;
        }
    } else {
        data.currentCombo = 0;
        data.perfectCombo = 0;
    }

    // 럭키 7.777 체크
    if (stoppedTime !== undefined) {
        const roundedTime = Math.round(stoppedTime * 1000) / 1000;
        if (roundedTime === 7.777 && !data.luckyAchieved) {
            data.luckyAchieved = true;
        }
    }

    saveGameData(data);
    checkMissions(data);
}

// 빙고 라인 정의 (0-indexed, 3x3 그리드)
const BINGO_LINES = [
    [0, 1, 2], // 가로 1
    [3, 4, 5], // 가로 2
    [6, 7, 8], // 가로 3
    [0, 3, 6], // 세로 1
    [1, 4, 7], // 세로 2
    [2, 5, 8], // 세로 3
    [0, 4, 8], // 대각 1
    [2, 4, 6]  // 대각 2
];

// 그룹별 빙고 체크
function checkGroupBingo(groupNum, data) {
    const groupStages = stages.filter(s => s.group === groupNum && !s.exam);
    if (groupStages.length !== 9) return { lines: 0, isAllBingo: false };

    // 각 스테이지의 bestDiff 가져오기
    const diffs = groupStages.map(s => {
        const stageData = data.stages[s.id];
        return stageData?.bestDiff;
    });

    let bingoLines = 0;

    // 각 빙고 라인 체크
    BINGO_LINES.forEach(line => {
        const [a, b, c] = line;
        // 세 스테이지 모두 클리어되어 있고 (bestDiff가 null이 아님)
        // 세 스테이지의 오차가 모두 같아야 함
        if (diffs[a] !== null && diffs[b] !== null && diffs[c] !== null &&
            diffs[a] === diffs[b] && diffs[b] === diffs[c]) {
            bingoLines++;
        }
    });

    // 올빙고 체크: 9개 모두 클리어 + 모든 오차가 같음
    const allCleared = diffs.every(d => d !== null);
    const allSame = allCleared && diffs.every(d => d === diffs[0]);

    return {
        lines: bingoLines,
        isAllBingo: allSame
    };
}

// 전체 빙고 줄 수 계산
function getTotalBingoLines(data) {
    let totalLines = 0;
    const groupNums = [...new Set(stages.map(s => s.group))];

    groupNums.forEach(groupNum => {
        const result = checkGroupBingo(groupNum, data);
        totalLines += result.lines;
    });

    return totalLines;
}

// 올빙고 개수 계산
function getAllBingoCount(data) {
    let count = 0;
    const groupNums = [...new Set(stages.map(s => s.group))];

    groupNums.forEach(groupNum => {
        const result = checkGroupBingo(groupNum, data);
        if (result.isAllBingo) count++;
    });

    return count;
}

// 클리어한 그룹 수 계산
function getClearedGroupCount() {
    const groupNums = [...new Set(stages.map(s => s.group))];
    let count = 0;
    groupNums.forEach(groupNum => {
        if (isGroupCompleted(groupNum)) count++;
    });
    return count;
}

// 최대 스테이지 실패 횟수 (성공 전)
function getMaxStageFailures(data) {
    let maxFailures = 0;

    Object.values(data.stages).forEach(stageData => {
        if (stageData.failuresBeforeSuccess > maxFailures) {
            maxFailures = stageData.failuresBeforeSuccess;
        }
    });

    return maxFailures;
}

function checkMissions(data) {
    const today = getTodayString();
    const todayPlays = data.dailyPlays[today] || 0;
    const totalBingoLines = getTotalBingoLines(data);
    const allBingoCount = getAllBingoCount(data);
    const clearedGroupCount = getClearedGroupCount(data);
    const maxStageFailures = getMaxStageFailures(data);

    missions.forEach(mission => {
        if (data.completedMissions.includes(mission.id)) return;

        let completed = false;

        switch(mission.type) {
            case 'play_count':
                completed = data.totalPlays >= mission.target;
                break;
            case 'daily_play':
                completed = todayPlays >= mission.target;
                break;
            case 'bingo':
                completed = totalBingoLines >= mission.target;
                break;
            case 'perfect_combo':
                completed = data.maxPerfectCombo >= mission.target;
                break;
            case 'group_clear':
                completed = clearedGroupCount >= mission.target;
                break;
            case 'lucky':
                completed = data.luckyAchieved;
                break;
            case 'all_bingo':
                completed = allBingoCount >= mission.target;
                break;
            case 'stage_fail':
                completed = maxStageFailures >= mission.target;
                break;
            case 'first_try':
                completed = data.firstTryAchieved;
                break;
            case 'zero_diff':
                completed = data.zeroDiffAchieved;
                break;
        }

        if (completed && !data.completedMissions.includes(mission.id)) {
            data.completedMissions.push(mission.id);
            saveGameData(data);
            showMissionComplete(mission);
        }
    });
}

function getClearedCount(data) {
    return Object.values(data.stages).filter(s => s.successes > 0).length;
}

function showMissionComplete(mission) {
    const msg = `🎉 미션 완료!\n${mission.reward} ${mission.title}`;
    setTimeout(() => alert(msg), 100);
}

// 스테이지 클리어 여부
function isStageCleared(stageId) {
    const data = getGameData();
    return data.stages[stageId]?.successes > 0;
}

// 구간의 일반 스테이지 ID 목록 반환
function getSectionStages(examId) {
    const examIndex = stages.findIndex(s => s.id === examId);
    if (examIndex === -1) return [];

    const sectionStages = [];
    for (let i = examIndex - 1; i >= 0; i--) {
        if (stages[i].exam) break;
        sectionStages.unshift(stages[i].id);
    }
    return sectionStages;
}

// 구간의 클리어 개수 반환
function getSectionProgress(examId) {
    const sectionStages = getSectionStages(examId);
    const clearedCount = sectionStages.filter(id => isStageCleared(id)).length;
    return { cleared: clearedCount, total: sectionStages.length };
}

// 그룹 완료 여부 확인 (시험까지 모두 클리어)
function isGroupCompleted(groupNum) {
    const groupStages = stages.filter(s => s.group === groupNum);
    const examStage = groupStages.find(s => s.exam);

    // 시험 스테이지가 클리어되었으면 그룹 완료
    if (examStage && isStageCleared(examStage.id)) {
        return true;
    }
    return false;
}

function canPlayStage() {
    return true;
}

// 화면 전환
function showScreen(screenId, addToHistory = true) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');

    // 히스토리에 추가
    if (addToHistory) {
        history.pushState({ screen: screenId }, '', `#${screenId}`);
    }
}

// 메인 화면 초기화
function initMainScreen() {
    const container = document.getElementById('stageGrid');
    const data = getGameData();

    container.innerHTML = '';

    // 그룹별로 스테이지 분류
    const groups = {};
    stages.forEach(stage => {
        if (!groups[stage.group]) {
            groups[stage.group] = [];
        }
        groups[stage.group].push(stage);
    });

    // 각 그룹 렌더링
    Object.keys(groups).sort((a, b) => a - b).forEach(groupNum => {
        const groupStages = groups[groupNum];
        const normalStages = groupStages.filter(s => !s.exam);
        const examStage = groupStages.find(s => s.exam);

        // 그룹 컨테이너
        const groupContainer = document.createElement('div');
        groupContainer.className = 'stage-group';

        // 그룹 완료 시 특별 스타일 적용
        if (isGroupCompleted(parseInt(groupNum))) {
            groupContainer.classList.add('group-completed');
        }

        // 그룹 헤더
        const groupHeader = document.createElement('div');
        groupHeader.className = 'group-header';
        groupHeader.textContent = `구간 ${groupNum}`;
        groupContainer.appendChild(groupHeader);

        // 3x3 그리드 (일반 스테이지)
        const gridList = document.createElement('ul');
        gridList.className = 'stage-grid';

        normalStages.forEach(stage => {
            const item = document.createElement('li');
            item.className = 'stage-item';

            const btnContainer = document.createElement('div');
            btnContainer.className = 'stage-btn-container';

            const btn = document.createElement('button');
            btn.className = 'stage-btn';

            // 목표 시간 표시
            let btnText = '';
            let targetValue = 0;
            if (stage.target === 'random') {
                btnText = `${stage.targetRange[0]}-${stage.targetRange[1]}`;
                targetValue = (stage.targetRange[0] + stage.targetRange[1]) / 2;
            } else {
                btnText = `${stage.target}`;
                targetValue = stage.target;
            }

            // SVG 원형 프로그레스 링 추가
            const maxTarget = 20;
            const progress = Math.min(targetValue / maxTarget, 1);
            const circumference = 2 * Math.PI * 22; // r=22
            const offset = circumference - (progress * circumference);

            btn.innerHTML = `
                <svg class="stage-progress-ring" viewBox="0 0 50 50">
                    <circle class="stage-ring-bg" cx="25" cy="25" r="22"></circle>
                    <circle class="stage-ring-progress" cx="25" cy="25" r="22"
                            style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset};"></circle>
                </svg>
                <span class="stage-number">${btnText}</span>
            `;

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
            item.appendChild(btnContainer);
            gridList.appendChild(item);
        });

        groupContainer.appendChild(gridList);

        // 시험 버튼
        if (examStage) {
            const examContainer = document.createElement('div');
            examContainer.className = 'exam-container';

            const examBtn = document.createElement('button');
            examBtn.className = 'stage-btn exam';
            examBtn.textContent = examStage.examName || `시험 ${groupNum}`;

            if (isStageCleared(examStage.id)) examBtn.classList.add('cleared');
            if (!canPlayStage(examStage.id)) {
                examBtn.classList.add('locked');
                examBtn.disabled = true;
            }

            examBtn.onclick = () => startStage(examStage.id);

            const examStatus = document.createElement('span');
            examStatus.className = 'exam-status';

            if (isStageCleared(examStage.id)) {
                examStatus.textContent = '완료';
            } else if (canPlayStage(examStage.id)) {
                examStatus.textContent = '도전 가능';
            } else {
                const sectionProgress = getSectionProgress(examStage.id);
                examStatus.textContent = `${sectionProgress.cleared}/${sectionProgress.total} 클리어`;
            }

            examContainer.appendChild(examBtn);
            examContainer.appendChild(examStatus);
            groupContainer.appendChild(examContainer);
        }

        container.appendChild(groupContainer);
    });

    document.getElementById('progress').textContent = getClearedCount(data);

    const completedCount = data.completedMissions.length;
    const currentMedal = getCurrentMedal(completedCount);
    const medalDisplay = document.getElementById('medalDisplay');

    if (currentMedal) {
        const medal = medals[currentMedal];
        medalDisplay.textContent = `${medal.emoji} ${medal.name} 메달 (미션 ${completedCount}/${missions.length})`;
    } else {
        medalDisplay.textContent = `메달 없음 (미션 ${completedCount}/${missions.length})`;
    }

    // applySkin(getCurrentSkin());
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

    let descHtml = '';
    if (currentStage.multi) {
        descHtml = `<span class="highlight-time">${gameState.actualTarget}초</span> 동안 ${gameState.multiTargets.join(', ')}초에 정확히 클릭하세요!`;
        multiTargets.style.display = 'block';
        multiTargets.innerHTML = gameState.multiTargets.map((t, i) => `
            <div class="target-item" id="target-${i}">
                <span>${t}초</span>
                <span>대기중</span>
            </div>
        `).join('');
    } else {
        const targetTime = currentStage.target === 'random' ? gameState.actualTarget : currentStage.target;
        descHtml = `<span class="highlight-time">${targetTime}초</span>를 정확히 맞춰보세요!`;
        if (currentStage.margin > 0) descHtml += ` (오차범위 ±${currentStage.margin}초)`;
        if (currentStage.hideAfter) descHtml += ` (${currentStage.hideAfter}초 후 타이머 숨김)`;
        multiTargets.style.display = 'none';
    }

    stageDesc.innerHTML = descHtml;

    const timerText = document.getElementById('timerText');
    timerText.innerHTML = '<span class="integer">0</span><span class="decimal">.000</span>';
    timerText.classList.remove('hidden');

    const progressBar = document.getElementById('progressBar');
    progressBar.style.strokeDasharray = CIRCLE_CIRCUMFERENCE;
    progressBar.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
    progressBar.style.opacity = 0.3; // 초기 투명도 설정
}

// 타이머 업데이트
function updateTimer() {
    if (!gameState.running) return;

    gameState.currentTime = Math.floor((performance.now() - gameState.startTime)) / 1000;
    const timerText = document.getElementById('timerText');
    const progressBar = document.getElementById('progressBar');

    const isHidden = currentStage.hideAfter && gameState.currentTime > currentStage.hideAfter;

    const timeStr = gameState.currentTime.toFixed(3);
    const [intPart, decPart] = timeStr.split('.');
    timerText.innerHTML = `<span class="integer">${intPart}</span><span class="decimal">.${decPart}</span>`;

    if (isHidden) {
        timerText.classList.add('hidden');
        progressBar.classList.add('hidden');
    } else {
        timerText.classList.remove('hidden');
        progressBar.classList.remove('hidden');
    }

    const progress = Math.min(gameState.currentTime / gameState.actualTarget, 1);
    const offset = CIRCLE_CIRCUMFERENCE - (progress * CIRCLE_CIRCUMFERENCE);
    progressBar.style.strokeDashoffset = offset;

    // 프로그레스 바 투명도 그라데이션 효과 (연한색 → 진한색)
    if (!isHidden) {
        const opacity = 0.3 + (progress * 0.7); // 0.3 ~ 1.0
        progressBar.style.opacity = opacity;
    } else {
        progressBar.style.opacity = 0;
    }

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
        diff === 0 :
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
            diff === 0 :
            diff <= currentStage.margin;

        detail = `목표: ${gameState.actualTarget}초<br>
                 기록: ${gameState.currentTime.toFixed(3)}초<br>
                 오차: ${diff.toFixed(3)}초`;
    }

    updateStats(currentStage.id, success, diff, gameState.currentTime);

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

        // 다음 플레이 가능한 스테이지 찾기
        let hasNext = false;
        for (let i = currentStage.id + 1; i <= stages.length; i++) {
            if (canPlayStage(i)) {
                hasNext = true;
                break;
            }
        }

        if (hasNext && currentStage.id < stages.length) {
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
    const data = getGameData();
    const completedCount = data.completedMissions.length;
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

// 미션별 현재 진행도 계산
function getMissionProgress(mission, data) {
    const today = getTodayString();
    const todayPlays = data.dailyPlays[today] || 0;

    switch(mission.type) {
        case 'play_count':
            return data.totalPlays;
        case 'daily_play':
            return todayPlays;
        case 'bingo':
            return getTotalBingoLines(data);
        case 'perfect_combo':
            return data.maxPerfectCombo;
        case 'group_clear':
            return getClearedGroupCount(data);
        case 'lucky':
            return data.luckyAchieved ? 1 : 0;
        case 'all_bingo':
            return getAllBingoCount(data);
        case 'stage_fail':
            return getMaxStageFailures(data);
        case 'first_try':
            return data.firstTryAchieved ? 1 : 0;
        case 'zero_diff':
            return data.zeroDiffAchieved ? 1 : 0;
        default:
            return 0;
    }
}

// 미션 타겟 값 (표시용)
function getMissionTargetDisplay(mission) {
    if (mission.type === 'lucky' || mission.type === 'first_try' || mission.type === 'zero_diff') {
        return 1;
    }
    return mission.target;
}

// 미션 화면
function showMissionScreen() {
    const data = getGameData();
    const today = getTodayString();
    const todayPlays = data.dailyPlays[today] || 0;

    document.getElementById('totalPlays').textContent = data.totalPlays;
    document.getElementById('perfectCount').textContent = data.maxPerfectCombo;
    document.getElementById('maxCombo').textContent = todayPlays;

    const missionList = document.getElementById('missionList');

    // 오픈 미션
    const openMissions = missions.filter(m => !m.hidden);
    // 히든 미션 (완료된 것만 표시)
    const completedHiddenMissions = missions.filter(m => m.hidden && data.completedMissions.includes(m.id));
    // 미완료 히든 미션 개수
    const hiddenMissionsCount = missions.filter(m => m.hidden).length;
    const unlockedHiddenCount = completedHiddenMissions.length;

    let html = '';

    // 오픈 미션 섹션
    html += '<div class="mission-section"><div class="mission-section-title">미션</div>';
    html += openMissions.map(mission => {
        const completed = data.completedMissions.includes(mission.id);
        const current = getMissionProgress(mission, data);
        const target = getMissionTargetDisplay(mission);
        const progressPercent = Math.min((current / target) * 100, 100);

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
                    <div class="mission-progress-text">${current} / ${target}</div>
                </div>
            </div>
        `;
    }).join('');
    html += '</div>';

    // 히든 미션 섹션
    html += `<div class="mission-section"><div class="mission-section-title">히든 미션 (${unlockedHiddenCount}/${hiddenMissionsCount} 발견)</div>`;

    if (completedHiddenMissions.length > 0) {
        html += completedHiddenMissions.map(mission => {
            return `
                <div class="mission-item completed hidden-mission">
                    <div class="mission-completed-badge">발견!</div>
                    <div class="mission-header">
                        <div class="mission-title">${mission.title}</div>
                        <div class="mission-reward">${mission.reward}</div>
                    </div>
                    <div class="mission-description">${mission.description}</div>
                </div>
            `;
        }).join('');
    } else {
        html += '<div class="mission-item hidden-placeholder"><div class="mission-description">아직 발견된 히든 미션이 없습니다...</div></div>';
    }

    // 미발견 히든 미션 표시 (물음표로)
    const undiscoveredCount = hiddenMissionsCount - unlockedHiddenCount;
    for (let i = 0; i < undiscoveredCount; i++) {
        html += `
            <div class="mission-item hidden-mission locked">
                <div class="mission-header">
                    <div class="mission-title">???</div>
                    <div class="mission-reward">?</div>
                </div>
                <div class="mission-description">아직 발견되지 않은 미션</div>
            </div>
        `;
    }

    html += '</div>';

    missionList.innerHTML = html;

    showScreen('missionScreen');
}

// 파티클 시계 시스템
let clockParticles = [];
let clockAnimationId = null;
let clockCanvas = null;
let clockCtx = null;

class ClockParticle {
    constructor(x, y, color) {
        this.targetX = x;
        this.targetY = y;
        // 아래 랜덤 위치에서 시작
        this.startX = Math.random() * 300;
        this.startY = 350 + Math.random() * 50;
        this.x = this.startX;
        this.y = this.startY;
        this.color = color;
        this.size = 2 + Math.random() * 1.5;

        this.arrived = false;
        this.alpha = 0;
        this.progress = 0;
        this.speed = 0.015 + Math.random() * 0.01;
    }

    update() {
        if (!this.arrived) {
            this.progress += this.speed;
            if (this.progress >= 1) {
                this.progress = 1;
                this.arrived = true;
            }
            // easeOutCubic
            const ease = 1 - Math.pow(1 - this.progress, 3);
            this.x = this.startX + (this.targetX - this.startX) * ease;
            this.y = this.startY + (this.targetY - this.startY) * ease;
            this.alpha = Math.min(1, this.progress * 1.5);
        }
    }

    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.fillStyle = this.color.replace('1)', `${this.alpha})`);
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
}

function createClockParticles(h, m, s) {
    const particles = [];
    const cx = 150, cy = 150;

    // 시계 외곽 원 (점들로 구성)
    for (let i = 0; i < 120; i++) {
        const angle = (i / 120) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * 110;
        const y = cy + Math.sin(angle) * 110;
        particles.push(new ClockParticle(x, y, 'rgba(255, 255, 255, 1)'));
    }

    // 시간 눈금 (12개)
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const len = i % 3 === 0 ? 15 : 8;
        for (let j = 0; j < len; j += 3) {
            const x = cx + Math.cos(angle) * (100 - j);
            const y = cy + Math.sin(angle) * (100 - j);
            particles.push(new ClockParticle(x, y, 'rgba(255, 255, 255, 1)'));
        }
    }

    // 시침
    const hourAngle = ((h % 12) * 30 + m * 0.5) * Math.PI / 180 - Math.PI / 2;
    for (let i = 0; i < 40; i += 4) {
        const x = cx + Math.cos(hourAngle) * i;
        const y = cy + Math.sin(hourAngle) * i;
        particles.push(new ClockParticle(x, y, 'rgba(255, 255, 255, 1)'));
    }

    // 분침
    const minuteAngle = (m * 6 + s * 0.1) * Math.PI / 180 - Math.PI / 2;
    for (let i = 0; i < 65; i += 4) {
        const x = cx + Math.cos(minuteAngle) * i;
        const y = cy + Math.sin(minuteAngle) * i;
        particles.push(new ClockParticle(x, y, 'rgba(255, 255, 255, 1)'));
    }

    // 초침
    const secondAngle = (s * 6) * Math.PI / 180 - Math.PI / 2;
    for (let i = 0; i < 80; i += 4) {
        const x = cx + Math.cos(secondAngle) * i;
        const y = cy + Math.sin(secondAngle) * i;
        particles.push(new ClockParticle(x, y, 'rgba(255, 120, 120, 1)'));
    }

    // 중앙점
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x = cx + Math.cos(angle) * 5;
        const y = cy + Math.sin(angle) * 5;
        particles.push(new ClockParticle(x, y, 'rgba(255, 255, 255, 1)'));
    }
    particles.push(new ClockParticle(cx, cy, 'rgba(255, 255, 255, 1)'));

    return particles;
}

function animateClock() {
    if (!clockCtx) return;

    clockCtx.clearRect(0, 0, 300, 300);

    let allArrived = true;
    for (let i = 0; i < clockParticles.length; i++) {
        const p = clockParticles[i];
        p.update();
        p.draw(clockCtx);
        if (!p.arrived) allArrived = false;
    }

    // 모두 도착하면 애니메이션 중지 (정적 시계 유지)
    if (!allArrived) {
        clockAnimationId = requestAnimationFrame(animateClock);
    } else {
        clockAnimationId = null;
    }
}

function startIntroClock() {
    clockCanvas = document.getElementById('particleClock');
    const digitalClock = document.getElementById('digitalClock');

    if (!clockCanvas || !digitalClock) return;

    clockCtx = clockCanvas.getContext('2d');

    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    const ms = now.getMilliseconds();

    // 파티클로 시계 생성 (아래에서 올라옴)
    clockParticles = createClockParticles(h, m, s);
    animateClock();

    // 디지털 시계
    const hourStr = String(h).padStart(2, '0');
    const minuteStr = String(m).padStart(2, '0');
    const secondStr = String(s).padStart(2, '0');
    const msStr = String(ms).padStart(3, '0');
    digitalClock.textContent = `${hourStr}:${minuteStr}:${secondStr}.${msStr}`;
}

function stopIntroClock() {
    // 애니메이션 정리
    if (clockAnimationId) {
        cancelAnimationFrame(clockAnimationId);
        clockAnimationId = null;
    }
}

// 이벤트 리스너
document.addEventListener('DOMContentLoaded', () => {
    // 인트로 시계 시작
    startIntroClock();

    // 인트로 화면 시작 버튼
    document.getElementById('startGameBtn').onclick = () => {
        stopIntroClock();
        initMainScreen();
        showScreen('mainScreen');
    };

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
        // 다음 플레이 가능한 스테이지 찾기
        for (let i = currentStage.id + 1; i <= stages.length; i++) {
            if (canPlayStage(i)) {
                startStage(i);
                return;
            }
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

    // 브라우저 뒤로가기/앞으로가기 처리
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.screen) {
            showScreen(event.state.screen, false);

            // 메인 화면으로 돌아갈 때 데이터 새로고침
            if (event.state.screen === 'mainScreen') {
                initMainScreen();
            }
        } else {
            // 히스토리가 없으면 인트로 화면으로
            showScreen('introScreen', false);
        }
    });

    // 초기 히스토리 상태 설정
    history.replaceState({ screen: 'introScreen' }, '', '#introScreen');

    // 데이터 로드 및 초기화
    loadData();
});
