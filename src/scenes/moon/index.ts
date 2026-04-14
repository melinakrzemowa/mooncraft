import { Direction, GridEngine, GridEngineConfig } from "grid-engine";
import { GameObjects, Scene, Tilemaps, Physics } from "phaser";
import { Player } from "../../classes/player";
import { Monster, WORM_CONFIG, BIG_WORM_CONFIG, MonsterConfig } from "../../classes/monster";
import { saveGame, clearSave, SaveData } from "../../classes/save-manager";
import { TouchControls } from "../../classes/touch-controls";
import { getEffectivePosition } from "../../classes/grid-utils";

// Generate small worm spawns across the map, avoiding lander area
function generateSmallSpawns(): { x: number; y: number }[] {
  const spawns: { x: number; y: number }[] = [];
  const rng = (min: number, max: number) => Math.floor(min + (max - min) * ((Math.sin(spawns.length * 127.1 + 311.7) * 0.5 + 0.5)));
  for (let gx = 0; gx < 10; gx++) {
    for (let gy = 0; gy < 5; gy++) {
      const x = gx * 10 + 3 + rng(0, 6);
      const y = gy * 10 + 3 + rng(0, 6);
      if (x >= 45 && x <= 55 && y >= 45 && y <= 55) continue;
      if (x < 2 || x > 97 || y < 2 || y > 47) continue;
      spawns.push({ x, y });
    }
  }
  return spawns;
}

// Big worms spawn further from lander
const BIG_WORM_SPAWNS = [
  { x: 10, y: 10 }, { x: 90, y: 10 }, { x: 10, y: 40 }, { x: 90, y: 40 },
  { x: 20, y: 15 }, { x: 80, y: 15 }, { x: 20, y: 38 }, { x: 80, y: 38 },
];

const SMALL_WORM_SPAWNS = generateSmallSpawns();

export class Moon extends Scene {
  private player!: Player;
  private npc!: GameObjects.Sprite;
  private map!: Tilemaps.Tilemap;
  private groundTileset!: Tilemaps.Tileset;
  private cratersTileset!: Tilemaps.Tileset;
  private landerTileset!: Tilemaps.Tileset;
  private groundLayer!: Tilemaps.TilemapLayer;
  private cratersLayer!: Tilemaps.TilemapLayer;
  private landerLayer!: Tilemaps.TilemapLayer;
  private landerHoverLayer!: Tilemaps.TilemapLayer;
  private gridEngine!: GridEngine;
  private monsters: Monster[] = [];
  private dead = false;

  constructor() {
    super("moon-scene");
  }

  create(): void {
    this.monsters = [];
    this.dead = false;
    this.initMap();
    this.player = new Player(this);

    const tc: TouchControls | undefined = this.registry.list.touchControls;
    if (tc) this.player.touchState = tc.state;

    this.npc = this.add.sprite(368, 416, "astronaut");
    this.npc.setInteractive();
    this.npc.on("pointerdown", () => this.cameras.main.flash());
    this.npc.anims.create({
      key: "stay-down",
      frames: this.npc.anims.generateFrameNames("astronaut", { prefix: "stay-down-", end: 1 }),
      frameRate: 4,
    });

    const gridEngineConfig: GridEngineConfig = {
      collisionTilePropertyName: "collides",
      characters: [
        {
          id: "player",
          sprite: this.player,
          startPosition: { x: this.registry.list.playerPosition.x, y: this.registry.list.playerPosition.y },
          speed: 2,
        },
        { id: "singleNpc", sprite: this.npc, startPosition: { x: 24, y: 24 } },
      ],
    };

    const save: SaveData | undefined = this.registry.list.saveData;
    const deadMonsters = new Set(save?.deadMonsters || []);

    // Small worms
    SMALL_WORM_SPAWNS.forEach((spawn, i) => {
      const id = `monster_${i}`;
      const monster = new Monster(this, id, spawn, WORM_CONFIG);
      this.monsters.push(monster);
      gridEngineConfig.characters.push({ id, sprite: monster.sprite, startPosition: spawn, speed: 1 });
    });

    // Big worms
    BIG_WORM_SPAWNS.forEach((spawn, i) => {
      const id = `bigworm_${i}`;
      const monster = new Monster(this, id, spawn, BIG_WORM_CONFIG);
      this.monsters.push(monster);
      gridEngineConfig.characters.push({ id, sprite: monster.sprite, startPosition: spawn, speed: 1 });
    });

    // NPC walkers
    const npcs: Map<string, any> = new Map();
    for (let x = 35; x <= 40; x++) {
      for (let y = 25; y <= 30; y++) {
        const spr = this.add.sprite(0, 0, "astronaut");
        npcs.set(`npc${x}#${y}`, spr);
        gridEngineConfig.characters.push({ id: `npc${x}#${y}`, sprite: spr, startPosition: { x, y }, speed: 1 });
      }
    }

    this.gridEngine.create(this.map, gridEngineConfig);
    this.monsters.forEach((m) => m.init(this.gridEngine, deadMonsters.has(m.id)));

    for (let x = 35; x <= 40; x++) {
      for (let y = 25; y <= 30; y++) {
        this.gridEngine.moveRandomly(`npc${x}#${y}`, Phaser.Math.Between(0, 1500));
      }
    }

    this.gridEngine.movementStarted().subscribe(({ charId, direction }: any) => {
      if (charId === "player") this.player.anims.play(direction);
      else if (npcs.has(charId)) npcs.get(charId).anims.play(direction);
    });

    this.gridEngine.movementStopped().subscribe(({ charId }: any) => {
      if (charId === "player") {
        this.player.anims.stop();
        this.player.playIdle(this.gridEngine.getFacingDirection("player"));
        const pos = this.gridEngine.getPosition("player");
        this.saveState("moon-scene", pos.x, pos.y);
      } else if (npcs.has(charId)) {
        npcs.get(charId).anims.stop();
        npcs.get(charId).anims.play("stay-down");
      }
    });

    this.gridEngine.directionChanged().subscribe(({ charId, direction }: any) => {
      if (charId === "player") this.player.playIdle(direction);
    });

    if (!tc) {
      this.input.on("pointerdown", (pointer: any) => {
        this.gridEngine.moveTo("player", { x: Math.floor(pointer.worldX / 16), y: Math.floor(pointer.worldY / 16) });
      });
    }

    this.player.on("shoot", (data: any) => this.handleShoot(data));
    this.player.on("grenade-impact", (data: any) => this.handleGrenadeImpact(data));

    this.physics.add.collider(this.player, this.cratersLayer);
    this.physics.add.collider(this.player, this.landerLayer);
    this.initCamera();
  }

  update(): void {
    if (this.dead) return;
    this.player.update(this.gridEngine);

    const playerPos = getEffectivePosition(this.gridEngine, "player");
    let anyAggroed = false;

    this.monsters.forEach((monster) => {
      if (!monster.alive) return;
      const result = monster.update(playerPos);
      if (result.melee > 0) this.player.takeDamage(result.melee);
      if (result.plasmaShot) {
        // Damage applied on projectile arrival, not immediately
        this.firePlasma(result.plasmaShot);
      }
      if (monster.isAggroed()) anyAggroed = true;
    });

    this.player.inCombat = anyAggroed;

    if (this.player.health <= 0) {
      this.showDeathScreen();
      return;
    }

    if (this.player.x > 799 && this.player.x < 801 && this.player.y > 783 && this.player.y < 785) {
      this.saveState("lander-scene", 12, 13);
      this.registry.set("playerPosition", { x: 12, y: 13 });
      this.scene.start("lander-scene");
    }
  }

  private firePlasma(shot: { damage: number; fromX: number; fromY: number; toX: number; toY: number }): void {
    const { damage, fromX, fromY, toX, toY } = shot;
    const startX = fromX * 16 + 8;
    const startY = fromY * 16 + 8;
    const endX = toX * 16 + 8;
    const endY = toY * 16 + 8;
    const dist = Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY));

    // Plasma bolt projectile
    const bolt = this.add.circle(startX, startY, 2.5, 0xff00ff);
    bolt.setDepth(997);

    // Glow trail
    const glow = this.add.circle(startX, startY, 4, 0xff00ff, 0.3);
    glow.setDepth(996);

    const travelTime = dist * 250; // 250ms per tile

    this.tweens.add({
      targets: [bolt, glow],
      x: endX,
      y: endY,
      duration: travelTime,
      onComplete: () => {
        // Cross-shaped hit: center + up/down/left/right (5 tiles)
        const playerPos = getEffectivePosition(this.gridEngine, "player");
        const dx = Math.abs(playerPos.x - toX);
        const dy = Math.abs(playerPos.y - toY);
        const inCross = (dx === 0 && dy === 0) || (dx === 0 && dy === 1) || (dx === 1 && dy === 0);
        if (inCross) {
          this.player.takeDamage(damage);
        }

        // Impact flash
        const flash = this.add.circle(endX, endY, 12, 0xff00ff, 0.4);
        flash.setDepth(997);
        this.tweens.add({ targets: flash, alpha: 0, scale: 1.5, duration: 250, onComplete: () => flash.destroy() });
        bolt.destroy();
        glow.destroy();
      },
    });
  }

  private saveState(scene: string, px: number, py: number): void {
    const deadMonsters = this.monsters.filter((m) => !m.alive).map((m) => m.id);
    const data: SaveData = {
      scene, playerX: px, playerY: py,
      level: this.player.level, xp: this.player.xp,
      health: this.player.health, maxHealth: this.player.maxHealth,
      deadMonsters,
    };
    saveGame(data);
    this.registry.set("saveData", data);
  }

  private showDeathScreen(): void {
    this.dead = true;
    clearSave();
    this.registry.set("saveData", undefined);

    // Position relative to player (camera centers on player)
    const px = this.player.x;
    const py = this.player.y;
    const cam = this.cameras.main;
    const halfW = cam.width / cam.zoom / 2;
    const halfH = cam.height / cam.zoom / 2;

    const overlay = this.add.rectangle(px, py, halfW * 2 + 20, halfH * 2 + 20, 0x000000, 0.7);
    overlay.setDepth(1500);

    const deathText = this.add.text(px, py - 8, "YOU DIED", {
      fontFamily: "ThaleahFat", fontSize: "12px", color: "#cc0000", resolution: 4,
    });
    deathText.setOrigin(0.5);
    deathText.setDepth(1501);

    const restartText = this.add.text(px, py + 4, "click to respawn", {
      fontFamily: "ThaleahFat", fontSize: "5px", color: "#888888", resolution: 4,
    });
    restartText.setOrigin(0.5);
    restartText.setDepth(1501);

    // Respawn on any click or key
    const respawn = () => {
      this.registry.set("playerPosition", { x: 49, y: 51 });
      this.scene.restart();
    };
    this.time.delayedCall(500, () => {
      this.input.once("pointerdown", respawn);
      this.input.keyboard.once("keydown", respawn);
    });
  }

  private handleShoot(data: { facing: Direction; pos: { x: number; y: number }; range: number; damage: number }): void {
    const { facing, pos, range, damage } = data;
    const dx = facing === Direction.LEFT ? -1 : facing === Direction.RIGHT ? 1 : 0;
    const dy = facing === Direction.UP ? -1 : facing === Direction.DOWN ? 1 : 0;

    for (let i = 1; i <= range; i++) {
      const tx = pos.x + dx * i;
      const ty = pos.y + dy * i;
      for (const monster of this.monsters) {
        if (!monster.alive) continue;
        const mpos = getEffectivePosition(this.gridEngine, monster.id);
        if (mpos.x === tx && mpos.y === ty) {
          const wasAlive = monster.alive;
          monster.takeDamage(damage);
          if (wasAlive && !monster.alive) this.player.addXp(monster.config.xpReward);
          return;
        }
      }
    }
  }

  private handleGrenadeImpact(data: { landX: number; landY: number; radius: number; damage: number }): void {
    const { landX, landY, radius, damage } = data;

    for (const monster of this.monsters) {
      if (!monster.alive) continue;
      const mpos = getEffectivePosition(this.gridEngine, monster.id);
      const dist = Math.max(Math.abs(mpos.x - landX), Math.abs(mpos.y - landY));
      if (dist <= radius) {
        const wasAlive = monster.alive;
        monster.takeDamage(damage);
        if (wasAlive && !monster.alive) this.player.addXp(monster.config.xpReward);
        if (monster.alive) monster.knockback(landX, landY, 2);
      }
    }

    const playerPos = getEffectivePosition(this.gridEngine, "player");
    const playerDist = Math.max(Math.abs(playerPos.x - landX), Math.abs(playerPos.y - landY));
    if (playerDist <= radius) {
      this.player.takeDamage(damage);
      this.player.knockback(this.gridEngine, playerPos.x === landX ? 0 : (playerPos.x > landX ? 1 : -1), playerPos.y === landY ? 0 : (playerPos.y > landY ? 1 : -1), 2);
    }
  }

  private initCamera(): void {
    this.cameras.main.startFollow(this.player, true, 0.5, 0.5);
    this.cameras.main.setFollowOffset(0, 0);
    this.cameras.main.zoom = 10;
  }

  private initMap(): void {
    this.map = this.make.tilemap({ key: "moon-map", tileWidth: 16, tileHeight: 16 });
    this.groundTileset = this.map.addTilesetImage("moon-ground", "moon-ground");
    this.cratersTileset = this.map.addTilesetImage("moon-craters", "moon-craters");
    this.landerTileset = this.map.addTilesetImage("lander", "lander");
    this.groundLayer = this.map.createLayer("ground", this.groundTileset, 0, 0);
    this.cratersLayer = this.map.createLayer("craters", this.cratersTileset, 0, 0);
    this.landerLayer = this.map.createLayer("lander", this.landerTileset, 0, 0);
    this.landerHoverLayer = this.map.createLayer("lander-hover", this.landerTileset, 0, 0);
  }
}
