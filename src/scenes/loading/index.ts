import { Scene } from "phaser";

export class LoadingScene extends Scene {
  constructor() {
    super("loading-scene");
  }

  preload(): void {
    this.load.baseURL = "assets/";
    this.load.atlas("astronaut", "spritesheets/astronaut.png", "spritesheets/astronaut_atlas.json");
    this.load.image("crater-001", "sprites/crater-001.png");
    this.load.image("platform", "sprites/platform.png");
    this.load.image({
      key: "moon-ground",
      url: "tilemaps/tiles/moon-ground.png",
    });
    this.load.image({
      key: "moon-craters",
      url: "tilemaps/tiles/moon-craters.png",
    });
    this.load.tilemapTiledJSON("moon-map", "tilemaps/json/moon-map.json");
  }

  create(): void {
    this.scene.start("moon-scene");
  }
}
