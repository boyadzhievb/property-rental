import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PaymentService } from '../PaymentService'

vi.mock('../../repositories/PaymentRepository', () => {
  const store = new Map<string, any>()
  return {
    paymentRepository: {
      getAll: vi.fn(async () => {
        const { Payment } = await import('../../domain/Payment')
        return [...store.values()].map(d => new Payment(d))
      }),
      getByReservationId: vi.fn(async (resId: string) => {
        const { Payment } = await import('../../domain/Payment')
        return [...store.values()].filter(d => d.reservationId === resId).map(d => new Payment(d))
      }),
      save: vi.fn(async (p: any) => {
        const data = p.toData()
        store.set(data.id, data)
        const { Payment } = await import('../../domain/Payment')
        return new Payment(data)
      }),
      delete: vi.fn(async (id: string) => { store.delete(id) }),
      _store: store,
    },
  }
})

vi.mock('../../repositories/ReservationRepository', () => {
  const store = new Map<string, any>()
  return {
    reservationRepository: {
      getById: vi.fn(async (id: string) => {
        const d = store.get(id)
        if (!d) return null
        const { Reservation } = await import('../../domain/Reservation')
        return new Reservation(d)
      }),
      _store: store,
    },
  }
})

import { paymentRepository } from '../../repositories/PaymentRepository'
import { reservationRepository } from '../../repositories/ReservationRepository'

const payStore = (paymentRepository as any)._store as Map<string, any>
const resStore = (reservationRepository as any)._store as Map<string, any>

vi.mock('../../api/client', () => ({
  atomicReadWrite: vi.fn(async (_storeNames: string[], callback: Function) => {
    const stores: Record<string, any> = {
      reservations: {
        get: async (key: string) => resStore.get(key),
        getAllByIndex: async (_index: string, key: string) =>
          [...payStore.values()].filter((record: any) => record.reservationId === key),
        put: (data: any) => { payStore.set(data.id, data) },
      },
      payments: {
        get: async (key: string) => payStore.get(key),
        getAllByIndex: async (_index: string, key: string) =>
          [...payStore.values()].filter((record: any) => record.reservationId === key),
        put: (data: any) => { payStore.set(data.id, data) },
      },
    }
    return callback(stores)
  }),
}))

function seedReservation(overrides: Partial<any> = {}) {
  const data = {
    id: 'res-1', roomId: 'room-1', guestId: 'guest-1',
    arrivalDate: '2026-09-10', departureDate: '2026-09-15',
    guestsCount: 1, status: 'Confirmed', price: 500, ...overrides,
  }
  resStore.set(data.id, data)
  return data
}

function makePaymentData(overrides: Partial<any> = {}) {
  return {
    id: 'pay-1', reservationId: 'res-1', amount: 200,
    date: '2026-09-10', method: 'cash' as const, note: '', ...overrides,
  }
}

describe('PaymentService', () => {
  let service: PaymentService

  beforeEach(() => {
    payStore.clear()
    resStore.clear()
    service = new PaymentService()
  })

  describe('createPayment', () => {
    it('creates a valid payment', async () => {
      seedReservation()
      const result = await service.createPayment(makePaymentData())
      expect(result.amount).toBe(200)
      expect(result.method).toBe('cash')
    })

    it('rejects payment for cancelled reservation', async () => {
      seedReservation({ status: 'Cancelled' })
      await expect(service.createPayment(makePaymentData()))
        .rejects.toThrow('cancelled reservation')
    })

    it('rejects payment for non-existent reservation', async () => {
      await expect(service.createPayment(makePaymentData()))
        .rejects.toThrow('Reservation not found')
    })

    it('rejects payment exceeding remaining balance', async () => {
      seedReservation({ price: 500 })
      payStore.set('pay-0', { ...makePaymentData({ id: 'pay-0', amount: 400 }) })
      await expect(service.createPayment(makePaymentData({ id: 'pay-1', amount: 200 })))
        .rejects.toThrow('exceeds remaining balance')
    })

    it('allows payment up to exact remaining balance', async () => {
      seedReservation({ price: 500 })
      payStore.set('pay-0', { ...makePaymentData({ id: 'pay-0', amount: 300 }) })
      const result = await service.createPayment(makePaymentData({ id: 'pay-1', amount: 200 }))
      expect(result.amount).toBe(200)
    })

    it('rejects invalid payment data', async () => {
      seedReservation()
      await expect(service.createPayment({ ...makePaymentData(), amount: -10 }))
        .rejects.toThrow()
    })
  })

  describe('deletePayment', () => {
    it('deletes an existing payment', async () => {
      payStore.set('pay-1', makePaymentData())
      await service.deletePayment('pay-1')
      expect(payStore.has('pay-1')).toBe(false)
    })
  })
})
