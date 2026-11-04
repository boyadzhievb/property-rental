import { describe, it, expect } from 'vitest'
import { taskTitle } from '../taskTitle'
import german from '../de'
import english from '../en'


describe('taskTitle', () => {
  it('translates automatic tasks from their template', () => {
    expect(taskTitle({ title: 'Clean Suite 1', template: { kind: 'clean', roomName: 'Suite 1' } }, german))
      .toBe(german.autoTaskClean.replace('{room}', 'Suite 1'))
    expect(taskTitle({ title: 'x', template: { kind: 'prepare', roomName: 'Suite 2', guestName: 'Ana' } }, english))
      .toBe('Prepare Suite 2 for Ana')
    expect(taskTitle({ title: 'x', template: { kind: 'checkPayment', guestName: 'Ben' } }, english))
      .toBe('Check payment from Ben')
  })

  it('keeps the typed title for manual tasks and old tasks without a template', () => {
    expect(taskTitle({ title: 'Buy towels' }, german)).toBe('Buy towels')
  })

  it('does not treat $ patterns in names as replacement tokens', () => {
    expect(taskTitle({ title: 'x', template: { kind: 'clean', roomName: "Room $& $1" } }, english)).toBe('Clean Room $& $1')
  })
})
