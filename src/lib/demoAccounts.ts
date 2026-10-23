/** Shared demo logins — several people can sign in at once on different devices/browsers. */
export const DEMO_PASSWORD = "Password123!";

export const DEMO_ACCOUNTS = [
  { email: "ada@afrismart.ng", label: "Ada · consumer", role: "CONSUMER" as const },
  { email: "chioma@afrismart.ng", label: "Chioma · consumer", role: "CONSUMER" as const },
  { email: "tunde@afrismart.ng", label: "Tunde · consumer", role: "CONSUMER" as const },
  { email: "yaba@afrismart.ng", label: "Yaba Campus Mart · merchant", role: "MERCHANT" as const },
  { email: "surulere@afrismart.ng", label: "Surulere Stationers · merchant", role: "MERCHANT" as const },
  { email: "ikeja@afrismart.ng", label: "Ikeja CV Mart · merchant", role: "MERCHANT" as const },
] as const;
