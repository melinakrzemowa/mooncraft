import { GameObjects, Scene, Tilemaps } from "phaser";
import { Player } from "../../classes/player";
import { throws } from "assert";

export class Moon extends Scene {
  private player!: GameObjects.Sprite;
  private map!: Tilemaps.Tilemap;
  private groundTileset!: Tilemaps.Tileset;
  private cratersTileset!: Tilemaps.Tileset;
  private groundLayer!: Tilemaps.TilemapLayer;
  private cratersLayer!: Tilemaps.TilemapLayer;

  constructor() {
    super("moon-scene");
  }

  create(): void {
    this.initMap();
    this.player = new Player(this, 400, 400);
    this.physics.add.collider(this.player, this.cratersLayer);
    this.initCamera();
  }

  update(): void {
    this.player.update();
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
    this.groundLayer = this.map.createLayer("ground", this.groundTileset, 0, 0); // (layar-name-from-Tiled, Tileset)
    this.cratersLayer = this.map.createLayer("craters", this.cratersTileset, 0, 0);
    this.cratersLayer.setCollisionByProperty({ collides: true }); // custom property of Tileset in Tiled
  }
}
