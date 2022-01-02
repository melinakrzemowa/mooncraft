import '@geckos.io/phaser-on-nodejs'

import { Actor } from "../../src/classes/actor";
import Phaser from "phaser";

// const a = window.setTimeout(() => {
//     console.log("123123123123");
// }, 1000)

// console.log(a)

// console.log(clearTimeout(a));

// your MainScene
class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene')
    }
}

// window.cancelAnimationFrame = () => true
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.HEADLESS,
    scene: [MainScene],
    banner: false,
    audio: {
        noAudio: true
    },
    physics: {
        default: "arcade",
    },
    fps: {
        forceSetTimeOut: true
    }
}

// start the game
const game = new Phaser.Game(config)

describe("Actor behaviour", () => {
    test("checks flip", () => {
        const actor = new TestActor(game.scene.scenes.at(0)!, 0, 0);

        actor.body.velocity.x = -10;
        actor.scale = 2;

        actor.update();

        expect(actor.scaleX).toBe(-2);
    });
});

afterAll(() => {
    game.destroy(false, true);
})

class TestActor extends Actor {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, "test");
    }

    update() : void {
        this.checkFlip();
    }
}