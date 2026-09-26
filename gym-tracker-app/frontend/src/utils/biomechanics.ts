/**
 * Pure strength-training maths used by the video analysis pipeline.
 *
 * Everything here is intentionally side-effect free (no canvas, no model, no
 * network) so the coaching rules can be unit-tested without a browser GPU.
 * `utils/videoAnalysis.ts` calls these functions; it owns all I/O.
 */

export interface Point2D {
    x: number;
    y: number;
}

/** Knee flexion below this means the rep has started its descent. */
export const SQUAT_DOWN_KNEE_DEG = 110;
/** Knee extension above this means the rep is complete. */
export const SQUAT_STAND_KNEE_DEG = 155;
/** Deepest knee angle that still counts as full squat depth. */
export const DEEP_SQUAT_KNEE_DEG = 90;
/** Hip angle below this means the torso is leaning too far forward. */
export const TORSO_LEAN_HIP_DEG = 60;

/**
 * Angle at `b` formed by the segments b->a and b->c, in degrees.
 * A degenerate (zero-length) segment yields 180 rather than NaN.
 */
export function angleDeg(a: Point2D, b: Point2D, c: Point2D): number {
    const v1x = a.x - b.x;
    const v1y = a.y - b.y;
    const v2x = c.x - b.x;
    const v2y = c.y - b.y;
    const dot = v1x * v2x + v1y * v2y;
    const mag = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
    if (mag === 0) return 180;
    const cos = Math.min(1, Math.max(-1, dot / mag));
    return Math.acos(cos) * (180 / Math.PI);
}

export interface RepState {
    /** Whether the tracked knee is currently in the descended position. */
    down: boolean;
    reps: number;
}

/**
 * Hysteresis rep counter (a Schmitt trigger). The down and up thresholds
 * differ on purpose: landmark angles jitter several degrees per frame, so a
 * single threshold would double-count every crossing. Between the two
 * thresholds the state does not change, and only a genuine return to full
 * extension increments the count.
 */
export function updateRepState(avgKneeAngle: number, state: RepState): void {
    if (avgKneeAngle < SQUAT_DOWN_KNEE_DEG && !state.down) state.down = true;
    if (avgKneeAngle > SQUAT_STAND_KNEE_DEG && state.down) {
        state.down = false;
        state.reps++;
    }
}

/** Human-readable verdicts for a finished squat clip. */
export function squatFeedback(minKneeAngle: number, minHipAngle: number, reps: number): string[] {
    const feedback = [`Reps detected: ${reps}`];
    if (reps === 0) {
        feedback.push('No full repetitions detected — descend until your hips break parallel, then stand tall');
        return feedback;
    }
    feedback.push(
        minKneeAngle <= DEEP_SQUAT_KNEE_DEG
            ? 'Good squat depth (knee angle reached ~90° or less)'
            : 'Shallow squat — aim for deeper descent'
    );
    feedback.push(
        minHipAngle <= TORSO_LEAN_HIP_DEG
            ? 'Torso leans too far forward — keep chest up'
            : 'Torso upright through the movement'
    );
    return feedback;
}

/** Epley formula for the estimated one-rep max. */
export function epley(weight: number, repetitions: number): number {
    return weight * (1 + repetitions / 30);
}
