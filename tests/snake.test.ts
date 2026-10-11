import { describe, expect, it } from 'vitest';
import { createSnake, MAX_QUEUE, queueTurn, speedFor, step } from '../src/games/snake/logic';
import { constant } from './helpers';

describe('snake logic', () => {
  it('starts with length 3 heading right from the centre', () => {
    const s = createSnake(20, 20, constant(0));
    expect(s.body).toEqual([
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ]);
    expect(s.dir).toBe('right');
    expect(s.food).not.toBeNull();
  });

  it('rejects a 180 degree turn', () => {
    const s = createSnake(20, 20, constant(0));
    expect(queueTurn(s, 'left')).toBe(false);
    expect(s.queue).toEqual([]);
  });

  it('checks reversal against the last queued direction', () => {
    const s = createSnake(20, 20, constant(0));
    expect(queueTurn(s, 'up')).toBe(true);
    expect(queueTurn(s, 'down')).toBe(false);
    expect(queueTurn(s, 'left')).toBe(true);
    expect(s.queue).toEqual(['up', 'left']);
  });

  it('caps the turn queue', () => {
    const s = createSnake(20, 20, constant(0));
    queueTurn(s, 'up');
    queueTurn(s, 'left');
    expect(queueTurn(s, 'down')).toBe(false);
    expect(s.queue.length).toBe(MAX_QUEUE);
  });

  it('processes one queued turn per step so quick inputs are not lost', () => {
    const s = createSnake(20, 20, constant(0));
    s.food = { x: 0, y: 0 };
    queueTurn(s, 'up');
    queueTurn(s, 'left');
    step(s, constant(0));
    expect(s.body[0]).toEqual({ x: 10, y: 9 });
    step(s, constant(0));
    expect(s.body[0]).toEqual({ x: 9, y: 9 });
    expect(s.alive).toBe(true);
  });

  it('dies when hitting a wall', () => {
    const s = createSnake(5, 5, constant(0));
    s.food = { x: 0, y: 0 };
    expect(step(s, constant(0))).toBe('move');
    expect(step(s, constant(0))).toBe('move');
    expect(step(s, constant(0))).toBe('dead');
    expect(s.alive).toBe(false);
  });

  it('dies when running into its own body', () => {
    const s = createSnake(20, 20, constant(0));
    s.body = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
      { x: 6, y: 6 },
    ];
    s.food = { x: 0, y: 0 };
    queueTurn(s, 'down');
    expect(step(s, constant(0))).toBe('dead');
  });

  it('may move into the cell the tail is leaving', () => {
    const s = createSnake(20, 20, constant(0));
    s.body = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
    ];
    s.food = { x: 0, y: 0 };
    queueTurn(s, 'down');
    expect(step(s, constant(0))).toBe('move');
  });

  it('grows and scores when eating', () => {
    const s = createSnake(20, 20, constant(0));
    s.food = { x: 11, y: 10 };
    expect(step(s, constant(0))).toBe('eat');
    expect(s.body.length).toBe(4);
    expect(s.eaten).toBe(1);
    expect(s.food).not.toEqual({ x: 11, y: 10 });
  });

  it('speeds up every five foods up to the cap', () => {
    expect(speedFor('easy', 0)).toBe(6);
    expect(speedFor('easy', 5)).toBe(7);
    expect(speedFor('normal', 4)).toBe(8);
    expect(speedFor('hard', 500)).toBe(18);
  });
});
