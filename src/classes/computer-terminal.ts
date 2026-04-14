import { Scene } from "phaser";

const LANDING_LOGS = [
  "  LUNAR MODULE FLIGHT COMPUTER",
  "  ============================",
  "",
  "  > boot sequence initiated",
  "  > nav system ........... OK",
  "  > comms array .......... OK",
  "  > fuel cells ........... OK",
  "  > landing radar ........ OK",
  "",
  "  -- DESCENT LOG --",
  "",
  "  T-00:12:34  orbit stable 110km",
  "  T-00:08:21  descent burn start",
  "  T-00:05:47  altitude 24km",
  "  T-00:03:12  throttle 60%",
  "  T-00:01:55  altitude 2.4km",
  "  T-00:00:48  WARN: boulder field",
  "  T-00:00:31  manual override ON",
  "  T-00:00:12  altitude 40m",
  "  T-00:00:03  contact light",
  "  T+00:00:00  ENGINE STOP",
  "",
  "  status: LANDED",
  "  fuel remaining: 3.2%",
  "  coordinates: 23.4N 47.2W",
  "",
  "  press [E] to close",
];

export class ComputerTerminal {
  private scene: Scene;
  private container: Phaser.GameObjects.Container;
  private visible = false;

  constructor(scene: Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(1000);
    this.container.setScrollFactor(0);
    this.container.setVisible(false);
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;

    this.container.removeAll(true);

    const cam = this.scene.cameras.main;
    const w = cam.width;
    const h = cam.height;

    // Terminal background (dark screen with border)
    const borderOuter = this.scene.add.rectangle(w / 2, h / 2, 142, 108, 0x555568);
    const borderInner = this.scene.add.rectangle(w / 2, h / 2, 138, 104, 0x333344);
    const screen = this.scene.add.rectangle(w / 2, h / 2, 134, 100, 0x0a1a0a);

    this.container.add([borderOuter, borderInner, screen]);

    // Scanline effect
    for (let i = 0; i < 100; i += 4) {
      const scanline = this.scene.add.rectangle(
        w / 2, h / 2 - 50 + i, 134, 1, 0x0a1a0a, 0.3
      );
      this.container.add(scanline);
    }

    // Render log text line by line
    const startX = w / 2 - 63;
    const startY = h / 2 - 46;
    const lineHeight = 3.2;

    LANDING_LOGS.forEach((line, i) => {
      const text = this.scene.add.text(startX, startY + i * lineHeight, line, {
        fontFamily: "monospace",
        fontSize: "3px",
        color: "#33ff33",
        resolution: 4,
      });
      this.container.add(text);
    });

    // Blinking cursor at the bottom
    const cursor = this.scene.add.rectangle(
      startX + 2, startY + LANDING_LOGS.length * lineHeight + 2,
      2, 2, 0x33ff33
    );
    this.container.add(cursor);
    this.scene.tweens.add({
      targets: cursor,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    this.container.setVisible(true);
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.container.setVisible(false);
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  isVisible(): boolean {
    return this.visible;
  }
}
