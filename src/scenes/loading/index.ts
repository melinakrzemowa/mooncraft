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
  }

  create(): void {
    this.scene.start("moon-scene");
  }
}
