/** Travel's original 60 Hz recurrence, evaluated at elapsed time instead of
 * once per display refresh. Integer steps retain the original easing/fling. */
export function advanceTravelMotion(state: { current: number; target: number; velocity: number },
  frames: number, dragging: boolean, reduced: boolean) {
  if (reduced) { state.current = state.target; if (!dragging) state.velocity = 0; return; }
  const lerp = dragging ? .22 : .08, q = 1 - lerp;
  let remaining = Math.max(0, frames);
  if (!dragging && Math.abs(state.velocity) > .1) {
    const friction = .92;
    const moving = Math.min(remaining, Math.ceil(Math.log(.1 / Math.abs(state.velocity)) / Math.log(friction)));
    const decay = Math.pow(friction, moving), follow = Math.pow(q, moving);
    const velocity = state.velocity, target = state.target;
    const series = Math.abs(q - friction) < 1e-10 ? moving * decay
      : friction * (follow - decay) / (q - friction);
    state.current = follow * state.current + (1 - follow) * (target + velocity / (1 - friction))
      - lerp * velocity / (1 - friction) * series;
    state.target += velocity * (1 - decay) / (1 - friction);
    state.velocity *= decay;
    remaining -= moving;
  } else if (!dragging) state.velocity = 0;
  if (remaining > 0) {
    if (!dragging && Math.abs(state.velocity) <= .1) state.velocity = 0;
    state.current += (state.target - state.current) * (1 - Math.pow(q, remaining));
  }
}
