// A nonce pair for ID-token sign-in (Apple, Google). The provider is given the
// SHA-256 hash and embeds it in the token; Supabase is given the original and
// hashes it to compare. That binds the token to this one sign-in, so a token
// issued for another cannot be replayed into it. Send the same value to both
// and every sign-in fails with a nonce mismatch.
export async function makeNonce() {
  const raw = crypto.randomUUID()
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hashed = [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return { raw, hashed }
}
