import { GameObjects, Scene } from "phaser";
import { Player } from "../../classes/player";

export class Moon extends Scene {
  private player!: GameObjects.Sprite;

  constructor() {
    super("moon-scene");
  }

  create(): void {
    this.player = new Player(this, 88, 72);
    this.initCamera();
  }

  update(): void {
    this.player.update();
  }

  private initCamera(): void {
    this.cameras.main.startFollow(this.player, false);
  }
}
