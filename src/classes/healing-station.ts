import { Scene } from "phaser";

export class HealingStation {
  private scene: Scene;
  private container: Phaser.GameObjects.Container;
  private visible = false;
  private healing = false;

  constructor(scene: Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(1000);
    this.container.setScrollFactor(0);
    this.container.setVisible(false);
  }

  show(currentHealth: number, maxHealth: number, onComplete: () => void): void {
    if (this.visible) return;
    this.visible = true;
    this.healing = true;

    this.container.removeAll(true);

    const cam = this.scene.cameras.main;
    const w = cam.width;
    const h = cam.height;

    // Terminal background
    const borderOuter = this.scene.add.rectangle(w / 2, h / 2, 120, 90, 0x555568);
    const borderInner = this.scene.add.rectangle(w / 2, h / 2, 116, 86, 0x333344);
    const screen = this.scene.add.rectangle(w / 2, h / 2, 112, 82, 0x0a1a0a);
    this.container.add([borderOuter, borderInner, screen]);

    // Title
    const title = this.scene.add.text(w / 2, h / 2 - 35, "EMERGENCY MEDKIT", {
      fontFamily: "monospace", fontSize: "3px", color: "#33ff33", resolution: 4,
    });
    title.setOrigin(0.5);
    this.container.add(title);

    // Body outline (simple pixel art person)
    const bodyX = w / 2;
    const bodyY = h / 2 - 5;
    const bodyParts = [
      { x: 0, y: -12, w: 6, h: 6 },   // head
      { x: 0, y: -4, w: 8, h: 10 },    // torso
      { x: -6, y: -4, w: 4, h: 8 },    // left arm
      { x: 6, y: -4, w: 4, h: 8 },     // right arm
      { x: -3, y: 7, w: 3, h: 8 },     // left leg
      { x: 3, y: 7, w: 3, h: 8 },      // right leg
    ];

    const ratio = currentHealth / maxHealth;
    const redParts: Phaser.GameObjects.Rectangle[] = [];
    const greenParts: Phaser.GameObjects.Rectangle[] = [];

    bodyParts.forEach((part, i) => {
      // Red (damaged)
      const red = this.scene.add.rectangle(bodyX + part.x, bodyY + part.y, part.w, part.h, 0xcc3333);
      this.container.add(red);
      redParts.push(red);

      // Green (healed) - starts at current health ratio
      const green = this.scene.add.rectangle(bodyX + part.x, bodyY + part.y, part.w, part.h, 0x33cc33);
      green.setAlpha(ratio);
      this.container.add(green);
      greenParts.push(green);
    });

    // Status text
    const statusText = this.scene.add.text(w / 2, h / 2 + 22, "SCANNING...", {
      fontFamily: "monospace", fontSize: "2.5px", color: "#33ff33", resolution: 4,
    });
    statusText.setOrigin(0.5);
    this.container.add(statusText);

    // Progress bar
    const barBg = this.scene.add.rectangle(w / 2, h / 2 + 28, 60, 3, 0x1a1a2e);
    const barFill = this.scene.add.rectangle(w / 2 - 30, h / 2 + 28, 0, 3, 0x33cc33);
    barFill.setOrigin(0, 0.5);
    this.container.add([barBg, barFill]);

    this.container.setVisible(true);

    // Animate healing over 2 seconds
    this.scene.tweens.add({
      targets: barFill,
      width: 60,
      duration: 2000,
      onUpdate: (tween: any) => {
        const progress = tween.progress;
        greenParts.forEach((g) => g.setAlpha(ratio + (1 - ratio) * progress));
        if (progress > 0.3) statusText.setText("REPAIRING TISSUE...");
        if (progress > 0.6) statusText.setText("APPLYING NANOGEL...");
        if (progress > 0.9) statusText.setText("COMPLETE");
      },
      onComplete: () => {
        statusText.setText("HEALING COMPLETE");
        statusText.setColor("#00ff00");
        this.scene.time.delayedCall(800, () => {
          this.hide();
          this.healing = false;
          onComplete();
        });
      },
    });
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.container.setVisible(false);
  }

  isVisible(): boolean {
    return this.visible;
  }

  isHealing(): boolean {
    return this.healing;
  }
}
