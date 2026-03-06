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
        this.vfxLayer = [];
        this.screenShake = 0;
        this.screenColorOverlay = null;
        this.overlayTimer = 0;
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
        this.towerData = {
            cannon: { cost: 100, name: "Canhão Básico", icon: "🏹", color: "#8a2be2", range: 150 },
            fire: { cost: 200, name: "Torre de Fogo", icon: "🔥", color: "#ff4500", range: 120 },
            ice: { cost: 150, name: "Torre de Gelo", icon: "❄️", color: "#00bfff", range: 130 },
            lightning: { cost: 300, name: "Torre de Raio", icon: "⚡", color: "#ffff00", range: 160 },
            magic: { cost: 400, name: "Torre Mágica", icon: "✨", color: "#da70d6", range: 160 },
            poison: { cost: 250, name: "Torre Veneno", icon: "🧪", color: "#32cd32", range: 140 }
        };

        this.init();
        this.setupBackground();
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
        this.updateHUD();
    }

    setupBackground() {
        this.bgCanvas = document.createElement('canvas');
        this.bgCanvas.width = 800;
        this.bgCanvas.height = 600;
        const bctx = this.bgCanvas.getContext('2d');

        // Forest Grass
        bctx.fillStyle = '#2e7d32';
        bctx.fillRect(0, 0, 800, 600);
        for (let i = 0; i < 3000; i++) {
            bctx.fillStyle = Math.random() > 0.5 ? '#1b5e20' : '#388e3c';
            bctx.fillRect(Math.random() * 800, Math.random() * 600, 2, 2);
        }
        for (let i = 0; i < 500; i++) {
            bctx.fillStyle = '#4caf50';
            bctx.fillRect(Math.random() * 800, Math.random() * 600, 2, 4);
        }

        // Dirt Path
        bctx.strokeStyle = '#795548';
        bctx.lineWidth = 44;
        bctx.lineCap = 'round';
        bctx.lineJoin = 'round';
        bctx.beginPath();
        bctx.moveTo(this.path[0].x, this.path[0].y);
        this.path.forEach(p => bctx.lineTo(p.x, p.y));
        bctx.stroke();

        bctx.strokeStyle = '#8d6e63';
        bctx.lineWidth = 36;
        bctx.stroke();

        // Path stones
        for (let i = 0; i < 1500; i++) {
            const x = Math.random() * 800, y = Math.random() * 600;
            if (this.isNearPath(x, y, 22)) {
                bctx.fillStyle = Math.random() > 0.7 ? '#5d4037' : '#9c7e6e';
                bctx.fillRect(x, y, 2, 2);
            }
        }
    }

    start() {
        this.paused = false;
        const startScreen = document.getElementById('start-screen');
        if (startScreen) startScreen.style.display = 'none';
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.loop(time));
    }

    updateHUD() {
        const goldVal = document.getElementById('gold-value');
        const hpVal = document.getElementById('hp-value');
        const waveNum = document.getElementById('wave-number');
        if (goldVal) goldVal.innerText = Math.floor(this.gold);
        if (hpVal) hpVal.innerText = Math.max(0, this.hp);
        if (waveNum) waveNum.innerText = this.wave;

        Object.keys(this.skills).forEach(id => {
            const skill = this.skills[id];
            const btn = document.getElementById('skill-' + id);
            if (!btn) return;
            const now = Date.now();
            const elapsed = now - (skill.lastUsed || 0);
            const isCooldown = elapsed < skill.cooldown;
            btn.disabled = this.gold < skill.cost || isCooldown;
            const cooldownEl = document.getElementById('cooldown-' + id);
            if (cooldownEl) {
                if (isCooldown) cooldownEl.style.height = (100 - (elapsed / skill.cooldown * 100)) + '%';
                else cooldownEl.style.height = '0%';
            }
        });
    }

    handleMouseMove(e) { this.handleInput(e.clientX, e.clientY, false); }
    handleMouseDown(e) { this.handleInput(e.clientX, e.clientY, true); }

    handleInput(clientX, clientY, isClick) {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = (clientX - rect.left) * (800 / rect.width);
        const y = (clientY - rect.top) * (600 / rect.height);
        if (isClick) this.processClick(x, y, clientX, clientY);
        else this.towerToPlace = this.selectedTowerType ? { x, y, type: this.selectedTowerType } : null;
    }

    processClick(x, y, screenX, screenY) {
        // Find clicked tower
        const clickedTower = this.towers.find(t => Math.sqrt((t.x - x) ** 2 + (t.y - y) ** 2) < 25);

        if (clickedTower) {
            this.selectedActiveTower = clickedTower;
            this.showUpgradeMenu();
            this.selectedTowerType = null;
            this.selectTowerType(null); // Clear placement selection
            return;
        }

        // Clicked empty space
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
        return this.towers.some(t => Math.sqrt((t.x - x) ** 2 + (t.y - y) ** 2) < 40);
    }

    deselectTower() {
        this.selectedActiveTower = null;
        const menu = document.getElementById('evolution-menu');
        if (menu) menu.classList.add('hidden');
    }

    isNearPath(x, y, dist) {
        for (let i = 0; i < this.path.length - 1; i++) {
            const p1 = this.path[i], p2 = this.path[i + 1];
            const L2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
            if (L2 === 0) continue;
            let t = Math.max(0, Math.min(1, ((x - p1.x) * (p2.x - p1.x) + (y - p1.y) * (p2.y - p1.y)) / L2));
            if (Math.sqrt((x - (p1.x + t * (p2.x - p1.x))) ** 2 + (y - (p1.y + t * (p2.y - p1.y))) ** 2) < dist) return true;
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

        // Update texts
        document.getElementById('evo-tower-preview').innerText = data.icon;
        document.getElementById('evo-name').innerText = data.name.toUpperCase();
        document.getElementById('evo-level-tag').innerText = `Lv. ${tower.level}`;

        // Stats
        document.getElementById('stat-dmg').innerText = tower.damage.toFixed(1);
        document.getElementById('stat-rng').innerText = (tower.range / 10).toFixed(1); // Visual scale
        document.getElementById('stat-spd').innerText = (1000 / tower.atkS).toFixed(2);

        // XP/Level Bar
        document.getElementById('evo-xp-fill').style.width = (tower.level / 7 * 100) + '%';

        // Evolve Button
        const evolveBtn = document.getElementById('evolve-btn');
        const cost = tower.getUpgradeCost();
        document.getElementById('evolve-cost').innerText = tower.level >= 7 ? 'MAX' : `$${cost}`;
        evolveBtn.disabled = tower.level >= 7 || this.gold < cost;
    }

    upgradeSelectedTower() {
        if (this.selectedActiveTower && this.selectedActiveTower.level < 7) {
            const cost = this.selectedActiveTower.getUpgradeCost();
            if (this.gold >= cost) {
                this.gold -= cost;
                this.selectedActiveTower.upgrade();
                this.updateHUD();
                this.showUpgradeMenu(); // Refresh menu
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

    announce(main, sub) {
        const el = document.getElementById('announcement');
        const amain = document.getElementById('announcement-main');
        const asub = document.getElementById('announcement-sub');
        if (!el || !amain || !asub) return;
        amain.innerText = main;
        asub.innerText = sub;
        el.style.opacity = '1';
        setTimeout(() => el.style.opacity = '0', 3000);
    }

    castSkill(id) {
        const skill = this.skills[id];
        if (!skill || this.gold < skill.cost || Date.now() - (skill.lastUsed || 0) < skill.cooldown) return;

        this.gold -= skill.cost;
        skill.lastUsed = Date.now();

        // Visual feedback on button
        const btn = document.getElementById('skill-' + id);
        if (btn) {
            btn.classList.add('activated');
            setTimeout(() => btn.classList.remove('activated'), 400);
        }

        this.triggerSuperAttack(id);
        this.updateHUD();
    }

    triggerSuperAttack(type) {
        switch (type) {
            case 'arrows':
                this.screenShake = 15;
                for (let i = 0; i < 60; i++) {
                    this.vfxLayer.push({
                        type: 'arrow',
                        x: Math.random() * 800,
                        y: -50 - Math.random() * 200,
                        speed: 15 + Math.random() * 10,
                        life: 100
                    });
                }
                setTimeout(() => {
                    this.enemies.forEach(e => e.takeDamage(15));
                    this.createMagicEffect('#fff', 30);
                }, 400);
                break;

            case 'fire':
                this.screenShake = 25;
                this.vfxLayer.push({ type: 'explosion', x: 400, y: 300, radius: 0, maxRadius: 400, life: 100 });
                this.enemies.forEach(e => { e.takeDamage(25); e.burn(8); });
                break;

            case 'ice':
                this.screenColorOverlay = 'rgba(0, 191, 255, 0.3)';
                this.overlayTimer = 5000;
                this.enemies.forEach(e => { e.takeDamage(5); e.slow(0.7, 5000); });
                break;

            case 'lightning':
                this.screenShake = 10;
                for (let i = 0; i < 8; i++) {
                    setTimeout(() => {
                        const tx = Math.random() * 800;
                        this.vfxLayer.push({ type: 'lightning_strike', x: tx, life: 100 });
                        this.enemies.forEach(e => {
                            if (Math.abs(e.x - tx) < 100) e.takeDamage(40);
                        });
                    }, i * 150);
                }
                break;

            case 'annihilation':
                this.screenColorOverlay = 'rgba(255, 255, 255, 0.8)';
                this.overlayTimer = 1000;
                this.screenShake = 40;
                setTimeout(() => {
                    this.enemies.forEach(e => e.takeDamage(e.hp * 0.7 + 100));
                }, 500);
                break;
        }
    }

    createMagicEffect(color, count, x = null, y = null) {
        for (let i = 0; i < count; i++) {
            const px = x !== null ? x : Math.random() * 800;
            const py = y !== null ? y : Math.random() * 600;
            this.particles.push(new Particle(px, py, color));
        }
    }

    loop(time) {
        const delta = time - this.lastTime;
        this.lastTime = time;
        if (!this.paused) this.update(delta);
        this.draw();
        if (this.hp > 0) requestAnimationFrame((t) => this.loop(t));
        else this.gameOver();
    }

    update(delta) {
        if (this.screenShake > 0) this.screenShake -= delta * 0.05;
        if (this.overlayTimer > 0) this.overlayTimer -= delta;
        else this.screenColorOverlay = null;

        this.vfxLayer.forEach((v, i) => {
            if (v.type === 'arrow') {
                v.y += v.speed;
                if (v.y > 700) this.vfxLayer.splice(i, 1);
            } else if (v.type === 'explosion') {
                v.radius += 10;
                v.life -= 2;
                if (v.life <= 0) this.vfxLayer.splice(i, 1);
            } else if (v.type === 'lightning_strike') {
                v.life -= 10;
                if (v.life <= 0) this.vfxLayer.splice(i, 1);
            }
        });

        if (this.enemies.length === 0 && this.enemiesSpawned >= this.enemiesInWave) {
            const reward = 100 + (this.wave * 50);
            this.gold += reward; this.wave++; this.enemiesSpawned = 0;
            this.enemiesInWave = Math.floor(10 * Math.pow(1.15, this.wave));
            this.announce("ONDA CONCLUÍDA", `Próxima: Onda ${this.wave} | Recompensa: $${reward}`);
            this.updateHUD();
        }
        this.spawnTimer += delta;
        if (this.spawnTimer > 1000 && this.enemiesSpawned < this.enemiesInWave) {
            let type = 'normal';
            const r = Math.random();
            if (this.wave >= 2 && r > 0.8) type = 'fast';
            if (this.wave >= 4 && r > 0.9) type = 'tank';
            if (this.wave >= 6 && r > 0.95) type = 'spawn';
            if (this.wave >= 8 && r > 0.98) type = 'shielded';
            this.enemies.push(new Enemy(this.wave, this, type));
            this.enemiesSpawned++; this.spawnTimer = 0;
        }

        this.enemies.forEach((e, i) => {
            e.update(delta);
            if (e.dead) {
                if (e.reachedEnd) { this.hp--; this.updateHUD(); }
                else {
                    this.gold += e.bounty; this.updateHUD();
                    if (e.type === 'spawn') for (let j = 0; j < 2; j++) {
                        const sub = new Enemy(this.wave, this, 'normal');
                        sub.x = e.x; sub.y = e.y; sub.hp = sub.maxHp * 0.5; sub.pathIndex = e.pathIndex;
                        this.enemies.push(sub);
                    }
                }
                this.enemies.splice(i, 1);
            }
        });
        this.towers.forEach(t => t.update(delta));
        this.projectiles.forEach((p, i) => { p.update(delta); if (p.dead) this.projectiles.splice(i, 1); });
        this.particles.forEach((p, i) => { p.update(delta); if (p.life <= 0) this.particles.splice(i, 1); });
    }

    draw() {
        this.ctx.save();
        if (this.screenShake > 0) {
            const rx = (Math.random() - 0.5) * this.screenShake;
            const ry = (Math.random() - 0.5) * this.screenShake;
            this.ctx.translate(rx, ry);
        }

        this.ctx.drawImage(this.bgCanvas, 0, 0);

        // Selection Aura and Range (Canvas side)
        if (this.selectedActiveTower) {
            const t = this.selectedActiveTower;
            // Draw Range Circle
            this.ctx.beginPath();
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            // Draw selection aura (glow)
            this.ctx.save();
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = 'white';
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(t.x, t.y, 22, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();
        }

        this.enemies.forEach(e => e.draw(this.ctx));
        this.towers.forEach(t => t.draw(this.ctx));
        this.projectiles.forEach(p => p.draw(this.ctx));
        this.particles.forEach(p => {
            if (typeof p.draw === 'function') p.draw(this.ctx);
            else {
                this.ctx.globalAlpha = p.life / 100;
                this.ctx.fillStyle = p.color;
                this.ctx.fillRect(p.x, p.y, 4, 4);
                this.ctx.globalAlpha = 1.0;
            }
        });

        // DRAW VFX LAYER
        this.vfxLayer.forEach(v => {
            if (v.type === 'arrow') {
                this.ctx.fillStyle = '#eee';
                this.ctx.fillRect(v.x, v.y, 2, 20);
            } else if (v.type === 'explosion') {
                this.ctx.beginPath();
                const g = this.ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, v.radius);
                g.addColorStop(0, 'rgba(255,255,255,1)');
                g.addColorStop(0.2, 'rgba(255,200,0,0.8)');
                g.addColorStop(1, 'rgba(255,0,0,0)');
                this.ctx.fillStyle = g;
                this.ctx.arc(v.x, v.y, v.radius, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (v.type === 'lightning_strike') {
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.moveTo(v.x, 0);
                let curX = v.x;
                for (let y = 0; y < 600; y += 50) {
                    curX += (Math.random() - 0.5) * 40;
                    this.ctx.lineTo(curX, y);
                }
                this.ctx.stroke();
            }
        });

        if (this.screenColorOverlay) {
            this.ctx.fillStyle = this.screenColorOverlay;
            this.ctx.fillRect(0, 0, 800, 600);
        }

        if (this.towerToPlace) {
            this.ctx.globalAlpha = 0.4;
            this.ctx.fillStyle = (this.isNearPath(this.towerToPlace.x, this.towerToPlace.y, 40) || this.isOverlappingTower(this.towerToPlace.x, this.towerToPlace.y)) ? 'rgba(255,0,0,0.5)' : 'rgba(0,255,0,0.3)';
            this.ctx.beginPath(); this.ctx.arc(this.towerToPlace.x, this.towerToPlace.y, 20, 0, Math.PI * 2); this.ctx.fill();
            this.ctx.strokeStyle = 'white'; this.ctx.lineWidth = 1;
            this.ctx.beginPath(); this.ctx.arc(this.towerToPlace.x, this.towerToPlace.y, this.towerData[this.towerToPlace.type].range || 150, 0, Math.PI * 2); this.ctx.stroke();
            this.ctx.globalAlpha = 1.0;
        }

        const cX = this.path[this.path.length - 1].x, cY = this.path[this.path.length - 1].y;
        this.ctx.fillStyle = '#455a64'; this.ctx.fillRect(cX - 25, cY - 20, 50, 40);
        this.ctx.fillStyle = '#607d8b'; this.ctx.fillRect(cX - 30, cY - 30, 15, 30); this.ctx.fillRect(cX + 15, cY - 30, 15, 30);
        this.ctx.fillStyle = '#b71c1c';
        this.ctx.beginPath(); this.ctx.moveTo(cX - 32, cY - 30); this.ctx.lineTo(cX - 22, cY - 45); this.ctx.lineTo(cX - 12, cY - 30); this.ctx.fill();
        this.ctx.beginPath(); this.ctx.moveTo(cX + 13, cY - 30); this.ctx.lineTo(cX + 23, cY - 45); this.ctx.lineTo(cX + 33, cY - 30); this.ctx.fill();

        // Wave counter fixed position (bottom right of canvas)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(660, 545, 130, 45);
        this.ctx.fillStyle = '#00fa9a';
        this.ctx.font = 'bold 22px Outfit';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`ONDA: ${this.wave}`, 780, 577);
        this.ctx.textAlign = 'left';

        this.ctx.restore(); // END SHAKE
    }

    gameOver() {
        this.paused = true;
        this.ctx.fillStyle = 'rgba(0,0,0,0.85)';
        this.ctx.fillRect(0, 0, 800, 600);

        // Gradient text for Game Over
        const grad = this.ctx.createLinearGradient(400, 200, 400, 300);
        grad.addColorStop(0, '#ff4d4d');
        grad.addColorStop(1, '#8b0000');

        this.ctx.fillStyle = grad;
        this.ctx.font = 'bold 72px Outfit';
        this.ctx.textAlign = 'center';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#ff4d4d';
        this.ctx.fillText('DERROTA', 400, 280);

        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px Outfit';
        this.ctx.fillText(`Seu castelo caiu na Onda ${this.wave}`, 400, 330);

        this.ctx.fillStyle = '#00fa9a';
        this.ctx.font = 'bold 18px Outfit';
        this.ctx.fillText('Pressione F5 para tentar novamente', 400, 400);
    }
}

class Enemy {
    constructor(wave, game, type = 'normal') {
        this.game = game; this.type = type; this.pathIndex = 0;
        this.x = game.path[0].x; this.y = game.path[0].y;
        this.radius = 12; this.shield = 0;
        let hpM = 1, spM = 1;
        switch (type) {
            case 'fast': hpM = 0.6; spM = 2; this.color = '#ffff00'; break;
            case 'tank': hpM = 3; spM = 0.6; this.radius = 18; this.color = '#8b4513'; break;
            case 'spawn': hpM = 1.5; spM = 1; this.color = '#9400d3'; break;
            case 'shielded': hpM = 1; spM = 0.8; this.shield = 5; this.color = '#4682b4'; break;
            default: this.color = '#ff4444';
        }
        this.maxHp = 20 * Math.pow(1.15, wave - 1) * hpM; this.hp = this.maxHp;
        this.speed = (1.2 + Math.random() * 0.5) * spM; this.tempSpeed = this.speed;
        this.bounty = Math.floor(10 * Math.pow(1.05, wave - 1));
        this.slowT = 0; this.burnT = 0; this.burnD = 0; this.poisonT = 0; this.poisonD = 0;
        this.lastT = 0; this.dead = false; this.reachedEnd = false;
    }
    update(delta) {
        if (this.slowT > 0) { this.slowT -= delta; if (this.slowT <= 0) this.tempSpeed = this.speed; }
        this.lastT += delta;
        if (this.lastT >= 1000) {
            if (this.burnT > 0) { this.takeDamage(this.burnD, true); this.burnT--; }
            if (this.poisonT > 0) { this.takeDamage(this.poisonD, true); this.poisonT--; }
            this.lastT = 0;
        }
        const target = this.game.path[this.pathIndex + 1];
        if (!target) { this.dead = true; this.reachedEnd = true; return; }
        const dx = target.x - this.x, dy = target.y - this.y, d = Math.sqrt(dx * dx + dy * dy);
        const md = this.tempSpeed * (delta / 16);
        if (d < md) { this.x = target.x; this.y = target.y; this.pathIndex++; }
        else { this.x += (dx / d) * md; this.y += (dy / d) * md; }
        if (this.hp <= 0) this.dead = true;
    }
    takeDamage(dmg, ignoreS = false) {
        if (!ignoreS && this.shield > 0) { this.shield--; return; }
        this.hp -= dmg; if (this.hp <= 0) this.dead = true;
    }
    slow(p, d) { this.tempSpeed = this.speed * (1 - p); this.slowT = d; }
    burn(d) { this.burnT = 4; this.burnD = d; }
    poison(d) { this.poisonT = 5; this.poisonD = d; }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        const bob = Math.sin(Date.now() / 150) * 2;
        const fBob = Math.sin(Date.now() / 80) * 4;
        switch (this.type) {
            case 'normal':
                ctx.fillStyle = '#a5a5a5'; ctx.fillRect(-6, -8 + bob, 12, 14);
                ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.arc(-8, bob, 6, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(6, 4 + bob); ctx.lineTo(12, -2 + bob); ctx.stroke();
                ctx.fillStyle = '#757575'; ctx.beginPath(); ctx.arc(0, -10 + bob, 5, 0, Math.PI * 2); ctx.fill();
                break;
            case 'fast':
                ctx.save(); ctx.rotate(0.2);
                ctx.fillStyle = '#1b5e20'; ctx.beginPath(); ctx.moveTo(-5, -5 + fBob); ctx.lineTo(10, 5 + fBob); ctx.lineTo(-5, 10 + fBob); ctx.fill();
                ctx.fillStyle = '#4caf50'; ctx.fillRect(-4, -6 + fBob, 8, 10);
                ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(0, -8 + fBob, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
                break;
            case 'tank':
                ctx.fillStyle = '#4e342e'; ctx.fillRect(-12, -15 + bob, 24, 25);
                ctx.fillStyle = '#5d4037'; ctx.fillRect(10, -10 + bob, 8, 20);
                ctx.fillStyle = '#8d6e63'; ctx.beginPath(); ctx.arc(0, -18 + bob, 8, 0, Math.PI * 2); ctx.fill();
                break;
            case 'spawn':
                const pl = Math.sin(Date.now() / 300) * 3;
                ctx.globalAlpha = 0.6; ctx.fillStyle = '#9c27b0'; ctx.beginPath(); ctx.arc(0, bob, 15 + pl, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1.0; ctx.fillStyle = '#e1bee7'; ctx.beginPath(); ctx.arc(-5 + pl, -5, 4, 0, Math.PI * 2); ctx.fill();
                break;
            case 'shielded':
                ctx.fillStyle = '#616161'; ctx.fillRect(-10, -10 + bob, 20, 20);
                ctx.fillStyle = '#212121'; ctx.fillRect(-16, -15 + bob, 10, 30);
                ctx.fillStyle = '#424242'; ctx.beginPath(); ctx.arc(0, -12 + bob, 7, 0, Math.PI * 2); ctx.fill();
                break;
            default:
                ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = '#333'; ctx.fillRect(this.x - 10, this.y - 20, 20, 4);
        ctx.fillStyle = '#2ecc71'; ctx.fillRect(this.x - 10, this.y - 20, 20 * (this.hp / this.maxHp), 4);
    }
}

class Tower {
    constructor(x, y, game, type) {
        this.x = x; this.y = y; this.game = game; this.type = type; this.level = 1; this.timer = 0;
        this.muzzleFlash = 0;
        const d = game.towerData[type];
        switch (type) {
            case 'cannon': this.range = 150; this.damage = 10; this.atkS = 1000; break;
            case 'fire': this.range = 120; this.damage = 5; this.atkS = 1200; break;
            case 'ice': this.range = 130; this.damage = 3; this.atkS = 1500; break;
            case 'lightning': this.range = 200; this.damage = 8; this.atkS = 600; break;
            case 'magic': this.range = 160; this.damage = 15; this.atkS = 2000; break;
            case 'poison': this.range = 140; this.damage = 4; this.atkS = 1300; break;
        }
    }
    getUpgradeCost() { return Math.floor(this.game.towerData[this.type].cost * Math.pow(1.8, this.level)); }
    upgrade() { this.level++; this.damage *= 1.4; this.range += 15; this.atkS *= 0.9; }
    update(delta) {
        this.timer += delta;
        if (this.timer >= this.atkS) {
            const t = this.game.enemies.find(e => Math.sqrt((e.x - this.x) ** 2 + (e.y - this.y) ** 2) <= this.range);
            if (t) {
                if (this.type === 'lightning') {
                    // Instant hit for tesla with paralysis
                    const dmg = this.damage;
                    const target = t;
                    target.takeDamage(dmg);
                    target.slow(1.0, 333); // Total paralysis for 1/3 second

                    // Add Lightning Arc Particle Effect
                    this.game.particles.push({
                        draw: (ctx) => {
                            ctx.strokeStyle = '#fff';
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            ctx.moveTo(this.x, this.y - 28);
                            // Jagged line
                            let curX = this.x, curY = this.y - 28;
                            for (let i = 0; i < 3; i++) {
                                curX += (target.x - curX) * 0.3 + (Math.random() - 0.5) * 30;
                                curY += (target.y - curY) * 0.3 + (Math.random() - 0.5) * 30;
                                ctx.lineTo(curX, curY);
                            }
                            ctx.lineTo(target.x, target.y);
                            ctx.stroke();
                            // Glow
                            ctx.strokeStyle = '#ffff00';
                            ctx.lineWidth = 4;
                            ctx.globalAlpha = 0.5;
                            ctx.stroke();
                            ctx.globalAlpha = 1.0;
                        },
                        update: function () { this.life -= 10; },
                        life: 100
                    });

                    this.muzzleFlash = 100;
                    this.timer = 0;
                } else {
                    this.game.projectiles.push(new Projectile(this.x, this.y, t, this.damage, this.type, this.game));
                    this.muzzleFlash = 100; // Trigger flash
                    this.timer = 0;
                }
            }
        }
        if (this.muzzleFlash > 0) this.muzzleFlash -= delta;
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        const time = Date.now();
        const float = Math.sin(time / 400) * 3;
        const level = this.level;

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
        ctx.restore();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Outfit'; ctx.textAlign = 'center'; ctx.fillText(`LVL ${this.level}`, this.x, this.y + 28);
    }
}

class Projectile {
    constructor(x, y, target, damage, type, game) {
        this.x = x; this.y = y; this.target = target; this.damage = damage; this.type = type; this.game = game;
        this.speed = 7; this.dead = false; this.piercing = (type === 'magic'); this.hitE = new Set();
    }
    update(delta) {
        // Trail particles
        if (Math.random() > 0.5) {
            let color = '#fff';
            if (this.type === 'fire') color = '#ff4500';
            if (this.type === 'ice') color = '#e3f2fd';
            if (this.type === 'poison') color = '#4caf50';
            if (this.type === 'magic') color = '#ea80fc';
            this.game.particles.push(new Particle(this.x, this.y, color));
        }

        if (this.piercing) {
            if (!this.vx) { const dx = this.target.x - this.x, dy = this.target.y - this.y, d = Math.sqrt(dx * dx + dy * dy); this.vx = (dx / d) * this.speed; this.vy = (dy / d) * this.speed; }
            this.x += this.vx; this.y += this.vy;
            this.game.enemies.forEach(e => { if (!this.hitE.has(e)) { if (Math.sqrt((e.x - this.x) ** 2 + (e.y - this.y) ** 2) < e.radius + 5) { this.apply(e); this.hitE.add(e); } } });
            if (this.x < 0 || this.x > 800 || this.y < 0 || this.y > 600) this.dead = true;
        } else {
            if (!this.target || this.target.dead) { this.dead = true; return; }
            const dx = this.target.x - this.x, dy = this.target.y - this.y, d = Math.sqrt(dx * dx + dy * dy);
            if (d < 10) { this.apply(this.target); this.dead = true; }
            else { this.x += (dx / d) * this.speed; this.y += (dy / d) * this.speed; }
        }
    }
    apply(t) {
        t.takeDamage(this.damage);
        if (this.type === 'fire') t.burn(this.damage * 0.5);
        if (this.type === 'ice') t.slow(0.4, 5000);
        if (this.type === 'poison') t.poison(this.damage * 0.3);
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        ctx.shadowBlur = 5;
        switch (this.type) {
            case 'cannon':
                // Obuseiro Explosivo
                ctx.fillStyle = '#424242'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ffeb3b'; ctx.fillRect(-2, -2, 4, 4); // Spikes/glow
                break;
            case 'ice':
                // Lança de Gelo
                ctx.fillStyle = '#bbdefb'; ctx.shadowColor = '#00bfff';
                ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-4, -4); ctx.lineTo(-2, 0); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
                break;
            case 'fire':
                // Meteoro Incandescente
                ctx.fillStyle = '#ff4500'; ctx.shadowColor = '#ff4500'; ctx.shadowBlur = 10;
                ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#424242'; ctx.beginPath(); ctx.arc(-2, -2, 3, 0, Math.PI * 2); ctx.fill();
                break;
            case 'poison':
                // Bomba de Bio-Risco (Flask)
                ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.5;
                ctx.fillRect(-3, -6, 6, 12); ctx.globalAlpha = 1;
                ctx.fillStyle = '#4caf50'; ctx.fillRect(-2, -2, 4, 6);
                break;
            case 'magic':
                // Estrela Cadente
                ctx.fillStyle = '#ea80fc'; ctx.shadowColor = '#ea80fc'; ctx.shadowBlur = 15;
                ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.fillRect(-2, -2, 4, 4);
                break;
            default:
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) { this.x = x; this.y = y; this.color = color; this.vx = (Math.random() - 0.5) * 5; this.vy = (Math.random() - 0.5) * 5; this.life = 100; }
    update() { this.x += this.vx; this.y += this.vy; this.life -= 2; }
    draw(ctx) { ctx.globalAlpha = this.life / 100; ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, 4, 4); ctx.globalAlpha = 1.0; }
}

window.onload = () => {
    window.game = new Game();
};
