import { z } from 'zod';
import type { Locale } from '../i18n';

/**
 * Version of the backup file format written by `exportBackup()`.
 * Bump it when the format changes incompatibly, and teach the importer to upgrade older versions.
 * Files exported before versioning existed have no `schemaVersion` and are treated as version 1.
 */
export const BACKUP_SCHEMA_VERSION = 1;

const SUPPORTED_LOCALES = ['en', 'bg', 'de', 'el', 'fr', 'es'] as const satisfies readonly Locale[];
const SUPPORTED_THEMES = ['light', 'dark', 'system'] as const;

/** Only the property name is restored; `id` and `isConfigured` are set by the importer. */
export const BackupSettingsSchema = z.object({
  name: z.string().trim().min(1).max(100).optional().catch(undefined),
});

/** Invalid preference values are dropped instead of rejecting the whole backup. */
export const BackupPreferencesSchema = z.object({
  locale: z.enum(SUPPORTED_LOCALES).optional().catch(undefined),
  theme: z.enum(SUPPORTED_THEMES).optional().catch(undefined),
  notificationsEnabled: z.boolean().optional().catch(undefined),
});

/**
 * Shape of a backup file. Individual records are validated one by one with the entity
 * schemas during import, so a few bad records can be reported instead of failing the file.
 */
export const BackupFileSchema = z.object({
  schemaVersion: z.number().int().min(1).optional(),
  settings: BackupSettingsSchema.optional(),
  preferences: BackupPreferencesSchema.optional().catch(undefined),
  rooms: z.array(z.unknown()).optional(),
  guests: z.array(z.unknown()).optional(),
  reservations: z.array(z.unknown()).optional(),
  payments: z.array(z.unknown()).optional(),
  tasks: z.array(z.unknown()).optional(),
});

export type BackupFile = z.infer<typeof BackupFileSchema>;
