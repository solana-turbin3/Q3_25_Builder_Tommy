import { describe, test } from "node:test";
import assert from "node:assert";
import { getErrorMessageFromLogs } from "../lib/logs";

describe("getErrorMessageFromLogs", () => {
  test("extracts error message with program and instruction name", () => {
    const logMessages = [
      "Program 8jR5GeNzeweq35Uo84kGP3v1NcBaZWH5u62k7PxN4T2y invoke [1]",
      "Program log: Instruction: MakeOffer",
      "Program 11111111111111111111111111111111 invoke [2]",
      "Program 11111111111111111111111111111111 success",
      "Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL invoke [2]",
      "Program log: Create",
      "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb invoke [3]",
      "Program log: Instruction: GetAccountDataSize",
      "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb consumed 1389 of 161234 compute units",
      "Program return: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb qgAAAAAAAAA=",
      "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb success",
      "Program 11111111111111111111111111111111 invoke [3]",
      "Program 11111111111111111111111111111111 success",
      "Program log: Initialize the associated token account",
      "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb invoke [3]",
      "Program log: Instruction: InitializeImmutableOwner",
      "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb consumed 487 of 154915 compute units",
      "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb success",
      "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb invoke [3]",
      "Program log: Instruction: InitializeAccount3",
      "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb consumed 2125 of 152038 compute units",
      "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb success",
      "Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL consumed 23013 of 172622 compute units",
      "Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL success",
      "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb invoke [2]",
      "Program log: Instruction: TransferChecked",
      "Program log: Error: insufficient funds",
      "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb consumed 1102 of 142491 compute units",
      "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb failed: custom program error: 0x1",
      "Program 8jR5GeNzeweq35Uo84kGP3v1NcBaZWH5u62k7PxN4T2y consumed 58611 of 200000 compute units",
      "Program 8jR5GeNzeweq35Uo84kGP3v1NcBaZWH5u62k7PxN4T2y failed: custom program error: 0x1",
    ];

    const errorMessage = getErrorMessageFromLogs(logMessages);
    assert.equal(errorMessage, "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb.TransferChecked: insufficient funds");
  });

  test("returns null when no error message found", () => {
    const logMessages = [
      "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb invoke [2]",
      "Program log: Instruction: TransferChecked",
    ];

    const errorMessage = getErrorMessageFromLogs(logMessages);
    assert.equal(errorMessage, null);
  });

  test("returns null when program invoke log is missing", () => {
    const logMessages = ["Program log: Instruction: TransferChecked", "Program log: Error: insufficient funds"];

    const errorMessage = getErrorMessageFromLogs(logMessages);
    assert.equal(errorMessage, null);
  });

  test("returns null when instruction log is missing", () => {
    const logMessages = [
      "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb invoke [2]",
      "Program log: Error: insufficient funds",
    ];

    const errorMessage = getErrorMessageFromLogs(logMessages);
    assert.equal(errorMessage, null);
  });

  test("extracts Anchor error message with program and instruction name", () => {
    const logMessages = [
      "Program 8jR5GeNzeweq35Uo84kGP3v1NcBaZWH5u62k7PxN4T2y invoke [1]",
      "Program log: Instruction: RefundOffer",
      "Program log: AnchorError caused by account: offer. Error Code: ConstraintHasOne. Error Number: 2001. Error Message: A has one constraint was violated.",
      "Program log: Left:",
      "Program log: 8AtymagduEcKX2jsos2M8Zm2fh3fcwUoKVavtbZy6BuA",
      "Program log: Right:",
      "Program log: 6boYThNJPGwuPXWqypTvpimgQRYCVYMSesXNdpdbGK8B",
      "Program 8jR5GeNzeweq35Uo84kGP3v1NcBaZWH5u62k7PxN4T2y consumed 12645 of 200000 compute units",
      "Program 8jR5GeNzeweq35Uo84kGP3v1NcBaZWH5u62k7PxN4T2y failed: custom program error: 0x7d1",
    ];

    const errorMessage = getErrorMessageFromLogs(logMessages);
    assert.equal(
      errorMessage,
      "8jR5GeNzeweq35Uo84kGP3v1NcBaZWH5u62k7PxN4T2y.RefundOffer: A has one constraint was violated",
    );
  });

  test("extracts system program error message with program and instruction name", () => {
    const logMessages = [
      "Program 8jR5GeNzeweq35Uo84kGP3v1NcBaZWH5u62k7PxN4T2y invoke [1]",
      "Program log: Instruction: MakeOffer",
      "Program 11111111111111111111111111111111 invoke [2]",
      "Allocate: account Address { address: BiyVmyr8KEdrmmVDGsC6r1xQL2sinTtiEhjZhoFaHJbA, base: None } already in use",
      "Program 11111111111111111111111111111111 failed: custom program error: 0x0",
      "Program 8jR5GeNzeweq35Uo84kGP3v1NcBaZWH5u62k7PxN4T2y consumed 11747 of 200000 compute units",
      "Program 8jR5GeNzeweq35Uo84kGP3v1NcBaZWH5u62k7PxN4T2y failed: custom program error: 0x0",
    ];

    const errorMessage = getErrorMessageFromLogs(logMessages);
    assert.equal(errorMessage, "11111111111111111111111111111111.Allocate: account already in use");
  });
});
