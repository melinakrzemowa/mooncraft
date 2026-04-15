import { Scene } from "phaser";

const LANDER_POS = { x: 50, y: 50 };
const METERS_PER_TILE = 10;

export class LanderTracker {
  private scene: Scene;
  private container: Phaser.GameObjects.Container;
  private visible = false;
  private animating = false;

  constructor(scene: Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(1000);
    this.container.setScrollFactor(0);
    this.container.setVisible(false);
  }

  show(playerX: number, playerY: number): void {
    if (this.visible) return;
    this.visible = true;
    this.animating = true;

    this.container.removeAll(true);

    const cam = this.scene.cameras.main;
    const w = cam.width;
    const h = cam.height;
    const cx = w / 2;
    const cy = h / 2;

    // Device frame (retro tablet)
    const frame = this.scene.add.rectangle(cx, cy, 130, 110, 0x444455);
    const frameBevel = this.scene.add.rectangle(cx, cy, 126, 106, 0x333344);
    const screen = this.scene.add.rectangle(cx, cy - 4, 110, 80, 0x0a1a0a);
    this.container.add([frame, frameBevel, screen]);

    // Screen border glow
    const screenBorder = this.scene.add.rectangle(cx, cy - 4, 112, 82, 0x225522, 0);
    screenBorder.setStrokeStyle(0.5, 0x33ff33, 0.5);
    this.container.add(screenBorder);

    // Title
    const title = this.scene.add.text(cx, cy - 40, "LANDER LOCATOR v2.1", {
      fontFamily: "monospace", fontSize: "2.5px", color: "#33ff33", resolution: 4,
    });
    title.setOrigin(0.5);
    this.container.add(title);

    // Status text (bottom of device)
    const statusLabel = this.scene.add.text(cx, cy + 46, "NAV-COMP M7", {
      fontFamily: "monospace", fontSize: "2px", color: "#666677", resolution: 4,
    });
    statusLabel.setOrigin(0.5);
    this.container.add(statusLabel);

    // Compass circle
    const compassRadius = 25;
    const compassY = cy - 8;

    // Outer ring
    const ring = this.scene.add.graphics();
    ring.lineStyle(0.5, 0x33ff33, 0.6);
    ring.strokeCircle(cx, compassY, compassRadius);
    ring.strokeCircle(cx, compassY, compassRadius - 2);
    this.container.add(ring);

    // Tick marks around compass
    const ticks = this.scene.add.graphics();
    ticks.lineStyle(0.3, 0x33ff33, 0.4);
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 - Math.PI / 2;
      const innerR = i % 4 === 0 ? compassRadius - 5 : compassRadius - 3;
      ticks.lineBetween(
        cx + Math.cos(angle) * innerR, compassY + Math.sin(angle) * innerR,
        cx + Math.cos(angle) * (compassRadius - 1), compassY + Math.sin(angle) * (compassRadius - 1)
      );
    }
    this.container.add(ticks);

    // Cardinal labels
    const cardinals = [
      { label: "N", angle: -Math.PI / 2 },
      { label: "E", angle: 0 },
      { label: "S", angle: Math.PI / 2 },
      { label: "W", angle: Math.PI },
    ];
    cardinals.forEach((c) => {
      const lx = cx + Math.cos(c.angle) * (compassRadius + 4);
      const ly = compassY + Math.sin(c.angle) * (compassRadius + 4);
      const label = this.scene.add.text(lx, ly, c.label, {
        fontFamily: "monospace", fontSize: "2.5px", color: "#33ff33", resolution: 4,
      });
      label.setOrigin(0.5);
      this.container.add(label);
    });

    // Center dot
    const centerDot = this.scene.add.circle(cx, compassY, 1.5, 0x33ff33);
    this.container.add(centerDot);

    // Compass needle (will be animated)
    const needle = this.scene.add.graphics();
    this.container.add(needle);

    // Calculate target angle to lander
    const dx = LANDER_POS.x - playerX;
    const dy = LANDER_POS.y - playerY;
    const targetAngle = Math.atan2(dy, dx);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const distMeters = Math.round(distance * METERS_PER_TILE);

    // Scanning text
    const scanText = this.scene.add.text(cx, cy + 24, "SCANNING...", {
      fontFamily: "monospace", fontSize: "2.5px", color: "#33ff33", resolution: 4,
    });
    scanText.setOrigin(0.5);
    this.container.add(scanText);

    // Distance text (hidden until calibrated)
    const distText = this.scene.add.text(cx, cy + 32, "", {
      fontFamily: "monospace", fontSize: "2.5px", color: "#33ff33", resolution: 4,
    });
    distText.setOrigin(0.5);
    this.container.add(distText);

    // Close hint
    const closeHint = this.scene.add.text(cx, cy + 38, "[X] close", {
      fontFamily: "monospace", fontSize: "2px", color: "#225522", resolution: 4,
    });
    closeHint.setOrigin(0.5);
    this.container.add(closeHint);

    this.container.setVisible(true);

    // Animate needle: spin twice, then ease into target direction
    const spinDuration = 1500;
    const settleDuration = 1200;
    const totalSpinAngle = Math.PI * 4 + targetAngle; // 2 full rotations + target

    let startTime = this.scene.time.now;

    const drawNeedle = (angle: number) => {
      needle.clear();
      const tipLen = compassRadius - 4;
      const tipX = cx + Math.cos(angle) * tipLen;
      const tipY = compassY + Math.sin(angle) * tipLen;

      // Needle line
      needle.lineStyle(1, 0x33ff33);
      needle.lineBetween(cx, compassY, tipX, tipY);

      // Arrow head
      const headSize = 4;
      const leftAngle = angle + Math.PI * 0.8;
      const rightAngle = angle - Math.PI * 0.8;
      needle.fillStyle(0x33ff33);
      needle.beginPath();
      needle.moveTo(tipX, tipY);
      needle.lineTo(tipX + Math.cos(leftAngle) * headSize, tipY + Math.sin(leftAngle) * headSize);
      needle.lineTo(tipX + Math.cos(rightAngle) * headSize, tipY + Math.sin(rightAngle) * headSize);
      needle.closePath();
      needle.fillPath();

      // Tail
      needle.lineStyle(0.5, 0x33ff33, 0.4);
      needle.lineBetween(
        cx, compassY,
        cx + Math.cos(angle + Math.PI) * 8,
        compassY + Math.sin(angle + Math.PI) * 8
      );
    };

    // Animation loop
    const updateEvent = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!this.visible) {
          updateEvent.destroy();
          return;
        }

        const elapsed = this.scene.time.now - startTime;

        if (elapsed < spinDuration) {
          // Fast spinning phase
          const progress = elapsed / spinDuration;
          const angle = -Math.PI / 2 + progress * Math.PI * 4;
          drawNeedle(angle);
          scanText.setText("SCANNING" + ".".repeat(Math.floor(elapsed / 200) % 4));
        } else if (elapsed < spinDuration + settleDuration) {
          // Settling phase - ease out to target
          const settleProgress = (elapsed - spinDuration) / settleDuration;
          const eased = 1 - Math.pow(1 - settleProgress, 3); // ease-out cubic
          const startAngle = Math.PI * 4 - Math.PI / 2; // where spinning ended
          const angle = startAngle + (targetAngle - (startAngle % (Math.PI * 2))) * eased;
          drawNeedle(angle);
          scanText.setText("CALIBRATING...");
        } else {
          // Locked on
          drawNeedle(targetAngle);
          scanText.setText("SIGNAL LOCKED");
          scanText.setColor("#00ff00");

          const dirLabel = this.getDirectionLabel(targetAngle);
          distText.setText(`${distMeters}m ${dirLabel}`);

          this.animating = false;
          updateEvent.destroy();
        }
      },
    });
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.animating = false;
    this.container.setVisible(false);
  }

  isVisible(): boolean {
    return this.visible;
  }

  isAnimating(): boolean {
    return this.animating;
  }

  private getDirectionLabel(angle: number): string {
    // Normalize to 0-2PI
    const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const deg = (a * 180) / Math.PI;

    if (deg >= 337.5 || deg < 22.5) return "E";
    if (deg >= 22.5 && deg < 67.5) return "SE";
    if (deg >= 67.5 && deg < 112.5) return "S";
    if (deg >= 112.5 && deg < 157.5) return "SW";
    if (deg >= 157.5 && deg < 202.5) return "W";
    if (deg >= 202.5 && deg < 247.5) return "NW";
    if (deg >= 247.5 && deg < 292.5) return "N";
    if (deg >= 292.5 && deg < 337.5) return "NE";
    return "";
  }
}
