import assert from 'node:assert/strict';
import {createScrollReversalGuard} from './scroll-intent.js';
const guard=createScrollReversalGuard(4);
for(const value of [0,10,50,100,99,99,100,99,99,100,103,102,103]){
  assert.equal(guard.update(value),false,'a forward swipe and one-pixel settling must not reverse the entrance');
}
for(const value of [102,101,100])assert.equal(guard.update(value),false);
assert.equal(guard.update(99),true,'a real four-pixel reverse accumulates across small updates');
assert.equal(guard.update(99),true,'holding the confirmed reverse preserves its target');
assert.equal(guard.update(100),false,'forward movement establishes a fresh origin');
guard.reset();assert.equal(guard.update(20),false,'resizing/re-anchoring starts from the new native coordinate');
assert.equal(guard.update(NaN),false);assert.equal(guard.update(1),false);
console.log('Touch scroll intent: settling jitter, slow genuine reversal, forward resumption and viewport reset passed.');
