import { Game, Types } from "phaser";
import { LoadingScene, Moon } from "./scenes";

const gameConfig: Types.Core.GameConfig = {
  title: "Phaser game tutorial",
  type: Phaser.AUTO,
  width: 2080, // 13 tilse x 16px x 10 zoom
  height: 1440, // 9 tilse x 16px x 10 zoom
  parent: "game",
  backgroundColor: "#adacb9",
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  render: {
    antialiasGL: false,
    pixelArt: true,
  },
  canvasStyle: `display: block; max-width: 100vw; max-height: 100vh; margin: auto;`,
  autoFocus: true,
  audio: {
    disableWebAudio: false,
  },
  scene: [LoadingScene, Moon],
};

window.game = new Game(gameConfig);
