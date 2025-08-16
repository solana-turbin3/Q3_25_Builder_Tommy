import { createSolanaRpcFromTransport } from "@solana/kit";
import { NOT_FOUND } from "./constants";

export const getLogsFactory = (rpc: ReturnType<typeof createSolanaRpcFromTransport>) => {
  /**
   * Retrieves logs for a transaction.
   * @param {string} signature - Transaction signature to get logs for
   * @returns {Promise<Array<string>>} Array of log messages from the transaction
   */
  const getLogs = async (signature: string): Promise<Array<string>> => {
    const transaction = await rpc
      .getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      })
      .send();

    if (!transaction?.meta) {
      throw new Error(`Transaction not found: ${signature}`);
    }

    return transaction.meta.logMessages ?? [];
  };
  return getLogs;
};

/**
 * Extracts a user-friendly error message from transaction logs.
 * @param logMessages Array of log messages from the transaction
 * @returns A formatted error message in the format "programAddress.instructionName: errorMessage" or null if no error found
 */
export const getErrorMessageFromLogs = (logMessages: Array<string>): string | null => {
  // First try to find an Anchor error
  // Pattern:
  // "Program <program> invoke [n]"
  // "Program log: Instruction: <instruction>"
  // "Program log: AnchorError caused by account: <account>. Error Code: <code>. Error Number: <number>. Error Message: <message>"
  const anchorErrorIndex = logMessages.findIndex((logMessage: string) =>
    logMessage.includes("Program log: AnchorError caused by account:"),
  );

  if (anchorErrorIndex !== NOT_FOUND) {
    // Get the program name from the invoke log (usually 2 lines before the error)
    const programInvokeLog = logMessages[anchorErrorIndex - 2];
    const programName = programInvokeLog?.split("Program ")[1]?.split(" invoke")[0];

    // Get the instruction name from the instruction log (usually 1 line before the error)
    const instructionHandlerLog = logMessages[anchorErrorIndex - 1];
    const instructionHandlerName = instructionHandlerLog?.split("Instruction: ")[1];

    // Get the error message from the Anchor error log
    const errorMessage = logMessages[anchorErrorIndex].split("Error Message: ")[1]?.split(".")[0]?.trim();

    if (!errorMessage || !programName || !instructionHandlerName) {
      return null;
    }

    return `${programName}.${instructionHandlerName}: ${errorMessage}`;
  }

  // If no Anchor error found, look for regular error
  // Pattern:
  // "Program <program> invoke [n]"
  // "Program log: Instruction: <instruction>"
  // "Program log: Error: <error>"
  const errorIndex = logMessages.findIndex((logMessage: string) => logMessage.includes("Program log: Error: "));

  if (errorIndex !== NOT_FOUND) {
    // Get the program name from the invoke log (usually 2 lines before the error)
    const programInvokeLog = logMessages[errorIndex - 2];
    const programName = programInvokeLog?.split("Program ")[1]?.split(" invoke")[0];

    // Get the instruction name from the instruction log (usually 1 line before the error)
    const instructionHandlerLog = logMessages[errorIndex - 1];
    const instructionHandlerName = instructionHandlerLog?.split("Instruction: ")[1];

    // Get the error message
    const errorMessage = logMessages[errorIndex].split("Program log: Error: ")[1]?.trim();

    if (!errorMessage || !programName || !instructionHandlerName) {
      return null;
    }

    return `${programName}.${instructionHandlerName}: ${errorMessage}`;
  }

  // If no regular error found, look for system program error
  // Pattern:
  // "Program <program> invoke [n]"
  // "<instruction>: <error>"
  const systemErrorIndex = logMessages.findIndex(
    (logMessage: string) =>
      logMessage.includes(": ") &&
      !logMessage.includes("Program log:") &&
      !logMessage.includes("Program ") &&
      !logMessage.includes(" consumed ") &&
      !logMessage.includes(" success") &&
      !logMessage.includes(" failed:"),
  );

  if (systemErrorIndex !== NOT_FOUND) {
    // Get the program name from the invoke log (usually 1 line before the error)
    const programInvokeLog = logMessages[systemErrorIndex - 1];
    const programName = programInvokeLog?.split("Program ")[1]?.split(" invoke")[0];

    // Get the instruction name and error message from the error log
    const [instructionName, ...errorParts] = logMessages[systemErrorIndex].split(": ");
    const errorMessage = errorParts.join(": ");

    if (!errorMessage || !programName || !instructionName) {
      return null;
    }

    // For system program errors, we want to keep the full error message
    // but remove the address details if present
    const cleanErrorMessage = errorMessage
      .replace(/Address {[^}]*}/, "")
      .replace(/\s+/g, " ")
      .trim();

    return `${programName}.${instructionName}: ${cleanErrorMessage}`;
  }

  return null;
};
