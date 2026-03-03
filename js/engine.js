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
        if (this.selectedTowerType && this.gold >= 100) {
            // Check if on path
            if (this.isNearPath(x, y, 40)) return;

            this.towers.push(new Tower(x, y, this));
            this.gold -= 100;
            this.selectedTowerType = null;
            this.updateHUD();
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
        this.gold += 50; // Simple sell back
        this.towers = this.towers.filter(t => t !== this.selectedActiveTower);
        this.updateHUD();
        document.getElementById('upgrade-overlay').style.display = 'none';
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
        if (this.paused) return;
        const delta = time - this.lastTime;
        this.lastTime = time;

        this.update(delta);
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
            this.wave++;
            this.enemiesSpawned = 0;
            this.enemiesInWave = Math.floor(10 * Math.pow(1.1, this.wave));
            this.updateHUD();
        }

        this.spawnTimer += delta;
        if (this.spawnTimer > 1000 && this.enemiesSpawned < this.enemiesInWave) {
            this.enemies.push(new Enemy(this.wave, this));
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

        // Cooldowns HUD
        if (Math.random() > 0.95) this.updateHUD();
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
    constructor(wave, game) {
        this.game = game;
        this.pathIndex = 0;
        this.x = game.path[0].x;
        this.y = game.path[0].y;
        this.baseHp = 20;
        // HP = BaseHP * (1.15)^(W-1)
        this.maxHp = this.baseHp * Math.pow(1.15, wave - 1);
        this.hp = this.maxHp;
        this.speed = 1.2 + (Math.random() * 0.5);
        this.tempSpeed = this.speed;
        this.slowTimer = 0;
        this.burnTimer = 0;
        this.burnDamage = 0;
        this.bounty = Math.floor(10 * Math.pow(1.05, wave - 1));
        this.dead = false;
        this.reachedEnd = false;
        this.radius = 12;
    }

    update(delta) {
        if (this.slowTimer > 0) {
            this.slowTimer -= delta;
            if (this.slowTimer <= 0) this.tempSpeed = this.speed;
        }

        if (this.burnTimer > 0) {
            this.burnTimer -= delta;
            this.takeDamage(this.burnDamage * (delta / 1000));
        }

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

    takeDamage(dmg) {
        this.hp -= dmg;
        if (this.hp <= 0) this.dead = true;
    }

    slow(percent, duration) {
        this.tempSpeed = this.speed * (1 - percent);
        this.slowTimer = duration;
    }

    burn(dmg) {
        this.burnTimer = 3000;
        this.burnDamage = dmg;
    }

    draw(ctx) {
        ctx.fillStyle = this.slowTimer > 0 ? '#00ffff' : '#ff4444';
        if (this.burnTimer > 0) ctx.fillStyle = '#ffa500';

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // HP bar
        const barWidth = 20;
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - barWidth / 2, this.y - 20, barWidth, 4);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x - barWidth / 2, this.y - 20, barWidth * (this.hp / this.maxHp), 4);
    }
}

class Tower {
    constructor(x, y, game) {
        this.x = x;
        this.y = y;
        this.game = game;
        this.level = 1;
        this.range = 150;
        this.damage = 10;
        this.attackSpeed = 1000;
        this.timer = 0;
        this.color = '#8a2be2';
    }

    getUpgradeCost() {
        return Math.floor(100 * Math.pow(1.8, this.level));
    }

    upgrade() {
        this.level++;
        this.damage *= 1.5;
        this.range += 20;
        if (this.level === 7) this.color = '#ffd700'; // Gold for max level
    }

    update(delta) {
        this.timer += delta;
        if (this.timer >= this.attackSpeed) {
            const target = this.findTarget();
            if (target) {
                this.game.projectiles.push(new Projectile(this.x, this.y, target, this.damage));
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
        ctx.fillStyle = this.color;

        // Base
        ctx.fillRect(this.x - 15, this.y - 15, 30, 30);

        // Cannon
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - 5, this.y - 25, 10, 20);

        if (this.level === 7) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'gold';
            ctx.strokeStyle = 'gold';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x - 18, this.y - 18, 36, 36);
            ctx.shadowBlur = 0;
        }
    }
}

class Projectile {
    constructor(x, y, target, damage) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = 5;
        this.dead = false;
    }

    update(delta) {
        if (!this.target || this.target.dead) {
            this.dead = true;
            return;
        }

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 10) {
            this.target.takeDamage(this.damage);
            this.dead = true;
        } else {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();
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
