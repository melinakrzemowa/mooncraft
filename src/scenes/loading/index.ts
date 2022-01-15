import { Scene } from "phaser";

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
    // Remove loading text
    this.loadingText.destroy();

    this.singlePlayerText = this.createButton(2080 / 2, 1440 / 2 - 100, "SINGLE PLAYER");
    this.multiPlayerText = this.createButton(2080 / 2, 1440 / 2 + 100, "MULTI PLAYER");

    this.singlePlayerText.on("pointerdown", () => this.startSinglePlayer());
    this.multiPlayerText.on("pointerdown", () => this.startMultiPlayer());
  }

  startSinglePlayer(): void {
    this.singlePlayerText.destroy();
    this.multiPlayerText.destroy();

    this.registry.set("playerPosition", { x: 25, y: 26 });
    this.scene.start("moon-scene");
  }

  startMultiPlayer(): void {
    this.singlePlayerText.destroy();
    this.multiPlayerText.destroy();

    this.scene.start("multi-scene");
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
