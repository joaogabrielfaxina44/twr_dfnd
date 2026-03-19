const COLORS = {
    shadow: 'rgba(0,0,0,0.5)'
};

const TOWER_BASE_DATA = {
    cannon: { cost: 100, name: "Canhão de Cerco", icon: "🏹", color: "#8a2be2", range: 150, baseDmg: 60, atkS: 1000 },
    fire: { cost: 200, name: "Forja de Vulcão", icon: "🔥", color: "#ff4500", range: 120, baseDmg: 42, atkS: 1200 },
    ice: { cost: 150, name: "Pináculo de Gelo", icon: "❄️", color: "#00bfff", range: 130, baseDmg: 24, atkS: 1500 },
    lightning: { cost: 300, name: "Bobina de Raio", icon: "⚡", color: "#ffff00", range: 180, baseDmg: 28, atkS: 600 },
    magic: { cost: 400, name: "Santuário Arcano", icon: "✨", color: "#da70d6", range: 160, baseDmg: 37, atkS: 2000 },
    poison: { cost: 250, name: "Lab. de Peste", icon: "🧪", color: "#32cd32", range: 140, baseDmg: 16, atkS: 1300 }
};

const ENEMY_TYPES = {
    'normal': { hp: 50, speed: 1.2, gold: 15, size: 1.0, color: '#4caf50', icon: '👹' },
    'fast': { hp: 30, speed: 2.5, gold: 20, size: 0.8, color: '#00bcd4', icon: '🦊' },
    'tank': { hp: 200, speed: 0.6, gold: 40, size: 1.4, color: '#607d8b', icon: '🗿' },
    'spawn': { hp: 120, speed: 0.9, gold: 50, size: 1.2, color: '#9c27b0', icon: '🔮' },
    'shielded': { hp: 100, speed: 0.8, gold: 35, size: 1.1, color: '#4682b4', icon: '🛡️' },
    'miniboss': { hp: 500, speed: 0.7, gold: 200, size: 1.8, color: '#ffa500', icon: '💀' },
    'boss': { hp: 2000, speed: 0.4, gold: 500, size: 2.5, color: '#ff5722', icon: '👽' }
};

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.gold = 500;
        this.hp = 100;
        this.wave = 1;
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.particles = [];
        this.lastTime = 0;
        this.spawnTimer = 0;
        this.enemiesInWave = 10;
        this.enemiesSpawned = 0;
        this.paused = true;
        this.gameState = 'title'; // 'title', 'playing', 'gameover'
        this.vfxLayer = [];
        this.screenShake = 0;
        this.screenColorOverlay = null;
        this.overlayTimer = 0;
        this.titleOpacity = 0;
        this.titleFadeIn = true;
        this.starting = false;
        this.lastHUDState = {};
        this.activeBoss = null;
        this.autoSkip = false;
        this.waveTimer = 0; // Time since current wave started (ms)

        this.particlePool = [];
        for (let i = 0; i < 300; i++) this.particlePool.push(new Particle(0, 0, '#000'));
        this.particleIndex = 0;

        // Cache DOM Elements for performance
        this.dom = {
            gold: document.getElementById('gold-value'),
            hp: document.getElementById('hp-value'),
            wave: document.getElementById('wave-number'),
            evolutionMenu: document.getElementById('evolution-menu'),
            bossHealth: document.getElementById('boss-health-container'),
            bossName: document.getElementById('boss-name'),
            bossFill: document.getElementById('boss-hp-fill'),
            skipBtn: document.getElementById('skip-wave-btn'),
            announcement: document.getElementById('announcement'),
            annMain: document.getElementById('announcement-main'),
            annSub: document.getElementById('announcement-sub')
        };

        // --- Boss & Mini-Boss Data ---
        this.MINI_BOSS_DATA = {
            5: { name: "Golem de Seixo", skill: "shield_phys", desc: "Escudo Físico (50% Resist)" },
            15: { name: "Batedor Asa-de-Mana", skill: "rage_burst", desc: "Arremetida (Velocidade 50% HP)" },
            25: { name: "Xamã das Raízes", skill: "group_heal", desc: "Cura de Grupo" },
            35: { name: "Caranguejo de Quartzo", skill: "reflect_shell", desc: "Carapaça Refletora" },
            45: { name: "Fantasma de Cobre", skill: "intangible", desc: "Imunidade a Crowd Control" },
            55: { name: "O Tropeço", skill: "explosive_charge", desc: "Carga Explosiva ao Castelo" },
            65: { name: "Sombra Persistente", skill: "evasion_cloak", desc: "Invisibilidade Temporária" },
            75: { name: "Mestre de Engrenagens", skill: "auto_repair", desc: "Autorreparo" },
            85: { name: "Serpente de Vidro", skill: "glass_shard", desc: "Estilhaçar ao Morrer" },
            95: { name: "Vanguardista do Caos", skill: "chaos_aura", desc: "Aura de Redução de Alcance" }
        };

        this.BOSS_DATA = {
            10: { name: "Urso de Âmbar", skill: "primal_roar", desc: "Desativa torres próximas (3s)" },
            20: { name: "Víbora das Sombras", skill: "toxic_trail", desc: "Escudo para aliados no rastro" },
            30: { name: "Arquiteto de Sucata", skill: "scrap_devour", desc: "Devora projéteis para curar" },
            40: { name: "Rainha das Espinas", skill: "root_entangle", desc: "Enraíza torres" },
            50: { name: "Devorador de Éter", skill: "void_silence", desc: "Silencia habilidades Lv 5 e 7" },
            60: { name: "Parasita do Abismo", skill: "abyss_split", desc: "Divide-se ao morrer" },
            70: { name: "General Necro-Rúnico", skill: "necro_resurrection", desc: "Ressuscita últimos 10 inimigos" },
            80: { name: "Behemoth de Obsidiana", skill: "obsidian_armor", desc: "Só dano crítico Lv 7" },
            90: { name: "Avatar do Vazio", skill: "void_blink", desc: "Teletransporte (cooldown 8s)" },
            100: { name: "Eternus", skill: "apocalypse_rain", desc: "Chuva de Meteoros" }
        };

        this.LORE_DATA = {
            5: "Antigas pedras de rio que ganharam vida quando o primeiro cristal de mana caiu na água. Ele não é mau, apenas confunde o castelo com uma represa que precisa ser derrubada.",
            15: "Gárgulas esculpidas pelos antigos elfos para vigiar os céus. Com a corrupção do Vazio, elas agora caçam qualquer coisa que emita luz artificial.",
            25: "Um antigo botânico que se fundiu com a floresta para viver para sempre. Ele acredita que o seu castelo está roubando os nutrientes do solo sagrado.",
            35: "Habitante das cavernas de cristal profundas. Suas pinças de vidro podem cortar o próprio tecido da realidade, e ele foi atraído pelo som das suas torres.",
            45: "A armadura de um cavaleiro que tentou defender o Vale há mil anos. Ele não sabe que a guerra acabou e continua atacando qualquer fortificação que vê.",
            55: "Um ex-alquimista que tentou criar a poção da imortalidade, mas acabou explodindo seu laboratório. Agora ele vaga carregando barris instáveis, procurando por fogo.",
            65: "Uma fenda viva no espaço-tempo. Ela é a personificação do medo dos soldados que um dia guardaram as rotas do norte.",
            75: "Um inventor banido da cidade grande por criar máquinas 'vivas demais'. Ele quer provar que o vapor é superior à magia do seu castelo.",
            85: "Criada a partir dos espelhos de um palácio destruído. Ela reflete o ódio de todos os que foram derrotados por você antes dela.",
            95: "O porta-estandarte do exército do Vazio. Ele vem na frente para silenciar as esperanças (e as torres) antes da chegada do fim.",
            10: "O espírito da floresta personificado. Ele despertou de um sono de mil anos irritado com o barulho dos canhões e busca silenciar o Vale com suas patas de pedra.",
            20: "Uma criatura que se alimenta de luz. Ela quer envolver o seu castelo em uma noite eterna para que possa devorar a alma dos habitantes sem ser vista.",
            30: "Um amálgama de todas as torres destruídas em batalhas passadas. Ele se reconstrói usando o metal dos seus próprios inimigos e quer transformar o castelo em sucata.",
            40: "A soberana das plantas carnívoras. Ela vê os humanos como adubo de alta qualidade e planeja cobrir as muralhas do castelo com suas vinhas famintas.",
            50: "Um verme colossal que viaja entre dimensões. Ele não quer ouro ou poder, ele quer consumir a energia rúnica que mantém o seu castelo em pé.",
            60: "Uma infecção cósmica que tomou conta de uma montanha inteira. Ele se divide para garantir que, mesmo que o corpo principal morra, a praga continue.",
            70: "O rei de um império esquecido que afundou no pântano. Ele ergue seus soldados mortos porque acredita que o Vale pertence, por direito, aos que vieram antes.",
            80: "Uma força da natureza imparável nascida no coração de um vulcão. Ele é a prova de que o fogo purifica tudo, inclusive as defesas mais fortes.",
            90: "Uma projeção da mente do universo. Ele vê a existência do seu castelo como um erro lógico que precisa ser apagado através da distorção do tempo e espaço.",
            100: "O deus-serpente que criou o Vale. Ele decidir que a humanidade falhou em proteger a natureza e agora vem pessoalmente resetar o mundo, começando pela sua fortaleza."
        };

        this.BOSS_QUOTES = {
            10: "O silêncio voltará a este vale...",
            20: "A luz é um banquete para as sombras.",
            30: "Sua própria força será sua ruína.",
            40: "Vocês são apenas adubo para o meu jardim.",
            50: "Sinta a fome do infinito.",
            60: "Nós somos muitos, vocês são apenas um.",
            70: "O Vale pertence aos que já se foram.",
            80: "Cinzas à cinzas, pó ao pó.",
            90: "Erro detectado. Exclusão em andamento.",
            100: "O fim é apenas um novo começo."
        };

        this.defeatedBosses = JSON.parse(localStorage.getItem('defeatedBosses') || '[]');

        // --- Settings Management ---
        this.settings = JSON.parse(localStorage.getItem('ultraDefendersSettings') || JSON.stringify({
            bgm: 0.5,
            sfx: 0.7,
            mute: false,
            vfx: 'medium',
            screenShake: true,
            showAllRange: false
        }));

        // Load Splash Screen (Primary JPG.PNG as found in folder)
        this.splashImg = new Image();
        this.splashImg.src = 'splash.jpg.png';
        this.splashImg.onload = () => { this.titleOpacity = 1; this.titleFadeIn = true; };
        this.splashImg.onerror = () => {
            const ss = document.getElementById('start-screen');
            if (ss) ss.classList.add('fallback-bg');
            this.splashImg.src = 'splash.jpg';
            this.splashImg.onerror = () => {
                console.warn("Title image not found. Using fallback style.");
                this.titleOpacity = 1;
                this.titleFadeIn = true;
            };
        };
        // Hard fallback to make sure text appears after 500ms
        setTimeout(() => { if (this.titleOpacity === 0) this.titleOpacity = 1; }, 500);

        this.path = [
            { x: -20, y: 300 },
            { x: 100, y: 300 },
            { x: 100, y: 150 },
            { x: 350, y: 150 },
            { x: 350, y: 450 },
            { x: 650, y: 450 },
            { x: 650, y: 300 },
            { x: 820, y: 300 }
        ];

        this.selectedTowerType = null;
        this.towerToPlace = null;
        this.selectedActiveTower = null;

        this.skills = {
            arrows: { cost: 250, cooldown: 10000, lastUsed: 0 },
            fire: { cost: 500, cooldown: 15000, lastUsed: 0 },
            ice: { cost: 600, cooldown: 12000, lastUsed: 0 },
            lightning: { cost: 1000, cooldown: 20000, lastUsed: 0 },
            annihilation: { cost: 2500, cooldown: 45000, lastUsed: 0 }
        };

        this.towerLimits = { cannon: 0, fire: 0, ice: 0, lightning: 0, magic: 0, poison: 0 };
        this.towerData = TOWER_BASE_DATA;

        // --- Image Support ---
        this.images = {};
        this.spriteConfigs = { enemies: {}, towers: {}, projectiles: {} };
        
        this.loadImage = function(category, type, src, maxFrames = 1, speed = 120, drawScale = 1.0) {
            const img = new Image();
            img.src = src;
            img.crossOrigin = "Anonymous"; // Safety for dataURL
            img.onload = () => {
                const c = document.createElement('canvas');
                c.width = img.width; c.height = img.height;
                const ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imgData = ctx.getImageData(0, 0, c.width, c.height);
                const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) {
                        data[i+3] = 0; // Make transparent
                    }
                }
                ctx.putImageData(imgData, 0, 0);
                const transparentImg = new Image();
                transparentImg.src = c.toDataURL();
                transparentImg.onload = () => { this.images[type] = transparentImg; };
            };
            this.images[type] = img; // Temporary fallback
            this.spriteConfigs[category][type] = { maxFrames, speed, drawScale };
        }.bind(this);

        // --- Load Initial Assets ---
        this.loadImage('enemies', 'normal', 'assets/enemies/normal.png', 1, 120, 1.2);
        this.loadImage('enemies', 'fast', 'assets/enemies/fast.png', 1, 120, 1.2);
        this.loadImage('enemies', 'tank', 'assets/enemies/tank.png', 1, 120, 1.3);
        this.loadImage('enemies', 'spawn', 'assets/enemies/spawn.png', 1, 120, 1.3);

        // --- Subchefes (MiniBosses) ---
        this.loadImage('enemies', 'shield_phys', 'assets/enemies/golem.png', 1, 120, 1.6);
        this.loadImage('enemies', 'rage_burst', 'assets/enemies/batedor.png', 1, 120, 1.6);
        this.loadImage('enemies', 'group_heal', 'assets/enemies/xama.png', 1, 120, 1.6);
        this.loadImage('enemies', 'reflect_shell', 'assets/enemies/caranguejo.png', 1, 120, 1.6);
        this.loadImage('enemies', 'intangible', 'assets/enemies/fantasma.png', 1, 120, 1.6);
        this.loadImage('enemies', 'explosive_charge', 'assets/enemies/o_tropeco.png', 1, 120, 1.6);
        this.loadImage('enemies', 'evasion_cloak', 'assets/enemies/sombra.png', 1, 120, 1.6);
        this.loadImage('enemies', 'auto_repair', 'assets/enemies/mestre.png', 1, 120, 1.6);
        this.loadImage('enemies', 'glass_shard', 'assets/enemies/serpente.png', 1, 120, 1.6);
        this.loadImage('enemies', 'chaos_aura', 'assets/enemies/vanguardista.png', 1, 120, 1.6);

        // --- Chefões (Bosses) ---
        this.loadImage('enemies', 'primal_roar', 'assets/enemies/urso.png', 1, 120, 2.5);
        this.loadImage('enemies', 'toxic_trail', 'assets/enemies/vibora.png', 1, 120, 2.5);
        this.loadImage('enemies', 'scrap_devour', 'assets/enemies/arquiteto.png', 1, 120, 2.5);

        this.init();
        this.setupBackground();

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.togglePause();
        });

        // Start title loop immediately
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    init() {
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));

        // Touch support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleInput(touch.clientX, touch.clientY, true);
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleInput(touch.clientX, touch.clientY, false);
        }, { passive: false });

        window.addEventListener('resize', () => {
            this.updateHUD();
        });

        // Failsafe: start game on any document click ONLY if we don't have the high-end button
        // We actually want the user to click the specifically designed button now.
        // So we remove the global document click that starts the game instantly.

        this.updateHUD();
        this.applySettings();
    }

    setupBackground() {
        this.bgCanvas = document.createElement('canvas');
        this.bgCanvas.width = 800;
        this.bgCanvas.height = 600;
        const bctx = this.bgCanvas.getContext('2d');

        const generatePX = (w, h, setup) => {
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            const tx = c.getContext('2d');
            tx.imageSmoothingEnabled = false;
            setup(tx);
            return c;
        };

        // 1. Emerald Mana Carpet Ground
        const emeraldTex = generatePX(128, 128, (ctx) => {
            ctx.fillStyle = '#1b5e20'; ctx.fillRect(0, 0, 128, 128);
            for (let i = 0; i < 300; i++) {
                ctx.fillStyle = Math.random() > 0.6 ? '#00695c' : '#2e7d32';
                ctx.fillRect(Math.floor(Math.random() * 128), Math.floor(Math.random() * 128), 4, 4);
            }
            const colors = ['#ea80fc', '#b2ebf2', '#ff4081'];
            for (let i = 0; i < 40; i++) {
                ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                const x = Math.floor(Math.random() * 124), y = Math.floor(Math.random() * 124);
                ctx.fillRect(x, y, 2, 2);
            }
        });

        // 2. Rune Path
        const pathTex = generatePX(64, 64, (ctx) => {
            ctx.fillStyle = '#37474f'; ctx.fillRect(0, 0, 64, 64);
            for (let i = 0; i < 10; i++) {
                ctx.fillStyle = '#455a64';
                ctx.fillRect(Math.floor(Math.random() * 50), Math.floor(Math.random() * 50), 20, 15);
            }
            ctx.fillStyle = '#ffd700'; ctx.globalAlpha = 0.6;
            for (let i = 0; i < 5; i++) ctx.fillRect(Math.random() * 60, Math.random() * 60, 4, 2);
            ctx.globalAlpha = 1.0;
        });

        const groundPat = bctx.createPattern(emeraldTex, 'repeat');
        bctx.fillStyle = groundPat; bctx.fillRect(0, 0, 800, 600);

        const pathPat = bctx.createPattern(pathTex, 'repeat');
        bctx.lineWidth = 48; bctx.lineCap = 'round'; bctx.lineJoin = 'round';
        bctx.strokeStyle = 'rgba(0,0,0,0.3)';
        bctx.beginPath(); bctx.moveTo(this.path[0].x + 4, this.path[0].y + 4);
        this.path.forEach(p => bctx.lineTo(p.x + 4, p.y + 4)); bctx.stroke();

        bctx.strokeStyle = pathPat; bctx.lineWidth = 44;
        bctx.stroke();

        // Optimized Map Decorations (Pre-rendered)
        const decorations = [];
        for (let i = 0; i < 40; i++) {
            decorations.push({
                x: Math.random() * 800,
                y: Math.random() * 600,
                type: Math.random() < 0.3 ? '🌲' : (Math.random() < 0.6 ? '🪨' : '🍄'),
                size: 15 + Math.random() * 10,
                opacity: 0.2 + Math.random() * 0.3
            });
        }
        decorations.forEach(d => {
            bctx.font = `${d.size}px serif`;
            bctx.globalAlpha = d.opacity;
            bctx.fillText(d.type, d.x, d.y);
            bctx.globalAlpha = 1.0;
        });
    }

    updateHUD(force = false) {
        const currentGold = Math.floor(this.gold);
        const hudChanged = force ||
            currentGold !== this.lastHUDState.gold ||
            this.hp !== this.lastHUDState.hp ||
            this.wave !== this.lastHUDState.wave ||
            this.enemiesSpawned !== this.lastHUDState.spawned;

        if (!hudChanged) return;

        this.lastHUDState.gold = currentGold;
        this.lastHUDState.hp = this.hp;
        this.lastHUDState.wave = this.wave;
        this.lastHUDState.spawned = this.enemiesSpawned;

        if (this.dom.gold) this.dom.gold.innerText = currentGold;
        if (this.dom.hp) this.dom.hp.innerText = Math.max(0, this.hp);
        if (this.dom.wave) this.dom.wave.innerText = this.wave;

        Object.keys(this.towerData).forEach(type => {
            const el = document.getElementById('shop-' + type);
            if (el) {
                const canBuy = this.gold >= this.towerData[type].cost && this.towerLimits[type] < 5;
                if (canBuy) el.classList.remove('disabled');
                else el.classList.add('disabled');
            }
        });

        // Update Skills Cooldown and Cost
        const now = Date.now();
        Object.keys(this.skills).forEach(id => {
            const skill = this.skills[id];
            const btn = document.getElementById('skill-' + id);
            if (!btn) return;
            const elapsed = now - (skill.lastUsed || 0);
            const isCooldown = elapsed < skill.cooldown;
            btn.disabled = this.gold < skill.cost || isCooldown;
            const cooldownEl = document.getElementById('cooldown-' + id);
            if (cooldownEl) {
                if (isCooldown) cooldownEl.style.height = (100 - (elapsed / skill.cooldown * 100)) + '%';
                else cooldownEl.style.height = '0%';
            }
        });

        // Update Skip Wave Button state
        if (this.dom.skipBtn) {
            const skipAvailableAt = 10000;
            const canSkip = this.gameState === 'playing' && this.waveTimer >= skipAvailableAt && this.enemiesSpawned < this.enemiesInWave;
            this.dom.skipBtn.disabled = !canSkip;
            if (canSkip) this.dom.skipBtn.innerText = "SKIP WAVE";
            else if (this.enemiesSpawned >= this.enemiesInWave) this.dom.skipBtn.innerText = "CLEARED";
            else {
                const remaining = Math.ceil((skipAvailableAt - this.waveTimer) / 1000);
                this.dom.skipBtn.innerText = `SKP [${remaining}s]`;
            }
        }
    }

    start() {
        if (this.gameState === 'title' && !this.starting) {
            console.log("Game Starting...");
            this.starting = true;
            this.titleFadeIn = false;

            // Hide HTML overlay immediately to show progress
            const ss = document.getElementById('start-screen');
            if (ss) ss.style.opacity = '0';

            setTimeout(() => {
                this.gameState = 'playing';
                this.paused = false;
                if (ss) ss.style.display = 'none';
                this.lastTime = performance.now();
                this.starting = false;
                this.updateHUD(true);
                console.log("Game State: Playing");
            }, 800);
        }
    }

    handleMouseMove(e) { this.handleInput(e.clientX, e.clientY, false); }
    handleMouseDown(e) { this.handleInput(e.clientX, e.clientY, true); }

    handleInput(clientX, clientY, isClick) {
        if (!this.canvas) return;
        if (this.gameState === 'title' && isClick) { this.start(); return; }
        const rect = this.canvas.getBoundingClientRect();
        const x = (clientX - rect.left) * (800 / rect.width);
        const y = (clientY - rect.top) * (600 / rect.height);
        if (isClick) this.processClick(x, y, clientX, clientY);
        else this.towerToPlace = this.selectedTowerType ? { x, y, type: this.selectedTowerType } : null;
    }

    processClick(x, y, screenX, screenY) {
        const clickedTower = this.towers.find(t => {
            const dx = t.x - x, dy = t.y - y;
            return (dx * dx + dy * dy) < 625; // 25^2
        });
        if (clickedTower) {
            this.selectedActiveTower = clickedTower;
            this.showUpgradeMenu();
            this.selectTowerType(null);
            return;
        }
        if (this.selectedTowerType) {
            const data = this.towerData[this.selectedTowerType];
            if (this.gold >= data.cost && this.towerLimits[this.selectedTowerType] < 5 && !this.isNearPath(x, y, 40) && !this.isOverlappingTower(x, y)) {
                this.towers.push(new Tower(x, y, this, this.selectedTowerType));
                this.gold -= data.cost;
                this.towerLimits[this.selectedTowerType]++;
                this.selectTowerType(null);
                this.updateHUD();
            }
        } else {
            this.deselectTower();
        }
    }

    isOverlappingTower(x, y) {
        return this.towers.some(t => {
            const dx = t.x - x, dy = t.y - y;
            return (dx * dx + dy * dy) < 1600; // 40^2
        });
    }

    deselectTower() {
        this.selectedActiveTower = null;
        const menu = document.getElementById('evolution-menu');
        if (menu) menu.classList.add('hidden');
    }

    isNearPath(x, y, dist) {
        const distSq = dist * dist;
        for (let i = 0; i < this.path.length - 1; i++) {
            const p1 = this.path[i], p2 = this.path[i + 1];

            // Bounding box pre-check
            const minX = Math.min(p1.x, p2.x) - dist, maxX = Math.max(p1.x, p2.x) + dist;
            const minY = Math.min(p1.y, p2.y) - dist, maxY = Math.max(p1.y, p2.y) + dist;
            if (x < minX || x > maxX || y < minY || y > maxY) continue;

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const L2 = dx * dx + dy * dy;
            if (L2 === 0) continue;

            let t = ((x - p1.x) * dx + (y - p1.y) * dy) / L2;
            t = Math.max(0, Math.min(1, t));

            const projX = p1.x + t * dx;
            const projY = p1.y + t * dy;
            const actualDistSq = (x - projX) ** 2 + (y - projY) ** 2;

            if (actualDistSq < distSq) return true;
        }
        return false;
    }

    selectTowerType(type) {
        this.selectedTowerType = type;
        document.querySelectorAll('.shop-item').forEach(i => i.classList.remove('selected'));
        if (type) {
            const el = document.getElementById('shop-' + type);
            if (el) el.classList.add('selected');
        }
    }

    showUpgradeMenu() {
        const menu = document.getElementById('evolution-menu');
        if (!menu || !this.selectedActiveTower) return;
        const tower = this.selectedActiveTower;
        const data = this.towerData[tower.type];
        menu.classList.remove('hidden');
        document.getElementById('evo-tower-preview').innerText = data.icon;
        document.getElementById('evo-name').innerText = data.name.toUpperCase();
        document.getElementById('evo-level-tag').innerText = `Lv. ${tower.level}`;
        document.getElementById('stat-dmg').innerText = tower.damage.toFixed(1);
        document.getElementById('stat-rng').innerText = (tower.range / 10).toFixed(1);
        document.getElementById('stat-spd').innerText = (1000 / tower.atkS).toFixed(2);
        document.getElementById('evo-xp-fill').style.width = (tower.level / 7 * 100) + '%';
        const cost = tower.getUpgradeCost();
        document.getElementById('evolve-cost').innerText = tower.level >= 7 ? 'MAX' : `$${cost}`;
        document.getElementById('evolve-btn').disabled = tower.level >= 7 || this.gold < cost;
    }

    upgradeSelectedTower() {
        if (this.selectedActiveTower && this.selectedActiveTower.level < 7) {
            const cost = this.selectedActiveTower.getUpgradeCost();
            if (this.gold >= cost) {
                this.gold -= cost;
                this.selectedActiveTower.upgrade();
                this.updateHUD();
                this.showUpgradeMenu();
                this.createMagicEffect(this.towerData[this.selectedActiveTower.type].color, 20, this.selectedActiveTower.x, this.selectedActiveTower.y);
            }
        }
    }
    sellSelectedTower() {
        if (this.selectedActiveTower) {
            this.gold += Math.floor(this.towerData[this.selectedActiveTower.type].cost * 0.5 * this.selectedActiveTower.level);
            this.towerLimits[this.selectedActiveTower.type]--;
            this.towers = this.towers.filter(t => t !== this.selectedActiveTower);
            this.deselectTower();
            this.updateHUD();
        }
    }

    toggleAutoSkip(value) {
        this.autoSkip = value;
        if (this.autoSkip) this.skipWave(); // Check immediately
    }

    skipWave() {
        if (this.gameState !== 'playing') return;
        if (this.waveTimer < 10000 || this.enemiesSpawned >= this.enemiesInWave) return;

        const progress = this.enemiesSpawned / this.enemiesInWave;

        console.log(`[SkipWave] Skipping Wave ${this.wave}. Progress: ${Math.floor(progress * 100)}% (${this.enemiesSpawned}/${this.enemiesInWave})`);

        // 1. Award gold for enemies ALREADY on screen
        let goldFromScreen = 0;
        this.enemies.forEach(e => {
            if (!e.dead && e.bounty > 0) {
                goldFromScreen += e.bounty;
                this.createMagicEffect('#ffd700', 3, e.x, e.y);
                e.bounty = 0; // Prevent double gold
            }
        });
        this.gold += goldFromScreen;

        // 2. Spawn all REMAINING enemies of the current wave
        const remainingToSpawn = this.enemiesInWave - this.enemiesSpawned;
        const isMiniBossWave = this.wave % 10 === 5;
        const isBossWave = this.wave % 10 === 0;
        let spawnedHordaCount = 0;

        for (let i = 0; i < remainingToSpawn; i++) {
            let enemy;
            const currentSpawnIndex = this.enemiesSpawned + i;

            // Note: Boss/MiniBoss usually spawn at index 0, which is handled naturally at wave start.
            // But we keep this check for safety.
            if ((isMiniBossWave || isBossWave) && currentSpawnIndex === 0) {
                const data = isBossWave ? this.BOSS_DATA[this.wave] : this.MINI_BOSS_DATA[this.wave];
                if (data) {
                    enemy = new Enemy(this.wave, this, isBossWave ? 'boss' : 'miniboss');
                    enemy.name = data.name;
                    enemy.skillType = data.skill;
                    if (isBossWave) {
                        this.activeBoss = enemy;
                        const hb = document.getElementById('boss-health-container');
                        if (hb) hb.classList.remove('hidden');
                        const bn = document.getElementById('boss-name');
                        if (bn) bn.innerText = data.name.toUpperCase();
                        const quote = this.BOSS_QUOTES[this.wave];
                        this.announce(data.name.toUpperCase(), quote || "O VALE IRÁ CAIR");
                    }
                } else {
                    enemy = new Enemy(this.wave, this, 'normal');
                }
            } else {
                let type = 'normal';
                const r = Math.random();
                if (this.wave >= 2 && r > 0.8) type = 'fast';
                if (this.wave >= 4 && r > 0.9) type = 'tank';
                if (this.wave >= 6 && r > 0.95) type = 'spawn';
                if (this.wave >= 8 && r > 0.98) type = 'shielded';
                enemy = new Enemy(this.wave, this, type);
            }

            if (enemy) {
                this.gold += enemy.bounty;
                enemy.bounty = 0; // Already paid
                enemy.x += (Math.random() - 0.5) * 50;
                enemy.y += (Math.random() - 0.5) * 30; // More spread
                this.enemies.push(enemy);
                spawnedHordaCount++;
            }
        }

        console.log(`[SkipWave] Spawned ${spawnedHordaCount} horda enemies.`);

        // 3. Award Wave Completion Reward
        const completionReward = 100 + (this.wave * 50);
        this.gold += completionReward;

        // 4. Advance to Next Wave State
        this.wave++;
        this.enemiesSpawned = 0;
        this.enemiesInWave = Math.floor(10 * Math.pow(1.15, this.wave));
        this.waveTimer = 0; // Reset for next wave
        this.spawnTimer = 0; // Reset timer for fresh start

        this.announce("ONDA PULADA", `Reforços inimigos chegaram! (+$${goldFromScreen + completionReward})`);
        this.updateHUD();
        this.screenShake = 15;
    }

    announce(main, sub) {
        const el = document.getElementById('announcement');
        const amain = document.getElementById('announcement-main'), asub = document.getElementById('announcement-sub');
        if (!el || !amain || !asub) return;
        amain.innerText = main; asub.innerText = sub;
        el.style.opacity = '1'; setTimeout(() => el.style.opacity = '0', 3000);
    }

    castSkill(id) {
        const skill = this.skills[id];
        if (!skill || this.gold < skill.cost || Date.now() - (skill.lastUsed || 0) < skill.cooldown) return;
        this.gold -= skill.cost;
        skill.lastUsed = Date.now();
        const btn = document.getElementById('skill-' + id);
        if (btn) { btn.classList.add('activated'); setTimeout(() => btn.classList.remove('activated'), 400); }
        this.triggerSuperAttack(id);
        this.updateHUD();
    }

    triggerSuperAttack(type) {
        switch (type) {
            case 'arrows':
                this.screenShake = 15;
                for (let i = 0; i < 60; i++) this.vfxLayer.push({ type: 'arrow', x: Math.random() * 800, y: -50 - Math.random() * 200, speed: 15 + Math.random() * 10, life: 100 });
                setTimeout(() => { this.enemies.forEach(e => e.takeDamage(15)); this.createMagicEffect('#fff', 30); }, 400);
                break;
            case 'fire':
                this.screenShake = 25;
                this.vfxLayer.push({ type: 'explosion', x: 400, y: 300, radius: 0, maxRadius: 400, life: 100 });
                this.enemies.forEach(e => { e.takeDamage(25); e.burn(8); });
                break;
            case 'ice':
                this.screenColorOverlay = 'rgba(0, 191, 255, 0.3)'; this.overlayTimer = 5000;
                this.enemies.forEach(e => { e.takeDamage(5); e.slow(0.7, 5000); });
                break;
            case 'lightning':
                this.screenShake = 10;
                for (let i = 0; i < 8; i++) {
                    setTimeout(() => {
                        const tx = Math.random() * 800;
                        this.vfxLayer.push({ type: 'lightning_strike', x: tx, life: 100 });
                        this.enemies.forEach(e => { if (Math.abs(e.x - tx) < 100) e.takeDamage(40); });
                    }, i * 150);
                }
                break;
            case 'annihilation':
                this.screenColorOverlay = 'rgba(255, 255, 255, 0.8)'; this.overlayTimer = 1000; this.screenShake = 40;
                setTimeout(() => { this.enemies.forEach(e => e.takeDamage(e.hp * 0.7 + 100)); }, 500);
                break;
        }
    }

    createMagicEffect(color, count, x = null, y = null) {
        let finalCount = count;
        if (this.settings.vfx === 'medium') finalCount = Math.floor(count * 0.5);
        if (this.settings.vfx === 'low') finalCount = Math.floor(count * 0.2);
        if (finalCount < 1 && count > 0 && Math.random() < 0.2) finalCount = 1;

        for (let i = 0; i < finalCount; i++) {
            const px = x !== null ? x : Math.random() * 800, py = y !== null ? y : Math.random() * 600;
            const p = this.particlePool[this.particleIndex];
            p.reset(px, py, color);
            if (!this.particles.includes(p)) this.particles.push(p);
            this.particleIndex = (this.particleIndex + 1) % this.particlePool.length;
        }
    }

    togglePause() {
        if (this.gameState !== 'playing') return;
        this.paused = !this.paused;
        const pm = document.getElementById('pause-menu');
        if (pm) pm.classList.toggle('hidden', !this.paused);
        if (!this.paused) {
            this.lastTime = performance.now();
            this.closeGallery();

            // Auto close settings if they were open and save
            const setPanel = document.getElementById('settings-panel');
            const mainOpts = document.getElementById('pause-main-options');
            if (setPanel && !setPanel.classList.contains('hidden')) {
                setPanel.classList.add('hidden');
                if (mainOpts) mainOpts.classList.remove('hidden');
                this.saveSettings();
            }
        }
    }

    toggleSettings() {
        const mainOpts = document.getElementById('pause-main-options');
        const setPanel = document.getElementById('settings-panel');
        if (!mainOpts || !setPanel) return;

        if (setPanel.classList.contains('hidden')) {
            // Opening Settings
            mainOpts.classList.add('hidden');
            setPanel.classList.remove('hidden');
            this.syncSettingsUI();
        } else {
            // Closing Settings (Back to Pause)
            mainOpts.classList.remove('hidden');
            setPanel.classList.add('hidden');
            this.saveSettings();
        }
    }

    syncSettingsUI() {
        document.getElementById('bgm-volume').value = this.settings.bgm;
        document.getElementById('sfx-volume').value = this.settings.sfx;
        document.getElementById('mute-all').checked = this.settings.mute;
        document.getElementById('vfx-density').value = this.settings.vfx;
        document.getElementById('screen-shake-toggle').checked = this.settings.screenShake;
        document.getElementById('show-all-range').checked = this.settings.showAllRange;
    }

    updateSettings() {
        this.settings.bgm = parseFloat(document.getElementById('bgm-volume').value);
        this.settings.sfx = parseFloat(document.getElementById('sfx-volume').value);
        this.settings.mute = document.getElementById('mute-all').checked;
        this.settings.vfx = document.getElementById('vfx-density').value;
        this.settings.screenShake = document.getElementById('screen-shake-toggle').checked;
        this.settings.showAllRange = document.getElementById('show-all-range').checked;

        // Apply immediate changes (like volume or range visibility)
        this.applySettings();
    }

    applySettings() {
        // Placeholder for Audio Bus logic (if audio is implemented)
        if (window.bgmSource) window.bgmSource.volume = this.settings.mute ? 0 : this.settings.bgm;

        // Local saving on every change for safety
        this.saveSettings();
    }

    saveSettings() {
        localStorage.setItem('ultraDefendersSettings', JSON.stringify(this.settings));
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                this.announce("ERRO", "Tela cheia não suportada");
            });
        } else {
            document.exitFullscreen();
        }
    }

    confirmReset() {
        const confirm1 = confirm("⚠️ ATENÇÃO: Isso apagará todo o seu progresso da Galeria. Continuar?");
        if (confirm1) {
            const confirm2 = confirm("❌ TEM CERTEZA? Esta ação não pode ser desfeita.");
            if (confirm2) {
                localStorage.removeItem('defeatedBosses');
                this.defeatedBosses = [];
                this.announce("SISTEMA", "Progresso resetado com sucesso.");
                this.togglePause();
                location.reload();
            }
        }
    }

    openGallery() {
        const gallery = document.getElementById('boss-gallery');
        if (gallery) gallery.classList.remove('hidden');
        this.populateGallery();
    }

    closeGallery() {
        const gallery = document.getElementById('boss-gallery');
        if (gallery) gallery.classList.add('hidden');
    }

    populateGallery() {
        const list = document.getElementById('boss-list');
        if (!list) return;
        list.innerHTML = '';

        // Combine Miniboss and Boss Data for display
        const allBossWaves = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];

        allBossWaves.forEach(w => {
            const data = w % 10 === 0 ? this.BOSS_DATA[w] : this.MINI_BOSS_DATA[w];
            if (!data) return;

            const isDefeated = this.defeatedBosses.includes(w);
            const item = document.createElement('div');
            item.className = `gallery-boss-item ${isDefeated ? '' : 'locked'}`;
            item.innerHTML = w % 10 === 0 ? '💀' : '💀'; // Can differentiate later
            item.onclick = () => isDefeated ? this.showLore(w) : null;
            list.appendChild(item);
        });
    }

    showLore(wave) {
        const data = wave % 10 === 0 ? this.BOSS_DATA[wave] : this.MINI_BOSS_DATA[wave];
        const lore = this.LORE_DATA[wave];

        document.getElementById('lore-icon').innerText = wave % 10 === 0 ? '🌋' : '🌪️';
        document.getElementById('lore-title').innerText = data.name;
        document.getElementById('lore-text').innerText = lore;
        document.getElementById('lore-stats').innerHTML = `
            <div class="lore-stat-item">CATEGORIA: <b>${wave % 10 === 0 ? 'LORDE ANCIÃO' : 'GUARDIÃO REGIONAL'}</b></div>
            <div class="lore-stat-item">NÍVEL DE AMEAÇA: <b>${wave}</b></div>
            <div class="lore-stat-item">HABILIDADE ÚNICA: <b>${data.desc}</b></div>
            <div class="lore-stat-item">RECOMPENSA: <b>$${wave % 10 === 0 ? 500 : 200}+</b></div>
        `;

        document.querySelectorAll('.gallery-boss-item').forEach(i => i.classList.remove('selected'));
        // Mark as selected would need more tracking, but this is a start
    }

    loop(time) {
        // Cap delta to 64ms (around 15fps) to prevent physics glitches during lag
        const delta = Math.min(64, time - (this.lastTime || time));
        this.lastTime = time;
        if (this.gameState === 'title') {
            if (this.titleFadeIn) this.titleOpacity = Math.min(1, this.titleOpacity + delta * 0.001);
            else this.titleOpacity = Math.max(0, this.titleOpacity - delta * 0.001);
        } else if (!this.paused) {
            this.update(delta);
        }
        this.draw();
        if (this.hp > 0 || this.gameState === 'title') requestAnimationFrame((t) => this.loop(t));
        else this.gameOver();
    }

    update(delta) {
        if (!this.paused) this.waveTimer += delta;
        if (this.screenShake > 0) {
            if (!this.settings.screenShake) this.screenShake = 0;
            else this.screenShake -= delta * 0.05;
        }
        if (this.overlayTimer > 0) this.overlayTimer -= delta;
        else this.screenColorOverlay = null;

        this.particles = this.particles.filter(p => {
            if (p.update) p.update(delta);
            else if (p.life !== undefined) {
                p.life -= delta;
                if (p.type === 'puddle') {
                    this.enemies.forEach(e => {
                        const dx = e.x - p.x, dy = e.y - p.y;
                        if ((dx * dx + dy * dy) < 900) e.takeDamage(p.dmg * (delta / 1000), true);
                    });
                }
            }
            return p.life > 0;
        });

        // VFX Layer optimization: Avoid frequent filtering if possible
        if (this.vfxLayer.length > 0) {
            this.vfxLayer = this.vfxLayer.filter(v => {
                if (v.type === 'arrow') { v.y += v.speed; return v.y < 700; }
                if (v.type === 'explosion') { v.radius += 10; v.life -= 2; return v.life > 0; }
                if (v.type === 'lightning_strike') { v.life -= 10; return v.life > 0; }
                if (v.type === 'orbital') { v.life -= 2; return v.life > 0; }
                if (v.type === 'ice_prison' || v.type === 'gas_cloud') { v.life -= 16; return v.life > 0; }
                return v.life > 0;
            });
        }

        if (this.enemies.length === 0 && this.enemiesSpawned >= this.enemiesInWave) {
            const reward = 100 + (this.wave * 50);
            this.gold += reward; this.wave++; this.enemiesSpawned = 0;
            this.enemiesInWave = Math.floor(10 * Math.pow(1.15, this.wave));
            this.waveTimer = 0;
            this.announce("ONDA CONCLUÍDA", `Próxima: Onda ${this.wave} | Recompensa: $${reward}`);
            this.updateHUD();
        }

        // Auto Skip Wave Logic
        if (this.autoSkip && this.gameState === 'playing' && this.enemiesSpawned < this.enemiesInWave && this.waveTimer >= 10000) {
            this.skipWave();
        }

        if (this.enemiesSpawned < this.enemiesInWave) {
            this.spawnTimer += delta;
            const spawnInterval = Math.max(250, 1000 - (this.wave * 12));
            if (this.spawnTimer > spawnInterval) {
                // Wave Logic: Check for Mini-Boss or Boss
                const isMiniBossWave = this.wave % 10 === 5;
                const isBossWave = this.wave % 10 === 0;

                // Only spawn special enemy if not already spawned in this wave
                if ((isMiniBossWave || isBossWave) && this.enemiesSpawned === 0) {
                    const data = isBossWave ? this.BOSS_DATA[this.wave] : this.MINI_BOSS_DATA[this.wave];
                    if (data) {
                        const enemy = new Enemy(this.wave, this, isBossWave ? 'boss' : 'miniboss');
                        enemy.name = data.name;
                        enemy.skillType = data.skill;
                        this.enemies.push(enemy);
                        if (isBossWave) {
                            this.activeBoss = enemy;
                            const quote = this.BOSS_QUOTES[this.wave];
                            this.announce(data.name.toUpperCase(), quote || "O VALE IRÁ CAIR");
                            document.getElementById('boss-health-container').classList.remove('hidden');
                            document.getElementById('boss-name').innerText = data.name.toUpperCase();
                        } else {
                            this.announce("ELITE DETECTADA", data.name.toUpperCase());
                        }
                    } else {
                        // Fallback generic if wave > 100 or undefined
                        this.enemies.push(new Enemy(this.wave, this, 'normal'));
                    }
                } else {
                    let type = 'normal';
                    const r = Math.random();
                    if (this.wave >= 2 && r > 0.8) type = 'fast';
                    if (this.wave >= 4 && r > 0.9) type = 'tank';
                    if (this.wave >= 6 && r > 0.95) type = 'spawn';
                    if (this.wave >= 8 && r > 0.98) type = 'shielded';
                    this.enemies.push(new Enemy(this.wave, this, type));
                }

                this.enemiesSpawned++;
                this.spawnTimer = 0;
            }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(delta);
            if (e.dead) {
                if (e.reachedEnd) {
                    this.hp--;
                    this.updateHUD();
                } else {
                    this.gold += e.bounty;
                    this.updateHUD();

                    if (e.isBoss || e.isMiniBoss) {
                        if (e.waveRef && !this.defeatedBosses.includes(e.waveRef)) {
                            this.defeatedBosses.push(e.waveRef);
                            localStorage.setItem('defeatedBosses', JSON.stringify(this.defeatedBosses));
                        }
                        if (e.isBoss) {
                            const hb = document.getElementById('boss-health-container');
                            if (hb) hb.classList.add('hidden');
                            this.activeBoss = null;
                        }
                    }
                    if (e.type === 'spawn') {
                        for (let j = 0; j < 2; j++) {
                            const sub = new Enemy(this.wave, this, 'normal');
                            sub.x = e.x; sub.y = e.y; sub.hp = sub.maxHp * 0.5; sub.pathIndex = e.pathIndex;
                            this.enemies.push(sub);
                        }
                    }
                }
                this.enemies.splice(i, 1);
            }
        }

        this.towers.forEach(t => t.update(delta));

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(delta);
            if (p.dead) this.projectiles.splice(i, 1);
        }
    }

    draw() {
        if (this.gameState === 'title') { this.drawTitleScreen(); return; }
        this.ctx.save();
        if (this.screenShake > 0) this.ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
        this.ctx.drawImage(this.bgCanvas, 0, 0);

        this.towers.forEach(t => {
            if (this.settings.showAllRange || this.selectedActiveTower === t || this.towerToPlace) {
                this.ctx.beginPath();
                this.ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
                this.ctx.strokeStyle = this.selectedActiveTower === t ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
            if (t.type === 'ice' || t.type === 'magic') {
                const r = 25 + Math.sin(Date.now() / 600) * 5 + (t.level * 2); // Added level scaling
                const g = this.ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, r);
                g.addColorStop(0, t.type === 'ice' ? 'rgba(0,191,255,0.4)' : 'rgba(234,128,252,0.4)');
                g.addColorStop(1, 'transparent'); this.ctx.fillStyle = g; this.ctx.beginPath(); this.ctx.arc(t.x, t.y, r, 0, Math.PI * 2); this.ctx.fill();
            }
        });

        if (this.selectedActiveTower) {
            const t = this.selectedActiveTower;
            this.ctx.beginPath(); this.ctx.fillStyle = 'rgba(255,255,255,0.1)'; this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; this.ctx.lineWidth = 2;
            this.ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2); this.ctx.fill(); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.arc(t.x, t.y, 22, 0, Math.PI * 2); this.ctx.stroke();
        }

        this.enemies.forEach(e => e.draw(this.ctx));
        this.towers.forEach(t => t.draw(this.ctx));
        this.projectiles.forEach(p => p.draw(this.ctx));
        this.particles.forEach(p => {
            if (p.type === 'lightning_arc') {
                this.ctx.strokeStyle = '#fff'; this.ctx.lineWidth = 2;
                this.ctx.beginPath(); this.ctx.moveTo(p.x, p.y);
                this.ctx.lineTo(p.tx, p.ty); this.ctx.stroke();
            } else if (p.type === 'mana_beam') {
                this.ctx.strokeStyle = '#da70d6'; this.ctx.lineWidth = 2;
                this.ctx.globalAlpha = Math.min(1.0, p.life / 100);
                this.ctx.beginPath(); this.ctx.moveTo(p.x, p.y); this.ctx.lineTo(p.tx, p.ty); this.ctx.stroke();
                this.ctx.globalAlpha = 1.0;
            } else if (p.type === 'puddle') {
                this.ctx.fillStyle = p.color; this.ctx.globalAlpha = 0.5;
                this.ctx.beginPath(); this.ctx.arc(p.x, p.y, 20, 0, Math.PI * 2); this.ctx.fill();
                this.ctx.globalAlpha = 1.0;
            } else if (typeof p.draw === 'function') p.draw(this.ctx);
            else {
                this.ctx.globalAlpha = Math.min(1.0, p.life / 100);
                this.ctx.fillStyle = p.color;
                this.ctx.fillRect(p.x, p.y, 4, 4);
                this.ctx.globalAlpha = 1.0;
            }
        });

        this.vfxLayer.forEach(v => {
            if (v.type === 'arrow') { this.ctx.fillStyle = '#eee'; this.ctx.fillRect(v.x, v.y, 2, 20); }
            else if (v.type === 'explosion') {
                const g = this.ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, v.radius);
                g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,200,0,0.8)'); g.addColorStop(1, 'rgba(255,0,0,0)');
                this.ctx.fillStyle = g; this.ctx.beginPath(); this.ctx.arc(v.x, v.y, v.radius, 0, Math.PI * 2); this.ctx.fill();
            } else if (v.type === 'lightning_strike') {
                this.ctx.strokeStyle = '#fff'; this.ctx.lineWidth = 4; this.ctx.beginPath(); this.ctx.moveTo(v.x, 0);
                let cx = v.x; for (let y = 0; y < 600; y += 50) { cx += (Math.random() - 0.5) * 40; this.ctx.lineTo(cx, y); }
                this.ctx.stroke();
            } else if (v.type === 'orbital') {
                this.ctx.fillStyle = 'rgba(255, 255, 255, ' + (v.life / 100) + ')';
                this.ctx.beginPath(); this.ctx.arc(v.x, v.y, 100 - v.life, 0, Math.PI * 2); this.ctx.stroke();
                this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                this.ctx.fill();
            } else if (v.type === 'ice_prison') {
                this.ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
                this.ctx.fillRect(v.x - 15, v.y - 15, 30, 30);
                this.ctx.strokeStyle = '#fff'; this.ctx.lineWidth = 2;
                this.ctx.strokeRect(v.x - 15, v.y - 15, 30, 30);
            } else if (v.type === 'gas_cloud') {
                this.ctx.fillStyle = 'rgba(50, 205, 50, 0.3)';
                this.ctx.beginPath(); this.ctx.arc(v.x, v.y, 30, 0, Math.PI * 2); this.ctx.fill();
            }
        });

        if (this.screenColorOverlay) { this.ctx.fillStyle = this.screenColorOverlay; this.ctx.fillRect(0, 0, 800, 600); }

        if (this.towerToPlace) {
            this.ctx.globalAlpha = 0.4;
            this.ctx.fillStyle = (this.isNearPath(this.towerToPlace.x, this.towerToPlace.y, 40) || this.isOverlappingTower(this.towerToPlace.x, this.towerToPlace.y)) ? 'rgba(255,0,0,0.5)' : 'rgba(0,255,0,0.3)';
            this.ctx.beginPath(); this.ctx.arc(this.towerToPlace.x, this.towerToPlace.y, 20, 0, Math.PI * 2); this.ctx.fill();
            this.ctx.strokeStyle = 'white'; this.ctx.lineWidth = 1; // Added stroke for range
            this.ctx.beginPath(); this.ctx.arc(this.towerToPlace.x, this.towerToPlace.y, this.towerData[this.towerToPlace.type].range || 150, 0, Math.PI * 2); this.ctx.stroke();
            this.ctx.globalAlpha = 1.0;
        }

        const cX = this.path[this.path.length - 1].x, cY = this.path[this.path.length - 1].y;
        this.ctx.fillStyle = '#455a64'; this.ctx.fillRect(cX - 25, cY - 20, 50, 40); // Adjusted base
        this.ctx.fillStyle = '#607d8b'; this.ctx.fillRect(cX - 30, cY - 30, 15, 30); this.ctx.fillRect(cX + 15, cY - 30, 15, 30); // Adjusted towers
        this.ctx.fillStyle = '#b71c1c';
        this.ctx.beginPath(); this.ctx.moveTo(cX - 32, cY - 30); this.ctx.lineTo(cX - 22, cY - 45); this.ctx.lineTo(cX - 12, cY - 30); this.ctx.fill();
        this.ctx.beginPath(); this.ctx.moveTo(cX + 13, cY - 30); this.ctx.lineTo(cX + 23, cY - 45); this.ctx.lineTo(cX + 33, cY - 30); this.ctx.fill();

        // Wave counter fixed position (bottom right of canvas)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(660, 545, 130, 45);
        this.ctx.fillStyle = '#50fa7b'; // Mana Green for consistency
        this.ctx.font = 'bold 22px Outfit';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`ONDA: ${this.wave}`, 780, 577);
        this.ctx.textAlign = 'left';

        // Draw HUD details that are dynamic
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#9c27b0';
        this.ctx.font = '70px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🏰', 750, 315);
        this.ctx.shadowBlur = 0;

        const portalS = 60 + Math.sin(Date.now() * 0.005) * 5;
        this.ctx.font = `${portalS}px serif`;
        this.ctx.fillText('🌀', 30, 315);

        this.ctx.restore();
    }

    drawTitleScreen() {
        // Disable canvas title drawing in favor of the HTML overlay
        // This prevents the "Click to defend" text from appearing over our new UI
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, 800, 600);
        if (this.splashImg.complete && this.splashImg.width > 0) {
            this.ctx.globalAlpha = 0.3; // Very subtle preview
            this.ctx.drawImage(this.splashImg, 0, 0, 800, 600);
            this.ctx.globalAlpha = 1.0;
        }
    }

    gameOver() {
        this.paused = true; this.ctx.fillStyle = 'rgba(0,0,0,0.85)'; this.ctx.fillRect(0, 0, 800, 600);
        const grad = this.ctx.createLinearGradient(400, 200, 400, 300); // Added gradient for game over text
        grad.addColorStop(0, '#ff4d4d');
        grad.addColorStop(1, '#8b0000');
        this.ctx.fillStyle = grad;
        this.ctx.font = 'bold 72px Outfit'; this.ctx.textAlign = 'center';
        this.ctx.shadowBlur = 20; this.ctx.shadowColor = '#ff4d4d'; this.ctx.fillText('DERROTA', 400, 280); // Adjusted shadow color
        this.ctx.shadowBlur = 0; this.ctx.fillStyle = '#fff'; this.ctx.font = '24px Outfit';
        this.ctx.fillText(`Seu castelo caiu na Onda ${this.wave}`, 400, 330); // Changed text
        this.ctx.fillStyle = '#00fa9a';
        this.ctx.font = 'bold 18px Outfit';
        this.ctx.fillText('Pressione F5 para tentar novamente', 400, 400);
    }

    unlockTalentPoint() {
        this.gold += 500; // Bonus gold for boss
        this.announce("CHEFE DERROTADO", "Ponto de Talento Desbloqueado!");
        this.paused = true;
        // Logic for Talent Menu would go here
        console.log("Talent Point Awarded. Game Paused.");
        setTimeout(() => {
            if (confirm("Chefe Derrotado! Deseja continuar protegendo o Vale? (Menu de Talentos Virá em Breve)")) {
                this.paused = false;
            }
        }, 500);
    }
}

class Enemy {
    constructor(wave, game, type = 'normal') {
        const config = ENEMY_TYPES[type] || ENEMY_TYPES['normal'];
        this.game = game; this.type = type; this.pathIndex = 0;
        this.waveRef = wave;
        this.x = game.path[0].x; this.y = game.path[0].y;
        this.radius = config.size * 12; this.shield = type === 'shielded' ? 5 : 0;
        this.color = config.color;
        this.icon = config.icon;
        this.size = config.size * 15;

        this.maxHp = config.hp * Math.pow(1.15, wave - 1); this.hp = this.maxHp;
        this.speed = config.speed * (0.8 + Math.random() * 0.4); this.tempSpeed = this.speed;
        this.bounty = Math.floor(config.gold * Math.pow(1.05, wave - 1));

        // --- Special Hierarchies ---
        this.isBoss = type === 'boss';
        this.isMiniBoss = type === 'miniboss';
        this.scale = this.isBoss ? 3.5 : (this.isMiniBoss ? 2.0 : 1.0);

        if (this.isMiniBoss) {
            this.maxHp *= 2.5;
            this.hp = this.maxHp;
            this.radius *= 1.5;
            this.bounty *= 5;
            this.color = '#ffa500'; // Orange Elite
        } else if (this.isBoss) {
            this.maxHp *= 8.0; // Bosses are true sponges
            this.hp = this.maxHp;
            this.radius *= 2.5;
            this.bounty *= 20;
            this.color = '#ff0000'; // Red Boss
            this.speed *= 0.6; // Slower but imponent
        }

        this.slowT = 0; this.burnT = 0; this.burnD = 0; this.poisonT = 0; this.poisonD = 0;
        this.armorReduction = 1.0;
        this.damageTakenMult = 1.0;
        this.stunT = 0;
        this.lastT = 0; this.dead = false; this.reachedEnd = false;
        this.viralMarker = false;
        this.icePrisonMarker = 0;
        this.hitFlash = 0;
    }
    update(delta) {
        if (this.hitFlash > 0) this.hitFlash -= delta;
        if (this.stunT > 0) { this.stunT -= delta; return; }
        if (this.slowT > 0) { this.slowT -= delta; if (this.slowT <= 0) { this.tempSpeed = this.speed; this.damageTakenMult = 1.0; } }

        // --- Boss Screen Shake ---
        if (this.isBoss) {
            this.stepCounter = (this.stepCounter || 0) + delta;
            if (this.stepCounter > 800) {
                this.game.screenShake = 5;
                this.stepCounter = 0;
            }
            // Update UI Health Bar
            if (this.game.activeBoss === this) {
                const fill = document.getElementById('boss-hp-fill');
                if (fill) fill.style.width = (this.hp / this.maxHp * 100) + '%';
            }
        }

        this.lastT += delta;
        if (this.lastT >= 1000) {
            // Regeneration / Auto-repair
            if (this.skillType === 'auto_repair' && this.lastT >= 3000) {
                this.hp = Math.min(this.maxHp, this.hp + (this.maxHp * 0.05));
            }
            if (this.burnT > 0) { this.takeDamage(this.burnD, true); this.burnT--; }
            if (this.poisonT > 0) { this.takeDamage(this.poisonD, true); this.poisonT--; }
            this.lastT = 0;

            // Interval Skills
            if (this.skillType === 'group_heal') {
                this.game.enemies.forEach(e => {
                    const dx = e.x - this.x, dy = e.y - this.y;
                    if (e !== this && (dx * dx + dy * dy) < 10000) { // 100^2
                        e.hp = Math.min(e.maxHp, e.hp + 20);
                        this.game.createMagicEffect('#4caf50', 1, e.x, e.y);
                    }
                });
            }
        }

        // HP Threshold Skills
        if (this.skillType === 'rage_burst' && this.hp < this.maxHp * 0.5 && !this.raged) {
            this.tempSpeed *= 1.8;
            this.raged = true;
            this.game.announce("FÚRIA!", "Velocidade Aumentada!");
        }

        const target = this.game.path[this.pathIndex + 1];
        if (!target) { this.dead = true; this.reachedEnd = true; return; }
        const dx = target.x - this.x, dy = target.y - this.y, d = Math.sqrt(dx * dx + dy * dy);
        const md = this.tempSpeed * (delta / 16);
        if (d < md) { this.x = target.x; this.y = target.y; this.pathIndex++; }
        else { this.x += (dx / d) * md; this.y += (dy / d) * md; }

        if (this.hp <= 0) this.die();
    }
    takeDamage(dmg, ignoreS = false) {
        if (!ignoreS && this.shield > 0) { this.shield--; return; }

        // Skill: Shield Physical
        let finalDmg = dmg;
        if (this.skillType === 'shield_phys') finalDmg *= 0.5;

        // Skill: Obsidian Armor
        if (this.skillType === 'obsidian_armor') {
            // Simpler check: only take real damage if it's very high (proxy for crit/lvl 7)
            if (finalDmg < 100) finalDmg = 1;
        }

        finalDmg *= this.damageTakenMult * (1 / this.armorReduction);
        this.hp -= finalDmg;
        this.hitFlash = 100;

        // Skill: Reflect Shell
        if (this.skillType === 'reflect_shell' && Math.random() < 0.1) {
            this.game.screenColorOverlay = 'rgba(255,255,255,0.2)';
            this.game.overlayTimer = 100;
        }

        if (this.hp <= 0) this.die();
    }
    die() {
        if (this.dead) return;
        this.dead = true;

        if (this.isBoss) {
            this.game.activeBoss = null;
            document.getElementById('boss-health-container').classList.add('hidden');
            this.game.unlockTalentPoint();
        }

        if (this.skillType === 'glass_shard') {
            for (let i = 0; i < 4; i++) {
                const sub = new Enemy(this.game.wave, this.game, 'fast');
                sub.x = this.x; sub.y = this.y; sub.pathIndex = this.pathIndex;
                sub.maxHp *= 0.3; sub.hp = sub.maxHp;
                this.game.enemies.push(sub);
            }
        }

        if (this.skillType === 'abyss_split') {
            for (let i = 0; i < 3; i++) {
                const sub = new Enemy(this.game.wave, this.game, 'miniboss');
                sub.x = this.x; sub.y = this.y; sub.pathIndex = this.pathIndex;
                sub.maxHp *= 0.5; sub.hp = sub.maxHp;
                this.game.enemies.push(sub);
            }
        }

        if (this.viralMarker && !this.reachedEnd) {
            // Contágio Viral Level 7
            this.game.createMagicEffect('#4caf50', 15, this.x, this.y);
            this.game.enemies.forEach(e => {
                const d = Math.sqrt((e.x - this.x) ** 2 + (e.y - this.y) ** 2);
                if (d < 70 && e !== this) {
                    e.takeDamage(100);
                    e.poison(10); // Spreading pest
                }
            });
        }
    }
    stun(duration) { this.stunT = Math.max(this.stunT, duration); }
    slow(p, d, dmgMult = 1.0) { this.tempSpeed = this.speed * (1 - p); this.slowT = d; this.damageTakenMult = Math.max(this.damageTakenMult, dmgMult); }
    burn(d) { this.burnT = 4; this.burnD = d; }
    poison(d) { this.poisonT = 5; this.poisonD = d; }
    reduceArmor(reduction, duration) {
        this.armorReduction = 1 - reduction;
        setTimeout(() => { if (!this.dead) this.armorReduction = 1.0; }, duration);
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);

        if (this.hitFlash > 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, ' + (this.hitFlash / 100) + ')';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        const wobble = Math.sin(Date.now() / 150) * 0.15;
        const s = 1 + wobble;
        ctx.scale(s * this.scale, (2 - s) * this.scale);

        // Cute Body (Icon-based)
        ctx.fillStyle = COLORS.shadow;
        ctx.beginPath();
        ctx.ellipse(0, 10, this.radius * 0.8, this.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        const img = this.game.images[this.skillType] || this.game.images[this.type];
        if (img && img.complete && img.width > 0) {
            const spriteKey = this.game.images[this.skillType] ? this.skillType : this.type;
            const config = this.game.spriteConfigs.enemies[spriteKey] || { maxFrames: 1, speed: 120, drawScale: 1.0 };
            const frameW = img.width / config.maxFrames;
            const frameH = img.height;
            
            this.frameTimer = (this.frameTimer || 0) + 16;
            const frame = Math.floor(this.frameTimer / config.speed) % config.maxFrames;

            const drawScale = config.drawScale || 1.0;
            const drawSize = this.radius * 2 * drawScale;

            ctx.drawImage(
                img,
                frame * frameW, 0, frameW, frameH,
                -drawSize / 2, -drawSize / 2, drawSize, drawSize
            );
        } else {
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.font = `${this.size * 1.5}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.icon, 0, 0);
            ctx.shadowBlur = 0;
        }

        ctx.restore();

        // Health Bar (Fixed position above scaled body)
        const barW = this.radius * 2;
        ctx.fillStyle = '#333'; ctx.fillRect(this.x - barW / 2, this.y - this.radius - 20, barW, 4);
        ctx.fillStyle = '#2ecc71'; ctx.fillRect(this.x - barW / 2, this.y - this.radius - 20, barW * (this.hp / this.maxHp), 4);
    }
}

class Tower {
    constructor(x, y, game, type) {
        this.x = x; this.y = y; this.game = game; this.type = type; this.level = 1; this.timer = 0;
        this.muzzleFlash = 0;
        this.internalTimer = 0;
        this.manaFocusTimer = 0;
        this.speedBonus = 0;
        this.currentTarget = null;
        const d = game.towerData[type];
        this.range = d.range;
        this.rangeSq = d.range * d.range;
        this.damage = d.baseDmg;
        this.atkS = d.atkS;
    }
    getUpgradeCost() { return Math.floor(this.game.towerData[this.type].cost * Math.pow(1.8, this.level)); }
    upgrade() {
        this.level++;
        this.damage *= 1.4;
        this.range += 15;
        this.rangeSq = this.range * this.range;
        this.atkS *= 0.9;
    }
    update(delta) {
        if (this.internalTimer > 0) this.internalTimer -= delta;
        this.timer += delta;

        // Reset counters if target lost/changed
        const bestTarget = this.game.enemies.find(e => {
            const dx = e.x - this.x, dy = e.y - this.y;
            return (dx * dx + dy * dy) <= this.rangeSq;
        });
        if (bestTarget !== this.currentTarget) {
            this.currentTarget = bestTarget;
            this.manaFocusTimer = 0;
            this.speedBonus = 0;
        }

        if (this.timer >= this.atkS * (1 - this.speedBonus)) {
            if (this.currentTarget) {
                // Special Attack Level 7 logic
                if (this.level >= 7 && this.internalTimer <= 0) {
                    if (this.type === 'cannon') {
                        // Barragem Orbital
                        this.game.announce("BARRAGEM ORBITAL", "Stun em área!");
                        this.game.enemies.forEach(e => {
                            const d = Math.sqrt((e.x - this.currentTarget.x) ** 2 + (e.y - this.currentTarget.y) ** 2);
                            if (d < 200) e.stun(2000);
                        });
                        this.game.vfxLayer.push({ type: 'orbital', x: this.currentTarget.x, y: this.currentTarget.y, life: 100 });
                        this.internalTimer = 12000;
                    } else if (this.type === 'fire') {
                        // Erupção Catastrófica (A cada 10s automático, mas vamos vincular ao ataque se pronto)
                        this.game.announce("ERUPÇÃO", "Dano em 360°!");
                        this.game.enemies.forEach(e => {
                            const d = Math.sqrt((e.x - this.x) ** 2 + (e.y - this.y) ** 2);
                            if (d < 150) { e.takeDamage(this.damage * 0.75); e.burn(10); }
                        });
                        this.game.createMagicEffect('#ff4500', 50, this.x, this.y);
                        this.internalTimer = 10000;
                    } else if (this.type === 'magic') {
                        // Buraco Negro
                        this.game.announce("BURACO NEGRO", "Efeito Gravitacional!");
                        this.game.enemies.forEach(e => {
                            const d = Math.sqrt((e.x - this.x) ** 2 + (e.y - this.y) ** 2);
                            if (d < 180) {
                                e.stun(1500);
                                e.x = (e.x + this.x) / 2; e.y = (e.y + this.y) / 2; // Pull center
                            }
                        });
                        this.internalTimer = 15000;
                    }
                }

                // Normal Attack with Level 5 specific logic
                let dmg = this.damage;
                if (this.type === 'magic' && this.level >= 5) {
                    this.manaFocusTimer += this.timer;
                    const bonus = Math.min(0.3, Math.floor(this.manaFocusTimer / 1500) * 0.1);
                    dmg *= (1 + bonus);
                    if (bonus > 0) this.game.particles.push({ type: 'mana_beam', x: this.x, y: this.y, tx: this.currentTarget.x, ty: this.currentTarget.y, life: 100 });
                }

                if (this.type === 'lightning') {
                    this.game.projectiles.push(new Projectile(this.x, this.y, this.currentTarget, dmg, this.type, this.game, this.level));
                    if (this.level >= 7) this.speedBonus = Math.min(0.5, this.speedBonus + 0.05);
                } else {
                    this.game.projectiles.push(new Projectile(this.x, this.y, this.currentTarget, dmg, this.type, this.game, this.level));
                }

                this.muzzleFlash = 100;
                this.timer = 0;
            }
        }
        if (this.muzzleFlash > 0) this.muzzleFlash -= delta;
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        const time = Date.now();
        const float = Math.sin(time / 400) * 3;
        const level = this.level;

        const img = this.game.images[this.type];
        if (img && img.complete && img.width > 0) {
            const config = this.game.spriteConfigs.towers[this.type] || { maxFrames: 1, speed: 120 };
            const frameW = img.width / config.maxFrames;
            const frameH = img.height;
            const frame = Math.floor(time / config.speed) % config.maxFrames;

            ctx.drawImage(img, frame * frameW, 0, frameW, frameH, -25, -35, 50, 60);
            ctx.restore();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Outfit'; ctx.textAlign = 'center'; ctx.fillText(`LVL ${this.level}`, this.x, this.y + 28);
            return; // Skip standard draw
        }

        // Base de Pedra - Evolui com o nível
        ctx.fillStyle = level >= 7 ? '#4527a0' : (level >= 3 ? '#546e7a' : '#37474f');
        ctx.fillRect(-20, -2, 40, 22);
        ctx.fillStyle = level >= 7 ? '#311b92' : (level >= 3 ? '#37474f' : '#263238');
        ctx.fillRect(-22, 16, 44, 4);

        // Detalhes de Filigrana (Nível 3+)
        if (level >= 3) {
            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1;
            ctx.strokeRect(-18, 0, 36, 18);
        }

        switch (this.type) {
            case 'cannon':
                // Nível 1: Fortaleza Móvel | Nível 3: Canhão Triplo | Nível 7: Siege Engine Rotativo
                ctx.fillStyle = level >= 7 ? '#212121' : '#4e342e';
                ctx.fillRect(-15, -12, 30, 15);

                // Engrenagens e Vapor (Mais complexo no Nível 7)
                const gearCount = level >= 7 ? 4 : 2;
                for (let i = 0; i < gearCount; i++) {
                    ctx.save();
                    ctx.translate(i % 2 === 0 ? -12 : 12, i < 2 ? 5 : -5);
                    ctx.rotate(i % 2 === 0 ? time / 500 : -time / 500);
                    ctx.fillStyle = '#bcaaa4';
                    ctx.fillRect(-4, -4, 8, 8);
                    ctx.restore();
                }

                // Canos
                const barrels = level >= 7 ? 6 : (level >= 3 ? 3 : 2);
                ctx.fillStyle = level >= 7 ? '#b0bec5' : '#cd7f32';
                for (let i = 0; i < barrels; i++) {
                    const offset = (i - (barrels - 1) / 2) * (level >= 7 ? 6 : 8);
                    const recoil = this.muzzleFlash > 0 ? 5 : 0;
                    ctx.fillRect(offset - 3, -25 + recoil, 6, 20);
                }

                if (this.muzzleFlash > 0) {
                    ctx.fillStyle = '#ffeb3b';
                    ctx.beginPath(); ctx.arc(0, -30, 15, 0, Math.PI * 2); ctx.fill();
                }
                break;

            case 'ice':
                // Nível 1: Obelisco | Nível 3: Cristais Etch | Nível 7: Glacial Palace
                ctx.fillStyle = level >= 7 ? '#e3f2fd' : '#bbdefb';
                if (level >= 7) {
                    ctx.beginPath(); ctx.moveTo(0, -45 + float); ctx.lineTo(20, -10 + float); ctx.lineTo(-20, -10 + float); ctx.fill();
                } else {
                    ctx.beginPath(); ctx.moveTo(0, -35 + float); ctx.lineTo(12, -10 + float); ctx.lineTo(-12, -10 + float); ctx.fill();
                }

                // Cristais Orbitais (Aumentam com o nível)
                const crystalCount = level >= 7 ? 6 : (level >= 3 ? 4 : 2);
                for (let i = 0; i < crystalCount; i++) {
                    const dist = level >= 7 ? 25 : 18;
                    const angle = (time / (level >= 7 ? 400 : 600)) + (i * Math.PI * 2 / crystalCount);
                    const cx = Math.cos(angle) * dist, cy = Math.sin(angle) * (dist / 2) - 15;
                    ctx.fillStyle = level >= 7 ? '#fff' : '#e3f2fd';
                    ctx.fillRect(cx - 3, cy - 3, 6, 6);
                    if (level >= 7) { // Glow effects
                        ctx.shadowBlur = 5; ctx.shadowColor = '#00bfff';
                        ctx.strokeRect(cx - 4, cy - 4, 8, 8);
                    }
                }

                ctx.shadowBlur = 15; ctx.shadowColor = '#00bfff';
                ctx.fillStyle = '#00bfff'; ctx.beginPath(); ctx.arc(0, -15 + float, 5 + level, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
                break;

            case 'fire':
                // Nível 1: Altar | Nível 3: Altar Ornado | Nível 7: Magma Fortress
                ctx.fillStyle = level >= 7 ? '#1a0f0e' : '#212121';
                ctx.fillRect(-18, -15, 36, 20);

                const pulseF = (Math.sin(time / 200) + 1) / 2;
                // Lava Cascades (Aumenta no Nível 7)
                ctx.fillStyle = '#ff4500';
                const streams = level >= 7 ? 4 : 2;
                for (let i = 0; i < streams; i++) {
                    const sOffset = (i - (streams - 1) / 2) * 12;
                    ctx.fillRect(sOffset - 2, -5, 4, 15 + pulseF * 5);
                }

                // Top Basin
                ctx.fillStyle = '#bf360c';
                ctx.beginPath(); ctx.ellipse(0, -15, 15, 8, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ff4500';
                ctx.beginPath(); ctx.arc(0, -18, 8 + pulseF * 6, 0, Math.PI * 2); ctx.fill();

                if (level >= 7) { // Heat haze/smoke
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                    ctx.fillRect(-10, -40 + float, 20, 10);
                }
                break;

            case 'poison':
                // Nível 1: Destilaria | Nível 3: Tanques Múltiplos | Nível 7: Majestic Distillery
                ctx.fillStyle = '#3e2723'; ctx.fillRect(-15, -10, 30, 15);

                const tankCount = level >= 7 ? 3 : (level >= 3 ? 2 : 1);
                for (let i = 0; i < tankCount; i++) {
                    const tx = (i - (tankCount - 1) / 2) * 12;
                    ctx.fillStyle = '#1b5e20'; ctx.fillRect(tx - 5, -28, 10, 20);
                    const bbl = Math.sin(time / 150 + i) * 3;
                    ctx.fillStyle = level >= 7 ? '#ccff90' : '#4caf50';
                    ctx.fillRect(tx - 3, -24 + bbl, 6, 12);
                }

                // Extra Pipes (Nível 7)
                if (level >= 7) {
                    ctx.strokeStyle = '#a1887f'; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-25, -20); ctx.lineTo(0, -35); ctx.stroke();
                }
                break;

            case 'lightning':
                // Nível 1: Tesla | Nível 3: Ornate Rings | Nível 7: Lightning Fortress
                ctx.fillStyle = level >= 7 ? '#263238' : '#546e7a';
                ctx.fillRect(-5, -30, 10, 35);

                const ringCount = level >= 7 ? 5 : (level >= 3 ? 4 : 3);
                ctx.fillStyle = level >= 7 ? '#ffd700' : '#bcaaa4';
                for (let i = 0; i < ringCount; i++) {
                    ctx.fillRect(-12, -28 + (i * 6), 24, 2);
                }

                // Arc Effects
                if (Math.random() > (level >= 7 ? 0.4 : 0.8)) {
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(0, -30);
                    ctx.lineTo((Math.random() - 0.5) * 30, -45); ctx.stroke();
                }

                ctx.fillStyle = '#78909c'; ctx.beginPath(); ctx.arc(0, -32, 8, 0, Math.PI * 2); ctx.fill();
                break;

            case 'magic':
                // Nível 1: Sanctuary | Nível 3: planetary rings | Nível 7: Arcane Observatory
                ctx.fillStyle = level >= 7 ? '#4a148c' : '#311b92';
                ctx.beginPath(); ctx.arc(0, 0, 20, Math.PI, 0); ctx.fill();

                // Central Eye or Orb
                ctx.shadowBlur = level >= 7 ? 20 : 10;
                ctx.shadowColor = '#ea80fc';
                ctx.fillStyle = level >= 7 ? '#fff' : '#ea80fc';
                ctx.beginPath(); ctx.arc(0, -5, 6 + level, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;

                // Multiple Rings (Level 7)
                const rings = level >= 7 ? 3 : (level >= 3 ? 2 : 1);
                for (let i = 0; i < rings; i++) {
                    ctx.strokeStyle = '#ba68c8'; ctx.lineWidth = 1;
                    ctx.save();
                    ctx.rotate(time / (1000 + i * 200));
                    ctx.beginPath(); ctx.ellipse(0, -5, 25 + i * 5, 10 + i * 2, 0, 0, Math.PI * 2); ctx.stroke();
                    ctx.restore();
                }
                break;
        }
        if (level >= 5) {
            // Aura de Especialização
            ctx.fillStyle = this.game.towerData[this.type].color;
            ctx.globalAlpha = 0.2;
            ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        ctx.restore();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Outfit'; ctx.textAlign = 'center'; ctx.fillText(`LVL ${this.level}`, this.x, this.y + 28);

        // Nível 7: Alcance Dourado e Barra de Cooldown
        if (this.game.selectedActiveTower === this) {
            if (this.level >= 7) {
                ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2); ctx.stroke();
            }
        }
        if (this.level >= 7 && this.internalTimer > 0) {
            const barW = 30, barH = 4;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - barW / 2, this.y - 35, barW, barH);
            ctx.fillStyle = '#ffd700';
            const progress = 1 - (this.internalTimer / (this.type === 'cannon' ? 12000 : (this.type === 'magic' ? 15000 : 10000)));
            ctx.fillRect(this.x - barW / 2, this.y - 35, barW * progress, barH);
        }
    }
}

class Projectile {
    constructor(x, y, target, damage, type, game, towerLevel = 1) {
        this.x = x; this.y = y; this.startX = x; this.startY = y;
        this.target = target; this.damage = damage; this.type = type; this.game = game;
        this.towerLevel = towerLevel;
        this.speed = 7; this.dead = false; this.piercing = (type === 'magic');
        this.hitEnemies = new Set();
    }
    update(delta) {
        if (Math.random() > 0.8) this.game.createMagicEffect(this.game.towerData[this.type].color, 1, this.x, this.y);

        if (this.piercing) {
            if (!this.vx) {
                const dx = this.target.x - this.x, dy = this.target.y - this.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                this.vx = (dx / (d || 1)) * this.speed;
                this.vy = (dy / (d || 1)) * this.speed;
            }
            this.x += this.vx * (delta / 16);
            this.y += this.vy * (delta / 16);

            for (let i = 0; i < this.game.enemies.length; i++) {
                const e = this.game.enemies[i];
                if (!this.hitEnemies.has(e)) {
                    const dx = e.x - this.x, dy = e.y - this.y;
                    const r = e.radius + 5;
                    if ((dx * dx + dy * dy) < r * r) {
                        this.applyEffects(e);
                        this.hitEnemies.add(e);
                    }
                }
            }
            if (this.x < -50 || this.x > 850 || this.y < -50 || this.y > 650) this.dead = true;
        } else {
            if (!this.target || this.target.dead) { this.dead = true; return; }
            const dx = this.target.x - this.x, dy = this.target.y - this.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 100) { // 10^2
                this.applyEffects(this.target);
                this.dead = true;
            } else {
                const d = Math.sqrt(d2);
                const step = this.speed * (delta / 16);
                this.x += (dx / d) * step;
                this.y += (dy / d) * step;
            }
        }
    }
    applyEffects(t) {
        t.takeDamage(this.damage);
        if (this.type === 'fire') {
            t.burn(this.damage * 0.5);
            if (this.towerLevel >= 5) this.game.particles.push({ type: 'puddle', x: t.x, y: t.y, color: '#ff4500', life: 3000, dmg: this.damage * 0.2 });
        }
        if (this.type === 'ice') {
            t.slow(0.4, 5000, this.towerLevel >= 5 ? 1.15 : 1.0);
            if (this.towerLevel >= 7) {
                t.icePrisonMarker++;
                if (t.icePrisonMarker >= 5) { t.stun(3000); t.icePrisonMarker = 0; this.game.vfxLayer.push({ type: 'ice_prison', x: t.x, y: t.y, life: 3000 }); }
            }
        }
        if (this.type === 'poison') {
            t.poison(this.damage * 0.3);
            if (this.towerLevel >= 5) { t.reduceArmor(0.25, 4000); this.game.vfxLayer.push({ type: 'gas_cloud', x: t.x, y: t.y, life: 4000 }); }
            if (this.towerLevel >= 7) t.viralMarker = true;
        }
        if (this.type === 'cannon' && this.towerLevel >= 5) {
            // Fragmentação
            for (let i = 0; i < 3; i++) {
                const shard = new Projectile(this.x, this.y, null, this.damage * 0.35, 'cannon', this.game, 1);
                shard.vx = (Math.random() - 0.5) * 10; shard.vy = (Math.random() - 0.5) * 10;
                shard.piercing = true; // Make shards linear
                this.game.projectiles.push(shard);
            }
        }
        if (this.type === 'lightning') {
            t.slow(1.0, 333);
            if (this.towerLevel >= 5) {
                // Cadeia de Raios
                let jumps = 2;
                let lastT = t;
                const hits = new Set([t]);
                const chain = () => {
                    if (jumps <= 0) return;
                    const next = this.game.enemies.find(e => {
                        const dx = e.x - lastT.x, dy = e.y - lastT.y;
                        return !hits.has(e) && (dx * dx + dy * dy) < 10000;
                    });
                    if (next) {
                        next.takeDamage(this.damage * 0.7);
                        this.game.particles.push({ type: 'lightning_arc', x: lastT.x, y: lastT.y, tx: next.x, ty: next.y, life: 100 });
                        lastT = next; hits.add(next); jumps--; chain();
                    }
                };
                chain();
            }
        }
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        // Reduced shadow usage for performance
        switch (this.type) {
            case 'cannon':
                ctx.fillStyle = '#424242'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ffeb3b'; ctx.fillRect(-2, -2, 4, 4);
                break;
            case 'ice':
                ctx.fillStyle = '#bbdefb'; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-4, -4); ctx.lineTo(-2, 0); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
                break;
            case 'fire':
                ctx.fillStyle = '#ff4500'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#424242'; ctx.beginPath(); ctx.arc(-2, -2, 3, 0, Math.PI * 2); ctx.fill();
                break;
            case 'poison':
                ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.5; ctx.fillRect(-3, -6, 6, 12); ctx.globalAlpha = 1;
                ctx.fillStyle = '#4caf50'; ctx.fillRect(-2, -2, 4, 6);
                break;
            case 'magic':
                ctx.fillStyle = '#ea80fc'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.fillRect(-2, -2, 4, 4);
                break;
            default:
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.reset(x, y, color);
    }
    reset(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
        this.life = 100;
        this.size = 4;
        return this;
    }
    update(delta) {
        this.x += this.vx * (delta / 16);
        this.y += this.vy * (delta / 16);
        this.life -= 5 * (delta / 16);
    }
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life / 100);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

window.onload = () => {
    window.game = new Game();
};
