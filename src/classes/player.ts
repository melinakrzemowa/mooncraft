import { Direction, GridEngine } from "grid-engine";
import { Actor } from "./actor";
import { SaveData } from "./save-manager";
import { TouchState } from "./touch-controls";

const SHOOT_COOLDOWN = 500;
const BLASTER_DAMAGE = 12;
const BLASTER_RANGE = 4;
const GRENADE_COOLDOWN = 10000;
const GRENADE_DAMAGE = 24;
const GRENADE_RANGE = 4;
const GRENADE_BLAST_RADIUS = 2;
const BASE_HP = 100;
const HP_PER_LEVEL = 15;
const BASE_XP = 50;
const XP_GROWTH = 1.5;

export class Player extends Actor {
  private keyW: Phaser.Input.Keyboard.Key;
  private keyA: Phaser.Input.Keyboard.Key;
  private keyS: Phaser.Input.Keyboard.Key;
  private keyD: Phaser.Input.Keyboard.Key;
  private keyE: Phaser.Input.Keyboard.Key;
  private keyR: Phaser.Input.Keyboard.Key;
  private keyF: Phaser.Input.Keyboard.Key;
  private keySpace: Phaser.Input.Keyboard.Key;
  private interactPressed = false;
  private shootPressed = false;
  private grenadePressed = false;
  private lastShootTime = 0;
  private lastGrenadeTime = 0;

  public health: number;
  public maxHealth: number;
  public inCombat = false;
  public level = 1;
  public xp = 0;
  public xpToNext: number;

  private healthBar: Phaser.GameObjects.Graphics;
  private xpBar: Phaser.GameObjects.Graphics;
  private levelText: Phaser.GameObjects.Text;
  private _gridEngine: GridEngine | null = null;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, "astronaut");

    // Restore from save if available
    const save: SaveData | undefined = scene.registry.list.saveData;
    if (save) {
      this.level = save.level;
      this.xp = save.xp;
      this.maxHealth = save.maxHealth;
      this.health = save.health;
      this.xpToNext = Math.floor(BASE_XP * this.level * Math.pow(XP_GROWTH, this.level - 1));
    } else {
      this.maxHealth = BASE_HP;
      this.health = this.maxHealth;
      this.xpToNext = BASE_XP;
    }

    // KEYS
    this.keyW = this.scene.input.keyboard.addKey("W");
    this.keyA = this.scene.input.keyboard.addKey("A");
    this.keyS = this.scene.input.keyboard.addKey("S");
    this.keyD = this.scene.input.keyboard.addKey("D");
    this.keyE = this.scene.input.keyboard.addKey("E");
    this.keyR = this.scene.input.keyboard.addKey("R");
    this.keyF = this.scene.input.keyboard.addKey("F");
    this.keySpace = this.scene.input.keyboard.addKey("SPACE");

    // ANIMATIONS
    this.initAnimations();

    // Health bar (over player, only in combat)
    this.healthBar = scene.add.graphics();
    this.healthBar.setDepth(998);

    // XP bar and level (positioned in world space, updated each frame to follow camera)
    this.xpBar = scene.add.graphics();
    this.xpBar.setDepth(2000);

    this.levelText = scene.add.text(0, 0, `Lv ${this.level}`, {
      fontFamily: "ThaleahFat",
      fontSize: "5px",
      color: "#ffffff",
      resolution: 4,
    });
    this.levelText.setDepth(2000);
  }

  public touchState: TouchState | null = null;

  update(gridEngine: GridEngine, blockMovement = false): void {
    this._gridEngine = gridEngine;
    const t = this.touchState;

    if (!blockMovement) {
      const cursors = this.scene.input.keyboard.createCursorKeys();
      if (cursors.left.isDown || this.keyA.isDown || t?.left) {
        gridEngine.move("player", Direction.LEFT);
      } else if (cursors.right.isDown || this.keyD.isDown || t?.right) {
        gridEngine.move("player", Direction.RIGHT);
      } else if (cursors.up.isDown || this.keyW.isDown || t?.up) {
        gridEngine.move("player", Direction.UP);
      } else if (cursors.down.isDown || this.keyS.isDown || t?.down) {
        gridEngine.move("player", Direction.DOWN);
      }
    }

    // E key / touch interaction (edge-triggered)
    const interactDown = this.keyE?.isDown || t?.interact;
    const interactUp = this.keyE?.isUp && !t?.interact;
    if (interactDown && !this.interactPressed) {
      this.interactPressed = true;
      this.emit("interact");
    }
    if (interactUp) {
      this.interactPressed = false;
    }

    // R / Space / touch shoot (edge-triggered)
    const shootDown = this.keyR?.isDown || this.keySpace?.isDown || t?.shoot;
    const shootUp = this.keyR?.isUp && this.keySpace?.isUp && !t?.shoot;
    if (shootDown && !this.shootPressed) {
      this.shootPressed = true;
      this.tryShoot(gridEngine);
    }
    if (shootUp) {
      this.shootPressed = false;
    }

    // F / touch grenade (edge-triggered)
    const grenadeDown = this.keyF?.isDown || t?.grenade;
    const grenadeUp = this.keyF?.isUp && !t?.grenade;
    if (grenadeDown && !this.grenadePressed) {
      this.grenadePressed = true;
      this.tryGrenade(gridEngine);
    }
    if (grenadeUp) {
      this.grenadePressed = false;
    }

    this.drawHealthBar();
    this.drawXpBar();
  }

  tryShoot(gridEngine: GridEngine): void {
    const now = Date.now();
    if (now - this.lastShootTime < SHOOT_COOLDOWN) return;
    this.lastShootTime = now;

    const facing = gridEngine.getFacingDirection("player");
    const pos = gridEngine.getPosition("player");

    this.emit("shoot", { facing, pos, range: BLASTER_RANGE, damage: BLASTER_DAMAGE });
    this.showBlasterEffect(facing, pos);
  }

  tryGrenade(gridEngine: GridEngine): void {
    const now = Date.now();
    if (now - this.lastGrenadeTime < GRENADE_COOLDOWN) return;
    this.lastGrenadeTime = now;

    const facing = gridEngine.getFacingDirection("player");
    const pos = gridEngine.getPosition("player");
    const dx = facing === Direction.LEFT ? -1 : facing === Direction.RIGHT ? 1 : 0;
    const dy = facing === Direction.UP ? -1 : facing === Direction.DOWN ? 1 : 0;

    // Grenade lands at GRENADE_RANGE tiles ahead
    const landX = pos.x + dx * GRENADE_RANGE;
    const landY = pos.y + dy * GRENADE_RANGE;

    this.showGrenadeEffect(pos, landX, landY);
  }

  private showGrenadeEffect(from: { x: number; y: number }, lx: number, ly: number): void {
    const startX = from.x * 16 + 8;
    const startY = from.y * 16 + 8;
    const endX = lx * 16 + 8;
    const endY = ly * 16 + 8;

    const proj = this.scene.add.circle(startX, startY, 1.5, 0xff6600);
    proj.setDepth(997);

    this.scene.tweens.add({
      targets: proj,
      x: endX,
      y: endY,
      duration: 400,
      onComplete: () => {
        proj.destroy();
        // Explosion flash
        const blast = this.scene.add.circle(endX, endY, GRENADE_BLAST_RADIUS * 16, 0xff4400, 0.5);
        blast.setDepth(997);
        this.scene.tweens.add({
          targets: blast,
          alpha: 0,
          scale: 1.5,
          duration: 300,
          onComplete: () => blast.destroy(),
        });
        // Emit damage on impact
        this.emit("grenade-impact", {
          landX: lx, landY: ly, radius: GRENADE_BLAST_RADIUS, damage: GRENADE_DAMAGE,
        });
      },
    });
  }

  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    this.flashRed();
  }

  knockback(gridEngine: GridEngine, dx: number, dy: number, tiles: number): void {
    const pos = gridEngine.getPosition("player");
    const nx = dx !== 0 ? pos.x + dx * tiles : pos.x;
    const ny = dy !== 0 ? pos.y + dy * tiles : pos.y;
    gridEngine.moveTo("player", { x: nx, y: ny }, {
      noPathFoundStrategy: "CLOSEST_REACHABLE" as any,
    });
  }

  addXp(amount: number): void {
    this.xp += amount;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.levelUp();
    }
  }

  private levelUp(): void {
    this.level++;
    this.maxHealth = BASE_HP + HP_PER_LEVEL * (this.level - 1);
    this.health = this.maxHealth;
    this.xpToNext = Math.floor(BASE_XP * this.level * Math.pow(XP_GROWTH, this.level - 1));
    this.levelText.setText(`Lv ${this.level}`);

    // Level up flash effect
    this.setTint(0xffff00);
    this.scene.time.delayedCall(300, () => this.clearTint());
  }

  private flashRed(): void {
    this.setTint(0xff0000);
    this.scene.time.delayedCall(150, () => {
      this.clearTint();
    });
  }

  private showBlasterEffect(facing: Direction, pos: { x: number; y: number }): void {
    const dx = facing === Direction.LEFT ? -1 : facing === Direction.RIGHT ? 1 : 0;
    const dy = facing === Direction.UP ? -1 : facing === Direction.DOWN ? 1 : 0;

    for (let i = 1; i <= BLASTER_RANGE; i++) {
      const bx = (pos.x + dx * i) * 16 + 8;
      const by = (pos.y + dy * i) * 16 + 8;

      const bullet = this.scene.add.circle(bx, by, 1, 0x00ffff);
      bullet.setDepth(997);

      this.scene.tweens.add({
        targets: bullet,
        alpha: 0,
        duration: 200,
        delay: i * 30,
        onComplete: () => bullet.destroy(),
      });
    }
  }

  private drawHealthBar(): void {
    this.healthBar.clear();
    if (!this.inCombat) return;

    const width = 12;
    const height = 1.5;
    // sprite.x/y is updated smoothly by GridEngine during movement
    const x = this.x - width / 2;
    const y = this.y - 10;
    const ratio = this.health / this.maxHealth;

    this.healthBar.fillStyle(0x000000, 0.6);
    this.healthBar.fillRect(x, y, width, height);

    const color = ratio > 0.5 ? 0x00cc00 : ratio > 0.25 ? 0xcccc00 : 0xcc0000;
    this.healthBar.fillStyle(color);
    this.healthBar.fillRect(x, y, width * ratio, height);
  }

  private drawXpBar(): void {
    this.xpBar.clear();

    // Position relative to player (camera always centers on player)
    // Top-left of visible area is player pos minus half viewport
    const cam = this.scene.cameras.main;
    const halfW = cam.width / cam.zoom / 2;
    const halfH = cam.height / cam.zoom / 2;
    const left = this.x - halfW;
    const top = this.y - halfH;

    // Level text top-left
    this.levelText.setPosition(left + 1, top + 1);

    // XP bar next to level text
    const barX = left + 14;
    const barY = top + 3;
    const barWidth = 30;
    const barHeight = 2;
    const ratio = this.xp / this.xpToNext;

    this.xpBar.fillStyle(0x333344);
    this.xpBar.fillRect(barX - 0.5, barY - 0.5, barWidth + 1, barHeight + 1);

    this.xpBar.fillStyle(0x1a1a2e);
    this.xpBar.fillRect(barX, barY, barWidth, barHeight);

    this.xpBar.fillStyle(0xccaa00);
    this.xpBar.fillRect(barX, barY, barWidth * ratio, barHeight);
  }

  playIdle(direction: Direction): void {
    const dirMap: Record<string, string> = {
      [Direction.UP]: "stay-up",
      [Direction.DOWN]: "stay-down",
      [Direction.LEFT]: "stay-left",
      [Direction.RIGHT]: "stay-right",
    };
    this.anims.play(dirMap[direction] || "stay-down");
  }

  private initAnimations(): void {
    const directions = ["down", "up", "left", "right"];

    for (const dir of directions) {
      this.scene.anims.create({
        key: dir,
        frames: this.scene.anims.generateFrameNames("astronaut", {
          prefix: `move-${dir}-`,
          end: 3,
        }),
        frameRate: 4,
        repeat: -1,
      });

      this.scene.anims.create({
        key: `stay-${dir}`,
        frames: this.scene.anims.generateFrameNames("astronaut", {
          prefix: `stay-${dir}-`,
          end: 3,
        }),
        frameRate: 4,
        repeat: -1,
      });
    }
  }
}
