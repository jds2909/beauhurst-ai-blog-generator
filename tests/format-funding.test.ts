import assert from 'node:assert/strict'
import test from 'node:test'
import { formatFunding } from '../app/utils/format-funding.ts'

test('formats whole pounds and zero without decimal places', () => {
  assert.equal(formatFunding(120_500_00), '£120,500')
  assert.equal(formatFunding(0), '£0')
})

test('formats amounts with pennies to exactly two decimal places', () => {
  assert.equal(formatFunding(1_638_575_050), '£16,385,750.50')
  assert.equal(formatFunding(12_050_050), '£120,500.50')
  assert.equal(formatFunding(12_050_057), '£120,500.57')
})

test('rounds a half-penny median for display', () => {
  assert.equal(formatFunding(100.5), '£1.01')
})
