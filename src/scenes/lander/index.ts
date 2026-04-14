import { Direction, GridEngine, GridEngineConfig } from "grid-engine";
import { GameObjects, Scene, Tilemaps } from "phaser";
import { Player } from "../../classes/player";
import { ComputerTerminal } from "../../classes/computer-terminal";

// Tile IDs (0-indexed) in the lander-interior tileset that represent the computer
// These are tiles 3 and 4 in the top row of the 5x5 tileset (screens/monitors)
const COMPUTER_TILE_IDS = new Set([3, 4, 8, 9]);

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
      if (charId == "player") {
        this.player.anims.play(direction);
      }
    });

    this.gridEngine.movementStopped().subscribe(({ charId, direction }: any) => {
      if (charId == "player") {
        this.player.anims.stop();
        this.player.anims.play("stay-down");
      }
    });

    this.gridEngine.directionChanged().subscribe(({ charId, direction }: any) => {
      if (charId == "player") {
        this.player.anims.play("stay-down");
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
    if (!this.terminal.isVisible()) {
      this.player.update(this.gridEngine);

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

    const playerPos = this.gridEngine.getPosition("player");
    const facing = this.gridEngine.getFacingDirection("player");

    const targetPos = { ...playerPos };
    switch (facing) {
      case Direction.UP: targetPos.y -= 1; break;
      case Direction.DOWN: targetPos.y += 1; break;
      case Direction.LEFT: targetPos.x -= 1; break;
      case Direction.RIGHT: targetPos.x += 1; break;
    }

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
