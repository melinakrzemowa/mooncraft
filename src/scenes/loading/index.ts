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
    const alienGfx = this.make.graphics({ x: 0, y: 0, add: false });
    const aw = 32, ah = 32;
    for (let frame = 0; frame < 8; frame++) {
      const ox = frame * aw;
      const isAttack = frame >= 4;
      const wobble = (frame % 4) * 2 - 3;

      alienGfx.fillStyle(0x226633);
      alienGfx.fillEllipse(ox + 16, 18 + wobble * 0.3, 22, 20);
      alienGfx.fillStyle(0x33aa44);
      alienGfx.fillEllipse(ox + 16, 17 + wobble * 0.3, 16, 14);
      alienGfx.fillStyle(0xffff00);
      alienGfx.fillCircle(ox + 10 + wobble * 0.2, 12, 4);
      alienGfx.fillCircle(ox + 22 - wobble * 0.2, 12, 4);
      alienGfx.fillStyle(0x000000);
      alienGfx.fillCircle(ox + 11 + wobble * 0.3, 12, 2);
      alienGfx.fillCircle(ox + 21 - wobble * 0.3, 12, 2);
      alienGfx.fillStyle(0x114422);
      alienGfx.fillRect(ox + 8, 22 + wobble * 0.2, 3, isAttack ? 6 : 3);
      alienGfx.fillRect(ox + 21, 22 + wobble * 0.2, 3, isAttack ? 6 : 3);
      alienGfx.lineStyle(1, 0x33aa44);
      alienGfx.lineBetween(ox + 10, 6, ox + 6 + wobble, 1);
      alienGfx.lineBetween(ox + 22, 6, ox + 26 - wobble, 1);
      alienGfx.fillStyle(isAttack ? 0xff3333 : 0x66ff66);
      alienGfx.fillCircle(ox + 6 + wobble, 1, 2);
      alienGfx.fillCircle(ox + 26 - wobble, 1, 2);
      if (isAttack) {
        alienGfx.fillStyle(0xff00ff, 0.3);
        alienGfx.fillCircle(ox + 16, 26, 5 + (frame % 2) * 2);
      }
    }
    alienGfx.generateTexture("alien_big_sheet", aw * 8, ah);
    alienGfx.destroy();

    // Add spritesheet frame data to the generated texture
    const alienTex = this.textures.get("alien_big_sheet");
    for (let i = 0; i < 8; i++) {
      alienTex.add(i, 0, i * aw, 0, aw, ah);
    }

    // Plasma bolt sprite (8x8, 4 frames)
    const plasmaGfx = this.make.graphics({ x: 0, y: 0, add: false });
    for (let frame = 0; frame < 4; frame++) {
      const ox = frame * 8;
      const pulse = 1 + (frame % 2) * 0.5;
      plasmaGfx.fillStyle(0xff00ff, 0.3);
      plasmaGfx.fillCircle(ox + 4, 4, 3.5 * pulse);
      plasmaGfx.fillStyle(0xff44ff);
      plasmaGfx.fillCircle(ox + 4, 4, 2 * pulse);
      plasmaGfx.fillStyle(0xffffff);
      plasmaGfx.fillCircle(ox + 4, 4, 1);
    }
    plasmaGfx.generateTexture("plasma_bolt_sheet", 32, 8);
    plasmaGfx.destroy();

    const plasmaTex = this.textures.get("plasma_bolt_sheet");
    for (let i = 0; i < 4; i++) {
      plasmaTex.add(i, 0, i * 8, 0, 8, 8);
    }

    // Register animations
    this.anims.create({
      key: "alien-idle",
      frames: [{ key: "alien_big_sheet", frame: 0 }, { key: "alien_big_sheet", frame: 1 }, { key: "alien_big_sheet", frame: 2 }, { key: "alien_big_sheet", frame: 3 }],
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: "alien-walk",
      frames: [{ key: "alien_big_sheet", frame: 0 }, { key: "alien_big_sheet", frame: 1 }, { key: "alien_big_sheet", frame: 2 }, { key: "alien_big_sheet", frame: 3 }],
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "alien-attack",
      frames: [{ key: "alien_big_sheet", frame: 4 }, { key: "alien_big_sheet", frame: 5 }, { key: "alien_big_sheet", frame: 6 }, { key: "alien_big_sheet", frame: 7 }],
      frameRate: 6,
      repeat: 0,
    });
    this.anims.create({
      key: "plasma-fly",
      frames: [{ key: "plasma_bolt_sheet", frame: 0 }, { key: "plasma_bolt_sheet", frame: 1 }, { key: "plasma_bolt_sheet", frame: 2 }, { key: "plasma_bolt_sheet", frame: 3 }],
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
