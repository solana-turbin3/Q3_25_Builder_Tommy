import { connect } from "solana-kite";

const connection = connect();
const mintAuthority = await connection.createWallet();
const mintAddress = await connection.makeTokenMint(
  mintAuthority,
  6,
  "OPOS",
  "OPOS",
  "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
  {
    description: "Only Possible On Solana",
  },
);

console.log(connection.getExplorerLink("address", mintAddress));
