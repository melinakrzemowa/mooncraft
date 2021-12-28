import { GameObjects, Scene, Physics } from "phaser";
import { Player } from "../../classes/player";
import { throws } from "assert";

export class Moon extends Scene {
  private player!: GameObjects.Sprite;
  private craters!: Physics.Arcade.StaticGroup;
  private platforms!: Physics.Arcade.StaticGroup;

  private test!: GameObjects.Sprite;

  constructor() {
    super("moon-scene");
  }

  create(): void {
    this.player = new Player(this, 88, 72);

    this.test = this.add.sprite(30, 40, "crater-001");

    this.craters = this.physics.add.staticGroup();
    this.craters.create(120, 120, "crater-001");

    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(140, 180, "platform");
    this.platforms.add(this.test);

    this.physics.add.collider(this.player, this.craters);
    this.physics.add.collider(this.player, this.platforms);

    this.initCamera();
  }

  update(): void {
    this.player.update();
  }

  private initCamera(): void {
    this.cameras.main.startFollow(this.player, false);
  }
}
