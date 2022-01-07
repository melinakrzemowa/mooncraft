import { GameObjects, Scene, Tilemaps, Physics } from "phaser";
import { Player } from "../../classes/player";

export class Moon extends Scene {
  private player!: GameObjects.Sprite;
  private npc!: GameObjects.Sprite;
  private npcs!: Physics.Arcade.StaticGroup;
  private map!: Tilemaps.Tilemap;
  private groundTileset!: Tilemaps.Tileset;
  private cratersTileset!: Tilemaps.Tileset;
  private landerTileset!: Tilemaps.Tileset;
  private groundLayer!: Tilemaps.TilemapLayer;
  private cratersLayer!: Tilemaps.TilemapLayer;
  private landerLayer!: Tilemaps.TilemapLayer;
  private landerHoverLayer!: Tilemaps.TilemapLayer;
  // private pointer: any;
  private gridEngine: any;

  constructor() {
    super("moon-scene");
  }

  create(): void {
    this.initMap();
    // this.pointer = this.add.circle(0, 0, 4, 0x6666ff);
    this.player = new Player(this);

    // TEST NPC ONCLICK ( TODO : should be done as separated class)
    this.npc = this.add.sprite(368, 416, "astronaut");
    this.npc.setInteractive();
    this.npc.on("pointerdown", () => {
      console.log("NPC click");
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

    const gridEngineConfig = {
      collisionTilePropertyName: "collides",
      characters: [
        {
          id: "player",
          sprite: this.player,
          startPosition: { x: 27, y: 26 },
          speed: 1,
        },
        {
          id: "singleNpc",
          sprite: this.npc,
          startPosition: { x: 24, y: 24 },
        },
      ],
    };

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

    for (let x = 35; x <= 40; x++) {
      for (let y = 25; y <= 30; y++) {
        this.gridEngine.moveRandomly(`npc${x}#${y}`, this.getRandomInt(0, 1500));
      }
    }

    this.gridEngine.movementStarted().subscribe(({ charId, direction }: any) => {
      if (charId == "player") {
        this.player.anims.play(direction);
      } else {
        npcs.get(charId).anims.play(direction);
      }
    });

    this.gridEngine.movementStopped().subscribe(({ charId, direction }: any) => {
      if (charId == "player") {
        this.player.anims.stop();
        this.player.anims.play("stay-down");
      } else {
        npcs.get(charId).anims.stop();
        npcs.get(charId).anims.play("stay-down");
      }
    });

    this.gridEngine.directionChanged().subscribe(({ charId, direction }: any) => {
      if (charId == "player") {
        this.player.anims.play("stay-down");
      }
    });

    // Pointer
    this.input.on("pointerdown", (pointer: any, gameObject: any) => {
      // this.pointer.x = pointer.worldX;
      // this.pointer.y = pointer.worldY;
      this.gridEngine.moveTo("player", { x: Math.floor(pointer.worldX / 16), y: Math.floor(pointer.worldY / 16) });
    });

    this.physics.add.collider(this.player, this.cratersLayer);
    this.physics.add.collider(this.player, this.landerLayer);
    this.initCamera();
  }

  update(): void {
    this.player.update(this.gridEngine);

    if (this.player.x > 430 && this.player.x < 450 && this.player.y > 399 && this.player.y < 401) {
      this.scene.start("lander-scene");
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
    this.groundTileset = this.map.addTilesetImage("moon-ground", "moon-ground"); // (file-name, tileset-name-from-Tiled)
    this.cratersTileset = this.map.addTilesetImage("moon-craters", "moon-craters");
    this.landerTileset = this.map.addTilesetImage("lander", "lander");
    this.groundLayer = this.map.createLayer("ground", this.groundTileset, 0, 0); // (layar-name-from-Tiled, Tileset)
    this.cratersLayer = this.map.createLayer("craters", this.cratersTileset, 0, 0);
    this.landerLayer = this.map.createLayer("lander", this.landerTileset, 0, 0);
    this.landerHoverLayer = this.map.createLayer("lander-hover", this.landerTileset, 0, 0);
    // this.add.grid(0, 0, 16 * 100, 16 * 100, 16, 16, 0x010101, 0.4); // visible grid for testing purposes
  }

  getRandomInt(min: integer, max: integer): integer {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
