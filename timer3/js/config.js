// 게임 설정 및 상수
const STORAGE_KEY = 'timerGameData';
const SKIN_KEY = 'timerGameSkin';
const EFFECTS_KEY = 'timerGameEffects';
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 90; // r=90

// 기존 타이머 효과 데이터
const effects = [
    {
        id: 'particle',
        name: '파티클',
        description: '타이머 주변에 빛나는 입자 효과',
        unlockMission: null,
        preview: '✨'
    },
    {
        id: 'ripple',
        name: '파장',
        description: '타이머 원에서 퍼져나가는 파장 효과',
        unlockMission: null,
        preview: '🌊'
    }
];

// 클릭 효과 데이터 (전역 터치/클릭 이펙트)
const clickEffects = [
    {
        id: 'sparkle',
        name: '반짝임',
        description: '별이 반짝이며 퍼져나감',
        unlockMission: null,  // 테스트용 해금
        preview: '✨'
    },
    {
        id: 'ripple',
        name: '파장',
        description: '동그란 물결이 퍼져나감',
        unlockMission: null,
        preview: '🌊'
    },
    {
        id: 'particle',
        name: '파티클',
        description: '입자들이 사방으로 튀어나감',
        unlockMission: null,
        preview: '💫'
    },
    {
        id: 'heart',
        name: '하트',
        description: '하트가 위로 떠오르며 사라짐',
        unlockMission: null,
        preview: '❤️'
    },
    {
        id: 'fire',
        name: '불꽃',
        description: '스파크가 튀는 효과',
        unlockMission: null,
        preview: '🔥'
    },
    {
        id: 'petal',
        name: '꽃잎',
        description: '꽃잎이 흩날림',
        unlockMission: null,
        preview: '🌸'
    },
    {
        id: 'bubble',
        name: '버블',
        description: '비눗방울이 올라감',
        unlockMission: null,
        preview: '🫧'
    },
    {
        id: 'snow',
        name: '눈송이',
        description: '눈 결정이 흩날림',
        unlockMission: null,
        preview: '❄️'
    },
    {
        id: 'electric',
        name: '전기',
        description: '번개/전기 스파크',
        unlockMission: null,
        preview: '⚡'
    },
    {
        id: 'ink',
        name: '잉크',
        description: '잉크가 퍼지는 효과',
        unlockMission: null,
        preview: '🎨'
    },
    {
        id: 'rainbow',
        name: '무지개',
        description: '무지개 색 파장',
        unlockMission: null,
        preview: '🌈'
    },
    {
        id: 'neon',
        name: '네온',
        description: '네온 빛 링',
        unlockMission: null,
        preview: '🔮'
    }
];

// 스킨 데이터 (배경 테마)
const skins = [
    {
        id: 'default',
        name: '기본',
        unlockMedal: null,
        colors: {
            bg: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            circle: '#2c3e50',
            circleBg: 'rgba(44,62,80,0.2)',
            timer: '#2c3e50'
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
