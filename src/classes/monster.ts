import { Direction, GridEngine } from "grid-engine";
import { GameObjects, Scene } from "phaser";

const AGGRO_RANGE = 6;
const ATTACK_RANGE = 1;
const ATTACK_COOLDOWN = 1500;
const ATTACK_DAMAGE = 8;
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

  private scene: Scene;
  private gridEngine!: GridEngine;
  private aggroed = false;
  private lastAttackTime = 0;
  private wanderTimer: Phaser.Time.TimerEvent | null = null;
  private respawnTimer: Phaser.Time.TimerEvent | null = null;
  private healthBar: GameObjects.Graphics;

  constructor(scene: Scene, id: string, spawnPos: { x: number; y: number }, maxHealth = 30) {
    this.scene = scene;
    this.id = id;
    this.spawnPos = spawnPos;
    this.maxHealth = maxHealth;
    this.health = maxHealth;

    this.sprite = scene.add.sprite(0, 0, "enemy_worm");
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

  update(playerPos: { x: number; y: number }): number {
    if (!this.alive) return 0;

    const myPos = this.gridEngine.getPosition(this.id);
    const dist = Math.max(Math.abs(myPos.x - playerPos.x), Math.abs(myPos.y - playerPos.y));

    if (!this.aggroed && dist <= AGGRO_RANGE) {
      this.aggroed = true;
      this.stopWandering();
    } else if (this.aggroed && dist > AGGRO_RANGE * 2) {
      this.aggroed = false;
      this.startWandering();
    }

    let damage = 0;

    if (this.aggroed) {
      if (dist <= ATTACK_RANGE) {
        damage = this.tryAttack();
      } else {
        this.chasePlayer(playerPos);
      }
    }

    this.drawHealthBar();
    return damage;
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

  knockback(dx: number, dy: number, tiles: number): void {
    if (!this.alive) return;
    const pos = this.gridEngine.getPosition(this.id);
    const nx = dx !== 0 ? pos.x + dx * tiles : pos.x;
    const ny = dy !== 0 ? pos.y + dy * tiles : pos.y;
    this.gridEngine.moveTo(this.id, { x: nx, y: ny }, {
      noPathFoundStrategy: "CLOSEST_REACHABLE" as any,
    });
  }

  private tryAttack(): number {
    const now = Date.now();
    if (now - this.lastAttackTime < ATTACK_COOLDOWN) return 0;
    this.lastAttackTime = now;
    this.sprite.anims.play("worm-attack");
    return ATTACK_DAMAGE;
  }

  private die(): void {
    this.alive = false;
    this.aggroed = false;
    this.stopWandering();
    this.healthBar.clear();
    // Remove collision so player can walk through
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
    this.respawnTimer = this.scene.time.delayedCall(delay, () => {
      this.tryRespawn();
    });
  }

  private tryRespawn(): void {
    // Check if player is nearby
    const playerPos = this.gridEngine.getPosition("player");
    const dist = Math.max(
      Math.abs(this.spawnPos.x - playerPos.x),
      Math.abs(this.spawnPos.y - playerPos.y)
    );

    if (dist <= AGGRO_RANGE * 2) {
      // Player too close, try again in 10s
      this.respawnTimer = this.scene.time.delayedCall(10000, () => {
        this.tryRespawn();
      });
      return;
    }

    this.alive = true;
    this.health = this.maxHealth;
    this.aggroed = false;
    this.lastAttackTime = 0;

    // Move back to spawn position
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

    const width = 12;
    const height = 1.5;
    const x = this.sprite.x - width / 2;
    const y = this.sprite.y - 9;
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
