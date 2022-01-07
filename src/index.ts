import { Game, Types } from "phaser";
import { LoadingScene, Moon, Lander } from "./scenes";
import GridEngine from "grid-engine";

const gameConfig: Types.Core.GameConfig = {
  title: "Mooncraft",
  type: Phaser.AUTO,
  width: 2080, // 13 tilse x 16px x 10 zoom
  height: 1440, // 9 tilse x 16px x 10 zoom
  parent: "game",
  roundPixels: true,
  antialias: false,
  backgroundColor: "#adacb9",
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
      // debug: true,
    },
  },
  render: {
    antialiasGL: false,
    antialias: false,
    pixelArt: true,
  },
  canvasStyle: `display: block; max-width: 100vw; max-height: 100vh; margin: auto;`,
  autoFocus: true,
  audio: {
    disableWebAudio: false,
  },
  scene: [LoadingScene, Moon, Lander],
  plugins: {
    scene: [
      {
        key: "gridEngine",
        plugin: GridEngine,
        mapping: "gridEngine",
      },
    ],
  },
};

window.game = new Game(gameConfig);
