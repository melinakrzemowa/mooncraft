import { GridEngine, GridEngineConfig } from "grid-engine";
import { GameObjects, Scene, Tilemaps, Physics } from "phaser";
import { Player } from "../../classes/player";

export class Lander extends Scene {
  private player!: GameObjects.Sprite;
  private map!: Tilemaps.Tilemap;
  private landerTileset!: Tilemaps.Tileset;
  private groundLayer!: Tilemaps.TilemapLayer;
  private furnitureLayer!: Tilemaps.TilemapLayer;
  private gridEngine!: GridEngine;

  constructor() {
    super("lander-scene");
  }

  create(): void {
    this.initMap();
    this.player = new Player(this);

    const gridEngineConfig : GridEngineConfig = {
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
    this.input.on("pointerdown", (pointer: any, gameObject: any) => {
      this.gridEngine.moveTo("player", { x: Math.floor(pointer.worldX / 16), y: Math.floor(pointer.worldY / 16) });
    });

    this.initCamera();
  }

  update(): void {
    this.player.update(this.gridEngine);

    if (this.player.x > 191 && this.player.x < 193 && this.player.y > 223 && this.player.y < 225) {
      this.registry.set("playerPosition", { x: 27, y: 26 });
      this.scene.start("moon-scene");
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
