import { Actor } from "./actor";

export class Player extends Actor {
  private keyW: Phaser.Input.Keyboard.Key;
  private keyA: Phaser.Input.Keyboard.Key;
  private keyS: Phaser.Input.Keyboard.Key;
  private keyD: Phaser.Input.Keyboard.Key;
  private keyUp: Phaser.Input.Keyboard.Key;
  private keyLeft: Phaser.Input.Keyboard.Key;
  private keyDown: Phaser.Input.Keyboard.Key;
  private keyRight: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "astronaut");

    // KEYS
    this.keyW = this.scene.input.keyboard.addKey("W");
    this.keyA = this.scene.input.keyboard.addKey("A");
    this.keyS = this.scene.input.keyboard.addKey("S");
    this.keyD = this.scene.input.keyboard.addKey("D");
    this.keyUp = this.scene.input.keyboard.addKey("UP");
    this.keyLeft = this.scene.input.keyboard.addKey("LEFT");
    this.keyDown = this.scene.input.keyboard.addKey("DOWN");
    this.keyRight = this.scene.input.keyboard.addKey("RIGHT");

    // PHYSICS
    this.getBody().setSize(16, 16);

    // ANIMATIONS
    this.initAnimations();
  }

  update(): void {
    this.getBody().setVelocity(0);
    if (this.keyRight?.isDown && this.keyDown?.isDown) {
      this.body.velocity.x = 20;
      this.body.velocity.y = 20;
      this.checkFlip();
      this.getBody().setOffset(0, 0);
      this.anims.play("move-down", true);
    } else if (this.keyLeft?.isDown && this.keyDown?.isDown) {
      this.body.velocity.x = -20;
      this.body.velocity.y = 20;
      this.checkFlip();
      this.getBody().setOffset(16, 0);
      this.anims.play("move-down", true);
    } else if (this.keyRight?.isDown && this.keyUp?.isDown) {
      this.body.velocity.x = 20;
      this.body.velocity.y = -20;
      this.checkFlip();
      this.getBody().setOffset(0, 0);
      this.anims.play("move-up", true);
    } else if (this.keyLeft?.isDown && this.keyUp?.isDown) {
      this.body.velocity.x = -20;
      this.body.velocity.y = -20;
      this.checkFlip();
      this.getBody().setOffset(16, 0);
      this.anims.play("move-up", true);
    } else if (this.keyW?.isDown || this.keyUp?.isDown) {
      this.body.velocity.y = -20;
      this.anims.play("move-up", true);
    } else if (this.keyA?.isDown || this.keyLeft?.isDown) {
      this.body.velocity.x = -20;
      this.checkFlip();
      this.getBody().setOffset(16, 0);
      this.anims.play("move-side", true);
    } else if (this.keyS?.isDown || this.keyDown?.isDown) {
      this.body.velocity.y = 20;
      this.anims.play("move-down", true);
    } else if (this.keyD?.isDown || this.keyRight?.isDown) {
      this.body.velocity.x = 20;
      this.checkFlip();
      this.getBody().setOffset(0, 0);
      this.anims.play("move-side", true);
    } else {
      this.anims.play("stay-down", true);
    }
  }

  private initAnimations(): void {
    this.scene.anims.create({
      key: "move-down",
      frames: this.scene.anims.generateFrameNames("astronaut", {
        prefix: "move-down-",
        end: 3,
      }),
      frameRate: 4,
    });

    this.scene.anims.create({
      key: "move-up",
      frames: this.scene.anims.generateFrameNames("astronaut", {
        prefix: "move-up-",
        end: 3,
      }),
      frameRate: 4,
    });

    this.scene.anims.create({
      key: "move-side",
      frames: this.scene.anims.generateFrameNames("astronaut", {
        prefix: "move-side-",
        end: 3,
      }),
      frameRate: 4,
    });

    this.scene.anims.create({
      key: "stay-down",
      frames: this.scene.anims.generateFrameNames("astronaut", {
        prefix: "stay-down-",
        end: 1,
      }),
      frameRate: 4,
    });
  }
}
