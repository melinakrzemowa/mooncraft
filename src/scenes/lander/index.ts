import { Direction, GridEngine, GridEngineConfig } from "grid-engine";
import { GameObjects, Scene, Tilemaps } from "phaser";
import { Player } from "../../classes/player";
import { ComputerTerminal } from "../../classes/computer-terminal";

// Tile IDs (0-indexed) that represent computer screens
const COMPUTER_TILE_IDS = new Set([1, 2, 6, 7]);

export class Lander extends Scene {
  private player!: Player;
  private map!: Tilemaps.Tilemap;
  private landerTileset!: Tilemaps.Tileset;
  private groundLayer!: Tilemaps.TilemapLayer;
  private furnitureLayer!: Tilemaps.TilemapLayer;
  private gridEngine!: GridEngine;
  private terminal!: ComputerTerminal;

  constructor() {
    super("lander-scene");
  }

  create(): void {
    this.initMap();
    this.player = new Player(this);
    this.terminal = new ComputerTerminal(this);

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
      if (charId === "player") {
        this.player.anims.play(direction);
      }
    });

    this.gridEngine.movementStopped().subscribe(({ charId, direction }: any) => {
      if (charId === "player") {
        this.player.anims.stop();
        this.player.playIdle(this.gridEngine.getFacingDirection("player"));
      }
    });

    this.gridEngine.directionChanged().subscribe(({ charId, direction }: any) => {
      if (charId === "player") {
        this.player.playIdle(direction);
      }
    });

    // Pointer
    this.input.on("pointerdown", (pointer: any) => {
      if (this.terminal.isVisible()) return;
      this.gridEngine.moveTo("player", { x: Math.floor(pointer.worldX / 16), y: Math.floor(pointer.worldY / 16) });
    });

    // Interaction
    this.player.on("interact", () => this.handleInteract());

    this.initCamera();
  }

  update(): void {
    this.player.update(this.gridEngine, this.terminal.isVisible());

    if (!this.terminal.isVisible()) {
      if (this.player.x > 191 && this.player.x < 193 && this.player.y > 223 && this.player.y < 225) {
        this.registry.set("playerPosition", { x: 50, y: 50 });
        this.scene.start("moon-scene");
      }
    }
  }

  private handleInteract(): void {
    if (this.terminal.isVisible()) {
      this.terminal.hide();
      return;
    }

    const facing = this.gridEngine.getFacingDirection("player");
    if (facing !== Direction.UP) return;

    const playerPos = this.gridEngine.getPosition("player");
    const targetPos = { x: playerPos.x, y: playerPos.y - 1 };

    const tile = this.furnitureLayer.getTileAt(targetPos.x, targetPos.y);
    if (tile && COMPUTER_TILE_IDS.has(tile.index - 1)) {
      this.terminal.show();
    }
  }

  private initCamera(): void {
    this.cameras.main.startFollow(this.player, false);
    this.cameras.main.zoom = 10;
  }

  private initMap(): void {
    this.map = this.make.tilemap({
      key: "lander-interior-map",
      tileWidth: 16,
      tileHeight: 16,
    });
    this.landerTileset = this.map.addTilesetImage("lander-interior", "lander-interior");
    this.groundLayer = this.map.createLayer("ground", this.landerTileset, 0, 0);
    this.furnitureLayer = this.map.createLayer("furniture", this.landerTileset, 0, 0);
  }
}
