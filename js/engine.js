/**
 * ULTRA CASTLE DEFENDERS - THE ETHEREAL UPDATE
 * Core Engine: js/engine.js
 */

const COLORS = {
    primary: '#7b2cbf',
    secondary: '#ff4d00',
    accent: '#2de38e',
    mana: '#00d4ff',
    gold: '#ffd700',
    poison: '#a7ff00',
    ice: '#bde0fe',
    shadow: 'rgba(0,0,0,0.5)'
};

const ENEMY_TYPES = {
    'grublin': { hp: 50, speed: 1.2, gold: 15, size: 1.0, color: '#4caf50', icon: '👹' },
    'predator': { hp: 30, speed: 2.5, gold: 20, size: 0.8, color: '#00bcd4', icon: '🦊' },
    'guardian': { hp: 200, speed: 0.6, gold: 40, size: 1.4, color: '#607d8b', icon: '🛡️' },
    'sentinel': { hp: 120, speed: 0.9, gold: 50, size: 1.2, color: '#9c27b0', icon: '🧙' },
    'boss': { hp: 2000, speed: 0.4, gold: 500, size: 2.5, color: '#ff5722', icon: '💀' }
};

const TOWER_TYPES = {
    'cannon': { name: 'Canhão Básico', cost: 100, range: 120, dmg: 10, spd: 1.0, icon: '🏹', color: '#8d6e63' },
    'fire': { name: 'Torre de Fogo', cost: 200, range: 100, dmg: 15, spd: 1.2, icon: '🔥', color: '#ef5350' },
    'ice': { name: 'Torre de Gelo', cost: 150, range: 110, dmg: 5, spd: 0.8, icon: '❄️', color: '#4fc3f7' },
    'lightning': { name: 'Torre de Raio', cost: 300, range: 150, dmg: 25, spd: 1.5, icon: '⚡', color: '#fff176' },
    'magic': { name: 'Torre Mágica', cost: 400, range: 140, dmg: 35, spd: 1.0, icon: '✨', color: '#ba68c8' },
    'poison': { name: 'Torre Veneno', cost: 250, range: 105, dmg: 8, spd: 1.1, icon: '🧪', color: '#81c784' }
};

class Particle {
    constructor(x, y, color, speedX, speedY, life = 1.0) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = speedX;
        this.vy = speedY;
        this.life = life;
        this.decay = 0.02 + Math.random() * 0.02;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class Enemy {
    constructor(type, path, wave) {
        const config = ENEMY_TYPES[type] || ENEMY_TYPES['grublin'];
        this.type = type;
        this.path = path; // Path is an array of points {x, y}
        this.pathIndex = 0;
        this.x = path[0].x;
        this.y = path[0].y;

        // Scaling
        const hpMult = Math.pow(1.15, wave - 1);
        this.maxHp = Math.floor(config.hp * hpMult);
        if (wave > 15) this.armor = Math.min(30, (wave - 15) * 2); else this.armor = 0;

        this.hp = this.maxHp;
        this.speed = config.speed;
        this.gold = config.gold;
        this.size = config.size * 15;
        this.color = config.color;
        this.icon = config.icon;

        this.effects = {}; // {poison: {dmg: 1, duration: 60}, slow: {factor: 0.5, duration: 60}}
        this.wobble = 0;
        this.offset = {
            x: (Math.random() - 0.5) * 10,
            y: (Math.random() - 0.5) * 10
        };
        this.distanceTravelled = 0;
        this.isDead = false;
        this.isBoss = (type === 'boss');
    }

    update() {
        if (this.isDead) return;

        // Apply effects
        let currentSpeed = this.speed;
        if (this.effects.slow) {
            currentSpeed *= this.effects.slow.factor;
            this.effects.slow.duration--;
            if (this.effects.slow.duration <= 0) delete this.effects.slow;
        }
        if (this.effects.poison) {
            this.hp -= this.effects.poison.dmg / 60;
            this.effects.poison.duration--;
            if (this.effects.poison.duration <= 0) delete this.effects.poison;
        }
        if (this.effects.freeze) {
            currentSpeed = 0;
            this.effects.freeze.duration--;
            if (this.effects.freeze.duration <= 0) delete this.effects.freeze;
        }

        if (this.hp <= 0) {
            this.isDead = true;
            return;
        }

        // Movement
        const target = this.path[this.pathIndex + 1];
        if (!target) {
            // Reached castle
            game.takeDamage(this.isBoss ? 25 : 5);
            this.isDead = true;
            return;
        }

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < currentSpeed) {
            this.x = target.x;
            this.y = target.y;
            this.pathIndex++;
        } else {
            this.x += (dx / dist) * currentSpeed;
            this.y += (dy / dist) * currentSpeed;
        }

        this.distanceTravelled += currentSpeed;
        this.wobble += 0.15;
    }

    draw(ctx) {
        if (this.isDead) return;

        ctx.save();
        ctx.translate(this.x + this.offset.x, this.y + this.offset.y);

        // Wobble effect
        const s = 1 + Math.sin(this.wobble) * 0.1;
        ctx.scale(s, 2 - s);

        // Shadow
        ctx.fillStyle = COLORS.shadow;
        ctx.beginPath();
        ctx.ellipse(0, this.size - 5, this.size * 0.8, this.size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.font = `${this.size * 1.5}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, 0, 0);
        ctx.shadowBlur = 0;

        // Health Bar
        const barW = this.size * 2;
        const barH = 4;
        ctx.fillStyle = '#333';
        ctx.fillRect(-barW / 2, -this.size - 10, barW, barH);
        ctx.fillStyle = this.hp / this.maxHp > 0.5 ? '#2ecc71' : '#e74c3c';
        ctx.fillRect(-barW / 2, -this.size - 10, barW * (this.hp / this.maxHp), barH);

        // Status Icons
        let iconOffset = -this.size - 20;
        if (this.effects.slow) { ctx.font = '10px serif'; ctx.fillText('❄️', 0, iconOffset); iconOffset -= 12; }
        if (this.effects.poison) { ctx.font = '10px serif'; ctx.fillText('🧪', 0, iconOffset); iconOffset -= 12; }
        if (this.effects.freeze) { ctx.font = '10px serif'; ctx.fillText('🧊', 0, iconOffset); iconOffset -= 12; }

        ctx.restore();
    }
}

class Projectile {
    constructor(x, y, target, dmg, type, color) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.dmg = dmg;
        this.type = type;
        this.color = color;
        this.speed = 4;
        this.radius = 4;
        this.isDead = false;
    }

    update() {
        if (this.target.isDead) {
            this.isDead = true;
            return;
        }

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.speed) {
            this.hit();
            this.isDead = true;
        } else {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
    }

    hit() {
        this.target.hp -= this.dmg;
        // Effect application
        if (this.type === 'ice') {
            this.target.effects.slow = { factor: 0.5, duration: 120 };
        }
        if (this.type === 'poison') {
            this.target.effects.poison = { dmg: 5, duration: 180 };
        }

        // Particles
        for (let i = 0; i < 5; i++) {
            game.particles.push(new Particle(this.x, this.y, this.color, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4));
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

class Tower {
    constructor(x, y, type) {
        const config = TOWER_TYPES[type];
        this.x = x;
        this.y = y;
        this.type = type;
        this.level = 1;
        this.range = config.range;
        this.dmg = config.dmg;
        this.spd = config.spd;
        this.icon = config.icon;
        this.color = config.color;
        this.cooldown = 0;
        this.targetMode = 'first'; // first, last, strongest, closest
    }

    update(enemies) {
        if (this.cooldown > 0) {
            this.cooldown--;
            return;
        }

        const target = this.getBestTarget(enemies);
        if (target) {
            this.shoot(target);
            this.cooldown = 60 / this.spd;
        }
    }

    getBestTarget(enemies) {
        const inRange = enemies.filter(e => {
            const dist = Math.sqrt(Math.pow(e.x - this.x, 2) + Math.pow(e.y - this.y, 2));
            return dist <= this.range && !e.isDead;
        });

        if (inRange.length === 0) return null;

        switch (this.targetMode) {
            case 'first':
                return inRange.reduce((prev, curr) => curr.distanceTravelled > prev.distanceTravelled ? curr : prev);
            case 'last':
                return inRange.reduce((prev, curr) => curr.distanceTravelled < prev.distanceTravelled ? curr : prev);
            case 'strongest':
                return inRange.reduce((prev, curr) => curr.hp > prev.hp ? curr : prev);
            case 'closest':
                return inRange.reduce((prev, curr) => {
                    const d1 = Math.sqrt(Math.pow(prev.x - this.x, 2) + Math.pow(prev.y - this.y, 2));
                    const d2 = Math.sqrt(Math.pow(curr.x - this.x, 2) + Math.pow(curr.y - this.y, 2));
                    return d2 < d1 ? curr : prev;
                });
            default:
                return inRange[0];
        }
    }

    shoot(target) {
        game.projectiles.push(new Projectile(this.x, this.y, target, this.dmg, this.type, this.color));
    }

    draw(ctx, isSelected) {
        if (isSelected) {
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fill();
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // Base
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.roundRect(-20, -20, 40, 40, 8);
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Icon
        ctx.font = '24px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, 0, 0);

        // Level Tag
        ctx.fillStyle = COLORS.gold;
        ctx.font = 'bold 10px Outfit';
        ctx.fillText(`Lv.${this.level}`, 0, 15);

        ctx.restore();
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.gold = 500;
        this.hp = 100;
        this.maxHp = 100;
        this.wave = 0;
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.particles = [];
        this.isPaused = false;
        this.selectedTower = null;
        this.selectedTowerType = null;

        this.paths = [
            [{ x: 0, y: 300 }, { x: 200, y: 300 }, { x: 200, y: 150 }, { x: 600, y: 150 }, { x: 600, y: 450 }, { x: 800, y: 450 }],
            [{ x: 0, y: 300 }, { x: 200, y: 300 }, { x: 200, y: 450 }, { x: 600, y: 450 }, { x: 600, y: 150 }, { x: 800, y: 150 }]
        ];

        this.talents = {
            dmg: 1.0,
            gold: 1.0,
            castle: 1.0
        };

        this.init();
    }

    init() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.togglePause();
        });
        this.loop();
    }

    start() {
        document.getElementById('start-screen').classList.add('hidden');
        this.nextWave();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pause-menu').classList.toggle('hidden', !this.isPaused);
    }

    takeDamage(amt) {
        this.hp -= amt;
        this.updateHUD();
        if (this.hp <= 0) this.gameOver();
    }

    updateHUD() {
        document.getElementById('gold-value').innerText = Math.floor(this.gold);
        document.getElementById('wave-number').innerText = this.wave;
        const hpPerc = Math.max(0, (this.hp / this.maxHp) * 100);
        document.getElementById('hp-bar-fill').style.width = `${hpPerc}%`;
    }

    selectTowerType(type) {
        this.selectedTowerType = type;
        if (this.selectedTowerType) {
            this.canvas.style.cursor = 'copy';
        }
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

        // Check if clicking existing tower
        const clickedTower = this.towers.find(t => Math.sqrt(Math.pow(t.x - x, 2) + Math.pow(t.y - y, 2)) < 25);
        if (clickedTower) {
            this.selectTower(clickedTower);
            return;
        }

        // Try to place tower
        if (this.selectedTowerType) {
            this.placeTower(x, y);
        } else {
            this.deselectTower();
        }
    }

    placeTower(x, y) {
        const cost = TOWER_TYPES[this.selectedTowerType].cost;
        if (this.gold >= cost) {
            // Check if near path
            const isNearPath = this.paths.some(path => {
                for (let i = 0; i < path.length - 1; i++) {
                    const d = this.distToSegment({ x, y }, path[i], path[i + 1]);
                    if (d < 40) return true;
                }
                return false;
            });

            if (isNearPath) {
                this.announce("Não pode construir no caminho!", "#ff4d4d");
                return;
            }

            this.towers.push(new Tower(x, y, this.selectedTowerType));
            this.gold -= cost;
            this.selectedTowerType = null;
            this.canvas.style.cursor = 'crosshair';
            this.updateHUD();
        } else {
            this.announce("Ouro insuficiente!", "#ff4d4d");
        }
    }

    distToSegment(p, v, w) {
        const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
        if (l2 === 0) return Math.sqrt(Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2));
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.sqrt(Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) + Math.pow(p.y - (v.y + t * (w.y - v.y)), 2));
    }

    selectTower(tower) {
        this.selectedTower = tower;
        document.getElementById('evolution-menu').classList.remove('hidden');
        document.getElementById('evo-name').innerText = TOWER_TYPES[tower.type].name.toUpperCase();
        document.getElementById('evo-level-tag').innerText = `Lv. ${tower.level}`;
        document.getElementById('stat-dmg').innerText = tower.dmg;
        document.getElementById('stat-rng').innerText = tower.range;
        document.getElementById('stat-spd').innerText = tower.spd.toFixed(2);
        document.getElementById('evolve-cost').innerText = `$${Math.floor(TOWER_TYPES[tower.type].cost * Math.pow(1.5, tower.level))}`;

        // Update targeting UI
        document.querySelectorAll('.target-btn').forEach(btn => {
            btn.classList.toggle('active', btn.id === `target-${tower.targetMode}`);
        });
    }

    deselectTower() {
        this.selectedTower = null;
        document.getElementById('evolution-menu').classList.add('hidden');
    }

    setTargetMode(mode) {
        if (this.selectedTower) {
            this.selectedTower.targetMode = mode;
            this.selectTower(this.selectedTower);
        }
    }

    upgradeSelectedTower() {
        if (!this.selectedTower) return;
        const cost = Math.floor(TOWER_TYPES[this.selectedTower.type].cost * Math.pow(1.5, this.selectedTower.level));
        if (this.gold >= cost) {
            this.gold -= cost;
            this.selectedTower.level++;
            this.selectedTower.dmg = Math.floor(this.selectedTower.dmg * 1.4);
            this.selectedTower.range *= 1.1;
            this.selectedTower.spd *= 1.1;
            this.updateHUD();
            this.selectTower(this.selectedTower);
            this.announce("Torre Evoluída!", COLORS.accent);
        }
    }

    sellSelectedTower() {
        if (!this.selectedTower) return;
        const refund = Math.floor(TOWER_TYPES[this.selectedTower.type].cost * 0.7 * this.selectedTower.level);
        this.gold += refund;
        this.towers = this.towers.filter(t => t !== this.selectedTower);
        this.deselectTower();
        this.updateHUD();
    }

    nextWave() {
        this.wave++;
        this.updateHUD();
        this.spawnWave();
    }

    spawnWave() {
        let count = 5 + Math.floor(this.wave / 2);
        let spawned = 0;

        const isBossWave = (this.wave % 10 === 0);
        if (isBossWave) {
            this.spawnBoss();
        }

        const interval = setInterval(() => {
            if (this.isPaused) return;

            const type = this.getEnemyTypeForWave();
            const path = this.paths[Math.floor(Math.random() * this.paths.length)];
            this.enemies.push(new Enemy(type, path, this.wave));

            spawned++;
            if (spawned >= count) clearInterval(interval);
        }, 800);
    }

    getEnemyTypeForWave() {
        const roll = Math.random();
        if (this.wave < 3) return 'grublin';
        if (this.wave < 10) return roll < 0.8 ? 'grublin' : 'predator';
        if (this.wave < 20) return roll < 0.6 ? 'grublin' : (roll < 0.9 ? 'predator' : 'guardian');
        return roll < 0.4 ? 'grublin' : (roll < 0.7 ? 'predator' : (roll < 0.9 ? 'guardian' : 'sentinel'));
    }

    spawnBoss() {
        const path = this.paths[0];
        const data = BOSS_DATA[this.wave] || BOSS_DATA[10];
        const boss = new Enemy('boss', path, this.wave);
        boss.icon = data.icon;
        boss.color = data.color;
        this.enemies.push(boss);
        this.showBossHUD(boss, data.name);
    }

    showBossHUD(boss, name) {
        const hud = document.getElementById('boss-hud');
        hud.classList.remove('hidden');
        document.getElementById('boss-name').innerText = name;
        this.currentBoss = boss;
    }

    victory() {
        document.getElementById('end-screen').classList.remove('hidden');
        document.getElementById('end-title').innerText = "VITÓRIA LENDÁRIA";
        document.getElementById('end-subtitle').innerText = "O Vale foi purificado pela sua luz!";
        document.getElementById('infinite-btn').style.display = 'block';
        this.isPaused = true;
    }

    startInfiniteMode() {
        this.isInfinite = true;
        this.isPaused = false;
        document.getElementById('end-screen').classList.add('hidden');
        this.nextWave();
    }

    announce(msg, color = "#fff") {
        const el = document.getElementById('announcement');
        const main = document.getElementById('announcement-main');
        main.innerText = msg;
        main.style.color = color;
        el.style.opacity = 1;
        setTimeout(() => el.style.opacity = 0, 2000);
    }

    castSkill(type) {
        const skills = {
            'arrows': { cost: 250, dmg: 40, color: '#fff' },
            'fire': { cost: 500, dmg: 100, color: '#ff4d00' },
            'ice': { cost: 600, dmg: 20, freeze: 120, color: '#00d4ff' },
            'lightning': { cost: 1000, dmg: 300, color: '#ffeb3b' },
            'annihilation': { cost: 2500, dmg: 1000, color: '#7b2cbf' }
        };

        const skill = skills[type];
        if (this.gold >= skill.cost) {
            this.gold -= skill.cost;
            this.updateHUD();

            this.enemies.forEach(e => {
                e.hp -= skill.dmg;
                if (skill.freeze) e.effects.freeze = { duration: skill.freeze };

                // Visual feedback
                for (let i = 0; i < 3; i++) {
                    this.particles.push(new Particle(e.x, e.y, skill.color, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10));
                }
            });

            this.announce(`ATAQUE: ${type.toUpperCase()}!`, skill.color);
        } else {
            this.announce("Ouro insuficiente para habilidade!", "#ff4d4d");
        }
    }

    loop() {
        if (!this.isPaused) {
            this.update();
        }
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    update() {
        this.enemies.forEach(e => e.update());
        this.enemies = this.enemies.filter(e => {
            if (e.isDead && e.hp <= 0) {
                this.gold += e.gold * this.talents.gold;
                this.updateHUD();
                return false;
            }
            return !e.isDead;
        });

        this.towers.forEach(t => t.update(this.enemies));
        this.projectiles.forEach(p => p.update());
        this.projectiles = this.projectiles.filter(p => !p.isDead);

        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.life > 0);

        // Wave completion
        if (this.enemies.length === 0) {
            document.getElementById('skip-wave-btn').style.display = 'block';
        } else {
            document.getElementById('skip-wave-btn').style.display = 'none';
        }

        // Boss HUD update
        if (this.currentBoss) {
            const perc = Math.max(0, (this.currentBoss.hp / this.currentBoss.maxHp) * 100);
            document.getElementById('boss-hp-fill').style.width = `${perc}%`;
            if (this.currentBoss.isDead) {
                this.currentBoss = null;
                document.getElementById('boss-hud').classList.add('hidden');
                this.openTalentMenu();
            }
        }
    }

    skipWave() {
        this.gold += 20;
        this.nextWave();
    }

    openTalentMenu() {
        document.getElementById('talent-menu').classList.remove('hidden');
        const options = [
            { id: 'dmg', name: 'FORÇA ANCESTRAL', desc: '+20% de Dano em todas as torres', icon: '⚔️' },
            { id: 'gold', name: 'GANÂNCIA DO REI', desc: '+15% de Ouro por inimigo', icon: '💰' },
            { id: 'castle', name: 'ESCUDO DO VALE', desc: '+50 de Vida Máxima do Castelo', icon: '🛡️' }
        ];

        const container = document.getElementById('talent-options');
        container.innerHTML = '';
        options.forEach(opt => {
            const card = document.createElement('div');
            card.className = 'talent-card';
            card.innerHTML = `
                <div class="talent-icon">${opt.icon}</div>
                <div class="talent-name">${opt.name}</div>
                <div class="talent-desc">${opt.desc}</div>
            `;
            card.onclick = () => this.applyTalent(opt.id);
            container.appendChild(card);
        });
    }

    applyTalent(id) {
        if (id === 'dmg') this.talents.dmg += 0.2;
        if (id === 'gold') this.talents.gold += 0.15;
        if (id === 'castle') { this.maxHp += 50; this.hp += 50; }

        document.getElementById('talent-menu').classList.add('hidden');
        this.updateHUD();
        this.announce("Talento Adquirido!", COLORS.gold);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Map
        this.drawMap();

        // Draw Towers
        this.towers.forEach(t => t.draw(this.ctx, t === this.selectedTower));

        // Draw Enemies
        this.enemies.forEach(e => e.draw(this.ctx));

        // Draw Projectiles
        this.projectiles.forEach(p => p.draw(this.ctx));

        // Draw Particles
        this.particles.forEach(p => p.draw(this.ctx));
    }

    drawMap() {
        // Background grass
        this.ctx.fillStyle = '#1e2d1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Paths
        this.ctx.strokeStyle = '#2d1e11'; // Brown dirt
        this.ctx.lineWidth = 42;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.paths.forEach(path => {
            this.ctx.beginPath();
            this.ctx.moveTo(path[0].x, path[0].y);
            path.forEach(p => this.ctx.lineTo(p.x, p.y));
            this.ctx.stroke();

            this.ctx.strokeStyle = '#3d2e21';
            this.ctx.lineWidth = 36;
            this.ctx.stroke();
            this.ctx.strokeStyle = '#2d1e11';
            this.ctx.lineWidth = 42;
        });

        // Environment Details (Static Seeded Decorations)
        if (!this.decorations) {
            this.decorations = [];
            for (let i = 0; i < 40; i++) {
                this.decorations.push({
                    x: Math.random() * 800,
                    y: Math.random() * 600,
                    type: Math.random() < 0.3 ? '🌲' : (Math.random() < 0.6 ? '🪨' : '🍄'),
                    size: 15 + Math.random() * 10
                });
            }
        }

        this.decorations.forEach(d => {
            this.ctx.font = `${d.size}px serif`;
            this.ctx.globalAlpha = 0.5;
            this.ctx.fillText(d.type, d.x, d.y);
            this.ctx.globalAlpha = 1.0;
        });

        // Castle (Glow)
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = COLORS.primary;
        this.ctx.font = '70px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🏰', 750, 315);
        this.ctx.shadowBlur = 0;

        // Portal (Pulse)
        const portalS = 60 + Math.sin(Date.now() * 0.005) * 5;
        this.ctx.font = `${portalS}px serif`;
        this.ctx.fillText('🌀', 30, 315);
    }

    gameOver() {
        document.getElementById('end-screen').classList.remove('hidden');
        document.getElementById('end-title').innerText = "O VALE CAIU";
        document.getElementById('end-subtitle').innerText = "As sombras consumiram o Castelo";
        document.getElementById('stat-wave').innerText = this.wave;
        this.isPaused = true;
    }
}

const game = new Game();
