import { useState } from 'react';
import { Check } from 'lucide-react';
import { ZodError } from 'zod';
import { useRooms } from '../hooks/useRooms';
import { useReservationContext } from '../context/ReservationContext';
import { useGuestContext } from '../context/GuestContext';
import { reservationService } from '../services/ReservationService';
import { guestService } from '../services/GuestService';
import { GuestSchema } from '../schemas/GuestSchema';
import { ReservationSchema } from '../schemas/ReservationSchema';

interface FormData {
  guestName: string;
  phone: string;
  email: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  price: string;
}

type FormErrors = Partial<Record<string, string>>;

function validateForm(form: FormData): FormErrors {
  const errors: FormErrors = {};

  const guestResult = GuestSchema.safeParse({
    id: 'temp',
    name: form.guestName.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    avatar: '',
    previousStays: 0,
    notes: '',
  });

  if (!guestResult.success) {
    for (const issue of guestResult.error.issues) {
      const field = issue.path[0] as string;
      if (field === 'name') errors.guestName = issue.message;
      else if (field === 'phone') errors.phone = issue.message;
      else if (field === 'email') errors.email = issue.message;
    }
  }

  const resResult = ReservationSchema.safeParse({
    id: 'temp',
    roomId: form.roomId,
    guestId: 'temp',
    arrivalDate: form.checkIn,
    departureDate: form.checkOut,
    guestsCount: form.guestsCount,
    status: 'Confirmed',
    price: form.price ? parseFloat(form.price) : 0,
  });

  if (!resResult.success) {
    for (const issue of resResult.error.issues) {
      const field = issue.path[0] as string;
      if (field === 'roomId') errors.roomId = issue.message;
      else if (field === 'arrivalDate') errors.checkIn = issue.message;
      else if (field === 'departureDate') errors.checkOut = issue.message;
      else if (field === 'price') errors.price = issue.message;
    }
  }

  return errors;
}

export default function NewReservationModal({ onClose }: { onClose: () => void }) {
  const { rooms } = useRooms();
  const { refresh: refreshReservations } = useReservationContext();
  const { refresh: refreshGuests } = useGuestContext();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [form, setForm] = useState<FormData>({
    guestName: '',
    phone: '',
    email: '',
    roomId: '',
    checkIn: '',
    checkOut: '',
    guestsCount: 2,
    price: '',
  });

  const updateForm = (field: keyof FormData, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleNext = () => {
    const guestResult = GuestSchema.safeParse({
      id: 'temp',
      name: form.guestName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      avatar: '',
      previousStays: 0,
      notes: '',
    });

    if (!guestResult.success) {
      const stepErrors: FormErrors = {};
      for (const issue of guestResult.error.issues) {
        const field = issue.path[0] as string;
        if (field === 'name') stepErrors.guestName = issue.message;
        else if (field === 'phone') stepErrors.phone = issue.message;
        else if (field === 'email') stepErrors.email = issue.message;
      }
      setErrors(stepErrors);
      return;
    }
    setStep(2);
  };

  const handleSave = async () => {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      const guest = await guestService.createGuest({
        id: `g-${Date.now()}`,
        name: form.guestName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        avatar: '',
        previousStays: 0,
        notes: '',
      });

      await reservationService.createReservation({
        id: `r-${Date.now()}`,
        roomId: form.roomId,
        guestId: guest.id,
        arrivalDate: form.checkIn,
        departureDate: form.checkOut,
        guestsCount: form.guestsCount,
        status: 'Confirmed',
        price: parseFloat(form.price),
      });

      await Promise.all([refreshReservations(), refreshGuests()]);
      onClose();
    } catch (e: any) {
      if (e instanceof ZodError) {
        const zodErrors: FormErrors = {};
        for (const issue of e.issues) {
          zodErrors[issue.path[0] as string] = issue.message;
        }
        setErrors(zodErrors);
      } else {
        setErrors({ price: e.message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ios-bg animate-in slide-in-from-bottom-full duration-300 sm:p-5 sm:bg-black/40 sm:justify-center sm:items-center">
      <div className="flex-1 w-full bg-ios-bg sm:max-w-md sm:flex-none sm:rounded-3xl sm:h-auto sm:max-h-[90vh] sm:overflow-hidden flex flex-col shadow-2xl">
        <header className="flex items-center justify-between p-4 bg-ios-bg border-b border-ios-border/30">
          <button onClick={onClose} className="text-ios-blue text-lg px-2 active:opacity-70 transition-opacity">Cancel</button>
          <h2 className="font-semibold text-ios-text">New Reservation</h2>
          <button
            onClick={step === 1 ? handleNext : handleSave}
            className="text-ios-blue font-semibold text-lg px-2 active:opacity-70 transition-opacity disabled:opacity-40"
            disabled={submitting}
          >
            {step === 1 ? 'Next' : 'Save'}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {step === 1 ? (
            <div className="space-y-6">
              <div>
                <div className="text-xs uppercase tracking-wider text-ios-text-secondary font-semibold ml-4 mb-2">Guest Information</div>
                <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">
                  <div>
                    <input
                      type="text"
                      placeholder="Guest Name"
                      value={form.guestName}
                      onChange={(e) => updateForm('guestName', e.target.value)}
                      className="w-full p-4 border-b border-ios-border/40 focus:outline-none"
                      autoFocus
                    />
                    {errors.guestName && <div className="px-4 pb-2 text-xs text-ios-red">{errors.guestName}</div>}
                  </div>
                  <div>
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={form.phone}
                      onChange={(e) => updateForm('phone', e.target.value)}
                      className="w-full p-4 border-b border-ios-border/40 focus:outline-none"
                    />
                    {errors.phone && <div className="px-4 pb-2 text-xs text-ios-red">{errors.phone}</div>}
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="Email (Optional)"
                      value={form.email}
                      onChange={(e) => updateForm('email', e.target.value)}
                      className="w-full p-4 focus:outline-none"
                    />
                    {errors.email && <div className="px-4 pb-2 text-xs text-ios-red">{errors.email}</div>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="text-xs uppercase tracking-wider text-ios-text-secondary font-semibold ml-4 mb-2">Stay Details</div>
                <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04] divide-y divide-ios-border/40">

                  <div>
                    <div className="text-xs uppercase tracking-wider text-ios-text-secondary font-semibold px-4 pt-3">Room</div>
                    <div className="px-4 pb-3 pt-2 flex flex-wrap gap-2">
                      {rooms.map(room => (
                        <button
                          key={room.id}
                          onClick={() => updateForm('roomId', room.id)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            form.roomId === room.id
                              ? 'bg-ios-blue text-white'
                              : 'bg-ios-gray-light text-ios-text'
                          }`}
                        >
                          {room.name}
                          {form.roomId === room.id && <Check size={14} className="inline ml-1" />}
                        </button>
                      ))}
                    </div>
                    {errors.roomId && <div className="px-4 pb-2 text-xs text-ios-red">{errors.roomId}</div>}
                  </div>

                  <div className="flex flex-col p-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-ios-text font-medium">Check-in</span>
                      <input
                        type="date"
                        value={form.checkIn}
                        onChange={(e) => updateForm('checkIn', e.target.value)}
                        className="text-ios-blue text-right focus:outline-none bg-transparent"
                      />
                    </div>
                    {errors.checkIn && <div className="text-xs text-ios-red mb-2">{errors.checkIn}</div>}
                    <div className="flex justify-between items-center">
                      <span className="text-ios-text font-medium">Check-out</span>
                      <input
                        type="date"
                        value={form.checkOut}
                        onChange={(e) => updateForm('checkOut', e.target.value)}
                        className="text-ios-blue text-right focus:outline-none bg-transparent"
                      />
                    </div>
                    {errors.checkOut && <div className="text-xs text-ios-red mt-2">{errors.checkOut}</div>}
                  </div>

                  <div className="flex justify-between items-center p-4">
                    <span className="text-ios-text font-medium">Guests</span>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => updateForm('guestsCount', Math.max(1, form.guestsCount - 1))}
                        className="w-8 h-8 rounded-full bg-ios-gray-light flex items-center justify-center font-bold text-lg text-ios-blue active:opacity-70"
                      >-</button>
                      <span className="font-semibold text-lg w-4 text-center">{form.guestsCount}</span>
                      <button
                        onClick={() => updateForm('guestsCount', form.guestsCount + 1)}
                        className="w-8 h-8 rounded-full bg-ios-gray-light flex items-center justify-center font-bold text-lg text-ios-blue active:opacity-70"
                      >+</button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-ios-text-secondary font-semibold ml-4 mb-2">Total Price</div>
                <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">
                  <input
                    type="number"
                    placeholder="$0.00"
                    value={form.price}
                    onChange={(e) => updateForm('price', e.target.value)}
                    className="w-full p-4 focus:outline-none text-xl font-bold text-ios-text"
                  />
                  {errors.price && <div className="px-4 pb-3 text-xs text-ios-red">{errors.price}</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
