const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateSlug(length = 7) {
  let slug = '';
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * alphabet.length);
    slug += alphabet[index];
  }
  return slug;
}

export const slugPattern = /^[a-zA-Z0-9-]{1,24}$/;
