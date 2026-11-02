/**
 * AUTHORITATIVE PHONE NORMALIZATION & VALIDATION ENGINE
 * 
 * Complies with:
 * - E.164 international standard format
 * - User-friendly Indian mobile number entry (10-digit, 11-digit with leading 0, 12-digit with 91)
 * - Strict PII protection (masking helper)
 * - Country code preservation for international numbers
 */

export interface PhoneNormalizationResult {
  isValid: boolean;
  rawInput: string;
  normalized: string; // e.g. "+919118245636"
  masked: string;     // e.g. "+91 ******5636"
  countryCode: string;// e.g. "+91"
  nationalNumber: string; // e.g. "9118245636"
  isIndian: boolean;
  error?: string;
}

/**
 * Normalizes user-entered phone numbers to valid E.164 format.
 * 
 * Rules:
 * 1. Default to India (+91) if no country code supplied.
 * 2. 10-digit Indian numbers (e.g. "9118245636") -> "+919118245636".
 * 3. 11-digit numbers with leading 0 (e.g. "09118245636") -> "+919118245636".
 * 4. 12-digit Indian numbers starting with 91 (e.g. "919118245636") -> "+919118245636".
 * 5. International numbers starting with "+" (e.g. "+14155552671") are preserved as E.164 without adding +91.
 */
export function normalizePhoneNumber(
  rawInput: string,
  defaultCountryCode: string = "IN"
): PhoneNormalizationResult {
  if (!rawInput || typeof rawInput !== "string") {
    return {
      isValid: false,
      rawInput: String(rawInput || ""),
      normalized: "",
      masked: "",
      countryCode: "",
      nationalNumber: "",
      isIndian: false,
      error: "Phone number is required.",
    };
  }

  const trimmed = rawInput.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^0-9]/g, "");

  if (!digits || digits.length < 10) {
    return {
      isValid: false,
      rawInput: trimmed,
      normalized: "",
      masked: "",
      countryCode: "",
      nationalNumber: digits,
      isIndian: false,
      error: "Phone number must contain at least 10 digits.",
    };
  }

  // Case A: International number explicitly marked with "+"
  if (hasPlus) {
    // E.164 regex: + followed by 7 to 15 digits
    const e164Regex = /^\+[1-9]\d{7,14}$/;
    const formatted = `+${digits}`;

    if (!e164Regex.test(formatted)) {
      return {
        isValid: false,
        rawInput: trimmed,
        normalized: "",
        masked: "",
        countryCode: "",
        nationalNumber: digits,
        isIndian: false,
        error: "Invalid international E.164 phone number format.",
      };
    }

    const isIndian = digits.startsWith("91") && digits.length === 12;
    const countryCode = isIndian ? "+91" : `+${digits.substring(0, digits.length - 10)}`;
    const nationalNumber = digits.substring(digits.length - 10);

    return {
      isValid: true,
      rawInput: trimmed,
      normalized: formatted,
      masked: maskPhoneNumber(formatted),
      countryCode,
      nationalNumber,
      isIndian,
    };
  }

  // Case B: 10-digit standard Indian mobile number (starts with 6, 7, 8, or 9)
  if (digits.length === 10) {
    const firstDigit = digits.charAt(0);
    if (!["6", "7", "8", "9"].includes(firstDigit)) {
      return {
        isValid: false,
        rawInput: trimmed,
        normalized: "",
        masked: "",
        countryCode: "+91",
        nationalNumber: digits,
        isIndian: true,
        error: `Indian mobile number must start with 6, 7, 8, or 9 (received "${firstDigit}").`,
      };
    }

    const normalized = `+91${digits}`;
    return {
      isValid: true,
      rawInput: trimmed,
      normalized,
      masked: maskPhoneNumber(normalized),
      countryCode: "+91",
      nationalNumber: digits,
      isIndian: true,
    };
  }

  // Case C: 11-digit with leading 0 (e.g. "09118245636")
  if (digits.length === 11 && digits.startsWith("0")) {
    const withoutZero = digits.substring(1);
    const firstDigit = withoutZero.charAt(0);
    if (!["6", "7", "8", "9"].includes(firstDigit)) {
      return {
        isValid: false,
        rawInput: trimmed,
        normalized: "",
        masked: "",
        countryCode: "+91",
        nationalNumber: withoutZero,
        isIndian: true,
        error: "Indian mobile number must start with 6, 7, 8, or 9.",
      };
    }

    const normalized = `+91${withoutZero}`;
    return {
      isValid: true,
      rawInput: trimmed,
      normalized,
      masked: maskPhoneNumber(normalized),
      countryCode: "+91",
      nationalNumber: withoutZero,
      isIndian: true,
    };
  }

  // Case D: 12-digit Indian number without "+" (e.g. "919118245636")
  if (digits.length === 12 && digits.startsWith("91")) {
    const nationalNumber = digits.substring(2);
    const firstDigit = nationalNumber.charAt(0);
    if (!["6", "7", "8", "9"].includes(firstDigit)) {
      return {
        isValid: false,
        rawInput: trimmed,
        normalized: "",
        masked: "",
        countryCode: "+91",
        nationalNumber,
        isIndian: true,
        error: "Indian mobile number must start with 6, 7, 8, or 9.",
      };
    }

    const normalized = `+${digits}`;
    return {
      isValid: true,
      rawInput: trimmed,
      normalized,
      masked: maskPhoneNumber(normalized),
      countryCode: "+91",
      nationalNumber,
      isIndian: true,
    };
  }

  // Fallback for general valid numbers
  if (digits.length >= 10 && digits.length <= 15) {
    const normalized = `+${digits}`;
    return {
      isValid: true,
      rawInput: trimmed,
      normalized,
      masked: maskPhoneNumber(normalized),
      countryCode: "+",
      nationalNumber: digits,
      isIndian: false,
    };
  }

  return {
    isValid: false,
    rawInput: trimmed,
    normalized: "",
    masked: "",
    countryCode: "",
    nationalNumber: digits,
    isIndian: false,
    error: "Invalid phone number length (must be between 10 and 15 digits).",
  };
}

/**
 * Masks a phone number to protect personal identifiable information (PII) in logs.
 * Example: "+919118245636" -> "+91 ******5636"
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.trim();
  if (cleaned.length <= 4) return cleaned;

  const prefix = cleaned.startsWith("+91") ? "+91 " : cleaned.startsWith("+") ? cleaned.substring(0, 3) + " " : "";
  const last4 = cleaned.slice(-4);
  return `${prefix}******${last4}`;
}
