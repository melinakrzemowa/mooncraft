import { Scene } from "phaser";

export class LoadingScene extends Scene {
  constructor() {
    super("loading-scene");
  }

  preload(): void {
    this.load.baseURL = "assets/";
    this.load.atlas("astronaut", "spritesheets/astronaut.png", "spritesheets/astronaut_atlas.json");

    // moon scene:
    this.load.image({
      key: "moon-ground",
      url: "tilemaps/tiles/moon-ground.png",
    });
    this.load.image({
      key: "moon-craters",
      url: "tilemaps/tiles/moon-craters.png",
    });
    this.load.image({
      key: "lander",
      url: "tilemaps/tiles/lander.png",
    });
    this.load.tilemapTiledJSON("moon-map", "tilemaps/json/moon-map.json");

    // lander interior scene:
    this.load.image({
      key: "lander-interior",
      url: "tilemaps/tiles/lander-interior.png",
    });
    this.load.tilemapTiledJSON("lander-interior-map", "tilemaps/json/lander-interior-map.json");
  }

  create(): void {
    this.registry.set("playerPosition", { x: 25, y: 26 });
    this.scene.start("moon-scene");
  }
}
