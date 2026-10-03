export function validateProfile(input = {}) {
  const displayName = String(input.displayName || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  const mobileNumber = String(input.mobileNumber || "").trim();

  if (displayName.length > 80) return { error: "Display name must be 80 characters or fewer." };
  if (email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { error: "Enter a valid email address." };
  }
  const mobileDigits = mobileNumber.replace(/\D/g, "").length;
  if (mobileNumber.length > 32 || (mobileNumber && (!/^\+?[\d\s().-]+$/.test(mobileNumber) || mobileDigits < 7 || mobileDigits > 15))) {
    return { error: "Enter a valid mobile number with 7-15 digits." };
  }

  return { profile: { displayName, email, mobileNumber } };
}