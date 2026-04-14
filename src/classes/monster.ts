import { Direction, GridEngine } from "grid-engine";
import { GameObjects, Scene } from "phaser";
import { getEffectivePosition } from "./grid-utils";

export interface MonsterConfig {
  maxHealth: number;
  damage: number;
  attackCooldown: number;
  speed: number;
  aggroRange: number;
  xpReward: number;
  spriteKey: string;
  scale: number;
  plasmaRange: number;  // 0 = melee only
  plasmaDamage: number;
}

export const WORM_CONFIG: MonsterConfig = {
  maxHealth: 30, damage: 8, attackCooldown: 1500, speed: 1,
  aggroRange: 6, xpReward: 10, spriteKey: "enemy_worm", scale: 1,
  plasmaRange: 0, plasmaDamage: 0,
};

export const BIG_WORM_CONFIG: MonsterConfig = {
  maxHealth: 80, damage: 16, attackCooldown: 3000, speed: 1,
  aggroRange: 8, xpReward: 60, spriteKey: "enemy_worm", scale: 2,
  plasmaRange: 6, plasmaDamage: 16,
};

const WANDER_DELAY = 3000;
const RESPAWN_MIN = 60000;
const RESPAWN_MAX = 120000;

export class Monster {
  public sprite: GameObjects.Sprite;
  public id: string;
  public health: number;
  public maxHealth: number;
  public alive = true;
  public spawnPos: { x: number; y: number };
  public config: MonsterConfig;

  private scene: Scene;
  private gridEngine!: GridEngine;
  private aggroed = false;
  private lastAttackTime = 0;
  private lastPlasmaTime = 0;
  private wanderTimer: Phaser.Time.TimerEvent | null = null;
  private respawnTimer: Phaser.Time.TimerEvent | null = null;
  private healthBar: GameObjects.Graphics;
  private knockbackUntil = 0;

  constructor(scene: Scene, id: string, spawnPos: { x: number; y: number }, config: MonsterConfig = WORM_CONFIG) {
    this.scene = scene;
    this.id = id;
    this.spawnPos = spawnPos;
    this.config = config;
    this.maxHealth = config.maxHealth;
    this.health = config.maxHealth;

    this.sprite = scene.add.sprite(0, 0, config.spriteKey);
    if (config.scale !== 1) this.sprite.setScale(config.scale);
    if (config.plasmaRange > 0) this.sprite.setTint(0x44ff66); // Green tint for big worms
    this.initAnimations();

    this.healthBar = scene.add.graphics();
    this.healthBar.setDepth(998);
  }

  init(gridEngine: GridEngine, startDead = false): void {
    this.gridEngine = gridEngine;

    if (startDead) {
      this.alive = false;
      this.sprite.setVisible(false);
      this.healthBar.clear();
      this.scheduleRespawn();
      return;
    }

    const animPrefix = "worm";
    this.startWandering();
    this.sprite.anims.play(`${animPrefix}-idle`);

    gridEngine.movementStarted().subscribe(({ charId }: any) => {
      if (charId === this.id && this.alive) {
        this.sprite.anims.play(`${animPrefix}-walk`);
      }
    });

    gridEngine.movementStopped().subscribe(({ charId }: any) => {
      if (charId === this.id && this.alive && !this.aggroed) {
        this.sprite.anims.play(`${animPrefix}-idle`);
      }
    });
  }

  update(playerPos: { x: number; y: number }): { melee: number; plasmaShot: { damage: number; fromX: number; fromY: number; toX: number; toY: number } | null } {
    if (!this.alive) return { melee: 0, plasmaShot: null };

    const myPos = getEffectivePosition(this.gridEngine, this.id);
    const dist = Math.max(Math.abs(myPos.x - playerPos.x), Math.abs(myPos.y - playerPos.y));
    const now = Date.now();

    if (!this.aggroed && dist <= this.config.aggroRange) {
      this.aggroed = true;
      this.stopWandering();
    } else if (this.aggroed && dist > this.config.aggroRange * 2) {
      this.aggroed = false;
      this.startWandering();
    }

    let melee = 0;
    let plasmaShot: { damage: number; fromX: number; fromY: number; toX: number; toY: number } | null = null;

    if (this.aggroed && now > this.knockbackUntil) {
      // Plasma attack -- shoots toward player in any direction
      if (this.config.plasmaRange > 0 && dist > 1 && now - this.lastPlasmaTime > this.config.attackCooldown) {
        this.lastPlasmaTime = now;
        this.sprite.anims.play("worm-attack");
        // Normalize direction toward player, shoot plasmaRange tiles
        const dx = playerPos.x - myPos.x;
        const dy = playerPos.y - myPos.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const ndx = dx / len;
        const ndy = dy / len;
        plasmaShot = {
          damage: this.config.plasmaDamage,
          fromX: myPos.x, fromY: myPos.y,
          toX: Math.round(myPos.x + ndx * this.config.plasmaRange),
          toY: Math.round(myPos.y + ndy * this.config.plasmaRange),
        };
      }

      if (dist <= 1) {
        melee = this.tryAttack();
      } else if (!plasmaShot) {
        this.chasePlayer(playerPos);
      }
    }

    this.drawHealthBar();
    return { melee, plasmaShot };
  }

  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    this.flashRed();
    if (this.health <= 0) {
      this.die();
    }
  }

  isAggroed(): boolean {
    return this.aggroed;
  }

  knockback(fromX: number, fromY: number, tiles: number): void {
    if (!this.alive) return;
    const pos = this.gridEngine.getPosition(this.id);
    const dx = pos.x === fromX ? 0 : (pos.x > fromX ? 1 : -1);
    const dy = pos.y === fromY ? 0 : (pos.y > fromY ? 1 : -1);
    if (dx === 0 && dy === 0) return;
    const nx = pos.x + dx * tiles;
    const ny = pos.y + dy * tiles;
    this.knockbackUntil = Date.now() + 500;
    this.gridEngine.moveTo(this.id, { x: nx, y: ny }, {
      noPathFoundStrategy: "CLOSEST_REACHABLE" as any,
    });
  }

  private tryAttack(): number {
    const now = Date.now();
    if (now - this.lastAttackTime < this.config.attackCooldown) return 0;
    this.lastAttackTime = now;
    const animPrefix = "worm";
    this.sprite.anims.play(`${animPrefix}-attack`);
    return this.config.damage;
  }

  private die(): void {
    this.alive = false;
    this.aggroed = false;
    this.stopWandering();
    this.healthBar.clear();
    this.gridEngine.setPosition(this.id, { x: -1, y: -1 });
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.sprite.setVisible(false);
        this.sprite.setAlpha(1);
        this.scheduleRespawn();
      },
    });
  }

  private scheduleRespawn(): void {
    const delay = RESPAWN_MIN + Math.random() * (RESPAWN_MAX - RESPAWN_MIN);
    this.respawnTimer = this.scene.time.delayedCall(delay, () => this.tryRespawn());
  }

  private tryRespawn(): void {
    const playerPos = this.gridEngine.getPosition("player");
    const dist = Math.max(
      Math.abs(this.spawnPos.x - playerPos.x),
      Math.abs(this.spawnPos.y - playerPos.y)
    );
    if (dist <= this.config.aggroRange * 2) {
      this.respawnTimer = this.scene.time.delayedCall(10000, () => this.tryRespawn());
      return;
    }
    this.alive = true;
    this.health = this.maxHealth;
    this.aggroed = false;
    this.lastAttackTime = 0;
    this.lastPlasmaTime = 0;
    const animPrefix = "worm";
    this.gridEngine.setPosition(this.id, this.spawnPos);
    this.sprite.setVisible(true);
    this.sprite.anims.play(`${animPrefix}-idle`);
    this.startWandering();
  }

  private flashRed(): void {
    this.sprite.setTint(0xff0000);
    this.scene.time.delayedCall(150, () => {
      if (this.alive) {
        if (this.config.plasmaRange > 0) {
          this.sprite.setTint(0x44ff66);
        } else {
          this.sprite.clearTint();
        }
      }
    });
  }

  private chasePlayer(playerPos: { x: number; y: number }): void {
    if (!this.gridEngine.isMoving(this.id)) {
      this.gridEngine.moveTo(this.id, playerPos, {
        noPathFoundStrategy: "CLOSEST_REACHABLE" as any,
      });
    }
  }

  private startWandering(): void {
    this.stopWandering();
    this.wanderTimer = this.scene.time.addEvent({
      delay: WANDER_DELAY,
      loop: true,
      callback: () => {
        if (!this.alive || this.aggroed) return;
        if (this.gridEngine.isMoving(this.id)) return;
        const directions = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
        const dir = directions[Math.floor(Math.random() * directions.length)];
        this.gridEngine.move(this.id, dir);
      },
    });
  }

  private stopWandering(): void {
    if (this.wanderTimer) {
      this.wanderTimer.destroy();
      this.wanderTimer = null;
    }
  }

  private drawHealthBar(): void {
    this.healthBar.clear();
    if (!this.alive) return;

    const width = 12;
    const height = 1.5;
    const top = this.sprite.getTopCenter();
    const x = top.x - width / 2;
    const y = top.y - 2;
    const ratio = this.health / this.maxHealth;

    this.healthBar.fillStyle(0x000000, 0.6);
    this.healthBar.fillRect(x, y, width, height);

    const color = ratio > 0.5 ? 0x00cc00 : ratio > 0.25 ? 0xcccc00 : 0xcc0000;
    this.healthBar.fillStyle(color);
    this.healthBar.fillRect(x, y, width * ratio, height);
  }

  private initAnimations(): void {
    if (this.scene.anims.exists("worm-idle")) return;

    this.scene.anims.create({
      key: "worm-idle",
      frames: this.scene.anims.generateFrameNumbers("enemy_worm", { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });

    this.scene.anims.create({
      key: "worm-walk",
      frames: this.scene.anims.generateFrameNumbers("enemy_worm", { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    });

    this.scene.anims.create({
      key: "worm-attack",
      frames: this.scene.anims.generateFrameNumbers("enemy_worm", { start: 4, end: 7 }),
      frameRate: 8,
      repeat: 0,
    });
  }
}
