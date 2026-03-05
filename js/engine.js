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
            cannon: { cost: 100, name: "Canhão Básico", icon: "🏹", color: "#8a2be2" },
            fire: { cost: 200, name: "Torre de Fogo", icon: "🔥", color: "#ff4500" },
            ice: { cost: 150, name: "Torre de Gelo", icon: "❄️", color: "#00bfff" },
            lightning: { cost: 300, name: "Torre de Raio", icon: "⚡", color: "#ffff00" },
            magic: { cost: 400, name: "Torre Mágica", icon: "✨", color: "#da70d6" },
            poison: { cost: 250, name: "Torre Veneno", icon: "🧪", color: "#32cd32" }
        };

        this.init();
        this.setupBackground();
    }

    init() {
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
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
        for (let i = 0; i < 2000; i++) {
            bctx.fillStyle = Math.random() > 0.5 ? '#388e3c' : '#2b6a2d';
            bctx.fillRect(Math.random() * 800, Math.random() * 600, 2, 2);
        }
        for (let i = 0; i < 400; i++) {
            bctx.fillStyle = '#4caf50';
            const x = Math.random() * 800, y = Math.random() * 600;
            bctx.fillRect(x, y, 2, 4);
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
        for (let i = 0; i < 1000; i++) {
            const x = Math.random() * 800, y = Math.random() * 600;
            if (this.isNearPath(x, y, 22)) {
                bctx.fillStyle = Math.random() > 0.7 ? '#5d4037' : '#9c7e6e';
                bctx.fillRect(x, y, 2, 2);
            }
        }
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
        Object.keys(this.skills).forEach(id => {
            const skill = this.skills[id];
            const btn = document.getElementById('skill-' + id);
            const now = Date.now();
            const elapsed = now - (skill.lastUsed || 0);
            const isCooldown = elapsed < skill.cooldown;
            btn.disabled = this.gold < skill.cost || isCooldown;
            const cooldownEl = document.getElementById('cooldown-' + id);
            if (isCooldown) cooldownEl.style.height = (100 - (elapsed / skill.cooldown * 100)) + '%';
            else cooldownEl.style.height = '0%';
        });
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.towerToPlace = this.selectedTowerType ? { x: e.clientX - rect.left, y: e.clientY - rect.top, type: this.selectedTowerType } : null;
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        document.getElementById('upgrade-overlay').style.display = 'none';

        const clickedTower = this.towers.find(t => Math.sqrt((t.x - x) ** 2 + (t.y - y) ** 2) < 25);
        if (clickedTower) {
            this.selectedActiveTower = clickedTower;
            this.showUpgradeMenu(e.clientX, e.clientY);
            this.selectedTowerType = null;
            return;
        }

        if (this.selectedTowerType) {
            const data = this.towerData[this.selectedTowerType];
            if (this.gold >= data.cost && this.towerLimits[this.selectedTowerType] < 5 && !this.isNearPath(x, y, 40)) {
                this.towers.push(new Tower(x, y, this, this.selectedTowerType));
                this.gold -= data.cost;
                this.towerLimits[this.selectedTowerType]++;
                this.selectedTowerType = null;
                this.updateHUD();
            } else if (this.towerLimits[this.selectedTowerType] >= 5) {
                this.announce("LIMITE ATINGIDO", "Máximo 5 torres deste tipo!");
            }
        }
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
        if (type) document.getElementById('shop-' + type).classList.add('selected');
    }

    showUpgradeMenu(screenX, screenY) {
        const overlay = document.getElementById('upgrade-overlay'), info = document.getElementById('upgrade-info');
        const tower = this.selectedActiveTower;
        overlay.style.display = 'block';
        overlay.style.left = screenX + 'px';
        overlay.style.top = (screenY - 60) + 'px';
        info.innerHTML = `Nível: ${tower.level}/7<br>Next: +${(tower.damage * 0.4).toFixed(1)} Dano`;
        const btn = overlay.querySelector('button');
        btn.innerText = tower.level >= 7 ? "MAX" : `UPGRADE ($${tower.getUpgradeCost()})`;
        btn.disabled = tower.level >= 7;
    }

    upgradeSelectedTower() {
        if (this.selectedActiveTower && this.gold >= this.selectedActiveTower.getUpgradeCost() && this.selectedActiveTower.level < 7) {
            this.gold -= this.selectedActiveTower.getUpgradeCost();
            this.selectedActiveTower.upgrade();
            this.updateHUD();
            document.getElementById('upgrade-overlay').style.display = 'none';
        }
    }

    sellSelectedTower() {
        if (this.selectedActiveTower) {
            this.gold += Math.floor(this.towerData[this.selectedActiveTower.type].cost * 0.5);
            this.towerLimits[this.selectedActiveTower.type]--;
            this.towers = this.towers.filter(t => t !== this.selectedActiveTower);
            this.updateHUD();
            document.getElementById('upgrade-overlay').style.display = 'none';
        }
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
        if (this.gold < skill.cost || Date.now() - (skill.lastUsed || 0) < skill.cooldown) return;
        this.gold -= skill.cost;
        skill.lastUsed = Date.now();

        switch (id) {
            case 'arrows': this.enemies.forEach(e => e.takeDamage(10)); this.createMagicEffect('purple', 50); break;
            case 'fire': this.enemies.forEach(e => { e.takeDamage(15); e.burn(5); }); this.createMagicEffect('orange', 80); break;
            case 'ice': this.enemies.forEach(e => { e.takeDamage(5); e.slow(0.5, 5000); }); this.createMagicEffect('cyan', 60); break;
            case 'lightning': this.enemies.forEach(e => { if (Math.random() > 0.5) e.takeDamage(100); }); this.createMagicEffect('yellow', 100); break;
            case 'annihilation': this.enemies.forEach(e => e.takeDamage(e.hp * 0.5)); this.createMagicEffect('white', 200); break;
        }
        this.updateHUD();
    }

    createMagicEffect(color, count) {
        for (let i = 0; i < count; i++) this.particles.push(new Particle(Math.random() * 800, Math.random() * 600, color));
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
        this.ctx.drawImage(this.bgCanvas, 0, 0);
        this.enemies.forEach(e => e.draw(this.ctx));
        this.towers.forEach(t => t.draw(this.ctx));
        this.projectiles.forEach(p => p.draw(this.ctx));
        this.particles.forEach(p => p.draw(this.ctx));

        if (this.towerToPlace) {
            this.ctx.globalAlpha = 0.4;
            this.ctx.fillStyle = this.isNearPath(this.towerToPlace.x, this.towerToPlace.y, 40) ? 'rgba(255,0,0,0.5)' : 'rgba(0,255,0,0.3)';
            this.ctx.beginPath(); this.ctx.arc(this.towerToPlace.x, this.towerToPlace.y, 20, 0, Math.PI * 2); this.ctx.fill();
            this.ctx.strokeStyle = 'white'; this.ctx.lineWidth = 1;
            this.ctx.beginPath(); this.ctx.arc(this.towerToPlace.x, this.towerToPlace.y, 150, 0, Math.PI * 2); this.ctx.stroke();
            this.ctx.globalAlpha = 1.0;
        }

        // Castle
        const cX = this.path[this.path.length - 1].x, cY = this.path[this.path.length - 1].y;
        this.ctx.fillStyle = '#455a64'; this.ctx.fillRect(cX - 25, cY - 20, 50, 40);
        this.ctx.fillStyle = '#607d8b'; this.ctx.fillRect(cX - 30, cY - 30, 15, 30); this.ctx.fillRect(cX + 15, cY - 30, 15, 30);
        this.ctx.fillStyle = '#b71c1c';
        this.ctx.beginPath(); this.ctx.moveTo(cX - 32, cY - 30); this.ctx.lineTo(cX - 22, cY - 45); this.ctx.lineTo(cX - 12, cY - 30); this.ctx.fill();
        this.ctx.beginPath(); this.ctx.moveTo(cX + 13, cY - 30); this.ctx.lineTo(cX + 23, cY - 45); this.ctx.lineTo(cX + 33, cY - 30); this.ctx.fill();

        // Wave HUD
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; this.ctx.fillRect(10, 10, 130, 45);
        this.ctx.fillStyle = '#00fa9a'; this.ctx.font = 'bold 22px Outfit'; this.ctx.fillText(`ONDA: ${this.wave}`, 20, 42);
    }

    gameOver() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.8)'; this.ctx.fillRect(0, 0, 800, 600);
        this.ctx.fillStyle = 'white'; this.ctx.font = 'bold 48px Outfit'; this.ctx.textAlign = 'center';
        this.ctx.fillText('FIM DE JOGO', 400, 300);
        this.ctx.font = '24px Outfit'; this.ctx.fillText(`Você chegou na Onda ${this.wave}`, 400, 350);
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
        ctx.save();
        ctx.translate(this.x, this.y);

        // Movement bobbing effect
        const bob = Math.sin(Date.now() / 150) * 2;
        const fastBob = Math.sin(Date.now() / 80) * 4; // Faster animation for fast enemies

        switch (this.type) {
            case 'normal':
                // Soldier Body (Chainmail color)
                ctx.fillStyle = '#a5a5a5';
                ctx.fillRect(-6, -8 + bob, 12, 14);
                // Wooden Shield
                ctx.fillStyle = '#5d4037';
                ctx.beginPath(); ctx.arc(-8, bob, 6, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 1; ctx.stroke();
                // Sword
                ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(6, 4 + bob); ctx.lineTo(12, -2 + bob); ctx.stroke();
                // Head/Helmet
                ctx.fillStyle = '#757575';
                ctx.beginPath(); ctx.arc(0, -10 + bob, 5, 0, Math.PI * 2); ctx.fill();
                break;

            case 'fast':
                // Swift Scout (Goblin)
                ctx.save();
                ctx.rotate(Math.atan2(this.tempSpeed, 1) * 0.2); // Lean forward when moving
                // Dark Green Cloak
                ctx.fillStyle = '#1b5e20';
                ctx.beginPath();
                ctx.moveTo(-5, -5 + fastBob); ctx.lineTo(10, 5 + fastBob); ctx.lineTo(-5, 10 + fastBob);
                ctx.fill();
                // Slender Body
                ctx.fillStyle = '#4caf50'; // Green skin
                ctx.fillRect(-4, -6 + fastBob, 8, 10);
                // Hood
                ctx.fillStyle = '#2e7d32';
                ctx.beginPath(); ctx.arc(0, -8 + fastBob, 4, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
                break;

            case 'tank':
                // Bulky Ogre
                // Large Body (Dark Leather)
                ctx.fillStyle = '#4e342e';
                ctx.fillRect(-12, -15 + bob, 24, 25);
                // Leather patches
                ctx.fillStyle = '#3e2723';
                ctx.fillRect(-8, -10 + bob, 6, 6);
                ctx.fillRect(4, 2 + bob, 6, 6);
                // Massive Spiked Club
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(10, -10 + bob, 8, 20);
                ctx.fillStyle = '#9e9e9e'; // Stone spikes
                ctx.fillRect(8, -8 + bob, 3, 3);
                ctx.fillRect(16, 2 + bob, 3, 3);
                // Ogre Head
                ctx.fillStyle = '#8d6e63';
                ctx.beginPath(); ctx.arc(0, -18 + bob, 8, 0, Math.PI * 2); ctx.fill();
                break;

            case 'spawn':
                // Pulsating Slime Progenitor
                const pulse = Math.sin(Date.now() / 300) * 3;
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = '#9c27b0'; // Translucent Purple
                ctx.beginPath(); ctx.arc(0, bob, 15 + pulse, 0, Math.PI * 2); ctx.fill();
                // Inner cores
                ctx.globalAlpha = 1.0;
                ctx.fillStyle = '#e1bee7';
                ctx.beginPath(); ctx.arc(-5 + pulse, -5, 4, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(5, 5 - pulse, 3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(-2, 6, 2, 0, Math.PI * 2); ctx.fill();
                break;

            case 'shielded':
                // Dwarf Guardian
                // Stone Armor
                ctx.fillStyle = '#616161';
                ctx.fillRect(-10, -10 + bob, 20, 20);
                // Obsidian Tower Shield
                ctx.fillStyle = '#212121'; // Dark Obsidian
                ctx.fillRect(-16, -15 + bob, 10, 30);
                ctx.strokeStyle = '#4a148c'; // Runic purple glow
                ctx.lineWidth = 1;
                ctx.strokeRect(-16, -15 + bob, 10, 30);
                // Runic Helm
                ctx.fillStyle = '#424242';
                ctx.beginPath(); ctx.arc(0, -12 + bob, 7, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ffd700'; // Gold detail
                ctx.fillRect(-2, -16 + bob, 4, 4);
                break;

            default:
                ctx.fillStyle = this.slowT > 0 ? '#00ffff' : (this.burnT > 0 ? '#ffa500' : (this.poisonT > 0 ? '#32cd32' : this.color));
                ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();

        // HP bar remains
        ctx.fillStyle = '#333'; ctx.fillRect(this.x - 10, this.y - 20, 20, 4);
        ctx.fillStyle = '#2ecc71'; ctx.fillRect(this.x - 10, this.y - 20, 20 * (this.hp / this.maxHp), 4);
    }
}

class Tower {
    constructor(x, y, game, type) {
        this.x = x; this.y = y; this.game = game; this.type = type; this.level = 1; this.timer = 0;
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
    upgrade() {
        this.level++; this.damage *= 1.4; this.range += 15; this.atkS *= 0.9;
    }
    update(delta) {
        this.timer += delta;
        if (this.timer >= this.atkS) {
            const target = this.game.enemies.find(e => Math.sqrt((e.x - this.x) ** 2 + (e.y - this.y) ** 2) <= this.range);
            if (target) { this.game.projectiles.push(new Projectile(this.x, this.y, target, this.damage, this.type, this.game)); this.timer = 0; }
        }
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.rect(-18, -18, 36, 36); ctx.fill();
        ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.stroke();
        switch (this.type) {
            case 'cannon': ctx.fillStyle = '#5d4037'; ctx.fillRect(-15, -15, 30, 30); ctx.fillStyle = '#424242'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); break;
            case 'ice': ctx.fillStyle = '#1565c0'; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(15, 0); ctx.lineTo(0, 18); ctx.lineTo(-15, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#4fc3f7'; ctx.shadowBlur = 10; ctx.shadowColor = '#4fc3f7'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(10, 0); ctx.lineTo(0, 12); ctx.lineTo(-10, 0); ctx.closePath(); ctx.fill(); break;
            case 'fire': ctx.fillStyle = '#212121'; ctx.fillRect(-14, -14, 28, 28); const p = Math.sin(Date.now() / 200) * 3; ctx.fillStyle = '#ff3d00'; ctx.shadowBlur = 15; ctx.shadowColor = '#ff3d00'; ctx.beginPath(); ctx.arc(0, 0, 8 + p, 0, Math.PI * 2); ctx.fill(); break;
            case 'poison': ctx.fillStyle = '#455a64'; ctx.fillRect(-15, -10, 30, 20); ctx.fillStyle = '#32cd32'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill(); break;
            case 'lightning': ctx.fillStyle = '#78909c'; ctx.fillRect(-3, -15, 6, 30); ctx.fillStyle = '#ffff00'; ctx.shadowBlur = 20; ctx.shadowColor = '#ffff00'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); break;
            case 'magic': ctx.fillStyle = '#4a148c'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill(); const h = Math.sin(Date.now() / 300) * 5; ctx.fillStyle = '#ea80fc'; ctx.shadowBlur = 15; ctx.shadowColor = '#ea80fc'; ctx.beginPath(); ctx.moveTo(0, -10 + h); ctx.lineTo(8, h); ctx.lineTo(0, 10 + h); ctx.lineTo(-8, h); ctx.closePath(); ctx.fill(); break;
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
        if (this.piercing) {
            if (!this.vx) { const dx = this.target.x - this.x, dy = this.target.y - this.y, dist = Math.sqrt(dx * dx + dy * dy); this.vx = (dx / dist) * this.speed; this.vy = (dy / dist) * this.speed; }
            this.x += this.vx; this.y += this.vy;
            this.game.enemies.forEach(e => { if (!this.hitE.has(e)) { if (Math.sqrt((e.x - this.x) ** 2 + (e.y - this.y) ** 2) < e.radius + 5) { this.apply(e); this.hitE.add(e); } } });
            if (this.x < 0 || this.x > 800 || this.y < 0 || this.y > 600) this.dead = true;
        } else {
            if (!this.target || this.target.dead) { this.dead = true; return; }
            const dx = this.target.x - this.x, dy = this.target.y - this.y, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 10) { this.apply(this.target); this.dead = true; }
            else { this.x += (dx / dist) * this.speed; this.y += (dy / dist) * this.speed; }
        }
    }
    apply(target) {
        target.takeDamage(this.damage);
        if (this.type === 'fire') target.burn(this.damage * 0.5);
        if (this.type === 'ice') target.slow(0.4, 5000);
        if (this.type === 'poison') target.poison(this.damage * 0.3);
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        ctx.fillStyle = this.game.towerData[this.type].color;
        switch (this.type) {
            case 'fire': ctx.fillStyle = '#ff4500'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); break;
            case 'ice': ctx.fillStyle = '#00f2ff'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.fill(); break;
            case 'lightning': ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15); ctx.stroke(); break;
            default: ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) { this.x = x; this.y = y; this.color = color; this.vx = (Math.random() - 0.5) * 5; this.vy = (Math.random() - 0.5) * 5; this.life = 100; }
    update() { this.x += this.vx; this.y += this.vy; this.life -= 2; }
    draw(ctx) { ctx.globalAlpha = this.life / 100; ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, 4, 4); ctx.globalAlpha = 1.0; }
}

const game = new Game();
window.game = game;
