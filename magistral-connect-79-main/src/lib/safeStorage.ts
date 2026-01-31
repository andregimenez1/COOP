/**
 * Centralized utility for safe localStorage operations with automated backups and quota management.
 */

import { sortBackupKeysNewestFirst } from './legacyUserMigration';

const BACKUP_SUFFIX = '_backup_';
const MAX_BACKUPS_PER_KEY = 3;

/**
 * Get item from localStorage with error handling.
 */
export function safeGetItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const stored = localStorage.getItem(key);
    
    // If main data is missing or empty, try to restore from the latest backup
    if (!stored || stored === '[]' || stored === 'null') {
      const backup = restoreFromLatestBackup(key);
      if (backup) return JSON.parse(backup) as T;
      return defaultValue;
    }
    
    return JSON.parse(stored) as T;
  } catch (error) {
    console.error(`Error reading key "${key}" from localStorage:`, error);
    // Try to restore from backup on parse error
    try {
      const backup = restoreFromLatestBackup(key);
      if (backup) return JSON.parse(backup) as T;
    } catch {}
    return defaultValue;
  }
}

/**
 * Set item in localStorage with automated backup and quota management.
 */
export function safeSetItem(key: string, value: any): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const dataStr = JSON.stringify(value);
    const existing = localStorage.getItem(key);
    
    // Don't overwrite existing data with empty array unless explicitly intended
    // This protects against data loss during state initialization errors
    if (existing && existing !== '[]' && existing !== 'null' && dataStr === '[]') {
      console.warn(`Blocking attempt to overwrite existing data in "${key}" with an empty array. Created emergency backup.`);
      createBackup(key, existing);
      return false;
    }

    // Create a backup of current data before overwriting
    if (existing && existing !== dataStr) {
      createBackup(key, existing);
    }

    localStorage.setItem(key, dataStr);
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.warn(`LocalStorage quota exceeded while saving "${key}". Attempting cleanup...`);
      cleanupAllBackups();
      
      // Try again after cleanup
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (retryError) {
        console.error(`Failed to save "${key}" even after cleanup:`, retryError);
        return false;
      }
    }
    console.error(`Error saving key "${key}" to localStorage:`, error);
    return false;
  }
}

/**
 * Creates a timestamped backup for a specific key.
 */
function createBackup(key: string, data: string) {
  try {
    const timestamp = Date.now();
    const backupKey = `${key}${BACKUP_SUFFIX}${timestamp}`;
    localStorage.setItem(backupKey, data);
    
    // Clean up old backups for this key to save space
    limitBackupsPerKey(key);
  } catch (e) {
    // If backup fails due to quota, clean up all backups
    if (e instanceof Error && e.name === 'QuotaExceededError') {
      cleanupAllBackups();
    }
  }
}

/**
 * Limits the number of backups for a specific key.
 */
function limitBackupsPerKey(key: string) {
  try {
    const allKeys = Object.keys(localStorage);
    const backupKeys = allKeys.filter(k => k.startsWith(`${key}${BACKUP_SUFFIX}`));
    const sorted = sortBackupKeysNewestFirst(backupKeys);
    
    if (sorted.length > MAX_BACKUPS_PER_KEY) {
      sorted.slice(MAX_BACKUPS_PER_KEY).forEach(k => localStorage.removeItem(k));
    }
  } catch {}
}

/**
 * Removes all backup keys from localStorage to free up space.
 */
export function cleanupAllBackups() {
  try {
    console.log('🧹 Cleaning up all localStorage backups...');
    const allKeys = Object.keys(localStorage);
    const backupKeys = allKeys.filter(k => k.includes(BACKUP_SUFFIX));
    backupKeys.forEach(k => localStorage.removeItem(k));
    console.log(`✅ Removed ${backupKeys.length} backup files.`);
  } catch (e) {
    console.error('Error during backup cleanup:', e);
  }
}

/**
 * Attempts to find and return the latest backup for a key.
 */
function restoreFromLatestBackup(key: string): string | null {
  try {
    const allKeys = Object.keys(localStorage);
    const backupKeys = allKeys.filter(k => k.startsWith(`${key}${BACKUP_SUFFIX}`));
    const sorted = sortBackupKeysNewestFirst(backupKeys);
    
    if (sorted.length > 0) {
      const latestBackupKey = sorted[0];
      const data = localStorage.getItem(latestBackupKey);
      if (data && data !== '[]' && data !== 'null') {
        console.log(`♻️ Restored data for "${key}" from backup: ${latestBackupKey}`);
        return data;
      }
    }
  } catch {}
  return null;
}
