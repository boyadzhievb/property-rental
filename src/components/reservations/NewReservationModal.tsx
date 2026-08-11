import { useState, useEffect } from 'react';
import { ZodError } from 'zod';
import { useRooms } from '../../hooks/useRooms';
import { useGuests } from '../../hooks/useGuests';
import { useReservationContext } from '../../context/ReservationContext';
import { useGuestContext } from '../../context/GuestContext';
import { reservationService } from '../../services/ReservationService';
import { guestService } from '../../services/GuestService';
import { GuestSchema } from '../../schemas/GuestSchema';
import { ReservationSchema } from '../../schemas/ReservationSchema';
import GuestInfoStep from './GuestInfoStep';
import StayDetailsStep from './StayDetailsStep';

interface FormData {
  guestId: string;
  isNewGuest: boolean;
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

function validateGuestStep(form: FormData): FormErrors {
  const errors: FormErrors = {};

  if (form.isNewGuest) {
    const guestResult = GuestSchema.safeParse({
      id: 'temp',
      name: form.guestName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
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
  } else {
    if (!form.guestId) {
      errors.guestId = 'Please select a guest';
    }
  }

  return errors;
}

function validateStayStep(form: FormData): FormErrors {
  const errors: FormErrors = {};

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
  const { rooms, refresh: refreshRooms } = useRooms();
  const { guests } = useGuests();
  const { refresh: refreshReservations } = useReservationContext();
  const { refresh: refreshGuests } = useGuestContext();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [form, setForm] = useState<FormData>({
    guestId: '',
    isNewGuest: false,
    guestName: '',
    phone: '',
    email: '',
    roomId: '',
    checkIn: '',
    checkOut: '',
    guestsCount: 2,
    price: '',
  });

  const updateForm = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  useEffect(() => {
    if (!form.roomId || !form.checkIn || !form.checkOut) return;
    const room = rooms.find(r => r.id === form.roomId);
    if (!room) return;
    const arrival = new Date(form.checkIn);
    const departure = new Date(form.checkOut);
    const nights = Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
    if (nights > 0) {
      setForm(prev => ({ ...prev, price: String(nights * room.pricePerNight) }));
    }
  }, [form.roomId, form.checkIn, form.checkOut, rooms]);

  const handleNext = () => {
    const stepErrors = validateGuestStep(form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setStep(2);
  };

  const handleSave = async () => {
    const stayErrors = validateStayStep(form);
    if (Object.keys(stayErrors).length > 0) {
      setErrors(stayErrors);
      return;
    }

    setSubmitting(true);
    try {
      let guestId = form.guestId;

      if (form.isNewGuest) {
        const guest = await guestService.createGuest({
          id: `g-${Date.now()}`,
          name: form.guestName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          previousStays: 0,
          notes: '',
        });
        guestId = guest.id;
      }

      await reservationService.createReservation({
        id: `r-${Date.now()}`,
        roomId: form.roomId,
        guestId,
        arrivalDate: form.checkIn,
        departureDate: form.checkOut,
        guestsCount: form.guestsCount,
        status: 'Confirmed',
        price: parseFloat(form.price),
      });

      await Promise.all([refreshReservations(), refreshGuests(), refreshRooms()]);
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
            <GuestInfoStep
              guests={guests}
              selectedGuestId={form.guestId}
              isNewGuest={form.isNewGuest}
              guestName={form.guestName}
              phone={form.phone}
              email={form.email}
              errors={errors}
              onSelectGuest={(id) => {
                setForm(prev => ({ ...prev, guestId: id }));
                setErrors(prev => ({ ...prev, guestId: undefined }));
              }}
              onToggleNewGuest={() => {
                setForm(prev => ({ ...prev, isNewGuest: !prev.isNewGuest, guestId: '' }));
                setErrors({});
              }}
              onUpdate={updateForm}
            />
          ) : (
            <StayDetailsStep
              rooms={rooms}
              roomId={form.roomId}
              checkIn={form.checkIn}
              checkOut={form.checkOut}
              guestsCount={form.guestsCount}
              price={form.price}
              errors={errors}
              onUpdate={updateForm}
            />
          )}
        </div>
      </div>
    </div>
  );
}
