import { Direction, GridEngine } from "grid-engine";
import { Actor } from "./actor";

export class Player extends Actor {
  private keyE: Phaser.Input.Keyboard.Key;
  private interactPressed = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, "astronaut");

    // KEYS
    this.keyE = this.scene.input.keyboard.addKey("E");

    // PHYSICS
    this.setCircle(8);

    // ANIMATIONS
    this.initAnimations();
  }

  update(gridEngine: GridEngine, blockMovement = false): void {
    if (!blockMovement) {
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
    }

    // E key interaction (edge-triggered) - always processed
    if (this.keyE?.isDown && !this.interactPressed) {
      this.interactPressed = true;
      this.emit("interact");
    }
    if (this.keyE?.isUp) {
      this.interactPressed = false;
    }
  }

  playIdle(direction: Direction): void {
    const dirMap: Record<string, string> = {
      [Direction.UP]: "stay-up",
      [Direction.DOWN]: "stay-down",
      [Direction.LEFT]: "stay-left",
      [Direction.RIGHT]: "stay-right",
    };
    this.anims.play(dirMap[direction] || "stay-down");
  }

  private initAnimations(): void {
    const directions = ["down", "up", "left", "right"];

    for (const dir of directions) {
      this.scene.anims.create({
        key: dir,
        frames: this.scene.anims.generateFrameNames("astronaut", {
          prefix: `move-${dir}-`,
          end: 3,
        }),
        frameRate: 4,
        repeat: -1,
      });

      this.scene.anims.create({
        key: `stay-${dir}`,
        frames: this.scene.anims.generateFrameNames("astronaut", {
          prefix: `stay-${dir}-`,
          end: 3,
        }),
        frameRate: 4,
        repeat: -1,
      });
    }
  }
}
