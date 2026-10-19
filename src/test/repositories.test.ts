import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'

describe('RoomRepository', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  it('getAll returns empty array when no rooms exist', async () => {
    const { RoomRepository } = await import('../repositories/RoomRepository')
    const roomRepository = new RoomRepository()
    const rooms = await roomRepository.getAll()
    expect(rooms).toEqual([])
  })

  it('save persists a room and getAll retrieves it', async () => {
    const { RoomRepository } = await import('../repositories/RoomRepository')
    const { Room, RoomStatus } = await import('../domain/Room')
    const roomRepository = new RoomRepository()

    const room = new Room({
      id: 'room-1',
      name: 'Deluxe Suite',
      status: RoomStatus.AVAILABLE,
      pricePerNight: 200,
      maxGuests: 4,
    })

    const savedRoom = await roomRepository.save(room)
    expect(savedRoom.id).toBe('room-1')
    expect(savedRoom.name).toBe('Deluxe Suite')

    const allRooms = await roomRepository.getAll()
    expect(allRooms).toHaveLength(1)
    expect(allRooms[0].id).toBe('room-1')
    expect(allRooms[0].name).toBe('Deluxe Suite')
    expect(allRooms[0].status).toBe(RoomStatus.AVAILABLE)
    expect(allRooms[0].pricePerNight).toBe(200)
    expect(allRooms[0].maxGuests).toBe(4)
  })

  it('save with the same id updates an existing room', async () => {
    const { RoomRepository } = await import('../repositories/RoomRepository')
    const { Room, RoomStatus } = await import('../domain/Room')
    const roomRepository = new RoomRepository()

    const originalRoom = new Room({
      id: 'room-1',
      name: 'Standard Room',
      status: RoomStatus.AVAILABLE,
      pricePerNight: 100,
      maxGuests: 2,
    })
    await roomRepository.save(originalRoom)

    const updatedRoom = new Room({
      id: 'room-1',
      name: 'Premium Room',
      status: RoomStatus.AVAILABLE,
      pricePerNight: 180,
      maxGuests: 3,
    })
    await roomRepository.save(updatedRoom)

    const allRooms = await roomRepository.getAll()
    expect(allRooms).toHaveLength(1)
    expect(allRooms[0].name).toBe('Premium Room')
    expect(allRooms[0].pricePerNight).toBe(180)
    expect(allRooms[0].maxGuests).toBe(3)
  })

  it('delete removes a room', async () => {
    const { RoomRepository } = await import('../repositories/RoomRepository')
    const { Room, RoomStatus } = await import('../domain/Room')
    const roomRepository = new RoomRepository()

    const room = new Room({
      id: 'room-1',
      name: 'Ocean View',
      status: RoomStatus.AVAILABLE,
      pricePerNight: 250,
      maxGuests: 2,
    })
    await roomRepository.save(room)

    const roomsBeforeDelete = await roomRepository.getAll()
    expect(roomsBeforeDelete).toHaveLength(1)

    await roomRepository.delete('room-1')

    const roomsAfterDelete = await roomRepository.getAll()
    expect(roomsAfterDelete).toHaveLength(0)
  })
})

describe('ReservationRepository', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  it('getAll returns empty array when no reservations exist', async () => {
    const { ReservationRepository } = await import('../repositories/ReservationRepository')
    const reservationRepository = new ReservationRepository()
    const reservations = await reservationRepository.getAll()
    expect(reservations).toEqual([])
  })

  it('save persists a reservation and getAll retrieves it', async () => {
    const { ReservationRepository } = await import('../repositories/ReservationRepository')
    const { Reservation } = await import('../domain/Reservation')
    const reservationRepository = new ReservationRepository()

    const reservation = new Reservation({
      id: 'res-1',
      roomId: 'room-1',
      guestId: 'guest-1',
      arrivalDate: '2025-07-01',
      departureDate: '2025-07-05',
      guestsCount: 2,
      status: 'Confirmed',
      price: 600,
    })

    const savedReservation = await reservationRepository.save(reservation)
    expect(savedReservation.id).toBe('res-1')
    expect(savedReservation.status).toBe('Confirmed')

    const allReservations = await reservationRepository.getAll()
    expect(allReservations).toHaveLength(1)
    expect(allReservations[0].id).toBe('res-1')
    expect(allReservations[0].roomId).toBe('room-1')
    expect(allReservations[0].guestId).toBe('guest-1')
    expect(allReservations[0].arrivalDate).toBe('2025-07-01')
    expect(allReservations[0].departureDate).toBe('2025-07-05')
    expect(allReservations[0].guestsCount).toBe(2)
    expect(allReservations[0].price).toBe(600)
  })

  it('getByMonth filters reservations by date range', async () => {
    const { ReservationRepository } = await import('../repositories/ReservationRepository')
    const { Reservation } = await import('../domain/Reservation')
    const reservationRepository = new ReservationRepository()

    const earlyReservation = new Reservation({
      id: 'res-early',
      roomId: 'room-1',
      guestId: 'guest-1',
      arrivalDate: '2025-06-01',
      departureDate: '2025-06-05',
      guestsCount: 2,
      status: 'Confirmed',
      price: 400,
    })

    const midReservation = new Reservation({
      id: 'res-mid',
      roomId: 'room-1',
      guestId: 'guest-2',
      arrivalDate: '2025-07-10',
      departureDate: '2025-07-15',
      guestsCount: 1,
      status: 'Confirmed',
      price: 500,
    })

    const lateReservation = new Reservation({
      id: 'res-late',
      roomId: 'room-2',
      guestId: 'guest-3',
      arrivalDate: '2025-08-20',
      departureDate: '2025-08-25',
      guestsCount: 3,
      status: 'Confirmed',
      price: 750,
    })

    await reservationRepository.save(earlyReservation)
    await reservationRepository.save(midReservation)
    await reservationRepository.save(lateReservation)

    // Query for July only — should return only the mid reservation
    const julyReservations = await reservationRepository.getByMonth('2025-07-01', '2025-07-31')
    expect(julyReservations).toHaveLength(1)
    expect(julyReservations[0].id).toBe('res-mid')

    // Query for a wider range covering June and July
    const widerRange = await reservationRepository.getByMonth('2025-06-01', '2025-07-31')
    expect(widerRange).toHaveLength(2)
    const widerRangeIds = widerRange.map(reservation => reservation.id).sort()
    expect(widerRangeIds).toEqual(['res-early', 'res-mid'])
  })
})

describe('GuestRepository', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  it('getAll returns empty array when no guests exist', async () => {
    const { GuestRepository } = await import('../repositories/GuestRepository')
    const guestRepository = new GuestRepository()
    const guests = await guestRepository.getAll()
    expect(guests).toEqual([])
  })

  it('save persists a guest and getAll retrieves it', async () => {
    const { GuestRepository } = await import('../repositories/GuestRepository')
    const { Guest } = await import('../domain/Guest')
    const guestRepository = new GuestRepository()

    const guest = new Guest({
      id: 'guest-1',
      name: 'Maria Ivanova',
      phone: '+359888123456',
      email: 'maria@example.com',
      previousStays: 3,
      notes: 'Prefers ground floor',
    })

    const savedGuest = await guestRepository.save(guest)
    expect(savedGuest.id).toBe('guest-1')
    expect(savedGuest.name).toBe('Maria Ivanova')

    const allGuests = await guestRepository.getAll()
    expect(allGuests).toHaveLength(1)
    expect(allGuests[0].id).toBe('guest-1')
    expect(allGuests[0].name).toBe('Maria Ivanova')
    expect(allGuests[0].phone).toBe('+359888123456')
    expect(allGuests[0].email).toBe('maria@example.com')
    expect(allGuests[0].previousStays).toBe(3)
    expect(allGuests[0].notes).toBe('Prefers ground floor')
  })

  it('save with the same id updates an existing guest', async () => {
    const { GuestRepository } = await import('../repositories/GuestRepository')
    const { Guest } = await import('../domain/Guest')
    const guestRepository = new GuestRepository()

    const originalGuest = new Guest({
      id: 'guest-1',
      name: 'Maria Ivanova',
      phone: '+359888123456',
      email: 'maria@example.com',
      previousStays: 3,
      notes: 'Prefers ground floor',
    })
    await guestRepository.save(originalGuest)

    const updatedGuest = new Guest({
      id: 'guest-1',
      name: 'Maria Petrova',
      phone: '+359888999999',
      email: 'maria.petrova@example.com',
      previousStays: 5,
      notes: 'VIP guest',
    })
    await guestRepository.save(updatedGuest)

    const allGuests = await guestRepository.getAll()
    expect(allGuests).toHaveLength(1)
    expect(allGuests[0].name).toBe('Maria Petrova')
    expect(allGuests[0].phone).toBe('+359888999999')
    expect(allGuests[0].email).toBe('maria.petrova@example.com')
    expect(allGuests[0].previousStays).toBe(5)
    expect(allGuests[0].notes).toBe('VIP guest')
  })

  it('getById returns a guest by id', async () => {
    const { GuestRepository } = await import('../repositories/GuestRepository')
    const { Guest } = await import('../domain/Guest')
    const guestRepository = new GuestRepository()

    const guest = new Guest({
      id: 'guest-1',
      name: 'Maria Ivanova',
      phone: '+359888123456',
      email: 'maria@example.com',
      previousStays: 3,
      notes: 'Prefers ground floor',
    })
    await guestRepository.save(guest)

    const foundGuest = await guestRepository.getById('guest-1')
    expect(foundGuest).not.toBeNull()
    expect(foundGuest!.id).toBe('guest-1')
    expect(foundGuest!.name).toBe('Maria Ivanova')
  })

  it('getById returns null for non-existent guest', async () => {
    const { GuestRepository } = await import('../repositories/GuestRepository')
    const guestRepository = new GuestRepository()

    const foundGuest = await guestRepository.getById('non-existent-id')
    expect(foundGuest).toBeNull()
  })

  it('delete removes a guest', async () => {
    const { GuestRepository } = await import('../repositories/GuestRepository')
    const { Guest } = await import('../domain/Guest')
    const guestRepository = new GuestRepository()

    const guest = new Guest({
      id: 'guest-1',
      name: 'Maria Ivanova',
      phone: '+359888123456',
      email: 'maria@example.com',
      previousStays: 3,
      notes: 'Prefers ground floor',
    })
    await guestRepository.save(guest)

    const guestsBeforeDelete = await guestRepository.getAll()
    expect(guestsBeforeDelete).toHaveLength(1)

    await guestRepository.delete('guest-1')

    const guestsAfterDelete = await guestRepository.getAll()
    expect(guestsAfterDelete).toHaveLength(0)
  })
})

describe('PaymentRepository', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  it('getAll returns empty array when no payments exist', async () => {
    const { PaymentRepository } = await import('../repositories/PaymentRepository')
    const paymentRepository = new PaymentRepository()
    const payments = await paymentRepository.getAll()
    expect(payments).toEqual([])
  })

  it('save persists a payment and getAll retrieves it', async () => {
    const { PaymentRepository } = await import('../repositories/PaymentRepository')
    const { Payment } = await import('../domain/Payment')
    const paymentRepository = new PaymentRepository()

    const payment = new Payment({
      id: 'pay-1',
      reservationId: 'res-1',
      amount: 250,
      date: '2025-07-01',
      method: 'cash',
      note: 'Advance payment',
    })

    const savedPayment = await paymentRepository.save(payment)
    expect(savedPayment.id).toBe('pay-1')
    expect(savedPayment.amount).toBe(250)

    const allPayments = await paymentRepository.getAll()
    expect(allPayments).toHaveLength(1)
    expect(allPayments[0].id).toBe('pay-1')
    expect(allPayments[0].reservationId).toBe('res-1')
    expect(allPayments[0].amount).toBe(250)
    expect(allPayments[0].date).toBe('2025-07-01')
    expect(allPayments[0].method).toBe('cash')
    expect(allPayments[0].note).toBe('Advance payment')
  })

  it('getByReservationId filters payments correctly', async () => {
    const { PaymentRepository } = await import('../repositories/PaymentRepository')
    const { Payment } = await import('../domain/Payment')
    const paymentRepository = new PaymentRepository()

    const paymentForReservationOne = new Payment({
      id: 'pay-1',
      reservationId: 'res-1',
      amount: 200,
      date: '2025-07-01',
      method: 'cash',
      note: 'First payment',
    })

    const secondPaymentForReservationOne = new Payment({
      id: 'pay-2',
      reservationId: 'res-1',
      amount: 150,
      date: '2025-07-03',
      method: 'card',
      note: 'Second payment',
    })

    const paymentForReservationTwo = new Payment({
      id: 'pay-3',
      reservationId: 'res-2',
      amount: 500,
      date: '2025-07-05',
      method: 'transfer',
      note: 'Full payment',
    })

    await paymentRepository.save(paymentForReservationOne)
    await paymentRepository.save(secondPaymentForReservationOne)
    await paymentRepository.save(paymentForReservationTwo)

    const paymentsForReservationOne = await paymentRepository.getByReservationId('res-1')
    expect(paymentsForReservationOne).toHaveLength(2)
    const paymentIds = paymentsForReservationOne.map(payment => payment.id).sort()
    expect(paymentIds).toEqual(['pay-1', 'pay-2'])

    const paymentsForReservationTwo = await paymentRepository.getByReservationId('res-2')
    expect(paymentsForReservationTwo).toHaveLength(1)
    expect(paymentsForReservationTwo[0].id).toBe('pay-3')

    const paymentsForNonExistent = await paymentRepository.getByReservationId('res-999')
    expect(paymentsForNonExistent).toEqual([])
  })

  it('getById returns a payment by id', async () => {
    const { PaymentRepository } = await import('../repositories/PaymentRepository')
    const { Payment } = await import('../domain/Payment')
    const paymentRepository = new PaymentRepository()

    const payment = new Payment({
      id: 'pay-1',
      reservationId: 'res-1',
      amount: 250,
      date: '2025-07-01',
      method: 'cash',
      note: 'Advance payment',
    })
    await paymentRepository.save(payment)

    const foundPayment = await paymentRepository.getById('pay-1')
    expect(foundPayment).not.toBeNull()
    expect(foundPayment!.id).toBe('pay-1')
    expect(foundPayment!.amount).toBe(250)
  })

  it('getById returns null for non-existent payment', async () => {
    const { PaymentRepository } = await import('../repositories/PaymentRepository')
    const paymentRepository = new PaymentRepository()

    const foundPayment = await paymentRepository.getById('non-existent-id')
    expect(foundPayment).toBeNull()
  })

  it('delete removes a payment', async () => {
    const { PaymentRepository } = await import('../repositories/PaymentRepository')
    const { Payment } = await import('../domain/Payment')
    const paymentRepository = new PaymentRepository()

    const payment = new Payment({
      id: 'pay-1',
      reservationId: 'res-1',
      amount: 250,
      date: '2025-07-01',
      method: 'cash',
      note: 'Advance payment',
    })
    await paymentRepository.save(payment)

    const paymentsBeforeDelete = await paymentRepository.getAll()
    expect(paymentsBeforeDelete).toHaveLength(1)

    await paymentRepository.delete('pay-1')

    const paymentsAfterDelete = await paymentRepository.getAll()
    expect(paymentsAfterDelete).toHaveLength(0)
  })
})

describe('TaskRepository', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  it('getAll returns empty array when no tasks exist', async () => {
    const { TaskRepository } = await import('../repositories/TaskRepository')
    const taskRepository = new TaskRepository()
    const tasks = await taskRepository.getAll()
    expect(tasks).toEqual([])
  })

  it('save persists a task and getAll retrieves it', async () => {
    const { TaskRepository } = await import('../repositories/TaskRepository')
    const { Task } = await import('../domain/Task')
    const taskRepository = new TaskRepository()

    const task = new Task({
      id: 'task-1',
      title: 'Clean Deluxe Suite',
      category: 'cleaning',
      completed: false,
      date: '2025-07-01',
      linkedRoomId: 'room-1',
      auto: true,
    })

    const savedTask = await taskRepository.save(task)
    expect(savedTask.id).toBe('task-1')
    expect(savedTask.title).toBe('Clean Deluxe Suite')

    const allTasks = await taskRepository.getAll()
    expect(allTasks).toHaveLength(1)
    expect(allTasks[0].id).toBe('task-1')
    expect(allTasks[0].title).toBe('Clean Deluxe Suite')
    expect(allTasks[0].category).toBe('cleaning')
    expect(allTasks[0].completed).toBe(false)
    expect(allTasks[0].date).toBe('2025-07-01')
    expect(allTasks[0].linkedRoomId).toBe('room-1')
    expect(allTasks[0].auto).toBe(true)
  })

  it('getByDate filters tasks by date', async () => {
    const { TaskRepository } = await import('../repositories/TaskRepository')
    const { Task } = await import('../domain/Task')
    const taskRepository = new TaskRepository()

    const taskOnFirstDay = new Task({
      id: 'task-1',
      title: 'Clean Room A',
      category: 'cleaning',
      completed: false,
      date: '2025-07-01',
      linkedRoomId: 'room-1',
      auto: true,
    })

    const secondTaskOnFirstDay = new Task({
      id: 'task-2',
      title: 'Prepare Room B for guest',
      category: 'preparation',
      completed: false,
      date: '2025-07-01',
      linkedRoomId: 'room-2',
      linkedReservationId: 'res-1',
      auto: true,
    })

    const taskOnSecondDay = new Task({
      id: 'task-3',
      title: 'Check payment from guest',
      category: 'payment',
      completed: false,
      date: '2025-07-02',
      linkedReservationId: 'res-2',
      auto: true,
    })

    await taskRepository.save(taskOnFirstDay)
    await taskRepository.save(secondTaskOnFirstDay)
    await taskRepository.save(taskOnSecondDay)

    const tasksOnFirstDay = await taskRepository.getByDate('2025-07-01')
    expect(tasksOnFirstDay).toHaveLength(2)
    const firstDayTaskIds = tasksOnFirstDay.map(task => task.id).sort()
    expect(firstDayTaskIds).toEqual(['task-1', 'task-2'])

    const tasksOnSecondDay = await taskRepository.getByDate('2025-07-02')
    expect(tasksOnSecondDay).toHaveLength(1)
    expect(tasksOnSecondDay[0].id).toBe('task-3')

    const tasksOnEmptyDay = await taskRepository.getByDate('2025-07-10')
    expect(tasksOnEmptyDay).toEqual([])
  })

  it('getById returns a task by id', async () => {
    const { TaskRepository } = await import('../repositories/TaskRepository')
    const { Task } = await import('../domain/Task')
    const taskRepository = new TaskRepository()

    const task = new Task({
      id: 'task-1',
      title: 'Clean Deluxe Suite',
      category: 'cleaning',
      completed: false,
      date: '2025-07-01',
      linkedRoomId: 'room-1',
      auto: true,
    })
    await taskRepository.save(task)

    const foundTask = await taskRepository.getById('task-1')
    expect(foundTask).not.toBeNull()
    expect(foundTask!.id).toBe('task-1')
    expect(foundTask!.title).toBe('Clean Deluxe Suite')
  })

  it('getById returns null for non-existent task', async () => {
    const { TaskRepository } = await import('../repositories/TaskRepository')
    const taskRepository = new TaskRepository()

    const foundTask = await taskRepository.getById('non-existent-id')
    expect(foundTask).toBeNull()
  })

  it('delete removes a task', async () => {
    const { TaskRepository } = await import('../repositories/TaskRepository')
    const { Task } = await import('../domain/Task')
    const taskRepository = new TaskRepository()

    const task = new Task({
      id: 'task-1',
      title: 'Clean Deluxe Suite',
      category: 'cleaning',
      completed: false,
      date: '2025-07-01',
      linkedRoomId: 'room-1',
      auto: true,
    })
    await taskRepository.save(task)

    const tasksBeforeDelete = await taskRepository.getAll()
    expect(tasksBeforeDelete).toHaveLength(1)

    await taskRepository.delete('task-1')

    const tasksAfterDelete = await taskRepository.getAll()
    expect(tasksAfterDelete).toHaveLength(0)
  })
})
