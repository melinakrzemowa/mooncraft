import { Direction, GridEngine } from "grid-engine";
import { GameObjects, Scene } from "phaser";

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
  aggroRange: 8, xpReward: 30, spriteKey: "enemy_worm", scale: 2,
  plasmaRange: 3, plasmaDamage: 16,
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

    this.startWandering();
    this.sprite.anims.play("worm-idle");

    gridEngine.movementStarted().subscribe(({ charId }: any) => {
      if (charId === this.id && this.alive) {
        this.sprite.anims.play("worm-walk");
      }
    });

    gridEngine.movementStopped().subscribe(({ charId }: any) => {
      if (charId === this.id && this.alive && !this.aggroed) {
        this.sprite.anims.play("worm-idle");
      }
    });
  }

  update(playerPos: { x: number; y: number }): { melee: number; plasma: { damage: number; fromX: number; fromY: number; toX: number; toY: number } | null } {
    if (!this.alive) return { melee: 0, plasma: null };

    const myPos = this.gridEngine.getPosition(this.id);
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
    let plasma: { damage: number; fromX: number; fromY: number; toX: number; toY: number } | null = null;

    if (this.aggroed && now > this.knockbackUntil) {
      // Plasma attack -- fires in a line if player is aligned and in range
      if (this.config.plasmaRange > 0 && now - this.lastPlasmaTime > this.config.attackCooldown) {
        const dx = playerPos.x - myPos.x;
        const dy = playerPos.y - myPos.y;
        const aligned = (dx === 0 || dy === 0) && dist <= this.config.plasmaRange && dist > 1;
        if (aligned) {
          this.lastPlasmaTime = now;
          this.sprite.anims.play("worm-attack");
          plasma = {
            damage: this.config.plasmaDamage,
            fromX: myPos.x, fromY: myPos.y,
            toX: playerPos.x, toY: playerPos.y,
          };
        }
      }

      if (dist <= 1) {
        melee = this.tryAttack();
      } else if (!plasma) {
        this.chasePlayer(playerPos);
      }
    }

    this.drawHealthBar();
    return { melee, plasma };
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
    this.sprite.anims.play("worm-attack");
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
    this.gridEngine.setPosition(this.id, this.spawnPos);
    this.sprite.setVisible(true);
    this.sprite.anims.play("worm-idle");
    this.startWandering();
  }

  private flashRed(): void {
    this.sprite.setTint(0xff0000);
    this.scene.time.delayedCall(150, () => {
      if (this.alive) this.sprite.clearTint();
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

    const width = 12 * this.config.scale;
    const height = 1.5;
    const x = this.sprite.x - width / 2;
    const y = this.sprite.y - this.sprite.height * this.config.scale / 2 - 2;
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
