export function getPublicPassword() {
  return process.env.RATE_PASSWORD ?? "futbol-lunes";
}

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? getPublicPassword();
}

export function isValidPublicPassword(password: string | null) {
  return password === getPublicPassword();
}

export function isValidAdminPassword(password: string | null) {
  return password === getAdminPassword();
}
