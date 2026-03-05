class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
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
        this.isWaveInProgress = false;

        // Pathing coordinates (Point A to B)
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

        this.towerLimits = {
            cannon: 0,
            fire: 0,
            ice: 0,
            lightning: 0,
            magic: 0,
            poison: 0
        };

        this.towerData = {
            cannon: { cost: 100, name: "Canhão Básico", icon: "🏹", color: "#8a2be2" },
            fire: { cost: 200, name: "Torre de Fogo", icon: "🔥", color: "#ff4500" },
            ice: { cost: 150, name: "Torre de Gelo", icon: "❄️", color: "#00bfff" },
            lightning: { cost: 300, name: "Torre de Raio", icon: "⚡", color: "#ffff00" },
            magic: { cost: 400, name: "Torre Mágica", icon: "✨", color: "#da70d6" },
            poison: { cost: 250, name: "Torre Veneno", icon: "🧪", color: "#32cd32" }
        };

        this.init();
    }

    init() {
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.updateHUD();
    }

    start() {
        this.paused = false;
        document.getElementById('start-screen').style.display = 'none';
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.loop(time));
    }

    updateHUD() {
        document.getElementById('gold-value').innerText = Math.floor(this.gold);
        document.getElementById('hp-value').innerText = Math.max(0, this.hp);
        document.getElementById('wave-number').innerText = this.wave;

        // Update skill button states (disabled if not enough gold or on cooldown)
        Object.keys(this.skills).forEach(id => {
            const skill = this.skills[id];
            const btn = document.getElementById('skill-' + id);
            const now = Date.now();
            const elapsed = now - (skill.lastUsed || 0);
            const isCooldown = elapsed < skill.cooldown;
            btn.disabled = this.gold < skill.cost || isCooldown;

            // Update visual cooldown
            const cooldownEl = document.getElementById('cooldown-' + id);
            if (isCooldown) {
                const percent = 100 - (elapsed / skill.cooldown * 100);
                cooldownEl.style.height = percent + '%';
            } else {
                cooldownEl.style.height = '0%';
            }
        });
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.selectedTowerType) {
            this.towerToPlace = { x, y, type: this.selectedTowerType };
        } else {
            this.towerToPlace = null;
        }
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Overlay handling
        const overlay = document.getElementById('upgrade-overlay');
        overlay.style.display = 'none';

        // Check if clicking existing tower
        const clickedTower = this.towers.find(t =>
            Math.sqrt((t.x - x) ** 2 + (t.y - y) ** 2) < 25
        );

        if (clickedTower) {
            this.selectedActiveTower = clickedTower;
            this.showUpgradeMenu(e.clientX, e.clientY);
            this.selectedTowerType = null;
            return;
        }

        // Place new tower
        if (this.selectedTowerType) {
            const data = this.towerData[this.selectedTowerType];
            if (this.gold >= data.cost) {
                if (this.towerLimits[this.selectedTowerType] >= 5) {
                    this.announce("LIMITE ATINGIDO", "Máximo 5 torres deste tipo!");
                    return;
                }
                // Check if on path
                if (this.isNearPath(x, y, 40)) return;

                this.towers.push(new Tower(x, y, this, this.selectedTowerType));
                this.gold -= data.cost;
                this.towerLimits[this.selectedTowerType]++;
                this.selectedTowerType = null;
                this.updateHUD();
            }
        }
    }

    isNearPath(x, y, dist) {
        for (let i = 0; i < this.path.length - 1; i++) {
            const p1 = this.path[i];
            const p2 = this.path[i + 1];

            // Distance from point to line segment
            const L2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
            if (L2 === 0) continue;
            let t = ((x - p1.x) * (p2.x - p1.x) + (y - p1.y) * (p2.y - p1.y)) / L2;
            t = Math.max(0, Math.min(1, t));
            const projX = p1.x + t * (p2.x - p1.x);
            const projY = p1.y + t * (p2.y - p1.y);
            const d = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
            if (d < dist) return true;
        }
        return false;
    }

    selectTowerType(type) {
        this.selectedTowerType = type;
        // Visual feedback
        document.querySelectorAll('.shop-item').forEach(i => i.classList.remove('selected'));
        if (type) document.getElementById('shop-' + type).classList.add('selected');
    }

    showUpgradeMenu(screenX, screenY) {
        const overlay = document.getElementById('upgrade-overlay');
        const info = document.getElementById('upgrade-info');
        const tower = this.selectedActiveTower;

        overlay.style.display = 'block';
        overlay.style.left = screenX + 'px';
        overlay.style.top = (screenY - 60) + 'px';

        const nextLevel = tower.level + 1;
        const upgradeCost = tower.getUpgradeCost();

        info.innerHTML = `Nível: ${tower.level}/7<br>Next: +${tower.damage * 0.2} Dano | +10 Alcance`;
        const btn = overlay.querySelector('button');
        if (tower.level >= 7) {
            btn.innerText = "MAX NÍVEL";
            btn.disabled = true;
        } else {
            btn.innerText = `UPGRADE ($${upgradeCost})`;
            btn.disabled = false;
        }
    }

    upgradeSelectedTower() {
        if (!this.selectedActiveTower) return;
        const cost = this.selectedActiveTower.getUpgradeCost();
        if (this.gold >= cost && this.selectedActiveTower.level < 7) {
            this.gold -= cost;
            this.selectedActiveTower.upgrade();
            this.updateHUD();
            document.getElementById('upgrade-overlay').style.display = 'none';
        }
    }

    sellSelectedTower() {
        if (!this.selectedActiveTower) return;
        const tower = this.selectedActiveTower;
        this.gold += Math.floor(this.towerData[tower.type].cost * 0.5);
        this.towerLimits[tower.type]--;
        this.towers = this.towers.filter(t => t !== tower);
        this.updateHUD();
        document.getElementById('upgrade-overlay').style.display = 'none';
    }

    announce(main, sub) {
        const el = document.getElementById('announcement');
        document.getElementById('announcement-main').innerText = main;
        document.getElementById('announcement-sub').innerText = sub;
        el.style.opacity = '1';
        setTimeout(() => el.style.opacity = '0', 3000);
    }

    castSkill(id) {
        const skill = this.skills[id];
        if (this.gold < skill.cost) return;

        const now = Date.now();
        if (now - (skill.lastUsed || 0) < skill.cooldown) return;

        this.gold -= skill.cost;
        skill.lastUsed = now;

        // Apply skill logic
        switch (id) {
            case 'arrows':
                this.enemies.forEach(e => e.takeDamage(10));
                this.createMagicEffect('purple', 50);
                break;
            case 'fire':
                this.enemies.forEach(e => {
                    e.takeDamage(15);
                    e.burn(5);
                });
                this.createMagicEffect('orange', 80);
                break;
            case 'ice':
                this.enemies.forEach(e => {
                    e.takeDamage(5);
                    e.slow(0.5, 5000); // 50% slow for 5s
                });
                this.createMagicEffect('cyan', 60);
                break;
            case 'lightning':
                this.enemies.forEach(e => {
                    if (Math.random() > 0.5) e.takeDamage(100);
                });
                this.createMagicEffect('yellow', 100);
                break;
            case 'annihilation':
                this.enemies.forEach(e => e.takeDamage(e.hp * 0.5));
                this.createMagicEffect('white', 200);
                break;
        }

        this.updateHUD();
    }

    createMagicEffect(color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(
                Math.random() * this.canvas.width,
                Math.random() * this.canvas.height,
                color
            ));
        }
    }

    loop(time) {
        const delta = time - this.lastTime;
        this.lastTime = time;

        if (!this.paused) {
            this.update(delta);
        }

        this.draw();

        if (this.hp > 0) {
            requestAnimationFrame((t) => this.loop(t));
        } else {
            this.gameOver();
        }
    }

    update(delta) {
        // Wave management
        if (this.enemies.length === 0 && this.enemiesSpawned >= this.enemiesInWave) {
            const reward = 100 + (this.wave * 50);
            this.gold += reward;
            this.wave++;
            this.enemiesSpawned = 0;
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
            this.enemiesSpawned++;
            this.spawnTimer = 0;
        }

        // Entities update
        this.enemies.forEach((e, idx) => {
            e.update(delta);
            if (e.dead) {
                if (e.reachedEnd) {
                    this.hp--;
                    this.updateHUD();
                } else {
                    this.gold += e.bounty;
                    this.updateHUD();
                    // Spawn logic
                    if (e.type === 'spawn') {
                        for (let i = 0; i < 2; i++) {
                            const sub = new Enemy(this.wave, this, 'normal');
                            sub.x = e.x;
                            sub.y = e.y;
                            sub.hp = sub.maxHp * 0.5;
                            sub.pathIndex = e.pathIndex;
                            this.enemies.push(sub);
                        }
                    }
                }
                this.enemies.splice(idx, 1);
            }
        });

        this.towers.forEach(t => t.update(delta));
        this.projectiles.forEach((p, idx) => {
            p.update(delta);
            if (p.dead) this.projectiles.splice(idx, 1);
        });

        this.particles.forEach((p, idx) => {
            p.update(delta);
            if (p.life <= 0) this.particles.splice(idx, 1);
        });
    }

    draw() {
        const { ctx } = this;
        ctx.clearRect(0, 0, 800, 600);

        // Draw Map/Path
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 40;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(this.path[0].x, this.path[0].y);
        this.path.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();

        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw Entities
        this.enemies.forEach(e => e.draw(ctx));
        this.towers.forEach(t => t.draw(ctx));
        this.projectiles.forEach(p => p.draw(ctx));
        this.particles.forEach(p => p.draw(ctx));

        // Placement ghost
        if (this.towerToPlace) {
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = this.isNearPath(this.towerToPlace.x, this.towerToPlace.y, 40) ? 'red' : 'green';
            ctx.beginPath();
            ctx.arc(this.towerToPlace.x, this.towerToPlace.y, 20, 0, Math.PI * 2);
            ctx.fill();
            // Range indicator
            ctx.strokeStyle = 'white';
            ctx.beginPath();
            ctx.arc(this.towerToPlace.x, this.towerToPlace.y, 150, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }

        // Castle marker
        ctx.fillStyle = '#ff4d4d';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff4d4d';
        ctx.beginPath();
        ctx.arc(this.path[this.path.length - 1].x, this.path[this.path.length - 1].y, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Wave Counter on Canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(10, 10, 120, 40);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Outfit';
        ctx.textAlign = 'left';
        ctx.fillText(`ONDA: ${this.wave}`, 20, 37);
    }

    gameOver() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
        this.ctx.fillRect(0, 0, 800, 600);
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 48px Outfit';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('FIM DE JOGO', 400, 300);
        this.ctx.font = '24px Outfit';
        this.ctx.fillText(`Você chegou na Onda ${this.wave}`, 400, 350);
        this.ctx.fillText('Pressione F5 para reiniciar', 400, 400);
    }
}

class Enemy {
    constructor(wave, game, type = 'normal') {
        this.game = game;
        this.type = type;
        this.pathIndex = 0;
        this.x = game.path[0].x;
        this.y = game.path[0].y;
        this.baseHp = 20;

        let hpMult = 1;
        let speedMult = 1;
        this.radius = 12;

        switch (type) {
            case 'fast':
                hpMult = 0.6;
                speedMult = 2;
                this.color = '#ffff00';
                break;
            case 'tank':
                hpMult = 3;
                speedMult = 0.6;
                this.radius = 18;
                this.color = '#8b4513';
                break;
            case 'spawn':
                hpMult = 1.5;
                speedMult = 1;
                this.color = '#9400d3';
                break;
            case 'shielded':
                hpMult = 1;
                speedMult = 0.8;
                this.shield = 5;
                this.color = '#4682b4';
                break;
            default:
                this.color = '#ff4444';
        }

        this.maxHp = this.baseHp * Math.pow(1.15, wave - 1) * hpMult;
        this.hp = this.maxHp;
        this.speed = (1.2 + (Math.random() * 0.5)) * speedMult;
        this.tempSpeed = this.speed;
        this.slowTimer = 0;
        this.burnTimer = 0;
        this.burnTicks = 0;
        this.burnDamage = 0;
        this.poisonTimer = 0;
        this.poisonTicks = 0;
        this.poisonDamage = 0;
        this.lastTickTime = 0;
        this.bounty = Math.floor(10 * Math.pow(1.05, wave - 1));
        this.dead = false;
        this.reachedEnd = false;
    }

    update(delta) {
        if (this.slowTimer > 0) {
            this.slowTimer -= delta;
            if (this.slowTimer <= 0) this.tempSpeed = this.speed;
        }

        this.lastTickTime += delta;
        if (this.lastTickTime >= 1000) {
            if (this.burnTicks > 0) {
                this.takeDamage(this.burnDamage, true);
                this.burnTicks--;
            }
            if (this.poisonTicks > 0) {
                this.takeDamage(this.poisonDamage, true);
                this.poisonTicks--;
            }
            this.lastTickTime = 0;
        }

        // Visual effects timers (for coloring)
        if (this.burnTimer > 0) this.burnTimer -= delta;
        if (this.poisonTimer > 0) this.poisonTimer -= delta;

        const target = this.game.path[this.pathIndex + 1];
        if (!target) {
            this.dead = true;
            this.reachedEnd = true;
            return;
        }

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const moveDist = this.tempSpeed * (delta / 16);
        if (dist < moveDist) {
            this.x = target.x;
            this.y = target.y;
            this.pathIndex++;
        } else {
            this.x += (dx / dist) * moveDist;
            this.y += (dy / dist) * moveDist;
        }

        if (this.hp <= 0) this.dead = true;
    }

    takeDamage(dmg, ignoreShield = false) {
        if (!ignoreShield && this.shield > 0) {
            this.shield--;
            return;
        }
        this.hp -= dmg;
        if (this.hp <= 0) this.dead = true;
    }

    slow(percent, duration) {
        this.tempSpeed = this.speed * (1 - percent);
        this.slowTimer = duration;
    }

    burn(dmg) {
        this.burnTimer = 4000;
        this.burnTicks = 4;
        this.burnDamage = dmg;
    }

    poison(dmg) {
        this.poisonTimer = 5000;
        this.poisonTicks = 5;
        this.poisonDamage = dmg;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        if (this.slowTimer > 0) ctx.fillStyle = '#00ffff';
        if (this.burnTimer > 0) ctx.fillStyle = '#ffa500';
        if (this.poisonTimer > 0) ctx.fillStyle = '#32cd32';

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        if (this.shield > 0) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
            ctx.stroke();
        }

        // HP bar
        const barWidth = 20;
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - barWidth / 2, this.y - 20, barWidth, 4);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x - barWidth / 2, this.y - 20, barWidth * (this.hp / this.maxHp), 4);
    }
}

class Tower {
    constructor(x, y, game, type = 'cannon') {
        this.x = x;
        this.y = y;
        this.game = game;
        this.type = type;
        this.level = 1;
        this.timer = 0;

        const data = game.towerData[type];
        this.color = data.color;

        switch (type) {
            case 'cannon':
                this.range = 150;
                this.damage = 10;
                this.attackSpeed = 1000;
                break;
            case 'fire':
                this.range = 120;
                this.damage = 5;
                this.attackSpeed = 1200;
                break;
            case 'ice':
                this.range = 130;
                this.damage = 3;
                this.attackSpeed = 1500;
                break;
            case 'lightning':
                this.range = 200;
                this.damage = 8;
                this.attackSpeed = 600;
                break;
            case 'magic':
                this.range = 160;
                this.damage = 15;
                this.attackSpeed = 2000;
                break;
            case 'poison':
                this.range = 140;
                this.damage = 4;
                this.attackSpeed = 1300;
                break;
        }
    }

    getUpgradeCost() {
        const baseCost = this.game.towerData[this.type].cost;
        return Math.floor(baseCost * Math.pow(1.8, this.level));
    }

    upgrade() {
        this.level++;
        this.damage *= 1.4;
        this.range += 15;
        this.attackSpeed *= 0.9;
    }

    update(delta) {
        this.timer += delta;
        if (this.timer >= this.attackSpeed) {
            const target = this.findTarget();
            if (target) {
                this.game.projectiles.push(new Projectile(this.x, this.y, target, this.damage, this.type, this.game));
                this.timer = 0;
            }
        }
    }

    findTarget() {
        return this.game.enemies.find(e =>
            Math.sqrt((e.x - this.x) ** 2 + (e.y - this.y) ** 2) <= this.range
        );
    }

    draw(ctx) {
        const { x, y, color, type, level } = this;
        ctx.save();
        ctx.translate(x, y);

        // Tower Base (Universal)
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.rect(-18, -18, 36, 36);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        switch (type) {
            case 'cannon':
                // Wooden Platform
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(-15, -15, 30, 30);
                // Metal barrel
                ctx.fillStyle = '#424242';
                ctx.beginPath();
                ctx.arc(0, 0, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#212121';
                ctx.stroke();
                break;

            case 'ice':
                // Crystal Base
                ctx.fillStyle = '#1565c0';
                ctx.beginPath();
                ctx.moveTo(0, -18);
                ctx.lineTo(15, 0);
                ctx.lineTo(0, 18);
                ctx.lineTo(-15, 0);
                ctx.closePath();
                ctx.fill();
                // Glowing Crystal
                ctx.fillStyle = '#4fc3f7';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#4fc3f7';
                ctx.beginPath();
                ctx.moveTo(0, -12);
                ctx.lineTo(10, 0);
                ctx.lineTo(0, 12);
                ctx.lineTo(-10, 0);
                ctx.closePath();
                ctx.fill();
                break;

            case 'fire':
                // Volcanic Altar
                ctx.fillStyle = '#212121';
                ctx.fillRect(-14, -14, 28, 28);
                // Pulsing Flame
                const pulse = Math.sin(Date.now() / 200) * 3;
                ctx.fillStyle = '#ff3d00';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ff3d00';
                ctx.beginPath();
                ctx.arc(0, 0, 8 + pulse, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffea00';
                ctx.beginPath();
                ctx.arc(0, 0, 4 + pulse / 2, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'poison':
                // Alchemy Base
                ctx.fillStyle = '#455a64';
                ctx.fillRect(-15, -10, 30, 20);
                // Bubbling Vat
                ctx.fillStyle = '#32cd32';
                ctx.beginPath();
                ctx.arc(0, 0, 12, 0, Math.PI * 2);
                ctx.fill();
                // Bubbles
                const b = (Date.now() / 500) % 1;
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.beginPath();
                ctx.arc(-4, -4 + (b * 4), 2, 0, Math.PI * 2);
                ctx.arc(4, 4 - (b * 6), 3, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'lightning':
                // Tesla Coil
                ctx.fillStyle = '#78909c';
                ctx.fillRect(-3, -15, 6, 30);
                ctx.fillRect(-15, -15, 30, 4);
                ctx.fillRect(-15, 11, 30, 4);
                // Energy Ball
                ctx.fillStyle = '#ffff00';
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#ffff00';
                ctx.beginPath();
                ctx.arc(0, 0, 8, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'magic':
                // Runestone
                ctx.fillStyle = '#4a148c';
                ctx.beginPath();
                ctx.arc(0, 0, 16, 0, Math.PI * 2);
                ctx.fill();
                // Floating Crystal
                const hover = Math.sin(Date.now() / 300) * 5;
                ctx.fillStyle = '#ea80fc';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ea80fc';
                ctx.beginPath();
                ctx.moveTo(0, -10 + hover);
                ctx.lineTo(8, hover);
                ctx.lineTo(0, 10 + hover);
                ctx.lineTo(-8, hover);
                ctx.closePath();
                ctx.fill();
                break;
        }

        ctx.restore();

        // Level text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText(`LVL ${level}`, x, y + 28);
    }
}

class Projectile {
    constructor(x, y, target, damage, type, game) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.type = type;
        this.game = game;
        this.speed = 7;
        this.dead = false;
        this.piercing = (type === 'magic');
        this.hitEnemies = new Set();
    }

    update(delta) {
        if (this.piercing) {
            // Move in straight line towards initial target direction
            if (!this.vx) {
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                this.vx = (dx / dist) * this.speed;
                this.vy = (dy / dist) * this.speed;
            }
            this.x += this.vx;
            this.y += this.vy;

            // Check collisions with all enemies
            this.game.enemies.forEach(e => {
                if (!this.hitEnemies.has(e)) {
                    const d = Math.sqrt((e.x - this.x) ** 2 + (e.y - this.y) ** 2);
                    if (d < e.radius + 5) {
                        this.applyEffects(e);
                        this.hitEnemies.add(e);
                    }
                }
            });

            if (this.x < 0 || this.x > 800 || this.y < 0 || this.y > 600) this.dead = true;
        } else {
            if (!this.target || this.target.dead) {
                this.dead = true;
                return;
            }

            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 10) {
                this.applyEffects(this.target);
                this.dead = true;
            } else {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
            }
        }
    }

    applyEffects(target) {
        target.takeDamage(this.damage);
        switch (this.type) {
            case 'fire':
                target.burn(this.damage * 0.5);
                break;
            case 'ice':
                target.slow(0.4, 5000); // 5000ms = 5s
                break;
            case 'poison':
                target.poison(this.damage * 0.3);
                break;
        }
    }

    draw(ctx) {
        const { x, y, type } = this;
        ctx.save();
        ctx.translate(x, y);

        switch (type) {
            case 'cannon':
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(0, 0, 4, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'fire':
                const fSize = 6 + Math.random() * 4;
                ctx.fillStyle = '#ff4500';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ff4500';
                ctx.beginPath();
                ctx.arc(0, 0, fSize, 0, Math.PI * 2);
                ctx.fill();
                // Inner core
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                ctx.arc(0, 0, fSize * 0.5, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'ice':
                ctx.fillStyle = '#00f2ff';
                ctx.shadowBlur = 5;
                ctx.shadowColor = '#00f2ff';
                ctx.rotate(Math.atan2(this.vy || 1, this.vx || 1));
                ctx.beginPath();
                ctx.moveTo(8, 0);
                ctx.lineTo(-4, -4);
                ctx.lineTo(-4, 4);
                ctx.closePath();
                ctx.fill();
                break;

            case 'lightning':
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 3;
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ffff00';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                for (let i = 0; i < 3; i++) {
                    ctx.lineTo((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15);
                }
                ctx.stroke();
                break;

            case 'poison':
                ctx.fillStyle = '#32cd32';
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.arc(0, 0, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
                break;

            case 'magic':
                ctx.fillStyle = '#ea80fc';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ea80fc';
                ctx.beginPath();
                ctx.arc(0, 0, 6, 0, Math.PI * 2);
                ctx.fill();
                // Aura particles
                for (let i = 0; i < 3; i++) {
                    ctx.fillRect((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, 2, 2);
                }
                break;

            default:
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(0, 0, 3, 0, Math.PI * 2);
                ctx.fill();
        }

        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
        this.life = 100;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 2;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life / 100;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 4, 4);
        ctx.globalAlpha = 1.0;
    }
}

const game = new Game();
window.game = game;
