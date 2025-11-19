import { Contact, ColumnMapping } from '@/types/dispatch';

export const validateEmail = (email: string): boolean => {
  if (!email || !email.trim()) return false;
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
};

export const validatePhone = (phone: string): boolean => {
  if (!phone || !phone.trim()) return false;
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  // Brazilian phone should have at least 10 digits (with area code)
  return cleaned.length >= 10;
};

export const normalizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

export const normalizePhone = (phone: string): string => {
  // Keep +55 if present, otherwise just return cleaned digits
  const cleaned = phone.trim();
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  return cleaned.replace(/\D/g, '');
};

export const normalizeName = (name: string): string => {
  return name.trim();
};

export const validateContact = (row: Record<string, string>, mapping: ColumnMapping): {
  isValid: boolean;
  contact: Contact | null;
} => {
  const name = row[mapping.name] || '';
  const email = row[mapping.email] || '';
  const phone = row[mapping.phone] || '';
  
  // At least email or phone must be valid
  const hasValidEmail = validateEmail(email);
  const hasValidPhone = validatePhone(phone);
  
  if (!hasValidEmail && !hasValidPhone) {
    return { isValid: false, contact: null };
  }
  
  const extras: Record<string, string> = {};
  mapping.extras.forEach(extraKey => {
    if (row[extraKey]) {
      extras[extraKey] = row[extraKey].trim();
    }
  });
  
  const contact: Contact = {
    name: normalizeName(name),
    email: hasValidEmail ? normalizeEmail(email) : '',
    phone: hasValidPhone ? normalizePhone(phone) : '',
    extras,
  };
  
  return { isValid: true, contact };
};

export const removeDuplicates = (contacts: Contact[]): Contact[] => {
  const seen = new Set<string>();
  const unique: Contact[] = [];
  
  for (const contact of contacts) {
    const key = `${contact.email}|${contact.phone}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(contact);
    }
  }
  
  return unique;
};

export const createBatches = (
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  batchSize: number = 50
) => {
  const validContacts: Contact[] = [];
  let invalidCount = 0;
  
  rows.forEach(row => {
    const { isValid, contact } = validateContact(row, mapping);
    if (isValid && contact) {
      validContacts.push(contact);
    } else {
      invalidCount++;
    }
  });
  
  // Remove duplicates
  const uniqueContacts = removeDuplicates(validContacts);
  
  // Create batches
  const batches = [];
  for (let i = 0; i < uniqueContacts.length; i += batchSize) {
    const batchContacts = uniqueContacts.slice(i, i + batchSize);
    batches.push({
      block_number: Math.floor(i / batchSize) + 1,
      block_size: batchSize,
      range: {
        start: i + 1,
        end: i + batchContacts.length,
      },
      contacts: batchContacts,
      status: 'ready' as const,
    });
  }
  
  return {
    batches,
    stats: {
      total: rows.length,
      valid: uniqueContacts.length,
      invalid: invalidCount,
      duplicates: validContacts.length - uniqueContacts.length,
    },
  };
};
