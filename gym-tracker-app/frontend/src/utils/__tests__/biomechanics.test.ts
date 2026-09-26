import {
  angleDeg,
  updateRepState,
  squatFeedback,
  epley,
  RepState,
} from '../biomechanics';

function freshState(): RepState {
  return { down: false, reps: 0 };
}

describe('angleDeg', () => {
  test('right angle measures 90 degrees', () => {
    expect(angleDeg({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 })).toBeCloseTo(90, 5);
  });

  test('straight line measures 180 degrees', () => {
    expect(angleDeg({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 })).toBeCloseTo(180, 5);
  });

  test('acute angle', () => {
    expect(angleDeg({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(45, 5);
  });

  test('degenerate zero-length segment yields 180, not NaN', () => {
    const angle = angleDeg({ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 1 });
    expect(angle).toBe(180);
    expect(Number.isNaN(angle)).toBe(false);
  });
});

describe('updateRepState (hysteresis)', () => {
  test('descent below 110 arms the rep without counting', () => {
    const state = freshState();
    updateRepState(100, state);
    expect(state).toEqual({ down: true, reps: 0 });
  });

  test('return above 155 completes exactly one rep', () => {
    const state = { down: true, reps: 0 };
    updateRepState(160, state);
    expect(state).toEqual({ down: false, reps: 1 });
  });

  test('jitter inside the dead band never double-counts', () => {
    const state = freshState();
    updateRepState(100, state);
    updateRepState(120, state);
    updateRepState(130, state);
    updateRepState(140, state);
    updateRepState(120, state);
    expect(state.reps).toBe(0);
    updateRepState(160, state);
    expect(state.reps).toBe(1);
  });

  test('a partial rep that never stands back up is not counted', () => {
    const state = freshState();
    updateRepState(100, state);
    updateRepState(130, state);
    expect(state).toEqual({ down: true, reps: 0 });
  });

  test('counts consecutive full reps', () => {
    const state = freshState();
    for (let i = 0; i < 3; i++) {
      updateRepState(100, state);
      updateRepState(160, state);
    }
    expect(state.reps).toBe(3);
  });
});

describe('squatFeedback', () => {
  test('deep squat with upright torso', () => {
    const feedback = squatFeedback(85, 70, 5);
    expect(feedback[0]).toBe('Reps detected: 5');
    expect(feedback[1]).toMatch(/Good squat depth/);
    expect(feedback[2]).toMatch(/upright/);
  });

  test('shallow squat with forward lean', () => {
    const feedback = squatFeedback(120, 50, 3);
    expect(feedback[1]).toMatch(/Shallow/);
    expect(feedback[2]).toMatch(/leans too far forward/);
  });

  test('zero reps reports no completed repetitions, not a depth verdict', () => {
    const feedback = squatFeedback(180, 180, 0);
    expect(feedback).toHaveLength(2);
    expect(feedback[1]).toMatch(/No full repetitions/);
  });
});

describe('epley', () => {
  test('100 kg for 5 reps estimates 116.7', () => {
    expect(epley(100, 5)).toBeCloseTo(116.67, 1);
  });

  test('a single is the weight itself', () => {
    expect(epley(80, 1)).toBeCloseTo(82.67, 1);
  });
});
