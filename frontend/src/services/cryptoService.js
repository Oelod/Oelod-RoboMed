/**
 * OELOD ROBOMED - INSTITUTIONAL CRYPTOGRAPHIC SERVICE
 * Implements Industrial-Grade End-to-End Encryption (E2EE)
 * Using Hybrid RSA-OAEP / AES-GCM Protocol
 */

const DB_NAME = 'RoboMedCrypto';
const STORE_NAME = 'InternalKeys';

// --- IndexedDB Management for Private Key Persistence ---
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const savePrivateKey = async (userId, keyPair) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(keyPair.privateKey, `${userId}_private`);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getPrivateKey = async (userId) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(`${userId}_private`);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// --- Core Cryptographic Operations ---

/**
 * Generates an industrial-grade RSA-OAEP key pair
 */
export const generateKeyPair = async () => {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
};

/**
 * Prepares public key for institutional broadcast (Base64 SPKI)
 */
export const exportPublicKey = async (publicKey) => {
  const exported = await window.crypto.subtle.exportKey("spki", publicKey);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
};

/**
 * Imports a remote public key for encryption
 */
export const importPublicKey = async (publicKeyStr) => {
  const binaryDer = Uint8Array.from(atob(publicKeyStr), c => c.charCodeAt(0));
  return await window.crypto.subtle.importKey(
    "spki",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
};

/**
 * Encrypts clinical content using Hybrid Encryption
 * Supports Multi-Recipient Manifold (Encrypt for Recipient AND Sender)
 */
export const encryptMessage = async (text, recipientKeysMap) => {
  // recipientKeysMap: { [userId]: publicKeyStr }
  try {
    // Generate ephemeral AES key
    const aesKey = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    // Encrypt text with AES
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(text);
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      encodedText
    );

    // Export AES key to wrap it for each recipient
    const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
    const wrappedKeys = {};

    for (const [userId, pubKeyStr] of Object.entries(recipientKeysMap)) {
      if (!pubKeyStr) continue;
      const pubKey = await importPublicKey(pubKeyStr);
      const wrapped = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        pubKey,
        exportedAesKey
      );
      wrappedKeys[userId] = btoa(String.fromCharCode(...new Uint8Array(wrapped)));
    }

    return JSON.stringify({
      wrappedKeys, // Map of userId -> wrappedKey
      iv: btoa(String.fromCharCode(...iv)),
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
    });
  } catch (err) {
    console.error("Clinical Encryption Failure:", err);
    throw new Error("Failed to secure multi-recipient manifold.");
  }
};

/**
 * Decrypts clinical content
 */
export const decryptMessage = async (encryptedDataStr, userId) => {
  try {
    const privateKey = await getPrivateKey(userId);
    if (!privateKey) throw new Error("Private Key Manifold Missing.");

    const data = JSON.parse(encryptedDataStr);
    
    // Identity Discovery within Multi-Wrap Manifold
    const wrappedKeyStr = data.wrappedKeys?.[userId] || data.wrappedKey; // Backward compatibility
    if (!wrappedKeyStr) throw new Error("Identity Mismatch: Key not wrapped for this participant.");

    const wrappedKey = Uint8Array.from(atob(wrappedKeyStr), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(data.iv), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(data.ciphertext), c => c.charCodeAt(0));

    // Unwrap AES key
    const aesKeyRaw = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      wrappedKey
    );

    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      aesKeyRaw,
      { name: "AES-GCM" },
      true,
      ["decrypt"]
    );

    // Decrypt text
    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      aesKey,
      ciphertext
    );

    return new TextDecoder().decode(decryptedContent);
  } catch (err) {
    console.error("Clinical Decryption Failure:", err);
    // Industrial-Grade Forensic Reporting
    return `[[ CRYPTO_ERR: ${err.message || 'Identity Handshake Failed'} ]]`;
  }
};

// --- Statutory Identity Escrow Handshake ---

/**
 * Derives a character-perfect AES key from a recovery phrase (PBKDF2)
 */
const deriveRecoveryKey = async (phrase, salt) => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(phrase),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

/**
 * Backs up the institutional identity to the server escrow
 */
export const backupIdentity = async (userId, recoveryPhrase) => {
  try {
    const privateKey = await getPrivateKey(userId);
    if (!privateKey) throw new Error("Private Key Manifold Missing.");

    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const aesKey = await deriveRecoveryKey(recoveryPhrase, salt);

    // Export RSA Private Key (PKCS#8)
    const exportedPrivateKey = await window.crypto.subtle.exportKey("pkcs8", privateKey);
    
    // Encrypt it
    const encryptedBlob = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      exportedPrivateKey
    );

    const payload = {
      encryptedPrivateKey: btoa(String.fromCharCode(...new Uint8Array(encryptedBlob))),
      salt: btoa(String.fromCharCode(...salt)),
      iv: btoa(String.fromCharCode(...iv))
    };

    const api = (await import('../api/axiosInstance')).default;
    await api.post('/auth/identity/backup', payload);
    return true;
  } catch (err) {
    console.error("Identity Backup Failure:", err);
    throw err;
  }
};

/**
 * Restores the institutional identity from the server escrow
 */
export const restoreIdentity = async (userId, recoveryPhrase) => {
  try {
    const api = (await import('../api/axiosInstance')).default;
    const res = await api.get('/auth/identity/restore');
    const { encryptedPrivateKey, salt, iv } = res.data.data.escrow;

    const saltArr = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
    const ivArr = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    const blobArr = Uint8Array.from(atob(encryptedPrivateKey), c => c.charCodeAt(0));

    const aesKey = await deriveRecoveryKey(recoveryPhrase, saltArr);

    // Decrypt the RSA Private Key
    const decryptedRaw = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivArr },
      aesKey,
      blobArr
    );

    // Import it back into the local manifold
    const privateKey = await window.crypto.subtle.importKey(
      "pkcs8",
      decryptedRaw,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["decrypt"]
    );

    const STORE_NAME = 'InternalKeys';
    const request = indexedDB.open('RoboMedCrypto', 1);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const putReq = tx.objectStore(STORE_NAME).put(privateKey, `${userId}_private`);
        putReq.onsuccess = () => resolve(true);
        putReq.onerror = () => reject(putReq.error);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Identity Restoration Failure:", err);
    throw new Error("Handshake Failed: Recovery phrase might be incorrect.");
  }
};
