import { Direction, GridEngine, GridEngineConfig } from "grid-engine";
import { Scene, Tilemaps } from "phaser";
import { Player } from "../../classes/player";
import { ComputerTerminal } from "../../classes/computer-terminal";
import { HealingStation } from "../../classes/healing-station";
import { saveGame, SaveData } from "../../classes/save-manager";
import { TouchControls } from "../../classes/touch-controls";

// Computer screen tile IDs (0-indexed)
const COMPUTER_TILE_IDS = new Set([1, 2, 6, 7]);
// Medkit tile IDs -- right wall (tile ID 9 at x=14,y=11) and left wall (tile ID 5 at x=10,y=11, tile ID 15 at x=10,y=13)
const MEDKIT_TILE_IDS = new Set([5, 9, 15]);

export class Lander extends Scene {
  private player!: Player;
  private map!: Tilemaps.Tilemap;
  private landerTileset!: Tilemaps.Tileset;
  private groundLayer!: Tilemaps.TilemapLayer;
  private furnitureLayer!: Tilemaps.TilemapLayer;
  private gridEngine!: GridEngine;
  private terminal!: ComputerTerminal;
  private healingStation!: HealingStation;
  private interactHint!: Phaser.GameObjects.Text;

  constructor() {
    super("lander-scene");
  }

  create(): void {
    this.initMap();
    this.player = new Player(this);
    const tc: TouchControls | undefined = this.registry.list.touchControls;
    if (tc) this.player.touchState = tc.state;
    this.terminal = new ComputerTerminal(this);
    this.healingStation = new HealingStation(this);

    const gridEngineConfig: GridEngineConfig = {
      collisionTilePropertyName: "collides",
      characters: [
        {
          id: "player",
          sprite: this.player,
          startPosition: { x: this.registry.list.playerPosition.x, y: this.registry.list.playerPosition.y },
          speed: 1,
        },
      ],
    };
    this.gridEngine.create(this.map, gridEngineConfig);

    this.gridEngine.movementStarted().subscribe(({ charId, direction }: any) => {
      if (charId === "player") this.player.anims.play(direction);
    });

    this.gridEngine.movementStopped().subscribe(({ charId }: any) => {
      if (charId === "player") {
        this.player.anims.stop();
        this.player.playIdle(this.gridEngine.getFacingDirection("player"));
      }
    });

    this.gridEngine.directionChanged().subscribe(({ charId, direction }: any) => {
      if (charId === "player") this.player.playIdle(direction);
    });

    // Interaction hint
    this.interactHint = this.add.text(0, 0, "[E]", {
      fontFamily: "monospace", fontSize: "3px", color: "#ffffff",
      backgroundColor: "#00000088", padding: { x: 1, y: 0 }, resolution: 4,
    });
    this.interactHint.setOrigin(0.5, 1);
    this.interactHint.setVisible(false);
    this.interactHint.setDepth(999);

    // Pointer (desktop only)
    if (!tc) {
      this.input.on("pointerdown", (pointer: any) => {
        if (this.terminal.isVisible() || this.healingStation.isVisible()) return;
        this.gridEngine.moveTo("player", { x: Math.floor(pointer.worldX / 16), y: Math.floor(pointer.worldY / 16) });
      });
    }

    // Interaction
    this.player.on("interact", () => this.handleInteract());

    this.initCamera();
  }

  update(): void {
    const modalOpen = this.terminal.isVisible() || this.healingStation.isVisible();
    this.player.update(this.gridEngine, modalOpen);

    if (!modalOpen) {
      this.updateInteractHint();

      if (this.player.x > 191 && this.player.x < 193 && this.player.y > 223 && this.player.y < 225) {
        const prevSave: SaveData | undefined = this.registry.list.saveData;
        const data: SaveData = {
          scene: "moon-scene", playerX: 50, playerY: 50,
          level: this.player.level, xp: this.player.xp,
          health: this.player.health, maxHealth: this.player.maxHealth,
          deadMonsters: prevSave?.deadMonsters || [],
        };
        saveGame(data);
        this.registry.set("saveData", data);
        this.registry.set("playerPosition", { x: 50, y: 50 });
        this.scene.start("moon-scene");
      }
    } else {
      this.interactHint.setVisible(false);
    }
  }

  private updateInteractHint(): void {
    const facing = this.gridEngine.getFacingDirection("player");
    const playerPos = this.gridEngine.getPosition("player");

    const dirOffsets: Record<string, { x: number; y: number }> = {
      [Direction.UP]: { x: 0, y: -1 },
      [Direction.DOWN]: { x: 0, y: 1 },
      [Direction.LEFT]: { x: -1, y: 0 },
      [Direction.RIGHT]: { x: 1, y: 0 },
    };
    const offset = dirOffsets[facing];
    if (!offset) { this.interactHint.setVisible(false); return; }

    const targetPos = { x: playerPos.x + offset.x, y: playerPos.y + offset.y };
    const tile = this.furnitureLayer.getTileAt(targetPos.x, targetPos.y);

    if (tile && (COMPUTER_TILE_IDS.has(tile.index - 1) || MEDKIT_TILE_IDS.has(tile.index - 1))) {
      this.interactHint.setPosition(this.player.x, this.player.y - 10);
      this.interactHint.setVisible(true);
    } else {
      this.interactHint.setVisible(false);
    }
  }

  private handleInteract(): void {
    if (this.terminal.isVisible()) {
      this.terminal.hide();
      return;
    }
    if (this.healingStation.isVisible()) return;

    const facing = this.gridEngine.getFacingDirection("player");
    const playerPos = this.gridEngine.getPosition("player");

    const dirOffsets: Record<string, { x: number; y: number }> = {
      [Direction.UP]: { x: 0, y: -1 },
      [Direction.DOWN]: { x: 0, y: 1 },
      [Direction.LEFT]: { x: -1, y: 0 },
      [Direction.RIGHT]: { x: 1, y: 0 },
    };
    const offset = dirOffsets[facing];
    if (!offset) return;

    const targetPos = { x: playerPos.x + offset.x, y: playerPos.y + offset.y };
    const tile = this.furnitureLayer.getTileAt(targetPos.x, targetPos.y);
    if (!tile) return;

    const tileId = tile.index - 1;

    if (COMPUTER_TILE_IDS.has(tileId)) {
      this.terminal.show();
    } else if (MEDKIT_TILE_IDS.has(tileId)) {
      if (this.player.health >= this.player.maxHealth) return; // Already full
      this.healingStation.show(this.player.health, this.player.maxHealth, () => {
        this.player.health = this.player.maxHealth;
        // Save after healing
        const prevSave: SaveData | undefined = this.registry.list.saveData;
        const data: SaveData = {
          scene: "lander-scene",
          playerX: playerPos.x, playerY: playerPos.y,
          level: this.player.level, xp: this.player.xp,
          health: this.player.health, maxHealth: this.player.maxHealth,
          deadMonsters: prevSave?.deadMonsters || [],
        };
        saveGame(data);
        this.registry.set("saveData", data);
      });
    }
  }

  private initCamera(): void {
    this.cameras.main.startFollow(this.player, false);
    this.cameras.main.zoom = 10;
  }

  private initMap(): void {
    this.map = this.make.tilemap({ key: "lander-interior-map", tileWidth: 16, tileHeight: 16 });
    this.landerTileset = this.map.addTilesetImage("lander-interior", "lander-interior");
    this.groundLayer = this.map.createLayer("ground", this.landerTileset, 0, 0);
    this.furnitureLayer = this.map.createLayer("furniture", this.landerTileset, 0, 0);
  }
}
