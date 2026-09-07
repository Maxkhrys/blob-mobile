/**
 * Turns raw pointer and physics state into the events the mind reasons about.
 *
 * This is the only place that knows about drag poses and wall pressure. The
 * director sees nothing but MindEvents, which is what makes the same brain
 * portable to firmware where the inputs are a touch controller and an IMU.
 */

import { mindEvent, type MindEvent } from "./types";

export interface SensorInput {
  grabbed: boolean;
  /** Character position relative to the screen centre. */
  x: number;
  y: number;
  /** 0 free, 1 pressed hard into the wall. */
  wallPressure: number;
}

const TAP_MAX_MS = 260;
const TAP_MAX_TRAVEL = 9;
const DOUBLE_TAP_MS = 420;
const RAPID_POKE_WINDOW_MS = 2_400;
const RAPID_POKE_COUNT = 3;
const FLICK_SPEED = 900;
const FAST_DRAG_SPEED = 520;
const DRAG_REPORT_MS = 620;
const HOLD_REPORT_MS = 1_500;
const WALL_IMPACT_PRESSURE = 0.3;
const WALL_PRESS_MS = 700;
/** Away this long, and coming back is an event in its own right. */
const RETURN_QUIET_MS = 90_000;

export class InteractionSensor {
  private clock = 0;
  private grabbed = false;
  private grabStartedAt = 0;
  private grabStartX = 0;
  private grabStartY = 0;
  private lastX = 0;
  private lastY = 0;
  private speed = 0;
  private lastDragReportAt = 0;
  private lastHoldReportAt = 0;
  private lastTapAt = -1e9;
  private tapTimes: number[] = [];
  private lastInteractionAt = -1e9;
  private wallPressure = 0;
  private wallSince = -1;
  private lastWallPressAt = -1e9;

  reset() {
    this.clock = 0;
    this.grabbed = false;
    this.speed = 0;
    this.tapTimes = [];
    this.lastTapAt = -1e9;
    this.lastInteractionAt = -1e9;
    this.wallPressure = 0;
    this.wallSince = -1;
    this.lastWallPressAt = -1e9;
    this.lastDragReportAt = 0;
    this.lastHoldReportAt = 0;
  }

  /** Raw contact edges are synchronous, including taps between two frames. */
  contact(down: boolean, x: number, y: number, emit: (event: MindEvent) => void) {
    this.update(0, { grabbed: down, x, y, wallPressure: this.wallPressure }, emit);
  }

  /** Emits every event this frame produced. Allocation-free when idle. */
  update(dtMs: number, input: SensorInput, emit: (event: MindEvent) => void) {
    const dt = Math.max(0, Math.min(dtMs, 100));
    this.clock += dt;

    const dx = input.x - this.lastX;
    const dy = input.y - this.lastY;
    this.lastX = input.x;
    this.lastY = input.y;
    const instant = dt > 0 ? (Math.hypot(dx, dy) / dt) * 1000 : 0;
    // A little smoothing, so one jittery frame is not read as a flick.
    if (dt > 0) this.speed = this.speed * 0.6 + instant * 0.4;

    if (input.grabbed && !this.grabbed) {
      this.speed = 0;
      this.grabbed = true;
      this.grabStartedAt = this.clock;
      this.grabStartX = input.x;
      this.grabStartY = input.y;
      this.lastHoldReportAt = this.clock;
      this.markInteraction(emit);
      emit(mindEvent("GRAB_START", clamp01(this.speed / FLICK_SPEED), Math.sign(dx)));
    } else if (!input.grabbed && this.grabbed) {
      this.grabbed = false;
      const held = this.clock - this.grabStartedAt;
      const travel = Math.hypot(
        input.x - this.grabStartX,
        input.y - this.grabStartY
      );
      this.markInteraction(emit);
      if (held <= TAP_MAX_MS && travel <= TAP_MAX_TRAVEL) {
        this.registerTap(emit);
      } else if (this.speed >= FLICK_SPEED) {
        emit(mindEvent("FLICK", clamp01(this.speed / (FLICK_SPEED * 2)), Math.sign(dx)));
      } else {
        emit(mindEvent("RELEASE", clamp01(travel / 120), Math.sign(dx)));
      }
    } else if (this.grabbed) {
      this.markInteraction(emit);
      if (this.clock - this.lastDragReportAt >= DRAG_REPORT_MS) {
        this.lastDragReportAt = this.clock;
        if (this.speed >= FAST_DRAG_SPEED) {
          emit(mindEvent("DRAG_FAST", clamp01(this.speed / FLICK_SPEED), Math.sign(dx)));
        } else if (this.speed > 30) {
          emit(mindEvent("DRAG_SLOW", clamp01(this.speed / FAST_DRAG_SPEED), Math.sign(dx)));
        }
      }
      if (
        this.speed < 60 &&
        this.clock - this.grabStartedAt > HOLD_REPORT_MS &&
        this.clock - this.lastHoldReportAt >= HOLD_REPORT_MS
      ) {
        this.lastHoldReportAt = this.clock;
        // Gentleness is the point here: a still hold is affection, not force.
        emit(mindEvent("GRAB_HOLD", clamp01(1 - this.speed / 60), 0));
      }
    }

    // Wall contact. The rising edge is the impact; staying there is a press.
    const pressure = input.wallPressure;
    if (pressure >= WALL_IMPACT_PRESSURE && this.wallPressure < WALL_IMPACT_PRESSURE) {
      this.wallSince = this.clock;
      this.markInteraction(emit);
      emit(mindEvent("WALL_IMPACT", clamp01(pressure), Math.sign(input.x)));
    } else if (pressure < 0.08) {
      this.wallSince = -1;
    } else if (
      this.wallSince >= 0 &&
      this.clock - this.wallSince > WALL_PRESS_MS &&
      this.clock - this.lastWallPressAt > WALL_PRESS_MS
    ) {
      this.lastWallPressAt = this.clock;
      emit(mindEvent("WALL_PRESS", clamp01(pressure), Math.sign(input.x)));
    }
    this.wallPressure = pressure;
  }

  private registerTap(emit: (event: MindEvent) => void) {
    const doubled = this.clock - this.lastTapAt <= DOUBLE_TAP_MS;
    this.lastTapAt = this.clock;
    this.tapTimes.push(this.clock);
    while (
      this.tapTimes.length > 0 &&
      this.clock - this.tapTimes[0] > RAPID_POKE_WINDOW_MS
    ) {
      this.tapTimes.shift();
    }
    if (this.tapTimes.length >= RAPID_POKE_COUNT) {
      emit(mindEvent("RAPID_POKES", clamp01(this.tapTimes.length / 6), 0));
      return;
    }
    emit(mindEvent(doubled ? "TOUCH_DOUBLE_TAP" : "TOUCH_TAP", 0.5, 0));
  }

  /** One USER_RETURNED per genuine absence, ahead of the event that woke him. */
  private markInteraction(emit: (event: MindEvent) => void) {
    if (this.clock - this.lastInteractionAt > RETURN_QUIET_MS) {
      emit(mindEvent("USER_RETURNED", 0.7, 0));
    }
    this.lastInteractionAt = this.clock;
  }
}

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);
