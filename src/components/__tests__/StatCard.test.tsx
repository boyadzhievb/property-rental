import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatCard from '../ui/StatCard'

describe('StatCard', () => {
  it('renders value and label', () => {
    render(<StatCard icon={<span data-testid="icon">IC</span>} value={5} label="Occupied" />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Occupied')).toBeInTheDocument()
  })

  it('renders the icon', () => {
    render(<StatCard icon={<span data-testid="icon">IC</span>} value={0} label="Empty" />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })
})
