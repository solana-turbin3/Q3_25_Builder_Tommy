import wallet from "../turbin3-wallet.json"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"
import { readFile } from "fs/promises"

// Create a devnet connection
// const umi = createUmi('https://api.devnet.solana.com');
const umi = createUmi('https://solana-devnet.api.syndica.io/api-key/3nwfWkMbDcGpUrAFQYofpGgaKUK8LJAb3pZrvfmxm5UEZwsu7BYrkHytmK5BYttGtPh9cVw9EH665TstXvc6VoAMLdo8tpKsNVn');

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader({address: "https://devnet.irys.xyz/",}));
umi.use(signerIdentity(signer));

(async () => {
    try {

        const image = "https://copper-wooden-seahorse-493.mypinata.cloud/ipfs/bafkreic4xgbw6bbhl6s4a2wc2tfzs7a2ewhhflu4mzvafvylya2apv3eri";
        const myUri = image; 
        console.log("Your image URI: ", myUri);
    }
    catch(error) {
        console.log("Oops.. Something went wrong", error);
    }
})();
