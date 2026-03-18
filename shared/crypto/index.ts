// FinalWishes Shared — Client-Side Encryption
// AES-256-GCM encryption for documents before upload
// Matches the server-side KMS flow defined in TECHNICAL_DESIGN.md §3

/**
 * Encrypt a document with AES-256-GCM using a Data Encryption Key (DEK)
 * The DEK is provided by the API (generated via Cloud KMS)
 */
export async function encryptDocument(
  file: ArrayBuffer,
  plaintextDEK: Uint8Array
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    'raw',
    plaintextDEK,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    file
  );

  // Prepend IV to ciphertext for decryption
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);

  return result.buffer;
}

/**
 * Decrypt a document with AES-256-GCM
 */
export async function decryptDocument(
  encryptedData: ArrayBuffer,
  plaintextDEK: Uint8Array
): Promise<ArrayBuffer> {
  const data = new Uint8Array(encryptedData);
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);

  const key = await crypto.subtle.importKey(
    'raw',
    plaintextDEK,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
}
