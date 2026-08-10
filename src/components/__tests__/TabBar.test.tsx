import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Home, Calendar } from 'lucide-react'
import TabBar from '../layout/TabBar'

const items = [
  { id: 'rooms', label: 'Rooms', icon: Home },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
]

describe('TabBar', () => {
  it('renders all navigation items', () => {
    render(<TabBar items={items} activeTab="rooms" onTabChange={() => {}} />)
    expect(screen.getByText('Rooms')).toBeInTheDocument()
    expect(screen.getByText('Calendar')).toBeInTheDocument()
  })

  it('calls onTabChange when a tab is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TabBar items={items} activeTab="rooms" onTabChange={onChange} />)

    await user.click(screen.getByText('Calendar'))
    expect(onChange).toHaveBeenCalledWith('calendar')
  })

  it('applies active styling to the current tab', () => {
    render(<TabBar items={items} activeTab="rooms" onTabChange={() => {}} />)
    const roomsButton = screen.getByText('Rooms').closest('button')
    expect(roomsButton?.className).toContain('text-ios-blue')
  })
})
