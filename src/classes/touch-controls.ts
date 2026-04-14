export interface TouchState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
  interact: boolean;
  grenade: boolean;
}

const isTouchDevice = () => "ontouchstart" in window || navigator.maxTouchPoints > 0;

export class TouchControls {
  public state: TouchState = {
    up: false, down: false, left: false, right: false,
    shoot: false, interact: false, grenade: false,
  };

  private container: HTMLDivElement;
  private visible = false;

  constructor() {
    this.container = document.createElement("div");
    this.container.id = "touch-controls";
    this.container.innerHTML = `
      <div class="tc-dpad">
        <button class="tc-btn tc-up" data-dir="up">&#9650;</button>
        <div class="tc-mid-row">
          <button class="tc-btn tc-left" data-dir="left">&#9664;</button>
          <div class="tc-center"></div>
          <button class="tc-btn tc-right" data-dir="right">&#9654;</button>
        </div>
        <button class="tc-btn tc-down" data-dir="down">&#9660;</button>
      </div>
      <div class="tc-actions">
        <button class="tc-btn tc-action tc-interact" data-action="interact">E</button>
        <button class="tc-btn tc-action tc-shoot" data-action="shoot">&#9733;</button>
        <button class="tc-btn tc-action tc-grenade" data-action="grenade">&#9679;</button>
      </div>
    `;

    document.body.appendChild(this.container);
    this.addStyles();
    this.bindEvents();

    if (isTouchDevice()) {
      this.show();
    }
  }

  show(): void {
    this.visible = true;
    this.container.style.display = "flex";
  }

  hide(): void {
    this.visible = false;
    this.container.style.display = "none";
  }

  private bindEvents(): void {
    // D-pad buttons
    const dirs = ["up", "down", "left", "right"] as const;
    for (const dir of dirs) {
      const btn = this.container.querySelector(`[data-dir="${dir}"]`) as HTMLElement;
      if (!btn) continue;

      btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.state[dir] = true;
      }, { passive: false });

      btn.addEventListener("touchend", (e) => {
        e.preventDefault();
        this.state[dir] = false;
      }, { passive: false });

      btn.addEventListener("touchcancel", () => {
        this.state[dir] = false;
      });
    }

    // Action buttons
    const actions = ["shoot", "interact", "grenade"] as const;
    for (const action of actions) {
      const btn = this.container.querySelector(`[data-action="${action}"]`) as HTMLElement;
      if (!btn) continue;

      btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.state[action] = true;
      }, { passive: false });

      btn.addEventListener("touchend", (e) => {
        e.preventDefault();
        this.state[action] = false;
      }, { passive: false });

      btn.addEventListener("touchcancel", () => {
        this.state[action] = false;
      });
    }
  }

  private addStyles(): void {
    const style = document.createElement("style");
    style.textContent = `
      #touch-controls {
        display: none;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 12px 20px;
        justify-content: space-between;
        align-items: flex-end;
        pointer-events: none;
        z-index: 10000;
        user-select: none;
        -webkit-user-select: none;
      }

      .tc-dpad {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        pointer-events: auto;
      }

      .tc-mid-row {
        display: flex;
        align-items: center;
        gap: 2px;
      }

      .tc-center {
        width: 64px;
        height: 64px;
      }

      .tc-btn {
        width: 64px;
        height: 64px;
        border: 2px solid rgba(255, 255, 255, 0.5);
        background: rgba(0, 0, 0, 0.4);
        color: rgba(255, 255, 255, 0.8);
        font-size: 24px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        touch-action: none;
        -webkit-tap-highlight-color: transparent;
        image-rendering: pixelated;
        font-family: monospace;
      }

      .tc-btn:active {
        background: rgba(255, 255, 255, 0.3);
        border-color: rgba(255, 255, 255, 0.8);
      }

      .tc-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: auto;
      }

      .tc-action {
        width: 88px;
        height: 88px;
        border-radius: 50%;
        font-size: 28px;
      }

      .tc-shoot {
        background: rgba(0, 200, 200, 0.3);
        border-color: rgba(0, 255, 255, 0.6);
      }

      .tc-shoot:active {
        background: rgba(0, 255, 255, 0.5);
      }

      .tc-grenade {
        background: rgba(200, 100, 0, 0.3);
        border-color: rgba(255, 140, 0, 0.6);
      }

      .tc-grenade:active {
        background: rgba(255, 140, 0, 0.5);
      }

      .tc-interact {
        background: rgba(200, 200, 0, 0.3);
        border-color: rgba(255, 255, 0, 0.6);
        font-family: ThaleahFat, monospace;
        font-size: 30px;
      }

      .tc-interact:active {
        background: rgba(255, 255, 0, 0.5);
      }

      /* Landscape orientation hint */
      @media (orientation: portrait) {
        #touch-controls {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
