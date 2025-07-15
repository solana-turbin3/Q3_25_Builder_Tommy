import { before, describe, test, it } from "node:test";
import assert from "node:assert";
import * as programClient from "../dist/js-client";
import { getOfferDecoder, OFFER_DISCRIMINATOR } from "../dist/js-client";
import { connect, Connection, TOKEN_EXTENSIONS_PROGRAM, ErrorWithTransaction } from "solana-kite";
import { type KeyPairSigner, type Address } from "@solana/kit";
import { createTestOffer, getRandomBigInt, ONE_SOL } from "./escrow.test-helpers";

const INSUFFICIENT_FUNDS_ERROR = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb.TransferChecked: insufficient funds";
const REFUND_OFFER_ERROR =
  "FJaGSGgyggHR6Rr1hdEzgWQ9Ysv8KyySSw3Jwq33Ydic.RefundOffer: The program expected this account to be already initialized";
const ACCOUNT_IN_USE_ERROR = "11111111111111111111111111111111.Allocate: account already in use";
const INVALID_TOKEN_MINT_ERROR = "custom program error: #6002";
const INVALID_AMOUNT_ERROR = "custom program error: #6003";

describe("Escrow", () => {
  let connection: Connection;
  let user: KeyPairSigner;
  let alice: KeyPairSigner;
  let bob: KeyPairSigner;
  let tokenMintA: Address;
  let tokenMintB: Address;
  let aliceTokenAccountA: Address;
  let bobTokenAccountA: Address;
  let aliceTokenAccountB: Address;

  const tokenDecimals = 9;

  // Both tokens have 9 decimals, so we can use this to convert between major and minor units
  const TOKEN = 10n ** BigInt(tokenDecimals);

  // Alice is going to make a few offers in these tests, so we give her 10 tokens
  const aliceInitialTokenAAmount = 10n * TOKEN;
  // We have a test later where Bob tries to reuse Alice's offer ID, so we give him a tiny amount (1 minor unit) of token A
  const bobInitialTokenAAmount = 1n;
  // Bob has 1 token of token B he will offer in exchange
  const bobInitialTokenBAmount = 1n * TOKEN;

  // Alice will offer 1 token of token A in exchange for 1 token of token B
  const tokenAOfferedAmount = 1n * TOKEN;
  const tokenBWantedAmount = 1n * TOKEN;

  before(async () => {
    connection = await connect();

    // 'user' will be the account we use to create the token mints
    [user, alice, bob] = await connection.createWallets(3, { airdropAmount: ONE_SOL });

    // Create two token mints - the factories that create token A, and token B
    tokenMintA = await connection.createTokenMint({
      mintAuthority: user,
      decimals: tokenDecimals,
      name: "Token A",
      symbol: "TOKEN_A",
      uri: "https://example.com/token-a",
      additionalMetadata: {
        keyOne: "valueOne",
        keyTwo: "valueTwo",
      },
    });

    tokenMintB = await connection.createTokenMint({
      mintAuthority: user,
      decimals: tokenDecimals,
      name: "Token B",
      symbol: "TOKEN_B",
      uri: "https://example.com/token-b",
      additionalMetadata: {
        keyOne: "valueOne",
        keyTwo: "valueTwo",
      },
    });

    // Mint tokens to alice and bob
    await connection.mintTokens(tokenMintA, user, aliceInitialTokenAAmount, alice.address);
    await connection.mintTokens(tokenMintA, user, bobInitialTokenAAmount, bob.address);
    await connection.mintTokens(tokenMintB, user, bobInitialTokenBAmount, bob.address);

    // Get the token accounts for alice and bob
    aliceTokenAccountA = await connection.getTokenAccountAddress(alice.address, tokenMintA, true);
    bobTokenAccountA = await connection.getTokenAccountAddress(bob.address, tokenMintA, true);
    aliceTokenAccountB = await connection.getTokenAccountAddress(alice.address, tokenMintB, true);
  });

  describe("makeOffer", () => {
    test("successfully creates an offer with valid inputs", async () => {
      const { offer, vault } = await createTestOffer({
        connection,
        maker: alice,
        tokenMintA,
        tokenMintB,
        makerTokenAccountA: aliceTokenAccountA,
        tokenAOfferedAmount,
        tokenBWantedAmount,
      });

      // Verify the offer was created successfully by checking the vault balance
      const vaultBalanceResponse = await connection.getTokenAccountBalance({
        tokenAccount: vault,
        mint: tokenMintA,
        useTokenExtensions: true,
      });
      assert.equal(vaultBalanceResponse.amount, tokenAOfferedAmount, "Vault balance should match offered amount");
    });

    test("succeeds when different makers use the same offer ID", async () => {
      // First, create an offer with Alice using a specific offer ID
      const offerId = getRandomBigInt();
      await createTestOffer({
        connection,
        maker: alice,
        tokenMintA,
        tokenMintB,
        makerTokenAccountA: aliceTokenAccountA,
        tokenAOfferedAmount,
        tokenBWantedAmount,
        offerId,
      });

      // Now create another offer with Bob using the same offer ID
      // This should succeed because different makers can use the same offer ID

      // Create bobTokenAccountA if it doesn't exist
      bobTokenAccountA = await connection.getTokenAccountAddress(bob.address, tokenMintA, true);

      const testOffer = await createTestOffer({
        connection,
        maker: bob,
        tokenMintA,
        tokenMintB,
        makerTokenAccountA: bobTokenAccountA,
        tokenAOfferedAmount: bobInitialTokenAAmount,
        tokenBWantedAmount,
        offerId, // Reusing the same offer ID - this should work!
      });

      // Verify Bob's offer was created successfully by checking the vault balance
      const vaultBalanceResponse = await connection.getTokenAccountBalance({
        tokenAccount: testOffer.vault,
        mint: tokenMintA,
        useTokenExtensions: true,
      });
      assert.equal(vaultBalanceResponse.amount, bobInitialTokenAAmount, "Bob's vault balance should match offered amount");
    });

    test("fails when maker has insufficient token balance", async () => {
      const tooManyTokens = 1_000n * TOKEN;

      try {
        await createTestOffer({
          connection,
          maker: alice,
          tokenMintA,
          tokenMintB,
          makerTokenAccountA: aliceTokenAccountA,
          tokenAOfferedAmount: tooManyTokens,
          tokenBWantedAmount,
        });
        assert.fail("Expected the offer creation to fail but it succeeded");
      } catch (thrownObject) {
        const error = thrownObject as ErrorWithTransaction;
        assert(
          error.message === INSUFFICIENT_FUNDS_ERROR,
          `Expected "${INSUFFICIENT_FUNDS_ERROR}" but got: ${error.message}`,
        );
      }
    });

    test("fails when token mints are the same", async () => {
      try {
        await createTestOffer({
          connection,
          maker: alice,
          tokenMintA,
          tokenMintB: tokenMintA, // Using same mint
          makerTokenAccountA: aliceTokenAccountA,
          tokenAOfferedAmount,
          tokenBWantedAmount,
        });
        assert.fail("Expected the offer creation to fail but it succeeded");
      } catch (thrownObject) {
        const error = thrownObject as ErrorWithTransaction;
        assert(
          error.message.includes(INVALID_TOKEN_MINT_ERROR),
          `Expected InvalidTokenMint error but got: ${error.message}`,
        );
      }
    });

    test("fails when token_b_wanted_amount is zero", async () => {
      try {
        await createTestOffer({
          connection,
          maker: alice,
          tokenMintA,
          tokenMintB,
          makerTokenAccountA: aliceTokenAccountA,
          tokenAOfferedAmount,
          tokenBWantedAmount: 0n,
        });
        assert.fail("Expected the offer creation to fail but it succeeded");
      } catch (thrownObject) {
        const error = thrownObject as ErrorWithTransaction;
        assert(error.message.includes(INVALID_AMOUNT_ERROR), `Expected InvalidAmount error but got: ${error.message}`);
      }
    });

    test("fails when token_a_offered_amount is zero", async () => {
      try {
        await createTestOffer({
          connection,
          maker: alice,
          tokenMintA,
          tokenMintB,
          makerTokenAccountA: aliceTokenAccountA,
          tokenAOfferedAmount: 0n,
          tokenBWantedAmount,
        });
        assert.fail("Expected the offer creation to fail but it succeeded");
      } catch (thrownObject) {
        const error = thrownObject as ErrorWithTransaction;
        assert(error.message.includes(INVALID_AMOUNT_ERROR), `Expected InvalidAmount error but got: ${error.message}`);
      }
    });
  });

  describe("can get all the offers", () => {
    test("successfully gets all the offers", async () => {
      const getOffers = connection.getAccountsFactory(
        programClient.ESCROW_PROGRAM_ADDRESS,
        OFFER_DISCRIMINATOR,
        getOfferDecoder(),
      );

      const offers = await getOffers();

      assert.ok(offers.length === 3, "Expected to get three offers");

      // Verify all offers exist and have valid data
      offers.forEach((offer, index) => {
        assert.ok(offer.exists, `Offer ${index + 1} account should exist`);
        if (offer.exists) {
          // Check that maker is either Alice or Bob
          assert.ok(
            offer.data.maker === alice.address || offer.data.maker === bob.address,
            `Offer ${index + 1} maker should be Alice or Bob`
          );
          assert.equal(offer.data.tokenMintA, tokenMintA, `Offer ${index + 1} tokenMintA should match`);
          assert.equal(offer.data.tokenMintB, tokenMintB, `Offer ${index + 1} tokenMintB should match`);
          assert.ok(typeof offer.data.bump === "number", `Offer ${index + 1} bump should be a number`);
          assert.ok(offer.data.discriminator, `Offer ${index + 1} discriminator should exist`);
        }
      });

      // The three offers are:
      // 1. Alice's offer from 'successfully creates an offer with valid inputs' test
      // 2. Alice's offer from 'succeeds when different makers use the same offer ID' test
      // 3. Bob's offer from 'succeeds when different makers use the same offer ID' test
    });
  });

  describe("takeOffer", () => {
    let testOffer: Address;
    let testVault: Address;
    let testOfferId: bigint;

    before(async () => {
      const result = await createTestOffer({
        connection,
        maker: alice,
        tokenMintA,
        tokenMintB,
        makerTokenAccountA: aliceTokenAccountA,
        tokenAOfferedAmount,
        tokenBWantedAmount,
      });
      testOffer = result.offer;
      testVault = result.vault;
      testOfferId = result.offerId;
    });

    test("successfully takes an offer", async () => {
      const takeOfferInstruction = await programClient.getTakeOfferInstructionAsync({
        taker: bob,
        maker: alice.address,
        tokenMintA,
        tokenMintB,
        takerTokenAccountA: bobTokenAccountA,
        makerTokenAccountB: aliceTokenAccountB,
        offerDetails: testOffer,
        vault: testVault,
        tokenProgram: TOKEN_EXTENSIONS_PROGRAM,
        id: testOfferId,
      });

      await connection.sendTransactionFromInstructions({
        feePayer: alice,
        instructions: [takeOfferInstruction],
      });

      // Verify token transfers
      const bobTokenABalance = await connection.getTokenAccountBalance({
        tokenAccount: bobTokenAccountA,
        mint: tokenMintA,
        useTokenExtensions: true,
      });
      assert.equal(
        bobTokenABalance.amount,
        tokenAOfferedAmount,
        "Bob's token A balance should be the offered amount (his initial was consumed in earlier test)",
      );

      const aliceTokenBBalance = await connection.getTokenAccountBalance({
        tokenAccount: aliceTokenAccountB,
        mint: tokenMintB,
        useTokenExtensions: true,
      });
      assert.equal(aliceTokenBBalance.amount, tokenBWantedAmount, "Alice's token B balance should match wanted amount");
    });

    test("fails when taker has insufficient token balance", async () => {
      // Create an offer from Alice for a large amount of token B
      const largeTokenBAmount = 1000n * TOKEN; // Much larger than Bob's balance
      const { offer, vault, offerId } = await createTestOffer({
        connection,
        maker: alice,
        tokenMintA,
        tokenMintB,
        makerTokenAccountA: aliceTokenAccountA,
        tokenAOfferedAmount,
        tokenBWantedAmount: largeTokenBAmount,
      });

      const takeOfferInstruction = await programClient.getTakeOfferInstructionAsync({
        taker: bob,
        maker: alice.address,
        tokenMintA,
        tokenMintB,
        takerTokenAccountA: bobTokenAccountA,
        makerTokenAccountB: aliceTokenAccountB,
        offerDetails: offer,
        vault,
        tokenProgram: TOKEN_EXTENSIONS_PROGRAM,
        id: offerId,
      });

      try {
        await connection.sendTransactionFromInstructions({
          feePayer: bob,
          instructions: [takeOfferInstruction],
        });
        assert.fail("Expected the take offer to fail but it succeeded");
      } catch (thrownObject) {
        const error = thrownObject as ErrorWithTransaction;
        assert(
          error.message === INSUFFICIENT_FUNDS_ERROR,
          `Expected "${INSUFFICIENT_FUNDS_ERROR}" but got: ${error.message}`,
        );
      }
    });
  });

  describe("refundOffer", () => {
    let testOffer: Address;
    let testVault: Address;
    let testOfferId: bigint;

    before(async () => {
      const result = await createTestOffer({
        connection,
        maker: alice,
        tokenMintA,
        tokenMintB,
        makerTokenAccountA: aliceTokenAccountA,
        tokenAOfferedAmount,
        tokenBWantedAmount,
      });
      testOffer = result.offer;
      testVault = result.vault;
      testOfferId = result.offerId;
    });

    test("successfully refunds an offer to the maker", async () => {
      const aliceBalanceBefore = await connection.getTokenAccountBalance({
        tokenAccount: aliceTokenAccountA,
        mint: tokenMintA,
        useTokenExtensions: true,
      });

      const refundOfferInstruction = await programClient.getRefundOfferInstructionAsync({
        maker: alice,
        tokenMintA,
        makerTokenAccountA: aliceTokenAccountA,
        offer: testOffer,
        vault: testVault,
        tokenProgram: TOKEN_EXTENSIONS_PROGRAM,
        id: testOfferId,
      });

      await connection.sendTransactionFromInstructions({
        feePayer: alice,
        instructions: [refundOfferInstruction],
      });

      // Verify refund
      const aliceBalanceAfter = await connection.getTokenAccountBalance({
        tokenAccount: aliceTokenAccountA,
        mint: tokenMintA,
        useTokenExtensions: true,
      });
      assert.ok(
        aliceBalanceAfter.amount > aliceBalanceBefore.amount,
        "Balance after refund should be greater than before",
      );

      // Verify vault is closed
      const isClosed = await connection.checkTokenAccountIsClosed({
        tokenAccount: testVault,
        useTokenExtensions: true,
      });
      assert.ok(isClosed, "Vault should be closed");
    });

    test("fails when non-maker tries to refund the offer", async () => {
      const { offer, vault, offerId } = await createTestOffer({
        connection,
        maker: alice,
        tokenMintA,
        tokenMintB,
        makerTokenAccountA: aliceTokenAccountA,
        tokenAOfferedAmount,
        tokenBWantedAmount,
      });

      const refundOfferInstruction = await programClient.getRefundOfferInstructionAsync({
        maker: bob,  // Bob pretending to be the maker
        tokenMintA,
        makerTokenAccountA: bobTokenAccountA,  // Bob's token account
        offer,  // But this is Alice's offer PDA
        vault,  // And this is Alice's vault
        tokenProgram: TOKEN_EXTENSIONS_PROGRAM,
        id: offerId,
      });

      try {
        await connection.sendTransactionFromInstructions({
          feePayer: bob,
          instructions: [refundOfferInstruction],
        });
        assert.fail("Expected the refund to fail but it succeeded");
      } catch (thrownObject) {
        const error = thrownObject as ErrorWithTransaction;
        assert.equal(error.message, REFUND_OFFER_ERROR, "Expected refund offer error");
      }
    });
  });
});