import { Game, Types } from "phaser";
import { LoadingScene, Moon } from "./scenes";

const gameConfig: Types.Core.GameConfig = {
  title: "Phaser game tutorial",
  type: Phaser.AUTO,
  width: 176,
  height: 144,
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
  canvasStyle: `display: block; width: 100%; height: 100%;`,
  autoFocus: true,
  audio: {
    disableWebAudio: false,
  },
  scene: [LoadingScene, Moon],
};

window.game = new Game(gameConfig);
