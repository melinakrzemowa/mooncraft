import { Scene } from "phaser";
import { loadGame } from "../../classes/save-manager";

export class LoadingScene extends Scene {
  private loadingText!: Phaser.GameObjects.Text;
  private singlePlayerText!: Phaser.GameObjects.Text;
  private multiPlayerText!: Phaser.GameObjects.Text;

  constructor() {
    super("loading-scene");
  }

  init() {
    this.loadingText = this.add.text(2080 / 2, 1440 / 2, "Loading ...", {
      font: "64pt ThaleahFat",
      color: "#FFFFFF",
      align: "center",
    });
    this.loadingText.setOrigin(0.5, 0.5);
  }

  preload(): void {
    this.load.baseURL = "assets/";
    this.load.atlas("astronaut", "spritesheets/astronaut.png", "spritesheets/astronaut_atlas.json");

    this.load.spritesheet("enemy_worm", "spritesheets/enemy_worm.png", {
      frameWidth: 16,
      frameHeight: 16,
    });

    // moon scene:
    this.load.image({
      key: "moon-ground",
      url: "tilemaps/tiles/moon-ground.png",
    });
    this.load.image({
      key: "moon-craters",
      url: "tilemaps/tiles/moon-craters.png",
    });
    this.load.image({
      key: "lander",
      url: "tilemaps/tiles/lander.png",
    });
    this.load.tilemapTiledJSON("moon-map", "tilemaps/json/moon-map.json");

    // lander interior scene:
    this.load.image({
      key: "lander-interior",
      url: "tilemaps/tiles/lander-interior.png",
    });
    this.load.tilemapTiledJSON("lander-interior-map", "tilemaps/json/lander-interior-map.json");
  }

  create(): void {
    this.loadingText.destroy();
    this.generateSprites();

    // Check for existing save
    const save = loadGame();
    if (save) {
      this.registry.set("saveData", save);
      this.registry.set("playerPosition", { x: save.playerX, y: save.playerY });
      this.scene.start(save.scene);
      return;
    }

    this.singlePlayerText = this.createButton(2080 / 2, 1440 / 2 - 100, "SINGLE PLAYER");
    this.multiPlayerText = this.createButton(2080 / 2, 1440 / 2 + 100, "MULTI PLAYER");

    this.singlePlayerText.on("pointerdown", () => this.startSinglePlayer());
    this.multiPlayerText.on("pointerdown", () => this.startMultiPlayer());
  }

  startSinglePlayer(): void {
    this.registry.set("playerPosition", { x: 49, y: 51 });
    this.scene.start("moon-scene");
  }

  startMultiPlayer(): void {
    this.scene.start("multi-scene");
  }

  generateSprites(): void {
    // Big alien sprite (32x32, 8 frames: 4 idle + 4 attack)
    const alienGfx = this.make.graphics({ x: 0, y: 0 });
    const aw = 32, ah = 32;
    for (let frame = 0; frame < 8; frame++) {
      const ox = frame * aw;
      const isAttack = frame >= 4;
      const wobble = (frame % 4) * 2 - 3;

      // Body (green oval)
      alienGfx.fillStyle(0x226633);
      alienGfx.fillEllipse(ox + 16, 18 + wobble * 0.3, 22, 20);

      // Inner body
      alienGfx.fillStyle(0x33aa44);
      alienGfx.fillEllipse(ox + 16, 17 + wobble * 0.3, 16, 14);

      // Eyes (big, menacing)
      alienGfx.fillStyle(0xffff00);
      alienGfx.fillCircle(ox + 10 + wobble * 0.2, 12, 4);
      alienGfx.fillCircle(ox + 22 - wobble * 0.2, 12, 4);

      // Pupils
      alienGfx.fillStyle(0x000000);
      alienGfx.fillCircle(ox + 11 + wobble * 0.3, 12, 2);
      alienGfx.fillCircle(ox + 21 - wobble * 0.3, 12, 2);

      // Mandibles/teeth
      alienGfx.fillStyle(0x114422);
      alienGfx.fillRect(ox + 8, 22 + wobble * 0.2, 3, isAttack ? 6 : 3);
      alienGfx.fillRect(ox + 21, 22 + wobble * 0.2, 3, isAttack ? 6 : 3);

      // Antennae
      alienGfx.lineStyle(1, 0x33aa44);
      alienGfx.lineBetween(ox + 10, 6, ox + 6 + wobble, 1);
      alienGfx.lineBetween(ox + 22, 6, ox + 26 - wobble, 1);

      // Antenna tips
      alienGfx.fillStyle(isAttack ? 0xff3333 : 0x66ff66);
      alienGfx.fillCircle(ox + 6 + wobble, 1, 2);
      alienGfx.fillCircle(ox + 26 - wobble, 1, 2);

      // Plasma glow when attacking
      if (isAttack) {
        alienGfx.fillStyle(0xff00ff, 0.3);
        alienGfx.fillCircle(ox + 16, 26, 5 + (frame % 2) * 2);
      }
    }
    alienGfx.generateTexture("alien_big", aw * 8, ah);
    alienGfx.destroy();

    // Plasma bolt sprite (8x8, 4 frames)
    const plasmaGfx = this.make.graphics({ x: 0, y: 0 });
    for (let frame = 0; frame < 4; frame++) {
      const ox = frame * 8;
      const pulse = 1 + (frame % 2) * 0.5;

      // Outer glow
      plasmaGfx.fillStyle(0xff00ff, 0.3);
      plasmaGfx.fillCircle(ox + 4, 4, 3.5 * pulse);

      // Core
      plasmaGfx.fillStyle(0xff44ff);
      plasmaGfx.fillCircle(ox + 4, 4, 2 * pulse);

      // Hot center
      plasmaGfx.fillStyle(0xffffff);
      plasmaGfx.fillCircle(ox + 4, 4, 1);
    }
    plasmaGfx.generateTexture("plasma_bolt", 32, 8);
    plasmaGfx.destroy();

    // Register animations for alien
    this.anims.create({
      key: "alien-idle",
      frames: this.anims.generateFrameNumbers("alien_big", { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: "alien-walk",
      frames: this.anims.generateFrameNumbers("alien_big", { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "alien-attack",
      frames: this.anims.generateFrameNumbers("alien_big", { start: 4, end: 7 }),
      frameRate: 6,
      repeat: 0,
    });
    this.anims.create({
      key: "plasma-fly",
      frames: this.anims.generateFrameNumbers("plasma_bolt", { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    });
  }

  createButton(x: number, y: number, text: string): Phaser.GameObjects.Text {
    const button = this.add.text(x, y, text, { font: "128pt ThaleahFat", color: "#FFFFFF", align: "center" });
    button.setOrigin(0.5, 0.5);
    button.setShadow(10, 5, "#333333", 0, false, true);
    button.setInteractive();

    button.on("pointerover", () => {
      button.setColor("#6b6688");
    });

    button.on("pointerout", () => {
      button.setColor("#FFFFFF");
    });

    return button;
  }
}
