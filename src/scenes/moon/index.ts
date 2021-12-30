import { GameObjects, Scene, Physics } from "phaser";
import { Player } from "../../classes/player";
import { throws } from "assert";

export class Moon extends Scene {
  private player!: GameObjects.Sprite;
  private craters!: Physics.Arcade.StaticGroup;
  private singleTestCrater!: GameObjects.Sprite;

  constructor() {
    super("moon-scene");
  }

  create(): void {
    this.player = new Player(this, 88, 72);

    this.singleTestCrater = this.add.sprite(30, 40, "crater-001");

    this.craters = this.physics.add.staticGroup();
    this.craters.create(120, 120, "crater-001");
    this.craters.add(this.singleTestCrater);

    this.physics.add.collider(this.player, this.craters);

    this.initCamera();
  }

  update(): void {
    this.player.update();
  }

  private initCamera(): void {
    this.cameras.main.startFollow(this.player, false);
    this.cameras.main.zoom = 10;
  }
}
