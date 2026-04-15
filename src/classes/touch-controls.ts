export interface TouchState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
  interact: boolean;
  grenade: boolean;
  tracker: boolean;
}

const isTouchDevice = () => "ontouchstart" in window || navigator.maxTouchPoints > 0;

export class TouchControls {
  public state: TouchState = {
    up: false, down: false, left: false, right: false,
    shoot: false, interact: false, grenade: false, tracker: false,
  };

  private container: HTMLDivElement;
  private visible = false;

  constructor() {
    this.container = document.createElement("div");
    this.container.id = "touch-controls";
    this.container.innerHTML = `
      <div class="tc-left-col">
        <div class="tc-utils">
          <button class="tc-btn tc-action tc-interact" data-action="interact">
            <img src="https://unpkg.com/lucide-static@latest/icons/scan-search.svg" alt="interact" />
          </button>
          <button class="tc-btn tc-action tc-tracker" data-action="tracker">
            <img src="https://unpkg.com/lucide-static@latest/icons/compass.svg" alt="tracker" />
          </button>
        </div>
        <div class="tc-dpad">
          <button class="tc-btn tc-up" data-dir="up">&#9650;</button>
          <div class="tc-mid-row">
            <button class="tc-btn tc-left" data-dir="left">&#9664;</button>
            <div class="tc-center"></div>
            <button class="tc-btn tc-right" data-dir="right">&#9654;</button>
          </div>
          <button class="tc-btn tc-down" data-dir="down">&#9660;</button>
        </div>
      </div>
      <div class="tc-actions">
        <button class="tc-btn tc-action tc-shoot" data-action="shoot">
          <img src="https://unpkg.com/lucide-static@latest/icons/crosshair.svg" alt="shoot" />
        </button>
        <button class="tc-btn tc-action tc-grenade" data-action="grenade">
          <img src="https://unpkg.com/lucide-static@latest/icons/bomb.svg" alt="grenade" />
        </button>
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
    const actions = ["shoot", "interact", "grenade", "tracker"] as const;
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

      .tc-left-col {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-end;
        flex: 1;
        pointer-events: auto;
      }

      .tc-utils {
        display: flex;
        gap: 6px;
        position: fixed;
        top: 12px;
        left: 12px;
        pointer-events: auto;
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
        padding: 22px;
      }

      .tc-action img {
        width: 100%;
        height: 100%;
        filter: invert(1);
        pointer-events: none;
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

      .tc-tracker {
        background: rgba(0, 150, 0, 0.3);
        border-color: rgba(50, 255, 50, 0.6);
      }

      .tc-tracker:active {
        background: rgba(50, 255, 50, 0.5);
      }

      .tc-utils .tc-action {
        width: 64px;
        height: 64px;
        padding: 16px;
      }

      .tc-interact {
        background: rgba(200, 200, 0, 0.3);
        border-color: rgba(255, 255, 0, 0.6);
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
