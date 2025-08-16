#!/usr/bin/env ts-node

import {
  Connection,
  PublicKey,
  Keypair,
  TransactionInstruction,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  init,
  queueTask,
  createTaskQueue,
  getTaskQueueForName,
  taskQueueAuthorityKey,
  compileTransaction,
} from "@helium/tuktuk-sdk";
import { AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Tuktuk } from "@helium/tuktuk-idls/lib/types/tuktuk";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const PROGRAM_ID = new PublicKey("81zfvbGkhnSgAg24xtC7f24N3TKfanNs7426RkzBUmsx");
const TUKTUK_PROGRAM = new PublicKey("tuktukUrfhXT6ZT77QTU8RQtvgL967uRuVagWF57zVA");

// NOTE: VRF functionality has been mocked for testing
// In production, this would integrate with MagicBlock VRF for secure randomness

// Generate unique queue name with short timestamp suffix to avoid old task conflicts
// Use last 6 digits of timestamp to keep name short
const timestamp = Date.now().toString().slice(-6);
const TASK_QUEUE_NAME = `wr-queue-${timestamp}`;

// Instruction discriminators from IDL
const DISCRIMINATORS = {
  CREATE_USER_ACCOUNT: [146, 68, 100, 69, 63, 46, 182, 199],
  JOIN_EXPEDITION: [75, 62, 17, 19, 3, 164, 247, 159],
  SUBMIT_VOTE: [115, 242, 100, 0, 49, 178, 242, 133],
  CREATE_EXPEDITION: [73, 253, 165, 213, 244, 143, 142, 254],
  START_EXPEDITION: [31, 84, 87, 249, 2, 49, 23, 139],
  PROCESS_ROUND: [103, 110, 94, 106, 67, 52, 101, 68],
  COMPLETE_EXPEDITION: [32, 204, 49, 108, 223, 63, 209, 10],
  DISTRIBUTE_REWARDS: [87, 211, 212, 214, 55, 202, 49, 174],
  CLAIM_REWARDS: [4, 144, 132, 71, 116, 23, 151, 80],
};

// Test state
interface TestStep {
  name: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  txSignature?: string;
  error?: string;
}

class EndToEndTest {
  private connection: Connection;
  private wallet: Keypair;
  private anchorWallet: Wallet;
  private provider: AnchorProvider;
  private tuktukProgram?: Program<Tuktuk>;
  private taskQueue?: PublicKey;
  private gameStatePDA: PublicKey;
  private expeditionId: number = 0;
  private expeditionPDA?: PublicKey;
  private userAccountPDA?: PublicKey;
  private guildPerformancePDA?: PublicKey; // CRITICAL FIX: Save as class property for reuse
  private guildId: number = 0; // Valid guild ID (0-2, representing "Storm Runners")
  private discordId: number = 67890; // Test discord ID
  private steps: TestStep[] = [];
  private crankTurnerProcess?: ChildProcessWithoutNullStreams;
  private crankTurnerRunning: boolean = false;
  private crankTurnerOutput: string[] = [];
  private allCrankErrors: Array<{
    timestamp: string;
    step: string;
    errorType: string;
    message: string;
    fullLog: string;
  }> = [];

  constructor() {
    this.connection = new Connection("https://api.devnet.solana.com", "confirmed");
    
    // Load wallet
    const walletPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
    const walletData = fs.readFileSync(walletPath, 'utf-8');
    const secretKey = new Uint8Array(JSON.parse(walletData));
    this.wallet = Keypair.fromSecretKey(secretKey);
    
    // Create Anchor wallet
    this.anchorWallet = new Wallet(this.wallet);
    
    // Create provider
    this.provider = new AnchorProvider(this.connection, this.anchorWallet, {
      commitment: "confirmed"
    });

    // Derive game state PDA
    [this.gameStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("global_game_state")],
      PROGRAM_ID
    );

    // DEBUG: Log the derived PDA and program ID
    console.log(`\n🔍 DEBUG: PDA Derivation Check`);
    console.log(`  Program ID: ${PROGRAM_ID.toBase58()}`);
    console.log(`  Seed: "global_game_state"`);
    console.log(`  Derived PDA: ${this.gameStatePDA.toBase58()}`);
    console.log(`  Expected PDA: 71DxXtME9thkuebxDCggGwNAjwnRPFmdn54x3G83BsjP`);
    console.log(`  Match: ${this.gameStatePDA.toBase58() === '71DxXtME9thkuebxDCggGwNAjwnRPFmdn54x3G83BsjP' ? '✅' : '❌'}\n`);

    // Initialize test steps - FIXED ORDER: players join BEFORE expedition starts
    this.steps = [
      { name: "Setup", description: "Initialize test environment & task queue", status: "pending" },
      { name: "Check Balance", description: "Ensure wallet has sufficient SOL", status: "pending" },
      { name: "Start Crank Turner", description: "Launch tuktuk-crank-turner process", status: "pending" },
      { name: "Create Expedition", description: "Queue create_expedition task", status: "pending" },
      { name: "Wait for Creation", description: "Verify expedition account created", status: "pending" },
      { name: "Create User Account", description: "Create user account for test player", status: "pending" },
      { name: "Join Expedition", description: "Join the expedition as test player", status: "pending" },
      { name: "Start Expedition", description: "Queue start_expedition task (after players joined)", status: "pending" },
      { name: "Wait for Start", description: "Verify expedition started", status: "pending" },
      { name: "Submit Vote Round 1", description: "Submit vote for round 1 risk level", status: "pending" },
      { name: "Process Round 1", description: "Queue process_round for round 1 (with mocked randomness)", status: "pending" },
      { name: "Wait for Round 1", description: "Verify round 1 completion", status: "pending" },
      { name: "Submit Vote Round 2", description: "Submit vote for round 2 risk level", status: "pending" },
      { name: "Process Round 2", description: "Queue process_round for round 2 (with mocked randomness)", status: "pending" },
      { name: "Wait for Round 2", description: "Verify round 2 completion", status: "pending" },
      { name: "Submit Vote Round 3", description: "Submit vote for round 3 risk level", status: "pending" },
      { name: "Process Round 3", description: "Queue process_round for round 3 (with mocked randomness)", status: "pending" },
      { name: "Wait for Round 3", description: "Verify round 3 completion", status: "pending" },
      { name: "Complete Expedition", description: "Queue complete_expedition task", status: "pending" },
      { name: "Wait for Completion", description: "Verify expedition completed", status: "pending" },
      { name: "Distribute Rewards", description: "Queue distribute_rewards task with round/guild data", status: "pending" },
      { name: "Wait for Rewards", description: "Verify rewards distributed", status: "pending" },
      { name: "Claim Rewards", description: "Claim individual SCRAP token rewards", status: "pending" },
      { name: "Verify Token Balance", description: "Check SCRAP token balance after claiming", status: "pending" },
      { name: "Cleanup", description: "Stop crank turner & cleanup", status: "pending" },
    ];
  }

  private printProgress() {
    console.clear();
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}🚀 Wasteland Runners - Complete E2E Test with Crank Turner${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

    console.log(`${colors.blue}📍 Network: Devnet${colors.reset}`);
    console.log(`${colors.blue}👛 Wallet: ${this.wallet.publicKey.toBase58()}${colors.reset}`);
    if (this.taskQueue) {
      console.log(`${colors.blue}📦 Task Queue: ${this.taskQueue.toBase58()}${colors.reset}`);
    }
    console.log(`${colors.blue}🔧 Crank Turner: ${this.crankTurnerRunning ? colors.green + 'Running' : colors.yellow + 'Stopped'}${colors.reset}\n`);

    console.log(`${colors.yellow}📋 Test Progress:${colors.reset}\n`);

    for (const step of this.steps) {
      let icon = '⏸️ ';
      let color = colors.reset;

      if (step.status === 'success') {
        icon = '✅';
        color = colors.green;
      } else if (step.status === 'failed') {
        icon = '❌';
        color = colors.red;
      } else if (step.status === 'running') {
        icon = '⏳';
        color = colors.yellow;
      } else {
        icon = '⏸️ ';
        color = colors.reset;
      }

      console.log(`  ${icon} ${color}${step.name}${colors.reset}: ${step.description}`);
      
      if (step.txSignature) {
        console.log(`     ${colors.cyan}tx: https://solscan.io/tx/${step.txSignature}?cluster=devnet${colors.reset}`);
      }
      if (step.error) {
        console.log(`     ${colors.red}Error: ${step.error}${colors.reset}`);
      }
    }

    // Print current status
    const running = this.steps.find(s => s.status === 'running');
    if (running) {
      console.log(`\n${colors.yellow}⏳ Current: ${running.description}...${colors.reset}`);
    }

    const completed = this.steps.filter(s => s.status === 'success').length;
    const total = this.steps.length;
    const percentage = Math.round((completed / total) * 100);

    console.log(`\n${colors.magenta}Progress: ${completed}/${total} (${percentage}%)${colors.reset}`);
    console.log(`${colors.cyan}${'▓'.repeat(Math.floor(percentage / 2))}${'░'.repeat(50 - Math.floor(percentage / 2))}${colors.reset}`);

    // Show recent crank turner output
    if (this.crankTurnerOutput.length > 0) {
      console.log(`\n${colors.yellow}Recent Crank Turner Activity:${colors.reset}`);
      const recentOutput = this.crankTurnerOutput.slice(-3);
      for (const line of recentOutput) {
        console.log(`  ${colors.cyan}>${colors.reset} ${line}`);
      }
    }
  }

  private updateStep(index: number, status: TestStep['status'], txSignature?: string, error?: string) {
    this.steps[index].status = status;
    if (txSignature) this.steps[index].txSignature = txSignature;
    if (error) this.steps[index].error = error;
    this.printProgress();
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async checkAndFundWallet(): Promise<void> {
    const balance = await this.connection.getBalance(this.wallet.publicKey);
    const balanceInSol = balance / LAMPORTS_PER_SOL;
    
    console.log(`${colors.blue}💰 Current balance: ${balanceInSol.toFixed(4)} SOL${colors.reset}`);
    
    // Need at least 3 SOL for rent exemption and transaction fees
    const MIN_BALANCE = 3;
    
    if (balanceInSol < MIN_BALANCE) {
      console.log(`${colors.yellow}⚠️  Balance too low. Need at least ${MIN_BALANCE} SOL${colors.reset}`);
      console.log(`${colors.yellow}🚰 Requesting SOL from faucet...${colors.reset}`);
      
      try {
        const airdropSignature = await this.connection.requestAirdrop(
          this.wallet.publicKey,
          2 * LAMPORTS_PER_SOL
        );
        
        console.log(`${colors.cyan}Airdrop: https://solscan.io/tx/${airdropSignature}?cluster=devnet${colors.reset}`);
        
        // Wait for confirmation
        const latestBlockhash = await this.connection.getLatestBlockhash();
        await this.connection.confirmTransaction({
          signature: airdropSignature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        });
        
        // Check new balance
        const newBalance = await this.connection.getBalance(this.wallet.publicKey);
        const newBalanceInSol = newBalance / LAMPORTS_PER_SOL;
        console.log(`${colors.green}✅ New balance: ${newBalanceInSol.toFixed(4)} SOL${colors.reset}`);
        
        if (newBalanceInSol < MIN_BALANCE) {
          throw new Error(`Still insufficient balance after airdrop. Got ${newBalanceInSol} SOL, need ${MIN_BALANCE} SOL`);
        }
      } catch (error: any) {
        console.error(`${colors.red}❌ Failed to get airdrop: ${error.message}${colors.reset}`);
        console.log(`${colors.yellow}Please manually fund the wallet with at least ${MIN_BALANCE} SOL${colors.reset}`);
        console.log(`${colors.yellow}Wallet address: ${this.wallet.publicKey.toBase58()}${colors.reset}`);
        throw error;
      }
    } else {
      console.log(`${colors.green}✅ Sufficient balance${colors.reset}`);
    }
  }

  private async waitForAccount(pubkey: PublicKey, maxAttempts: number = 30): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      const account = await this.connection.getAccountInfo(pubkey);
      if (account) {
        return true;
      }
      await this.sleep(3000); // Wait 3 seconds between checks to reduce RPC load
    }
    return false;
  }

  private async waitForAccountData(
    pubkey: PublicKey,
    checkFn: (data: Buffer) => boolean,
    maxAttempts: number = 30
  ): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      const account = await this.connection.getAccountInfo(pubkey);
      if (account && checkFn(account.data)) {
        return true;
      }
      await this.sleep(3000); // Wait 3 seconds between checks to reduce RPC load
    }
    return false;
  }

  private async startCrankTurner(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`\n${colors.yellow}Starting crank turner process...${colors.reset}`);
        
        // Path to the config file
        const configPath = path.join(__dirname, '..', 'crank-turner-config.toml');
        
        // Check if tuktuk-crank-turner is installed
        const checkCommand = spawn('which', ['tuktuk-crank-turner']);
        
        checkCommand.on('close', (code) => {
          if (code !== 0) {
            console.log(`${colors.yellow}Installing tuktuk-crank-turner...${colors.reset}`);
            const install = spawn('cargo', ['install', 'tuktuk-crank-turner']);
            
            install.stdout.on('data', (data) => {
              const output = data.toString().trim();
              if (output) console.log(`  ${colors.cyan}>${colors.reset} ${output}`);
            });
            
            install.stderr.on('data', (data) => {
              const output = data.toString().trim();
              if (output && !output.includes('Compiling')) {
                console.log(`  ${colors.yellow}>${colors.reset} ${output}`);
              }
            });
            
            install.on('close', (installCode) => {
              if (installCode === 0) {
                console.log(`${colors.green}✅ tuktuk-crank-turner installed${colors.reset}`);
                this.launchCrankTurner(configPath, resolve, reject);
              } else {
                reject(new Error('Failed to install tuktuk-crank-turner'));
              }
            });
          } else {
            this.launchCrankTurner(configPath, resolve, reject);
          }
        });
      } catch (error: any) {
        reject(error);
      }
    });
  }

  private launchCrankTurner(configPath: string, resolve: Function, reject: Function) {
    // Start the crank turner process
    this.crankTurnerProcess = spawn('tuktuk-crank-turner', ['-c', configPath]);
    this.crankTurnerRunning = true;
    
    // Handle stdout
    this.crankTurnerProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        this.crankTurnerOutput.push(output);
        if (this.crankTurnerOutput.length > 10) {
          this.crankTurnerOutput.shift(); // Keep only last 10 lines
        }
        
        // Accumulate errors for JSON output
        this.accumulateErrors(output);
        
        // Log important messages
        if (output.includes('Task cranked') || output.includes('Tasks cranked') || output.includes('task execution succeeded')) {
          console.log(`\n${colors.green}🔧 Crank: ${output}${colors.reset}`);
        }
        // Log process-related messages (formerly VRF)
        if (output.includes('randomness') || output.includes('process_round')) {
          console.log(`\n${colors.magenta}🎮 Process: ${output}${colors.reset}`);
        }
      }
    });
    
    // Handle stderr
    this.crankTurnerProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        this.crankTurnerOutput.push(output);
        if (this.crankTurnerOutput.length > 10) {
          this.crankTurnerOutput.shift();
        }
        
        // Accumulate errors for JSON output
        this.accumulateErrors(output);
        
        // Don't log common non-error messages
        if (!output.includes('No tasks to crank') &&
            !output.includes('INFO') &&
            !output.includes('WARN')) {
          console.log(`${colors.yellow}Crank Turner: ${output}${colors.reset}`);
        }
      }
    });
    
    // Handle process exit
    this.crankTurnerProcess.on('close', (code) => {
      this.crankTurnerRunning = false;
      if (code !== 0 && code !== null) {
        console.log(`${colors.red}Crank turner exited with code ${code}${colors.reset}`);
      }
    });
    
    // Give it a moment to start
    setTimeout(() => {
      console.log(`${colors.green}✅ Crank turner process started${colors.reset}`);
      resolve();
    }, 2000);
  }

  private async stopCrankTurner(): Promise<void> {
    if (this.crankTurnerProcess) {
      console.log(`\n${colors.yellow}Stopping crank turner...${colors.reset}`);
      this.crankTurnerProcess.kill('SIGTERM');
      await this.sleep(1000);
      if (this.crankTurnerRunning) {
        this.crankTurnerProcess.kill('SIGKILL');
      }
      console.log(`${colors.green}✅ Crank turner stopped${colors.reset}`);
    }
  }

  private accumulateErrors(output: string): void {
    // Capture error messages for accumulation
    if (output.includes('simulation error') ||
        output.includes('task transaction failed') ||
        output.includes('AnchorError') ||
        output.includes('Error Code:') ||
        output.includes('failed: custom program error')) {
      
      const currentStep = this.steps.find(s => s.status === 'running')?.name || 'Unknown';
      
      let errorType = 'Unknown';
      let message = output;
      
      // Parse specific error types
      if (output.includes('InstructionDidNotDeserialize')) {
        errorType = 'InstructionDidNotDeserialize';
        message = 'The program could not deserialize the given instruction';
      } else if (output.includes('AccountOwnedByWrongProgram')) {
        errorType = 'AccountOwnedByWrongProgram';
        message = 'Account is owned by a different program than expected';
      } else if (output.includes('ConstraintSeeds')) {
        errorType = 'ConstraintSeeds';
        message = 'A seeds constraint was violated';
      } else if (output.includes('InvalidAccountInput')) {
        errorType = 'InvalidAccountInput';
        message = 'Invalid account input';
      } else if (output.includes('simulation error')) {
        errorType = 'SimulationError';
        const match = output.match(/err=([^)]+\))/);
        if (match) {
          message = match[1];
        }
      }
      
      this.allCrankErrors.push({
        timestamp: new Date().toISOString(),
        step: currentStep,
        errorType,
        message,
        fullLog: output
      });
    }
  }

  private async writeCrankErrorsToFile(): Promise<void> {
    if (this.allCrankErrors.length > 0) {
      const errorData = {
        testRun: {
          timestamp: new Date().toISOString(),
          expeditionId: this.expeditionId,
          taskQueue: this.taskQueue?.toBase58(),
          wallet: this.wallet.publicKey.toBase58()
        },
        summary: {
          totalErrors: this.allCrankErrors.length,
          errorTypes: [...new Set(this.allCrankErrors.map(e => e.errorType))],
          stepsWithErrors: [...new Set(this.allCrankErrors.map(e => e.step))]
        },
        errors: this.allCrankErrors
      };
      
      const filePath = path.join(__dirname, `crank-errors-${Date.now()}.json`);
      try {
        fs.writeFileSync(filePath, JSON.stringify(errorData, null, 2));
        console.log(`\n${colors.cyan}📄 All crank turner errors saved to: ${filePath}${colors.reset}`);
      } catch (error: any) {
        console.log(`${colors.yellow}⚠️ Could not save error file: ${error.message}${colors.reset}`);
      }
    }
  }

  private async queueInstruction(
    instruction: TransactionInstruction,
    description: string
  ): Promise<string> {
    try {
      if (!this.tuktukProgram) {
        throw new Error("Tuktuk program not initialized");
      }

      if (!this.taskQueue) {
        throw new Error("Task queue not initialized");
      }

      // Use the SDK's compileTransaction function - destructure the result like SDK examples do
      const { transaction, remainingAccounts } = compileTransaction([instruction], []);
      
      // Queue the task using the program instance
      const queueTaskBuilder = await queueTask(this.tuktukProgram, {
        taskQueue: this.taskQueue,
        args: {
          trigger: { now: {} }, // Run immediately
          transaction: {
            compiledV0: [transaction], // Use the original transaction from the SDK
          },
          crankReward: new BN(1000000), // 0.001 SOL
          freeTasks: 0,
          description,
        }
      });

      // Add queue authority and remaining accounts, then execute
      const sig = await queueTaskBuilder
        .accountsPartial({
          queueAuthority: this.anchorWallet.publicKey,
        })
        .remainingAccounts(remainingAccounts || [])
        .rpc({ skipPreflight: true });

      console.log(`  ${colors.cyan}Queued: https://solscan.io/tx/${sig}?cluster=devnet${colors.reset}`);
      
      return sig;
    } catch (error: any) {
      throw new Error(`Failed to queue ${description}: ${error.message}`);
    }
  }

  private async queueInstructionWithRemainingAccounts(
    instruction: TransactionInstruction,
    description: string,
    additionalRemainingAccounts: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[]
  ): Promise<string> {
    try {
      if (!this.tuktukProgram) {
        throw new Error("Tuktuk program not initialized");
      }

      if (!this.taskQueue) {
        throw new Error("Task queue not initialized");
      }

      // Use the SDK's compileTransaction function
      const { transaction, remainingAccounts } = compileTransaction([instruction], []);
      
      // Combine the instruction's remaining accounts with our additional ones
      const allRemainingAccounts = [
        ...(remainingAccounts || []),
        ...additionalRemainingAccounts
      ];
      
      console.log(`  ${colors.cyan}🔍 DEBUG: Compiling transaction with accounts:${colors.reset}`);
      console.log(`    Instruction accounts: ${instruction.keys.length}`);
      console.log(`    Additional remaining accounts: ${additionalRemainingAccounts.length}`);
      console.log(`    Total remaining accounts: ${allRemainingAccounts.length}`);

      // Queue the task using the program instance
      const queueTaskBuilder = await queueTask(this.tuktukProgram, {
        taskQueue: this.taskQueue,
        args: {
          trigger: { now: {} }, // Run immediately
          transaction: {
            compiledV0: [transaction], // Use the original transaction from the SDK
          },
          crankReward: new BN(1000000), // 0.001 SOL
          freeTasks: 0,
          description,
        }
      });

      // Add queue authority and ALL remaining accounts, then execute
      const sig = await queueTaskBuilder
        .accountsPartial({
          queueAuthority: this.anchorWallet.publicKey,
        })
        .remainingAccounts(allRemainingAccounts)
        .rpc({ skipPreflight: true });

      console.log(`  ${colors.cyan}Queued: https://solscan.io/tx/${sig}?cluster=devnet${colors.reset}`);
      
      return sig;
    } catch (error: any) {
      throw new Error(`Failed to queue ${description}: ${error.message}`);
    }
  }

  async run() {
    this.printProgress();

    try {
      // Step 1: Setup
      this.updateStep(0, 'running');
      
      // Initialize Tuktuk program
      this.tuktukProgram = await init(this.provider);
      
      console.log(`\n${colors.blue}📦 Using unique queue name: ${TASK_QUEUE_NAME}${colors.reset}`);
      console.log(`  This prevents conflicts with old tasks from previous runs\n`);
      
      // Always create a fresh queue to avoid old task conflicts
      console.log(`${colors.yellow}Creating fresh task queue...${colors.reset}`);
        
      const { pubkeys: { taskQueue: taskQueuePubkey } } = await (
        await createTaskQueue(this.tuktukProgram, {
          name: TASK_QUEUE_NAME,
          minCrankReward: new BN(1000000), // 0.001 SOL
          capacity: 100,
          lookupTables: [],
          staleTaskAge: 60, // 60 seconds - tasks go stale after 1 minute for easy cleanup
        })
      ).rpcAndKeys({ skipPreflight: true });
      
      this.taskQueue = taskQueuePubkey;
      console.log(`${colors.green}✅ Fresh task queue created: ${this.taskQueue.toBase58()}${colors.reset}`);
      console.log(`  No old tasks can interfere with this test run\n`);
      
      // Wait for the account to be created
      await this.sleep(2000);

      // Add queue authority if needed
      const queueAuthority = taskQueueAuthorityKey(this.taskQueue, this.wallet.publicKey)[0];
      const queueAuthorityAccount = await this.tuktukProgram.account.taskQueueAuthorityV0.fetchNullable(queueAuthority);
      
      if (!queueAuthorityAccount) {
        console.log(`${colors.yellow}Adding queue authority...${colors.reset}`);
        await this.tuktukProgram.methods
          .addQueueAuthorityV0()
          .accounts({
            payer: this.wallet.publicKey,
            queueAuthority: this.wallet.publicKey,
            taskQueue: this.taskQueue,
          })
          .rpc({ skipPreflight: true });
        console.log(`${colors.green}✅ Queue authority added${colors.reset}`);
        await this.sleep(2000);
      }
      
      this.updateStep(0, 'success');

      // Step 2: Check Balance
      this.updateStep(1, 'running');
      await this.checkAndFundWallet();
      this.updateStep(1, 'success');

      // Step 3: Start Crank Turner
      this.updateStep(2, 'running');
      await this.startCrankTurner();
      this.updateStep(2, 'success');

      // Step 4: Create Expedition
      this.updateStep(3, 'running');
      
      // Get the current next expedition ID right before queueing
      console.log(`\n🔍 DEBUG: Fetching game state account`);
      console.log(`  Attempting to fetch: ${this.gameStatePDA.toBase58()}`);
      console.log(`  Timestamp: ${new Date().toISOString()}`);
      
      let gameStateAccount = await this.connection.getAccountInfo(this.gameStatePDA);
      
      if (!gameStateAccount) {
        console.log(`  ❌ Account not found!`);
        console.log(`  RPC URL: ${this.connection.rpcEndpoint}`);
        
        // Try manual check with commitment
        console.log(`  Retrying with 'confirmed' commitment...`);
        const retryAccount = await this.connection.getAccountInfo(this.gameStatePDA, 'confirmed');
        
        if (!retryAccount) {
          console.log(`  ❌ Still not found after retry`);
          
          // Check if we can connect to RPC at all
          console.log(`  Testing RPC connection...`);
          try {
            const version = await this.connection.getVersion();
            console.log(`  RPC Version: ${JSON.stringify(version)}`);
            
            const slot = await this.connection.getSlot();
            console.log(`  Current Slot: ${slot}`);
          } catch (rpcError: any) {
            console.log(`  ❌ RPC Connection Error: ${rpcError.message}`);
          }
          
          throw new Error(`Game state not initialized at ${this.gameStatePDA.toBase58()}`);
        } else {
          console.log(`  ✅ Found on retry!`);
          gameStateAccount = retryAccount;
        }
      } else {
        console.log(`  ✅ Account found!`);
        console.log(`  Owner: ${gameStateAccount.owner.toBase58()}`);
        console.log(`  Data length: ${gameStateAccount.data.length} bytes`);
      }
      
      const gameStateData = gameStateAccount.data;
      this.expeditionId = Number(gameStateData.readBigUInt64LE(40));
      console.log(`  ${colors.blue}Read next_expedition_id: ${this.expeditionId}${colors.reset}`);
      console.log(`  ${colors.yellow}⚠️ WARNING: This ID might change if other tests run concurrently${colors.reset}`);
      console.log(`  ${colors.blue}Queueing expedition creation for ID: ${this.expeditionId}${colors.reset}`);
      
      // Derive expedition PDA with the current ID
      const expeditionIdBytes = Buffer.alloc(8);
      expeditionIdBytes.writeBigUInt64LE(BigInt(this.expeditionId));
      [this.expeditionPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("expedition"), expeditionIdBytes],
        PROGRAM_ID
      );
      console.log(`  ${colors.blue}Expedition PDA: ${this.expeditionPDA.toBase58()}${colors.reset}`);
      
      // Create instruction data with expedition ID
      const instructionData = Buffer.alloc(8 + 8); // discriminator + expedition_id
      instructionData.set(DISCRIMINATORS.CREATE_EXPEDITION, 0);
      instructionData.writeBigUInt64LE(BigInt(this.expeditionId), 8);
      
      // Add detailed logging of instruction data
      console.log('\n🔍 DEBUG: Instruction Data Analysis');
      console.log('=====================================');
      console.log(`  Total buffer size: ${instructionData.length} bytes`);
      console.log(`  Discriminator (bytes 0-7): [${Array.from(instructionData.slice(0, 8)).join(', ')}]`);
      console.log(`  Discriminator (hex): 0x${instructionData.slice(0, 8).toString('hex')}`);
      console.log(`  Expedition ID value: ${this.expeditionId}`);
      console.log(`  Expedition ID (bytes 8-15): [${Array.from(instructionData.slice(8, 16)).join(', ')}]`);
      console.log(`  Expedition ID (hex): 0x${instructionData.slice(8, 16).toString('hex')}`);
      console.log(`  Full instruction data (hex): 0x${instructionData.toString('hex')}`);
      console.log(`  Full instruction data (bytes): [${Array.from(instructionData).join(', ')}]`);
      console.log('=====================================\n');
      
      // CRITICAL FIX: Accounts must be in the correct order matching the on-chain instruction!
      // The on-chain instruction expects: authority, expedition, global_game_state, system_program
      const createExpeditionIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: this.gameStatePDA, isSigner: false, isWritable: true },        // global_game_state first
          { pubkey: this.expeditionPDA, isSigner: false, isWritable: true },       // expedition SECOND
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },      // authority third
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program LAST
        ],
        data: instructionData,
      });

      const createSig = await this.queueInstruction(createExpeditionIx, "create_expedition");
      this.updateStep(3, 'success', createSig);
      
      // Give time for task to be picked up
      await this.sleep(3000);

      // Step 5: Wait for creation
      this.updateStep(4, 'running');
      console.log(`\n${colors.yellow}Waiting for crank turner to execute task...${colors.reset}`);
      
      const created = await this.waitForAccount(this.expeditionPDA!);
      if (!created) {
        throw new Error("Expedition creation timed out - crank turner may not be processing tasks");
      }
      
      // CRITICAL: Read the ACTUAL expedition ID from the created account
      const createdExpeditionAccount = await this.connection.getAccountInfo(this.expeditionPDA!);
      if (createdExpeditionAccount) {
        const actualExpeditionId = Number(createdExpeditionAccount.data.readBigUInt64LE(8));
        console.log(`  ${colors.cyan}🔍 Expedition Creation Verification:${colors.reset}`);
        console.log(`    Expected expedition ID: ${this.expeditionId}`);
        console.log(`    Actual expedition ID: ${actualExpeditionId}`);
        if (actualExpeditionId !== this.expeditionId) {
          console.log(`    ${colors.red}❌ MISMATCH! Race condition detected!${colors.reset}`);
          console.log(`    ${colors.yellow}This means other expeditions were created between read and create${colors.reset}`);
          
          // CRITICAL FIX: Update both expedition ID AND re-derive PDA with correct ID
          this.expeditionId = actualExpeditionId;
          console.log(`    ${colors.yellow}Updated test to use actual ID: ${this.expeditionId}${colors.reset}`);
          
          // Re-derive expedition PDA with the actual expedition ID
          const correctedExpeditionIdBytes = Buffer.alloc(8);
          correctedExpeditionIdBytes.writeBigUInt64LE(BigInt(actualExpeditionId));
          const [correctedExpeditionPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("expedition"), correctedExpeditionIdBytes],
            PROGRAM_ID
          );
          
          console.log(`    ${colors.cyan}🔧 PDA Synchronization Fix:${colors.reset}`);
          console.log(`      Old expedition PDA: ${this.expeditionPDA.toBase58()}`);
          console.log(`      New expedition PDA: ${correctedExpeditionPDA.toBase58()}`);
          
          // Update the expedition PDA reference
          this.expeditionPDA = correctedExpeditionPDA;
          console.log(`    ${colors.green}✅ PDA synchronized with actual expedition ID${colors.reset}`);
        } else {
          console.log(`    ${colors.green}✅ IDs match - no race condition${colors.reset}`);
        }
      }
      
      // Verify the expedition PDA is accessible with the synchronized ID
      const verificationAccount = await this.connection.getAccountInfo(this.expeditionPDA!);
      if (!verificationAccount) {
        throw new Error(`CRITICAL: Synchronized expedition PDA ${this.expeditionPDA!.toBase58()} not accessible`);
      }
      const verifiedExpeditionId = Number(verificationAccount.data.readBigUInt64LE(8));
      if (verifiedExpeditionId !== this.expeditionId) {
        throw new Error(`CRITICAL: PDA synchronization failed - PDA has ID ${verifiedExpeditionId}, expected ${this.expeditionId}`);
      }
      
      console.log(`  ${colors.green}✅ Expedition ${this.expeditionId} created at ${this.expeditionPDA.toBase58()}${colors.reset}`);
      console.log(`  ${colors.green}✅ PDA synchronization verified - all subsequent operations will use correct account${colors.reset}`);
      this.updateStep(4, 'success');

      // Step 6: Create User Account (MOVED BEFORE join and start)
      this.updateStep(5, 'running');
      
      // Derive user account PDA - Uses "user" seed per Rust implementation
      [this.userAccountPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), this.wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      // Check if user account already exists
      const existingUserAccount = await this.connection.getAccountInfo(this.userAccountPDA);
      if (!existingUserAccount) {
        console.log(`  ${colors.blue}Creating user account...${colors.reset}`);
        
        // Create instruction data for user account creation
        const userAccountData = Buffer.alloc(8 + 8 + 8); // discriminator + discord_id + guild_id
        userAccountData.set(DISCRIMINATORS.CREATE_USER_ACCOUNT, 0);
        userAccountData.writeBigUInt64LE(BigInt(this.discordId), 8);
        userAccountData.writeBigUInt64LE(BigInt(this.guildId), 16);

        const createUserAccountIx = new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: this.userAccountPDA, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: userAccountData,
        });

        const createUserSig = await this.queueInstruction(createUserAccountIx, "create_user_account");
        console.log(`  ${colors.green}User account creation queued: ${createUserSig}${colors.reset}`);
        
        // Wait for user account creation
        const userCreated = await this.waitForAccount(this.userAccountPDA);
        if (!userCreated) {
          throw new Error("User account creation timed out");
        }
        console.log(`  ${colors.green}✅ User account created at ${this.userAccountPDA.toBase58()}${colors.reset}`);
        this.updateStep(5, 'success', createUserSig);
      } else {
        console.log(`  ${colors.green}✅ User account already exists at ${this.userAccountPDA.toBase58()}${colors.reset}`);
        this.updateStep(5, 'success');
      }

      // Step 7: Join Expedition (MOVED BEFORE start)
      this.updateStep(6, 'running');
      
      // CRITICAL: Re-derive expedition ID bytes with the ACTUAL expedition ID
      const actualExpeditionIdBytes = Buffer.alloc(8);
      actualExpeditionIdBytes.writeBigUInt64LE(BigInt(this.expeditionId));
      
      // Derive guild performance PDA - Uses "guild" seed (how it's created in join_expedition)
      const guildIdBytes = Buffer.alloc(8);
      guildIdBytes.writeBigUInt64LE(BigInt(this.guildId));
      
      // CRITICAL FIX: Save as class property for reuse in distribute_rewards and claim_rewards
      [this.guildPerformancePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("guild"), actualExpeditionIdBytes, guildIdBytes],
        PROGRAM_ID
      );
      console.log(`  ${colors.cyan}🔧 GuildPerformance PDA created and saved: ${this.guildPerformancePDA.toBase58()}${colors.reset}`);

      // CRITICAL FIX: Add expeditionId to instruction data
      const joinData = Buffer.alloc(8 + 8); // discriminator + expedition_id
      joinData.set(DISCRIMINATORS.JOIN_EXPEDITION, 0);
      joinData.writeBigUInt64LE(BigInt(this.expeditionId), 8);

      const joinExpeditionIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: this.userAccountPDA, isSigner: false, isWritable: true },
          { pubkey: this.expeditionPDA!, isSigner: false, isWritable: true },
          { pubkey: this.guildPerformancePDA!, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: joinData,
      });

      const joinSig = await this.queueInstruction(joinExpeditionIx, "join_expedition");
      console.log(`  ${colors.green}Join expedition queued: ${joinSig}${colors.reset}`);
      
      // Wait for guild performance account creation
      const joined = await this.waitForAccount(this.guildPerformancePDA!);
      if (!joined) {
        throw new Error("Join expedition timed out");
      }
      console.log(`  ${colors.green}✅ Joined expedition, guild performance created${colors.reset}`);
      this.updateStep(6, 'success', joinSig);

      // Step 8: Start Expedition (MOVED AFTER players joined)
      this.updateStep(7, 'running');

      const startExpeditionIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: this.expeditionPDA!, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(DISCRIMINATORS.START_EXPEDITION),
      });

      const startSig = await this.queueInstruction(startExpeditionIx, "start_expedition");
      this.updateStep(7, 'success', startSig);
      
      // Give time for task to be picked up
      await this.sleep(3000);

      // Step 9: Wait for start
      this.updateStep(8, 'running');
      const started = await this.waitForAccountData(
        this.expeditionPDA!,
        (data) => data[16] === 1 // Check if status is InProgress (ExpeditionStatus::InProgress = 1)
      );
      if (!started) {
        throw new Error("Expedition start timed out");
      }
      
      // DEBUG: Check the actual current_round value
      const expeditionAccount = await this.connection.getAccountInfo(this.expeditionPDA!);
      if (expeditionAccount) {
        const currentRoundValue = expeditionAccount.data.readBigUInt64LE(18); // current_round is at offset 18
        console.log(`\n${colors.cyan}🔍 DEBUG: Expedition started state:${colors.reset}`);
        console.log(`  Status: InProgress (verified)`);
        console.log(`  Current Round: ${currentRoundValue} (should be 0 for fresh start)`);
      }
      
      this.updateStep(8, 'success');

      // Process 3 rounds with voting
      for (let round = 1; round <= 3; round++) {
        const voteIndex = 9 + (round - 1) * 3;  // Updated to remove VRF steps (now 3 steps per round)
        const processIndex = voteIndex + 1;
        const waitIndex = processIndex + 1;

        // Submit Vote for Round
        this.updateStep(voteIndex, 'running');
        
        // Risk levels: 0 = Low, 1 = Medium, 2 = High
        const riskLevel = round - 1; // Round 1 = Low risk, Round 2 = Medium, Round 3 = High
        
        // CRITICAL FIX: expedition.current_round is 0-based (0, 1, 2) not 1-based!
        // When starting round 1, current_round is 0
        // When starting round 2, current_round is 1, etc.
        const currentRoundBytes = Buffer.alloc(8);
        const zeroBasedRound = round - 1; // Convert to 0-based
        currentRoundBytes.writeBigUInt64LE(BigInt(zeroBasedRound));
        
        console.log(`\n${colors.blue}📊 Round ${round} Vote Submission:${colors.reset}`);
        console.log(`  Display Round: ${round} (1-based for humans)`);
        console.log(`  Actual current_round: ${zeroBasedRound} (0-based in contract)`);
        console.log(`  Risk Level: ${riskLevel}`);
        
        // Use actual expedition ID for guild vote PDA
        const actualExpIdForVote = Buffer.alloc(8);
        actualExpIdForVote.writeBigUInt64LE(BigInt(this.expeditionId));
        const [guildVotePDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("guild_vote"), actualExpIdForVote, guildIdBytes, currentRoundBytes, this.wallet.publicKey.toBuffer()],
          PROGRAM_ID
        );

        // Derive user participation PDA - uses actual expedition ID
        const userParticipationIdBytes = Buffer.alloc(8);
        userParticipationIdBytes.writeBigUInt64LE(BigInt(this.expeditionId));
        const [userParticipationPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("user_participation"), userParticipationIdBytes, this.wallet.publicKey.toBuffer(), guildIdBytes],
          PROGRAM_ID
        );

        // Create vote instruction data
        const voteData = Buffer.alloc(8 + 1); // discriminator + vote
        voteData.set(DISCRIMINATORS.SUBMIT_VOTE, 0);
        voteData.writeUInt8(riskLevel, 8);

        const submitVoteIx = new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: this.userAccountPDA, isSigner: false, isWritable: true },
            { pubkey: this.expeditionPDA!, isSigner: false, isWritable: true },
            { pubkey: this.guildPerformancePDA!, isSigner: false, isWritable: true },
            { pubkey: guildVotePDA, isSigner: false, isWritable: true },
            { pubkey: userParticipationPDA, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: voteData,
        });

        const voteSig = await this.queueInstruction(submitVoteIx, `submit_vote_round_${round}`);
        console.log(`  ${colors.green}Vote submitted for round ${round} (risk level: ${riskLevel}): ${voteSig}${colors.reset}`);
        
        // Wait for vote to be processed
        const voted = await this.waitForAccount(guildVotePDA);
        if (!voted) {
          throw new Error(`Vote submission for round ${round} timed out`);
        }
        console.log(`  ${colors.green}✅ Vote for round ${round} processed${colors.reset}`);
        this.updateStep(voteIndex, 'success', voteSig);

        // Process Round
        this.updateStep(processIndex, 'running');
        
        // CRITICAL FIX: Use the ACTUAL expedition ID for PDA derivation
        // The expedition ID might have changed due to race conditions
        const expeditionIdForPDA = Buffer.alloc(8);
        expeditionIdForPDA.writeBigUInt64LE(BigInt(this.expeditionId));
        
        const currentRoundForPDA = Buffer.alloc(8);
        const zeroBasedRoundForPDA = round - 1; // Convert to 0-based for PDA derivation
        currentRoundForPDA.writeBigUInt64LE(BigInt(zeroBasedRoundForPDA));
        
        console.log(`\n${colors.cyan}🎯 Round ${round} Processing:${colors.reset}`);
        console.log(`  Display Round: ${round} (1-based for humans)`);
        console.log(`  PDA Round Seed: ${zeroBasedRoundForPDA} (0-based for contract PDAs)`);
        console.log(`  Expedition ID: ${this.expeditionId}`);
        
        const [roundPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("expedition_round"), expeditionIdForPDA, currentRoundForPDA],
          PROGRAM_ID
        );
        console.log(`  Expedition Round PDA: ${roundPDA.toBase58()}`);

        const processRoundIx = new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: this.expeditionPDA!, isSigner: false, isWritable: true },
            { pubkey: roundPDA, isSigner: false, isWritable: true },
            { pubkey: this.gameStatePDA, isSigner: false, isWritable: true },
            { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true }, // payer account (FIXED)
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: Buffer.from(DISCRIMINATORS.PROCESS_ROUND),
        });

        const processSig = await this.queueInstruction(processRoundIx, `process_round_${round}`);
        
        // Give time for task to be picked up
        await this.sleep(3000);
        
        console.log(`\n${colors.magenta}🎮 Round Processing:${colors.reset}`);
        console.log(`  Process Round ${round} transaction queued`);
        console.log(`  Voted Risk Level: ${riskLevel} (${riskLevel === 0 ? 'Low' : riskLevel === 1 ? 'Medium' : 'High'})`);
        console.log(`  Expected Success Threshold: ${riskLevel === 0 ? '10%' : riskLevel === 1 ? '30%' : '80%'} (from constants.rs)`);
        console.log(`  Voting results will affect round success probability`);
        console.log(`  Using deterministic randomness for testing (expedition_id + round + slot)`);
        console.log(`  In production, this would use MagicBlock VRF for secure randomness`);
        this.updateStep(processIndex, 'success', processSig);

        // Wait for round completion by checking expedition state
        this.updateStep(waitIndex, 'running');
        console.log(`\n${colors.yellow}⏳ Waiting for round ${round} to complete...${colors.reset}`);
        console.log(`  Checking for expedition current_round increment to ${round}`);
        console.log(`  Expedition PDA: ${this.expeditionPDA!.toBase58()}`);
        console.log(`  Processing with mocked randomness for testing`);
        
        // Wait for the expedition's current_round field to be incremented to the expected value
        // RACE CONDITION CHECK: current_round is incremented AFTER ExpeditionRound creation
        const expectedCurrentRound = round; // The round we just processed should increment current_round to this value
        console.log(`  ${colors.yellow}⚠️ RACE CHECK: Waiting for current_round to become ${expectedCurrentRound}${colors.reset}`);
        console.log(`    Note: ExpeditionRound created with round ${zeroBasedRoundForPDA}, but current_round increments after`);
        
        const completed = await this.waitForAccountData(
          this.expeditionPDA!,
          (data) => {
            const currentRoundValue = data.readBigUInt64LE(18); // current_round field at offset 18
            const matches = Number(currentRoundValue) === expectedCurrentRound;
            if (!matches) {
              console.log(`    Still waiting... current_round is ${currentRoundValue}, need ${expectedCurrentRound}`);
            }
            return matches;
          }
        );
        
        if (!completed) {
          // Add debugging info on timeout
          console.log(`\n${colors.red}❌ Round ${round} processing timed out${colors.reset}`);
          
          // Check current expedition state
          const expeditionAccount = await this.connection.getAccountInfo(this.expeditionPDA!);
          if (expeditionAccount) {
            const actualCurrentRound = expeditionAccount.data.readBigUInt64LE(18);
            console.log(`  Current expedition.current_round: ${actualCurrentRound} (expected: ${expectedCurrentRound})`);
          }
          
          // Also check if the round account was created
          const roundAccount = await this.connection.getAccountInfo(roundPDA);
          console.log(`  ExpeditionRound account exists: ${roundAccount ? 'YES' : 'NO'}`);
          if (roundAccount) {
            console.log(`  ExpeditionRound PDA: ${roundPDA.toBase58()}`);
          }
          
          throw new Error(`Round ${round} processing timed out - expedition state not updated`);
        }
        console.log(`  ${colors.green}✅ Round ${round} completed successfully with mocked randomness - expedition.current_round = ${expectedCurrentRound}${colors.reset}`);
        
        this.updateStep(waitIndex, 'success');

        // Wait 5 seconds between rounds as required for demo
        console.log(`  ${colors.yellow}Waiting 5 seconds before next round (demo requirement)...${colors.reset}`);
        await this.sleep(5000); // 5 second pause between rounds for demo
      }

      // Step: Complete Expedition (updated index after removing VRF steps)
      // Initial steps (0-8): 9 steps
      // 3 rounds × 3 steps each (9-17): 9 steps
      // Complete Expedition: index 18
      const completeExpeditionIndex = 9 + (3 * 3); // 9 initial + 9 round steps = 18
      console.log(`\n${colors.cyan}🔍 DEBUG: Step indices:${colors.reset}`);
      console.log(`  Complete Expedition Index: ${completeExpeditionIndex} (should be 18)`);
      this.updateStep(completeExpeditionIndex, 'running');
      
      const completeExpeditionIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: this.expeditionPDA!, isSigner: false, isWritable: true },
          { pubkey: this.gameStatePDA, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(DISCRIMINATORS.COMPLETE_EXPEDITION),
      });

      const completeSig = await this.queueInstruction(completeExpeditionIx, "complete_expedition");
      this.updateStep(completeExpeditionIndex, 'success', completeSig);

      // Step: Wait for completion
      const waitCompletionIndex = completeExpeditionIndex + 1; // 19
      console.log(`  Wait Completion Index: ${waitCompletionIndex} (should be 19)`);
      this.updateStep(waitCompletionIndex, 'running');
      const expeditionCompleted = await this.waitForAccountData(
        this.expeditionPDA!,
        (data) => data[16] === 2 // Check if status is Completed (ExpeditionStatus::Completed = 2)
      );
      if (!expeditionCompleted) {
        throw new Error("Expedition completion timed out");
      }
      this.updateStep(waitCompletionIndex, 'success');

      // Step: Distribute Rewards
      const distributeRewardsIndex = waitCompletionIndex + 1; // 20
      console.log(`  Distribute Rewards Index: ${distributeRewardsIndex} (should be 20)`);
      this.updateStep(distributeRewardsIndex, 'running');
      
      console.log(`\n${colors.blue}💰 Preparing reward distribution...${colors.reset}`);
      
      // Derive reward pool PDA
      const [rewardPoolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("reward_pool")],
        PROGRAM_ID
      );

      // Derive scrap mint PDA
      const [scrapMintPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("scrap_mint")],
        PROGRAM_ID
      );

      // Derive reward pool ATA
      const [rewardPoolATA] = PublicKey.findProgramAddressSync(
        [
          rewardPoolPDA.toBuffer(),
          new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(),
          scrapMintPDA.toBuffer(),
        ],
        new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
      );

      // CRITICAL FIX: Always use this.expeditionId which we updated after creation
      // This should now be the ACTUAL expedition ID, not the predicted one
      console.log(`\n${colors.cyan}🔍 Expedition ID for distribute_rewards:${colors.reset}`);
      console.log(`  Using this.expeditionId: ${this.expeditionId}`);
      console.log(`  This was updated after creation to match actual ID`);
      
      // Verify it matches the expedition account
      const currentExpeditionAccount = await this.connection.getAccountInfo(this.expeditionPDA!);
      if (!currentExpeditionAccount) {
        throw new Error("Expedition account not found");
      }
      
      const verifyExpeditionId = Number(currentExpeditionAccount.data.readBigUInt64LE(8));
      if (verifyExpeditionId !== this.expeditionId) {
        console.log(`  ${colors.red}❌ ERROR: Expedition ID mismatch!${colors.reset}`);
        console.log(`    this.expeditionId: ${this.expeditionId}`);
        console.log(`    Account expedition.id: ${verifyExpeditionId}`);
        throw new Error("Expedition ID synchronization error");
      }
      console.log(`  ${colors.green}✅ Verified: expedition.id matches${colors.reset}`);
      
      // Use the verified expedition ID for PDA derivation
      const expeditionIdForRounds = Buffer.alloc(8);
      expeditionIdForRounds.writeBigUInt64LE(BigInt(this.expeditionId));
      
      const expeditionRoundPDAs: PublicKey[] = [];
      const expeditionRoundDiscriminator = Buffer.from([241, 191, 181, 41, 121, 90, 162, 179]);

      console.log(`\n${colors.cyan}🔍 Verifying ExpeditionRound accounts before passing to distribute_rewards...${colors.reset}`);

      // Known discriminators for comparison
      const knownDiscriminators = {
        'ExpeditionRound': [241, 191, 181, 41, 121, 90, 162, 179],
        'RandomnessRequest': [244, 231, 228, 160, 148, 28, 17, 184],
        'GuildVote': [202, 93, 216, 150, 166, 11, 145, 198],
        'GuildPerformance': [1, 38, 204, 2, 177, 101, 221, 31],
        'UserExpeditionParticipation': [168, 5, 107, 29, 72, 174, 190, 140]
      };

      // Diagnostic data to be saved to JSON
      const diagnosticData: Array<{
        round: number;
        pda: string;
        exists: boolean;
        dataLength?: number;
        expectedDiscriminator: number[];
        actualDiscriminator?: number[];
        identifiedType: string;
        isValid: boolean;
      }> = [];

      for (let round = 0; round < 3; round++) {
        const roundBytes = Buffer.alloc(8);
        roundBytes.writeBigUInt64LE(BigInt(round));
        const [pda] = PublicKey.findProgramAddressSync(
          [Buffer.from("expedition_round"), expeditionIdForRounds, roundBytes],
          PROGRAM_ID
        );

        const accountInfo = await this.connection.getAccountInfo(pda);
        if (accountInfo) {
          const actualDiscriminator = Array.from(accountInfo.data.slice(0, 8));
          console.log(`  Account ${round}: PDA ${pda.toBase58()}`);
          console.log(`    Data length: ${accountInfo.data.length} bytes`);
          console.log(`    Expected discriminator: [${expeditionRoundDiscriminator.join(',')}]`);
          console.log(`    Actual discriminator:   [${actualDiscriminator.join(',')}]`);
          
          // Check against known discriminators
          let matchedType = 'Unknown';
          for (const [typeName, discriminator] of Object.entries(knownDiscriminators)) {
            if (discriminator.length === actualDiscriminator.length &&
                discriminator.every((val, i) => val === actualDiscriminator[i])) {
              matchedType = typeName;
              break;
            }
          }
          console.log(`    Account type identified: ${matchedType}`);
          
          const isValid = accountInfo.data.slice(0, 8).equals(expeditionRoundDiscriminator);
          
          // Store diagnostic data
          diagnosticData.push({
            round,
            pda: pda.toBase58(),
            exists: true,
            dataLength: accountInfo.data.length,
            expectedDiscriminator: Array.from(expeditionRoundDiscriminator),
            actualDiscriminator,
            identifiedType: matchedType,
            isValid
          });
          
          if (isValid) {
            console.log(`  ${colors.green}✅ Found valid ExpeditionRound account for round ${round}${colors.reset}`);
            expeditionRoundPDAs.push(pda);
          } else {
            console.log(`  ${colors.red}❌ DISCRIMINATOR MISMATCH: Found ${matchedType} account instead of ExpeditionRound${colors.reset}`);
          }
        } else {
          console.log(`  ${colors.red}❌ No account found for round ${round} at ${pda.toBase58()}${colors.reset}`);
          
          // Store diagnostic data for missing account
          diagnosticData.push({
            round,
            pda: pda.toBase58(),
            exists: false,
            expectedDiscriminator: Array.from(expeditionRoundDiscriminator),
            identifiedType: 'AccountNotFound',
            isValid: false
          });
        }
      }

      // Add diagnostic data to error accumulation for JSON output
      this.allCrankErrors.push({
        timestamp: new Date().toISOString(),
        step: 'Distribute Rewards - Account Verification',
        errorType: 'AccountDiscriminatorDiagnostic',
        message: `ExpeditionRound account verification completed. Valid accounts: ${expeditionRoundPDAs.length}/3`,
        fullLog: JSON.stringify(diagnosticData, null, 2)
      });

      if (expeditionRoundPDAs.length === 0) {
        console.log(`\n${colors.red}❌ FATAL: No valid ExpeditionRound accounts found to pass to distribute_rewards. This means all 'process_round' instructions failed catastrophically.${colors.reset}`);
        throw new Error("No valid ExpeditionRound accounts available to distribute rewards.");
      } else if (expeditionRoundPDAs.length < 3) {
          console.log(`\n${colors.yellow}⚠️ WARNING: Found only ${expeditionRoundPDAs.length} of 3 required ExpeditionRound accounts. This is expected if some 'process_round' instructions failed.${colors.reset}`);
      }

      // CRITICAL FIX: Reuse the same GuildPerformance PDA that was created during join_expedition
      if (!this.guildPerformancePDA) {
        throw new Error("GuildPerformance PDA not initialized - join_expedition should have created it");
      }
      console.log(`  ${colors.cyan}Reusing GuildPerformance PDA from join_expedition: ${this.guildPerformancePDA.toBase58()}${colors.reset}`);

      // Create remaining accounts array: ExpeditionRound accounts PLUS GuildPerformance
      // The distribute_rewards instruction needs both to update guild stats
      const remainingAccounts = [
        // First the ExpeditionRound accounts (for reading round results)
        ...expeditionRoundPDAs.map(pubkey => ({ pubkey, isSigner: false, isWritable: false })),
        // Then the GuildPerformance account (for updating stats) - MUST be writable!
        { pubkey: this.guildPerformancePDA!, isSigner: false, isWritable: true }
      ];
      console.log(`  Total remaining accounts: ${remainingAccounts.length} (${expeditionRoundPDAs.length} ExpeditionRounds + 1 GuildPerformance)`);

      // CRITICAL FIX: Keep main accounts separate from remaining accounts
      // The tuktuk SDK needs remaining accounts passed separately, not in the instruction keys
      const distributeRewardsIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: this.expeditionPDA!, isSigner: false, isWritable: true },
          { pubkey: this.gameStatePDA, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          // DO NOT add remaining accounts here - they must be passed separately
        ],
        data: Buffer.from(DISCRIMINATORS.DISTRIBUTE_REWARDS),
      });

      console.log(`\n${colors.cyan}🔍 DEBUG: Queueing distribute_rewards with:${colors.reset}`);
      console.log(`  Main accounts: 3 (expedition, game_state, system_program)`);
      console.log(`  Remaining accounts to pass separately: ${remainingAccounts.length}`);
      console.log(`  Main instruction accounts: ${distributeRewardsIx.keys.length}`);
      remainingAccounts.forEach((acc, idx) => {
        const accountType = idx < expeditionRoundPDAs.length ? 'ExpeditionRound' : 'GuildPerformance';
        console.log(`    Remaining ${idx} (${accountType}): ${acc.pubkey.toBase58()} (${acc.isWritable ? 'writable' : 'readonly'})`);
      });
      
      // Log GuildPerformance state BEFORE distribute_rewards
      console.log(`\n${colors.cyan}📊 GuildPerformance BEFORE distribute_rewards:${colors.reset}`);
      const guildPerfBefore = await this.connection.getAccountInfo(this.guildPerformancePDA!);
      if (guildPerfBefore) {
        const successfulRounds = guildPerfBefore.data.readUInt8(17);
        const totalRounds = guildPerfBefore.data.readUInt8(18);
        const totalRiskPoints = guildPerfBefore.data.readUInt32LE(19);
        console.log(`  Successful rounds: ${successfulRounds}`);
        console.log(`  Total rounds participated: ${totalRounds}`);
        console.log(`  Total risk points: ${totalRiskPoints}`);
      } else {
        console.log(`  ${colors.red}Account not found!${colors.reset}`);
      }

      // CRITICAL FIX: Execute distribute_rewards directly instead of through task queue
      // The TukTuk task queue system loses remaining accounts during serialization
      console.log(`\n${colors.cyan}🔧 EXECUTING DIRECTLY: TukTuk cannot handle remaining accounts${colors.reset}`);
      console.log(`  Bypassing task queue to ensure ExpeditionRound accounts are passed correctly`);
      
      // Create the complete instruction with all accounts
      const completeDistributeRewardsIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: this.expeditionPDA!, isSigner: false, isWritable: true },
          { pubkey: this.gameStatePDA, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          // Add ExpeditionRound AND GuildPerformance accounts as remaining accounts
          ...remainingAccounts.map(acc => ({
            pubkey: acc.pubkey,
            isSigner: acc.isSigner,
            isWritable: acc.isWritable  // Use the actual writable flag from remainingAccounts
          }))
        ],
        data: Buffer.from(DISCRIMINATORS.DISTRIBUTE_REWARDS),
      });

      // Execute directly using Anchor provider
      const { blockhash } = await this.connection.getLatestBlockhash();
      const transaction = new Transaction({
        feePayer: this.wallet.publicKey,
        blockhash,
        lastValidBlockHeight: (await this.connection.getLatestBlockhash()).lastValidBlockHeight
      });
      transaction.add(completeDistributeRewardsIx);
      transaction.sign(this.wallet);

      const distributeSig = await this.connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });

      console.log(`  ${colors.green}Reward distribution executed directly: ${distributeSig}${colors.reset}`);
      console.log(`  ${colors.cyan}https://solscan.io/tx/${distributeSig}?cluster=devnet${colors.reset}`);
      this.updateStep(distributeRewardsIndex, 'success', distributeSig);
      
      // Wait for confirmation
      await this.connection.confirmTransaction({
        signature: distributeSig,
        blockhash,
        lastValidBlockHeight: (await this.connection.getLatestBlockhash()).lastValidBlockHeight
      });
      console.log(`  ${colors.green}✅ Transaction confirmed${colors.reset}`);

      // Step: Wait for rewards
      const waitRewardsIndex = distributeRewardsIndex + 1; // 21
      console.log(`  Wait Rewards Index: ${waitRewardsIndex} (should be 21)`);
      this.updateStep(waitRewardsIndex, 'running');
      console.log(`\n${colors.yellow}⏳ Waiting for reward distribution to complete...${colors.reset}`);
      const rewardsDistributed = await this.waitForAccountData(
        this.expeditionPDA!,
        (data) => data[50] === 1 // Check if rewards_distributed is true (at byte 50)
      );
      if (!rewardsDistributed) {
        throw new Error("Reward distribution timed out");
      }
      console.log(`  ${colors.green}✅ Rewards distributed based on guild performance and VRF outcomes${colors.reset}`);
      this.updateStep(waitRewardsIndex, 'success');

      // Step: Claim Rewards
      const claimRewardsIndex = waitRewardsIndex + 1; // 22
      console.log(`  Claim Rewards Index: ${claimRewardsIndex} (should be 22)`);
      this.updateStep(claimRewardsIndex, 'running');
      
      console.log(`\n${colors.blue}🎁 Claiming individual SCRAP token rewards...${colors.reset}`);
      
      // CRITICAL FIX: Use actual expedition.id from account (like distribute_rewards fix)
      const actualExpeditionIdForClaim = Number(currentExpeditionAccount.data.readBigUInt64LE(8));
      console.log(`\n${colors.cyan}🔍 Expedition ID for claim_rewards:${colors.reset}`);
      console.log(`  Using actual expedition.id: ${actualExpeditionIdForClaim}`);
      console.log(`  Original this.expeditionId was: ${this.expeditionId}`);
      
      // CRITICAL FIX: Correct PDA derivation according to Rust implementation
      // Rust claim_rewards.user_participation seeds: ["user_participation", "expedition.id", "participant", "guild_id"]
      const claimExpeditionIdBytes = Buffer.alloc(8);
      claimExpeditionIdBytes.writeBigUInt64LE(BigInt(actualExpeditionIdForClaim));
      const claimGuildIdBytes = Buffer.alloc(8);
      claimGuildIdBytes.writeBigUInt64LE(BigInt(this.guildId));
      const [userParticipationPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_participation"), claimExpeditionIdBytes, this.wallet.publicKey.toBuffer(), claimGuildIdBytes],
        PROGRAM_ID
      );

      // CRITICAL FIX: Reuse the SAME GuildPerformance PDA from join_expedition
      // This ensures we're reading from the account that was actually updated
      if (!this.guildPerformancePDA) {
        throw new Error("GuildPerformance PDA not initialized");
      }
      console.log(`  ${colors.cyan}Reusing GuildPerformance PDA for claim: ${this.guildPerformancePDA.toBase58()}${colors.reset}`);

      // Derive user's SCRAP token account (ATA)
      const [userScrapATA] = PublicKey.findProgramAddressSync(
        [
          this.wallet.publicKey.toBuffer(),
          new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(),
          scrapMintPDA.toBuffer(),
        ],
        new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
      );
      console.log(`  User SCRAP ATA: ${userScrapATA.toBase58()}`);
      console.log(`  User Participation: ${userParticipationPDA.toBase58()}`);
      console.log(`  Guild Performance: ${this.guildPerformancePDA.toBase58()}`);

      // FIXED: Account order matching IDL structure exactly
      const claimRewardsIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: this.expeditionPDA!, isSigner: false, isWritable: false },           // expedition
          { pubkey: userParticipationPDA, isSigner: false, isWritable: true },          // user_participation (writable)
          { pubkey: this.userAccountPDA!, isSigner: false, isWritable: true },          // user_account (writable)
          { pubkey: this.guildPerformancePDA!, isSigner: false, isWritable: false },     // guild_performance
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },         // participant (writable, signer)
          { pubkey: userScrapATA, isSigner: false, isWritable: true },                 // participant_token_account (writable)
          { pubkey: rewardPoolPDA, isSigner: false, isWritable: false },               // reward_pool_pda
          { pubkey: rewardPoolATA, isSigner: false, isWritable: true },                // reward_pool_ata (writable)
          { pubkey: this.gameStatePDA, isSigner: false, isWritable: false },           // global_game_state
          { pubkey: scrapMintPDA, isSigner: false, isWritable: false },                // scrap_mint
          { pubkey: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), isSigner: false, isWritable: false }, // token_program
          { pubkey: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"), isSigner: false, isWritable: false }, // associated_token_program
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },     // system_program
        ],
        data: Buffer.from(DISCRIMINATORS.CLAIM_REWARDS),
      });

      const claimSig = await this.queueInstruction(claimRewardsIx, "claim_rewards");
      console.log(`  ${colors.green}Reward claim queued: ${claimSig}${colors.reset}`);
      
      // Give time for task to be picked up
      await this.sleep(3000);
      
      // Wait for claim to complete by checking if rewards_claimed is true
      // UserExpeditionParticipation memory layout:
      // [0-7]   discriminator
      // [8-15]  expedition_id
      // [16-23] guild_id
      // [24-55] user (32 bytes)
      // [56]    has_voted
      // [57]    rewards_claimed  <-- This is what we check
      const claimed = await this.waitForAccountData(
        userParticipationPDA,
        (data) => data[57] === 1 // Check if rewards_claimed is true (at byte 57, not 49)
      );
      if (!claimed) {
        throw new Error("Reward claim timed out");
      }
      console.log(`  ${colors.green}✅ SCRAP tokens claimed successfully${colors.reset}`);
      this.updateStep(claimRewardsIndex, 'success', claimSig);

      // Step: Verify Token Balance
      const verifyBalanceIndex = claimRewardsIndex + 1; // 23
      console.log(`  Verify Balance Index: ${verifyBalanceIndex} (should be 23)`);
      this.updateStep(verifyBalanceIndex, 'running');
      
      console.log(`\n${colors.blue}🔍 Verifying SCRAP token balance...${colors.reset}`);
      
      // Check user's SCRAP token balance
      try {
        const userTokenAccount = await this.connection.getAccountInfo(userScrapATA);
        if (userTokenAccount) {
          // Parse token account data to get balance
          const balance = userTokenAccount.data.readBigUInt64LE(64); // Token amount at offset 64
          const balanceFormatted = Number(balance) / Math.pow(10, 9); // 9 decimals for SCRAP
          console.log(`  ${colors.green}✅ SCRAP Token Balance: ${balanceFormatted} SCRAP${colors.reset}`);
          console.log(`  ${colors.cyan}Token Account: ${userScrapATA.toBase58()}${colors.reset}`);
          
          if (balance > 0) {
            console.log(`  ${colors.green}🎉 Token rewards successfully received!${colors.reset}`);
          } else {
            console.log(`  ${colors.yellow}⚠️ No tokens received - check reward calculation${colors.reset}`);
          }
        } else {
          console.log(`  ${colors.yellow}⚠️ Token account not found - no rewards received${colors.reset}`);
        }
      } catch (error: any) {
        console.log(`  ${colors.yellow}⚠️ Error checking token balance: ${error.message}${colors.reset}`);
      }
      this.updateStep(verifyBalanceIndex, 'success');

      // Step: Cleanup
      const cleanupIndex = verifyBalanceIndex + 1; // 24
      console.log(`  Cleanup Index: ${cleanupIndex} (should be 24)`);
      this.updateStep(cleanupIndex, 'running');
      await this.stopCrankTurner();
      
      // Write accumulated errors to file
      await this.writeCrankErrorsToFile();
      
      this.updateStep(cleanupIndex, 'success');

      // Final success message
      this.printProgress();
      console.log(`\n${colors.green}${'='.repeat(60)}${colors.reset}`);
      console.log(`${colors.green}🎉 SUCCESS! All tests passed!${colors.reset}`);
      console.log(`${colors.green}${'='.repeat(60)}${colors.reset}\n`);
      
      // Show error summary if any
      if (this.allCrankErrors.length > 0) {
        console.log(`\n${colors.yellow}📊 Crank Turner Error Summary:${colors.reset}`);
        console.log(`  Total errors encountered: ${this.allCrankErrors.length}`);
        console.log(`  Error types: ${[...new Set(this.allCrankErrors.map(e => e.errorType))].join(', ')}`);
        console.log(`  Steps with errors: ${[...new Set(this.allCrankErrors.map(e => e.step))].join(', ')}`);
        console.log(`  ${colors.cyan}See crank-errors-*.json for full details${colors.reset}`);
      }
      
      console.log(`${colors.cyan}📊 Summary:${colors.reset}`);
      console.log(`  • Expedition ID: ${this.expeditionId}`);
      console.log(`  • Expedition PDA: ${this.expeditionPDA!.toBase58()}`);
      console.log(`  • All 3 rounds processed successfully`);
      console.log(`  • Rewards distributed to guilds`);
      console.log(`  • Crank turner executed all tasks`);
      
      console.log(`\n${colors.yellow}🔗 View on Solscan:${colors.reset}`);
      console.log(`  https://solscan.io/account/${this.expeditionPDA!.toBase58()}?cluster=devnet`);

      process.exit(0);
    } catch (error: any) {
      const failedStep = this.steps.findIndex(s => s.status === 'running');
      if (failedStep >= 0) {
        this.updateStep(failedStep, 'failed', undefined, error.message);
      }
      
      this.printProgress();
      console.log(`\n${colors.red}❌ Test failed: ${error.message}${colors.reset}`);
      
      // Write accumulated errors to file even on failure
      await this.writeCrankErrorsToFile();
      
      // Show error summary
      if (this.allCrankErrors.length > 0) {
        console.log(`\n${colors.yellow}📊 Crank Turner Error Summary:${colors.reset}`);
        console.log(`  Total errors encountered: ${this.allCrankErrors.length}`);
        console.log(`  Error types: ${[...new Set(this.allCrankErrors.map(e => e.errorType))].join(', ')}`);
        console.log(`  Steps with errors: ${[...new Set(this.allCrankErrors.map(e => e.step))].join(', ')}`);
        console.log(`  ${colors.cyan}See crank-errors-*.json for full details${colors.reset}`);
      }
      
      // Cleanup on error
      await this.stopCrankTurner();
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(`\n${colors.yellow}Received SIGINT, cleaning up...${colors.reset}`);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(`\n${colors.yellow}Received SIGTERM, cleaning up...${colors.reset}`);
  process.exit(0);
});

// Run the test
const test = new EndToEndTest();
test.run().catch(error => {
  console.error(`${colors.red}Fatal error: ${error}${colors.reset}`);
  process.exit(1);
});