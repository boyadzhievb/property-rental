import { z } from 'zod';
import { isValid, parse } from 'date-fns';

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A calendar date stored as a local `yyyy-MM-dd` string. The exact format matters: overlap and
 * range checks compare these strings lexically, which is only correct for zero-padded ISO dates.
 */
export function localDate(requiredMessage: string) {
  return z
    .string()
    .min(1, requiredMessage)
    .regex(LOCAL_DATE_PATTERN, 'Date must use the yyyy-MM-dd format')
    .refine(value => isValid(parse(value, 'yyyy-MM-dd', new Date(0))), 'Date does not exist');
}
