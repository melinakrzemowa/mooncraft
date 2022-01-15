import { Direction, GridEngine } from "grid-engine";
import { Actor } from "./actor";

export class Player extends Actor {
  private keySpace: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, "astronaut");

    // KEYS
    this.keySpace = this.scene.input.keyboard.addKey("Space");

    // PHYSICS
    this.setCircle(8);

    // ANIMATIONS
    this.initAnimations();
  }

  update(gridEngine: GridEngine): void {
    const cursors = this.scene.input.keyboard.createCursorKeys();
    if (cursors.left.isDown) {
      gridEngine.move("player", Direction.LEFT);
    } else if (cursors.right.isDown) {
      gridEngine.move("player", Direction.RIGHT);
    } else if (cursors.up.isDown) {
      gridEngine.move("player", Direction.UP);
    } else if (cursors.down.isDown) {
      gridEngine.move("player", Direction.DOWN);
    }

    if (this.keySpace?.isDown) {
      console.log("some future action");
    }
  }

  private initAnimations(): void {
    this.scene.anims.create({
      key: "down",
      frames: this.scene.anims.generateFrameNames("astronaut", {
        prefix: "move-down-",
        end: 3,
      }),
      frameRate: 4,
      repeat: -1,
    });

    this.scene.anims.create({
      key: "up",
      frames: this.scene.anims.generateFrameNames("astronaut", {
        prefix: "move-up-",
        end: 3,
      }),
      frameRate: 4,
      repeat: -1,
    });

    this.scene.anims.create({
      key: "left",
      frames: this.scene.anims.generateFrameNames("astronaut", {
        prefix: "move-left-",
        end: 3,
      }),
      frameRate: 4,
      repeat: -1,
    });

    this.scene.anims.create({
      key: "right",
      frames: this.scene.anims.generateFrameNames("astronaut", {
        prefix: "move-right-",
        end: 3,
      }),
      frameRate: 4,
      repeat: -1,
    });

    this.scene.anims.create({
      key: "stay-down",
      frames: this.scene.anims.generateFrameNames("astronaut", {
        prefix: "stay-down-",
        end: 1,
      }),
      frameRate: 4,
      repeat: -1,
    });
  }
}
