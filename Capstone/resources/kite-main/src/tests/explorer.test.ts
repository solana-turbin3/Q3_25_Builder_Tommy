import { before, describe, test } from "node:test";
import assert from "node:assert";
import { connect } from "..";

describe("getExplorerLink", () => {
  test("getExplorerLink works for a block on mainnet", () => {
    const { getExplorerLink } = connect("mainnet-beta");
    const link = getExplorerLink("block", "242233124");
    assert.equal(link, "https://explorer.solana.com/block/242233124");
  });

  test("getExplorerLink works for an address using helius-mainnet", () => {
    // This is a fake API key, don't use it
    // But this works, and you can test it yourself
    // by visiting the URL and replacing the API key with a real one
    const FAKE_API_KEY = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
    process.env.HELIUS_API_KEY = FAKE_API_KEY;
    const { getExplorerLink } = connect("helius-mainnet");
    const link = getExplorerLink("address", "11111111111111111111111111111111");

    assert.equal(
      link,
      `https://explorer.solana.com/address/11111111111111111111111111111111?cluster=custom&customUrl=https%3A%2F%2Fmainnet.helius-rpc.com%2F%3Fapi-key%3D${FAKE_API_KEY}`,
    );
  });

  test("getExplorerLink works for an address on localnet when no network is supplied", () => {
    const { getExplorerLink } = connect();
    const link = getExplorerLink("address", "11111111111111111111111111111111");
    assert.equal(link, "https://explorer.solana.com/address/11111111111111111111111111111111?cluster=custom");
  });

  test("getExplorerLink works for an address on mainnet-beta", () => {
    const { getExplorerLink } = connect("mainnet-beta");
    const link = getExplorerLink("address", "dDCQNnDmNbFVi8cQhKAgXhyhXeJ625tvwsunRyRc7c8");
    assert.equal(link, "https://explorer.solana.com/address/dDCQNnDmNbFVi8cQhKAgXhyhXeJ625tvwsunRyRc7c8");
  });

  test("getExplorerLink works for an address on devnet", () => {
    const { getExplorerLink } = connect("devnet");
    const link = getExplorerLink("address", "dDCQNnDmNbFVi8cQhKAgXhyhXeJ625tvwsunRyRc7c8");
    assert.equal(
      link,
      "https://explorer.solana.com/address/dDCQNnDmNbFVi8cQhKAgXhyhXeJ625tvwsunRyRc7c8?cluster=devnet",
    );
  });

  test("getExplorerLink works for a transaction on mainnet-beta", () => {
    const { getExplorerLink } = connect("mainnet-beta");
    const link = getExplorerLink(
      "transaction",
      "4nzNU7YxPtPsVzeg16oaZvLz4jMPtbAzavDfEFmemHNv93iYXKKYAaqBJzFCwEVxiULqTYYrbjPwQnA1d9ZCTELg",
    );
    assert.equal(
      link,
      "https://explorer.solana.com/tx/4nzNU7YxPtPsVzeg16oaZvLz4jMPtbAzavDfEFmemHNv93iYXKKYAaqBJzFCwEVxiULqTYYrbjPwQnA1d9ZCTELg",
    );
  });

  test("getExplorerLink works for a block on mainnet-beta", () => {
    const { getExplorerLink } = connect("mainnet-beta");
    const link = getExplorerLink("block", "241889720");
    assert.equal(link, "https://explorer.solana.com/block/241889720");
  });

  test("getExplorerLink provides a localnet URL", () => {
    const { getExplorerLink } = connect("localnet");
    const link = getExplorerLink(
      "tx",
      "2QC8BkDVZgaPHUXG9HuPw7aE5d6kN5DTRXLe2inT1NzurkYTCFhraSEo883CPNe18BZ2peJC1x1nojZ5Jmhs94pL",
    );
    assert.equal(
      link,
      "https://explorer.solana.com/tx/2QC8BkDVZgaPHUXG9HuPw7aE5d6kN5DTRXLe2inT1NzurkYTCFhraSEo883CPNe18BZ2peJC1x1nojZ5Jmhs94pL?cluster=custom",
    );
  });
});
