// convert.ts
import bs58 from 'bs58';

// Replace this with your actual Phantom private key
const phantomPrivateKey = "";

// Convert to byte array
const byteArray = bs58.decode(phantomPrivateKey);
console.log(`[${Array.from(byteArray).join(',')}]`);