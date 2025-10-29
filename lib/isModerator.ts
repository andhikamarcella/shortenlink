const MODERATOR_EMAILS = ['andhikamarcella546@gmail.com'];

export const isModerator = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return MODERATOR_EMAILS.includes(email.toLowerCase());
};

export const moderatorEmails = MODERATOR_EMAILS;
