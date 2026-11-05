import { useState, useMemo, memo } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { ZodError } from 'zod';
import { useRooms } from '../../hooks/useRooms';
import { useGuests } from '../../hooks/useGuests';
import { useReservationContext } from '../../context/ReservationContext';
import { useLocale } from '../../context/LocaleContext';
import { reservationService } from '../../services/ReservationService';
import { guestService } from '../../services/GuestService';
import { Reservation, type RecurrencePattern } from '../../domain/Reservation';
import { GuestSchema } from '../../schemas/GuestSchema';
import { ReservationSchema } from '../../schemas/ReservationSchema';
import GuestInfoStep from './GuestInfoStep';
import StayDetailsStep from './StayDetailsStep';
import { errorMessage } from '../../i18n/errorMessage';
import { validationMessage } from '../../i18n/validationMessage';
import type { TranslationKeys } from '../../i18n/en';

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
  recurrencePattern: RecurrencePattern | '';
  recurrenceEndDate: string;
}

type FormErrors = Partial<Record<string, string>>;

function validateGuestStep(form: FormData, t: TranslationKeys): FormErrors {
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
        if (field === 'name') errors.guestName = validationMessage(issue.message, t);
        else if (field === 'phone') errors.phone = validationMessage(issue.message, t);
        else if (field === 'email') errors.email = validationMessage(issue.message, t);
      }
    }
  } else {
    if (!form.guestId) {
      errors.guestId = t.pleaseSelectGuest;
    }
  }

  return errors;
}

/** Nights × the room's nightly rate, or null when room or dates are not chosen yet. */
function suggestedPrice(form: FormData, rooms: { id: string; pricePerNight: number }[]): number | null {
  if (!form.roomId || !form.checkIn || !form.checkOut) return null;
  const room = rooms.find(candidate => candidate.id === form.roomId);
  if (!room) return null;
  const nights = differenceInCalendarDays(parseISO(form.checkOut), parseISO(form.checkIn));
  return nights > 0 ? nights * room.pricePerNight : null;
}

function validateStayStep(form: FormData, t: TranslationKeys): FormErrors {
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
      if (field === 'roomId') errors.roomId = validationMessage(issue.message, t);
      else if (field === 'arrivalDate') errors.checkIn = validationMessage(issue.message, t);
      else if (field === 'departureDate') errors.checkOut = validationMessage(issue.message, t);
      else if (field === 'price') errors.price = validationMessage(issue.message, t);
    }
  }

  if (form.recurrencePattern && !form.recurrenceEndDate) {
    errors.recurrenceEndDate = t.validationRecurrenceEndRequired;
  }
  if (form.recurrencePattern && form.recurrenceEndDate && form.recurrenceEndDate <= form.checkOut) {
    errors.recurrenceEndDate = t.validationRecurrenceEndAfterCheckOut;
  }

  return errors;
}

export default memo(function NewReservationModal({ onClose }: { onClose: () => void }) {
  const { rooms } = useRooms();
  const { guests } = useGuests();
  const { reservations } = useReservationContext();
  const { t } = useLocale();
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
    recurrencePattern: '',
    recurrenceEndDate: '',
  });

  const updateForm = (field: string, value: string | number) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'recurrencePattern' && value === '') {
        updated.recurrenceEndDate = '';
      }
      // Choosing a room or dates suggests a price (nights × nightly rate); the owner can still edit it.
      if (field === 'roomId' || field === 'checkIn' || field === 'checkOut') {
        const suggested = suggestedPrice(updated, rooms);
        if (suggested !== null) updated.price = String(suggested);
      }
      return updated;
    });
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const occurrenceCount = useMemo(() => {
    if (!form.recurrencePattern || !form.recurrenceEndDate || !form.checkIn || !form.checkOut) return 0;
    if (form.checkIn >= form.checkOut) return 0;
    try {
      const occurrences = Reservation.generateOccurrences(
        {
          id: 'temp',
          roomId: form.roomId || 'temp',
          guestId: 'temp',
          arrivalDate: form.checkIn,
          departureDate: form.checkOut,
          guestsCount: form.guestsCount,
          status: 'Confirmed',
          price: parseFloat(form.price) || 0,
        },
        { pattern: form.recurrencePattern, endDate: form.recurrenceEndDate },
      );
      return occurrences.length;
    } catch {
      return 0;
    }
  }, [form.recurrencePattern, form.recurrenceEndDate, form.checkIn, form.checkOut, form.roomId, form.guestsCount, form.price]);


  const handleNext = () => {
    const stepErrors = validateGuestStep(form, t);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setStep(2);
  };

  const handleSave = async () => {
    const stayErrors = validateStayStep(form, t);
    if (Object.keys(stayErrors).length > 0) {
      setErrors(stayErrors);
      return;
    }

    setSubmitting(true);
    try {
      const room = rooms.find(r => r.id === form.roomId);
      if (room && form.guestsCount > room.maxGuests) {
        setErrors({ guestsCount: t.exceedsCapacity });
        return;
      }

      const conflict = reservations.find(
        r => r.roomId === form.roomId && r.isActive() && r.overlaps(form.checkIn, form.checkOut)
      );
      if (conflict) {
        setErrors({ checkIn: t.roomAlreadyBooked });
        return;
      }

      let guestId = form.guestId;

      if (form.isNewGuest) {
        const guest = await guestService.createGuest({
          id: crypto.randomUUID(),
          name: form.guestName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          previousStays: 0,
          notes: '',
        });
        guestId = guest.id;
      }

      const reservationData: import('../../domain/Reservation').ReservationData = {
        id: crypto.randomUUID(),
        roomId: form.roomId,
        guestId,
        arrivalDate: form.checkIn,
        departureDate: form.checkOut,
        guestsCount: form.guestsCount,
        status: 'Confirmed',
        price: parseFloat(form.price),
      };

      if (form.recurrencePattern && form.recurrenceEndDate) {
        reservationData.recurrence = {
          pattern: form.recurrencePattern,
          endDate: form.recurrenceEndDate,
        };
      }

      await reservationService.createReservation(reservationData);
      onClose();
    } catch (e: unknown) {
      if (e instanceof ZodError) {
        const zodErrors: FormErrors = {};
        for (const issue of e.issues) {
          zodErrors[issue.path[0] as string] = validationMessage(issue.message, t);
        }
        setErrors(zodErrors);
      } else {
        console.error('Creating reservation failed:', e);
        // Booking errors carry no money parameters, so a plain number formatter is enough here.
        setErrors({ price: errorMessage(e, t, amount => String(amount)) });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ios-bg animate-in slide-in-from-bottom-full duration-300 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] sm:p-5 sm:bg-black/40 sm:justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="new-reservation-title" onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
      <div className="flex-1 w-full bg-ios-bg sm:max-w-md sm:flex-none sm:rounded-3xl sm:h-auto sm:max-h-[90vh] sm:overflow-hidden flex flex-col shadow-2xl">
        <header className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-4 bg-ios-bg border-b border-ios-border/30">
          <button onClick={onClose} className="text-ios-blue text-lg px-2 active:opacity-70 transition-opacity focus-visible:ring-2 focus-visible:ring-ios-blue focus-visible:rounded focus-visible:outline-none">{t.cancel}</button>
          <h2 id="new-reservation-title" className="font-semibold text-ios-text">{t.newReservation}</h2>
          <button
            onClick={step === 1 ? handleNext : handleSave}
            className="text-ios-blue font-semibold text-lg px-2 active:opacity-70 transition-opacity disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ios-blue focus-visible:rounded focus-visible:outline-none"
            disabled={submitting}
          >
            {step === 1 ? t.next : t.save}
          </button>
        </header>

        <div className="relative flex-1 min-h-0">
          <div className="h-full overflow-y-auto p-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
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
                reservations={reservations}
                roomId={form.roomId}
                checkIn={form.checkIn}
                checkOut={form.checkOut}
                guestsCount={form.guestsCount}
                price={form.price}
                recurrencePattern={form.recurrencePattern}
                recurrenceEndDate={form.recurrenceEndDate}
                occurrenceCount={occurrenceCount}
                errors={errors}
                onUpdate={updateForm}
              />
            )}
          </div>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-ios-bg to-transparent" />
        </div>
      </div>
    </div>
  );
});
