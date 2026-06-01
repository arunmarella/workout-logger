const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS
  ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map((email) => email.trim().toLowerCase())
  : ['arunmarella1108@gmail.com'];

/**
 * Checks if the user is a registered admin/developer.
 * @param {object} user - Supabase user object
 * @returns {boolean}
 */
export function isAdmin(user) {
  if (!user || !user.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}
