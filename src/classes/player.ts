import { Direction, GridEngine } from "grid-engine";
import { Actor } from "./actor";

export class Player extends Actor {
  private keySpace: Phaser.Input.Keyboard.Key;
  private keyE: Phaser.Input.Keyboard.Key;
  private interactPressed = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, "astronaut");

    // KEYS
    this.keySpace = this.scene.input.keyboard.addKey("Space");
    this.keyE = this.scene.input.keyboard.addKey("E");

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

    // E key interaction (edge-triggered)
    if (this.keyE?.isDown && !this.interactPressed) {
      this.interactPressed = true;
      this.emit("interact");
    }
    if (this.keyE?.isUp) {
      this.interactPressed = false;
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
