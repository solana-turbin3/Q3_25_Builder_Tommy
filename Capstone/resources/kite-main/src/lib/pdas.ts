import { Address, getAddressEncoder, getProgramDerivedAddress } from "@solana/kit";

const addressEncoder = getAddressEncoder();

// The web3.js c2 equivalent of
//    bigNumber.toArrayLike(Buffer, "le", 8),
// from web3.js v1
const bigIntToSeed = (bigInt: bigint, byteLength: number): Uint8Array => {
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength && bigInt > 0n; i++) {
    bytes[i] = Number(bigInt & 0xffn); // Get least significant byte
    bigInt >>= 8n; // Shift right by 8 bits
  }
  return bytes;
};

/**
 * Calculates a Program Derived Address (PDA) and its bump seed from a program address and seeds.
 * Handles encoding of different seed types:
 *   - Strings: encoded as UTF-8
 *   - Addresses: encoded using the address encoder
 *   - BigInts: encoded as 8-byte little-endian Uint8Array
 *   - Uint8Array: used as-is
 *
 * @param {Address} programAddress - The program address to derive the PDA from
 * @param {Array<String | Address | BigInt | Uint8Array>} seeds - Array of seeds to derive the PDA
 * @returns {Promise<{pda: Address, bump: number}>} The derived PDA and its bump seed
 */
export const getPDAAndBump = async (programAddress: Address, seeds: Array<String | Address | BigInt | Uint8Array>) => {
  const seedsUint8Array = seeds.map((seed) => {
    if (seed instanceof Uint8Array) {
      return seed; // Pass through unchanged
    }
    if (typeof seed === "bigint") {
      return bigIntToSeed(seed, 8);
    }

    // Try to encode as Address, if it fails treat as string
    // (since Address is an extension of String at runtime)
    try {
      const encoded = addressEncoder.encode(seed as Address);
      return encoded;
    } catch {
      return new TextEncoder().encode(seed as string);
    }
  });
  const [pda, bump] = await getProgramDerivedAddress({
    seeds: seedsUint8Array,
    programAddress,
  });
  return { pda, bump };
};
