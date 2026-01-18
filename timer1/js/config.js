// 게임 설정 및 상수
const STORAGE_KEY = 'timerGameProgress';
const STATS_KEY = 'timerGameStats';
const SKIN_KEY = 'timerGameSkin';
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 90; // r=90

// 스킨 데이터
const skins = [
    {
        id: 'default',
        name: '기본',
        unlockMedal: null,
        colors: {
            bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            circle: '#ffffff',
            circleBg: 'rgba(255,255,255,0.2)',
            timer: '#ffffff'
        }
    },
    {
        id: 'sunset',
        name: '석양',
        unlockMedal: 'silver',
        colors: {
            bg: 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)',
            circle: '#ffffff',
            circleBg: 'rgba(255,255,255,0.2)',
            timer: '#ffffff'
        }
    },
    {
        id: 'ocean',
        name: '바다',
        unlockMedal: 'silver',
        colors: {
            bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            circle: '#ffffff',
            circleBg: 'rgba(255,255,255,0.2)',
            timer: '#ffffff'
        }
    },
    {
        id: 'forest',
        name: '숲',
        unlockMedal: 'gold',
        colors: {
            bg: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)',
            circle: '#ffffff',
            circleBg: 'rgba(255,255,255,0.2)',
            timer: '#ffffff'
        }
    },
    {
        id: 'night',
        name: '밤하늘',
        unlockMedal: 'gold',
        colors: {
            bg: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
            circle: '#ffd700',
            circleBg: 'rgba(255,215,0,0.2)',
            timer: '#ffd700'
        }
    },
    {
        id: 'neon',
        name: '네온',
        unlockMedal: 'diamond',
        colors: {
            bg: 'linear-gradient(135deg, #ff00cc 0%, #3333ff 100%)',
            circle: '#00ffff',
            circleBg: 'rgba(0,255,255,0.2)',
            timer: '#00ffff'
        }
    },
    {
        id: 'gold',
        name: '황금',
        unlockMedal: 'diamond',
        colors: {
            bg: 'linear-gradient(135deg, #f09819 0%, #edde5d 100%)',
            circle: '#ffffff',
            circleBg: 'rgba(255,255,255,0.3)',
            timer: '#ffffff'
        }
    }
];

// 메달 시스템
const medals = {
    bronze: { name: '브론즈', emoji: '🥉', requiredMissions: 3 },
    silver: { name: '실버', emoji: '🥈', requiredMissions: 7 },
    gold: { name: '골드', emoji: '🥇', requiredMissions: 11 },
    diamond: { name: '다이아몬드', emoji: '💎', requiredMissions: 15 }
};
