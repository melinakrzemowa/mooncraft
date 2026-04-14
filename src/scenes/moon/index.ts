import { Direction, GridEngine, GridEngineConfig } from "grid-engine";
import { GameObjects, Scene, Tilemaps, Physics } from "phaser";
import { Player } from "../../classes/player";
import { Monster } from "../../classes/monster";
import { saveGame, clearSave, SaveData } from "../../classes/save-manager";
import { TouchControls } from "../../classes/touch-controls";

// Generate monster spawns across the map (100x50), avoiding the lander area (45-55, 45-55)
function generateSpawns(): { x: number; y: number }[] {
  const spawns: { x: number; y: number }[] = [];
  const rng = (min: number, max: number) => Math.floor(min + (max - min) * ((Math.sin(spawns.length * 127.1 + 311.7) * 0.5 + 0.5)));

  for (let gx = 0; gx < 10; gx++) {
    for (let gy = 0; gy < 5; gy++) {
      const baseX = gx * 10 + 3;
      const baseY = gy * 10 + 3;
      const x = baseX + rng(0, 6);
      const y = baseY + rng(0, 6);
      // Skip lander area
      if (x >= 45 && x <= 55 && y >= 45 && y <= 55) continue;
      // Stay in bounds
      if (x < 2 || x > 97 || y < 2 || y > 47) continue;
      spawns.push({ x, y });
    }
  }
  return spawns;
}

const MONSTER_SPAWNS = generateSpawns();

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
  private lastSavePos = { x: 0, y: 0 };

  constructor() {
    super("moon-scene");
  }

  create(): void {
    this.monsters = [];
    this.dead = false;
    this.initMap();
    this.player = new Player(this);

    // Wire touch controls
    const tc: TouchControls | undefined = this.registry.list.touchControls;
    if (tc) this.player.touchState = tc.state;

    // TEST NPC
    this.npc = this.add.sprite(368, 416, "astronaut");
    this.npc.setInteractive();
    this.npc.on("pointerdown", () => {
      this.cameras.main.flash();
    });
    this.npc.anims.create({
      key: "stay-down",
      frames: this.npc.anims.generateFrameNames("astronaut", {
        prefix: "stay-down-",
        end: 1,
      }),
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
        {
          id: "singleNpc",
          sprite: this.npc,
          startPosition: { x: 24, y: 24 },
        },
      ],
    };

    // Create all monsters (dead ones start hidden and schedule respawn)
    const save: SaveData | undefined = this.registry.list.saveData;
    const deadMonsters = new Set(save?.deadMonsters || []);

    MONSTER_SPAWNS.forEach((spawn, i) => {
      const id = `monster_${i}`;
      const monster = new Monster(this, id, spawn);
      this.monsters.push(monster);

      gridEngineConfig.characters.push({
        id: monster.id,
        sprite: monster.sprite,
        startPosition: spawn,
        speed: 1,
      });
    });

    // NPC walkers
    const npcs: Map<string, any> = new Map<string, any>();
    for (let x = 35; x <= 40; x++) {
      for (let y = 25; y <= 30; y++) {
        const spr = this.add.sprite(0, 0, "astronaut");
        npcs.set(`npc${x}#${y}`, spr);
        gridEngineConfig.characters.push({
          id: `npc${x}#${y}`,
          sprite: spr,
          startPosition: { x, y },
          speed: 1,
        });
      }
    }

    this.gridEngine.create(this.map, gridEngineConfig);

    // Init monster AI (dead ones from save start dead with respawn timer)
    this.monsters.forEach((m) => m.init(this.gridEngine, deadMonsters.has(m.id)));

    // NPC random movement
    for (let x = 35; x <= 40; x++) {
      for (let y = 25; y <= 30; y++) {
        this.gridEngine.moveRandomly(`npc${x}#${y}`, this.getRandomInt(0, 1500));
      }
    }

    this.gridEngine.movementStarted().subscribe(({ charId, direction }: any) => {
      if (charId === "player") {
        this.player.anims.play(direction);
      } else if (npcs.has(charId)) {
        npcs.get(charId).anims.play(direction);
      }
    });

    this.gridEngine.movementStopped().subscribe(({ charId, direction }: any) => {
      if (charId === "player") {
        this.player.anims.stop();
        this.player.playIdle(this.gridEngine.getFacingDirection("player"));
        // Save on every player move
        const pos = this.gridEngine.getPosition("player");
        this.saveState("moon-scene", pos.x, pos.y);
      } else if (npcs.has(charId)) {
        npcs.get(charId).anims.stop();
        npcs.get(charId).anims.play("stay-down");
      }
    });

    this.gridEngine.directionChanged().subscribe(({ charId, direction }: any) => {
      if (charId === "player") {
        this.player.playIdle(direction);
      }
    });

    // Pointer movement (desktop only - conflicts with touch controls on mobile)
    if (!tc) {
      this.input.on("pointerdown", (pointer: any) => {
        this.gridEngine.moveTo("player", { x: Math.floor(pointer.worldX / 16), y: Math.floor(pointer.worldY / 16) });
      });
    }

    // Blaster shooting
    this.player.on("shoot", (data: { facing: Direction; pos: { x: number; y: number }; range: number; damage: number }) => {
      this.handleShoot(data);
    });

    this.physics.add.collider(this.player, this.cratersLayer);
    this.physics.add.collider(this.player, this.landerLayer);
    this.initCamera();

    // Set initial save pos
    this.lastSavePos = { x: this.registry.list.playerPosition.x, y: this.registry.list.playerPosition.y };
  }

  update(): void {
    if (this.dead) return;

    this.player.update(this.gridEngine);

    const playerPos = this.gridEngine.getPosition("player");

    // Update monsters and handle combat
    let anyAggroed = false;
    this.monsters.forEach((monster) => {
      if (!monster.alive) return;
      const damage = monster.update(playerPos);
      if (damage > 0) {
        this.player.takeDamage(damage);
      }
      if (monster.isAggroed()) {
        anyAggroed = true;
      }
    });

    this.player.inCombat = anyAggroed;

    // Player death
    if (this.player.health <= 0) {
      this.showDeathScreen();
      return;
    }

    // Scene transition to lander
    if (this.player.x > 799 && this.player.x < 801 && this.player.y > 783 && this.player.y < 785) {
      this.saveState("lander-scene", 12, 13);
      this.registry.set("playerPosition", { x: 12, y: 13 });
      this.scene.start("lander-scene");
    }
  }

  private saveState(scene: string, px: number, py: number): void {
    const deadMonsters = this.monsters.filter((m) => !m.alive).map((m) => m.id);

    const data: SaveData = {
      scene,
      playerX: px,
      playerY: py,
      level: this.player.level,
      xp: this.player.xp,
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      deadMonsters,
    };
    saveGame(data);
    this.registry.set("saveData", data);
  }

  private showDeathScreen(): void {
    this.dead = true;
    clearSave();
    this.registry.set("saveData", undefined);

    const cam = this.cameras.main;
    const cx = cam.scrollX + cam.width / cam.zoom / 2;
    const cy = cam.scrollY + cam.height / cam.zoom / 2;
    const vw = cam.width / cam.zoom;
    const vh = cam.height / cam.zoom;

    const overlay = this.add.rectangle(cx, cy, vw, vh, 0x000000, 0.7);
    overlay.setDepth(1500);

    const deathText = this.add.text(cx, cy - 8, "YOU DIED", {
      fontFamily: "ThaleahFat",
      fontSize: "12px",
      color: "#cc0000",
      resolution: 4,
    });
    deathText.setOrigin(0.5);
    deathText.setDepth(1501);

    const restartText = this.add.text(cx, cy + 4, "click to respawn", {
      fontFamily: "ThaleahFat",
      fontSize: "5px",
      color: "#888888",
      resolution: 4,
    });
    restartText.setOrigin(0.5);
    restartText.setDepth(1501);

    this.input.once("pointerdown", () => {
      this.registry.set("playerPosition", { x: 49, y: 51 });
      this.scene.restart();
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
        const mpos = this.gridEngine.getPosition(monster.id);
        if (mpos.x === tx && mpos.y === ty) {
          const wasAlive = monster.alive;
          monster.takeDamage(damage);
          if (wasAlive && !monster.alive) {
            this.player.addXp(10);
          }
          return;
        }
      }
    }
  }

  private initCamera(): void {
    this.cameras.main.startFollow(this.player, false);
    this.cameras.main.zoom = 10;
  }

  private initMap(): void {
    this.map = this.make.tilemap({
      key: "moon-map",
      tileWidth: 16,
      tileHeight: 16,
    });
    this.groundTileset = this.map.addTilesetImage("moon-ground", "moon-ground");
    this.cratersTileset = this.map.addTilesetImage("moon-craters", "moon-craters");
    this.landerTileset = this.map.addTilesetImage("lander", "lander");
    this.groundLayer = this.map.createLayer("ground", this.groundTileset, 0, 0);
    this.cratersLayer = this.map.createLayer("craters", this.cratersTileset, 0, 0);
    this.landerLayer = this.map.createLayer("lander", this.landerTileset, 0, 0);
    this.landerHoverLayer = this.map.createLayer("lander-hover", this.landerTileset, 0, 0);
  }

  getRandomInt(min: integer, max: integer): integer {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
