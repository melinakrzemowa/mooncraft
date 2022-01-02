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
  private pointer: any;

  constructor() {
    super("moon-scene");
  }

  create(): void {
    this.initMap();
    this.pointer = this.add.circle(0, 0, 4, 0x6666ff);
    this.player = new Player(this, 400, 400);
    this.initMapHoverLayers();

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
    this.npcs = this.physics.add.staticGroup();
    this.npcs.add(this.npc);
    this.physics.add.collider(this.player, this.npcs);

    this.input.on("pointerdown", (pointer: any, gameObject: any) => {
      this.pointer.x = pointer.worldX;
      this.pointer.y = pointer.worldY;
    });

    this.physics.add.collider(this.player, this.cratersLayer);
    this.physics.add.collider(this.player, this.landerLayer);
    this.initCamera();
  }

  update(): void {
    this.player.update();
    this.npc.anims.play("stay-down", true);
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
    this.cratersLayer.setCollisionByProperty({ collides: true }); // custom property of Tileset in Tiled
    this.landerLayer = this.map.createLayer("lander", this.landerTileset, 0, 0);
    this.landerLayer.setCollisionByProperty({ collides: true }); // custom property of Tileset in Tiled

    // TODO : onclick only existing elements - now triggers everything (layer is everywhere - also empty)
    // this.landerLayer.setInteractive();
    // this.landerLayer.on("pointerdown", (pointer: Object, x: number, y: number, stopPropagation: Object) => {
    //   // console.log("This is Lander", pointer); // .downX/.downY
    //   // console.log("x: ", x);
    //   // console.log("y: ", y);
    //   console.log("ddd: ", this);
    // });
  }

  private initMapHoverLayers(): void {
    this.map = this.make.tilemap({
      key: "moon-map",
      tileWidth: 16,
      tileHeight: 16,
    });
    this.landerHoverLayer = this.map.createLayer("lander-hover", this.landerTileset, 0, 0);
  }
}
