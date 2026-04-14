import { Game, Types, Scale } from "phaser";
import { LoadingScene, Moon, Lander } from "./scenes";
import GridEngine from "grid-engine";
import { TouchControls } from "./classes/touch-controls";

const gameConfig: Types.Core.GameConfig = {
  title: "Mooncraft",
  type: Phaser.AUTO,
  width: 2080, // 13 tiles x 16px x 10 zoom
  height: 1440, // 9 tiles x 16px x 10 zoom
  parent: "game",
  roundPixels: true,
  antialias: false,
  backgroundColor: "#adacb9",
  scale: {
    mode: Scale.ENVELOP,
    autoCenter: Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  render: {
    antialiasGL: false,
    antialias: false,
    pixelArt: true,
  },
  autoFocus: true,
  audio: {
    disableWebAudio: false,
  },
  input: {
    touch: true,
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

const game = new Game(gameConfig);
window.game = game;

// Touch controls (auto-shows on touch devices)
const touchControls = new TouchControls();
(window as any).__touchControls = touchControls;

// Make touch state available to scenes via registry
game.events.on("ready", () => {
  game.registry.set("touchControls", touchControls);
});

declare const __APP_VERSION__: string;
const versionEl = document.createElement("div");
versionEl.className = "version";
versionEl.textContent = __APP_VERSION__;
document.body.appendChild(versionEl);
