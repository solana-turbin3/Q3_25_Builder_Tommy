# Tuktuk Integration for Wasteland Runners

This directory contains a complete end-to-end test for the Wasteland Runners game with Tuktuk crank turner integration.

## Important: Queue Funding Requirements

Since our `tuktuk_crank_create_expedition` instruction schedules other tasks (it's recursive), the task queue MUST be funded. The funding amount is used to pay for tasks that are queued by other tasks.

## Overview

The e2e-test.ts script provides a fully automated test that:
- Uses a properly funded Tuktuk task queue for recursive tasks
- Spawns a crank turner process to execute tasks
- Queues all expedition tasks (create, start, process rounds, complete, distribute rewards)
- Monitors task execution with live progress tracking
- Provides visual feedback with checkmarks and progress bars
- Automatically cleans up resources when complete

## Prerequisites

1. **Solana CLI** installed and configured
2. **Cargo** (Rust) installed for building the crank turner
3. **Node.js** v16+ and npm
4. **Wallet** configured at `~/.config/solana/id.json` with at least 1.3 SOL on devnet
5. **Program deployed** to devnet (ID: `81zfvbGkhnSgAg24xtC7f24N3TKfanNs7426RkzBUmsx`)
6. **Game state initialized** on devnet (use `npm run init` if not already done)
7. **Tuktuk CLI** installed: `cargo install tuktuk-cli`

## Installation

```bash
# Install dependencies
cd scripts/tuktuk-integration
npm install

# Install Tuktuk CLI and crank turner if not already installed
cargo install tuktuk-cli
cargo install tuktuk-crank-turner
```

## Setup Process

### Step 1: Initialize Game State (REQUIRED IF NOT DONE)

If the game hasn't been initialized on devnet yet, run:

```bash
npm run init
```

This script will:
1. Initialize the global game state PDA at the correct address
2. Create the reward pool PDA and SCRAP token mint
3. Set up the reward pool's associated token account
4. Mint the initial SCRAP token supply to the reward pool
5. Transfer and remove token authorities for immutability

The script checks if the game is already initialized and will skip if already done.

### Step 2: Queue Management (REQUIRED)

Before running the E2E test, you MUST set up a properly funded task queue:

```bash
npm run setup
# or
npm run manage-queues
```

This script will:
1. List existing task queues and check for active tasks
2. Close old queues to recover SOL deposits (1 SOL per queue)
3. Create a new queue with:
   - 0.1 SOL funding for recursive tasks
   - 0.001 SOL crank reward per task
   - Capacity for 10 concurrent tasks
   - 1 SOL deposit (refundable on queue close)

### Step 3: Run the E2E Test

After setting up the queue:

```bash
npm run e2e
```

The test will:
1. Load the queue configuration from `queue-config.json`
2. Automatically install and start the `tuktuk-crank-turner` process
3. Queue all expedition tasks in sequence
4. Wait for the crank turner to execute each task
5. Display live progress with visual feedback
6. Stop the crank turner and exit when complete

## Available Scripts

- `npm run init` - Initialize the game state on devnet (run once if needed)
- `npm run setup` - Set up a funded task queue (run before each test session)
- `npm run e2e` - Run the complete end-to-end test
- `npm run list-tasks` - List active tasks in the queue
- `npm run crank-turner` - Manually start the crank turner

## Monitoring Tasks

To monitor active tasks in the queue:

```bash
npm run list-tasks
# or
tuktuk -u https://api.devnet.solana.com task list --task-queue-name wasteland-runners-queue
```

You can filter by task description:
```bash
tuktuk -u https://api.devnet.solana.com task list --task-queue-name wasteland-runners-queue --description create_expedition
```

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   E2E Test      │────▶│  Funded Queue    │◀────│  Crank Turner   │
│  (TypeScript)   │     │   (On-chain)     │     │  (Rust Binary)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                      │                            │
        │                      │ 0.1 SOL funding           │
        ▼                      ▼                            ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Queue Tasks:    │    │ Recursive Tasks: │    │ Execute Tasks:  │
│ - Create Exp.*  │───▶│ - Schedule next  │    │ - Turn Cranks   │
│ - Start Exp.    │    │ - Uses funding   │    │ - Process Txs   │
│ - Process Rounds│    └──────────────────┘    │ - Earn Rewards  │
│ - Complete      │                             └─────────────────┘
│ - Distribute    │
└─────────────────┘
* Create Expedition is recursive - it schedules other tasks
```

## Configuration

The crank turner configuration is in `crank-turner-config.toml`:
```toml
rpc_url = "https://api.devnet.solana.com"
key_path = "/home/user/.config/solana/id.json"
min_crank_fee = 10000
```

Queue configuration (created by setup script) in `queue-config.json`:
```json
{
  "queueName": "wasteland-runners-queue",
  "fundingAmount": 100000000,  // 0.1 SOL for recursive tasks
  "crankReward": 1000000,      // 0.001 SOL per task
  "capacity": 10
}
```

## Test Steps

The test executes 18 steps in total:

1. **Setup** - Initialize Tuktuk SDK and verify funded task queue
2. **Check Balance** - Ensure wallet has sufficient SOL
3. **Start Crank Turner** - Launch the crank turner process
4. **Create Expedition** - Queue task to create new expedition (recursive)
5. **Wait for Creation** - Verify expedition account created
6. **Start Expedition** - Queue task to start expedition with VRF
7. **Wait for Start** - Verify expedition status changed to Active
8-13. **Process Rounds 1-3** - Queue and verify each round processing
14. **Complete Expedition** - Queue task to complete expedition
15. **Wait for Completion** - Verify expedition status changed to Completed
16. **Distribute Rewards** - Queue task to distribute rewards
17. **Wait for Rewards** - Verify rewards distributed flag set
18. **Cleanup** - Stop crank turner and exit

## Output

The test provides real-time visual feedback:
- ✅ Green checkmarks for completed steps
- ⏳ Yellow spinner for running steps
- ❌ Red X for failed steps
- Progress bar showing overall completion
- Live crank turner activity log
- Queue funding status

## Wallet Requirements

**Minimum 1.3 SOL in wallet**:
- 1 SOL for queue deposit (refundable)
- 0.1 SOL for queue funding (for recursive tasks)
- 0.1 SOL for game initialization (one-time, if needed)
- 0.1 SOL for transaction fees and buffer

## Troubleshooting

### "Game state not initialized" or "AccountOwnedByWrongProgram"
Run `npm run init` first to initialize the game state on devnet.

### "Task queue not found"
Run `npm run setup` to create and fund the queue.

### "Seeds constraint violation"
This occurs when the expedition ID changes between task queueing and execution. The setup script ensures proper queue funding to prevent this.

### "Insufficient queue funding"
The queue needs funding for recursive tasks. Run `npm run setup` to create a properly funded queue.

### Check wallet balance
Ensure you have enough SOL on devnet:
```bash
solana balance
```

### Verify program deployment
Confirm program is deployed to the correct address:
```bash
solana program show 81zfvbGkhnSgAg24xtC7f24N3TKfanNs7426RkzBUmsx
```

### Check Queue Status
```bash
tuktuk -u https://api.devnet.solana.com task-queue get --task-queue-name wasteland-runners-queue
```

### Fund an Existing Queue
If you need to add more funding to an existing queue:
```bash
tuktuk -u https://api.devnet.solana.com task-queue fund --task-queue-name wasteland-runners-queue --amount 100000000
```

### RPC Issues
The default devnet RPC may have rate limits. Consider using a custom RPC endpoint.

### Crank Turner Installation
If installation fails, manually install with:
```bash
cargo install tuktuk-crank-turner
```

## Clean Up

To close the queue and recover funds:
```bash
tuktuk -u https://api.devnet.solana.com task-queue remove-queue-authority --task-queue-name wasteland-runners-queue --queue-authority <your-wallet>
tuktuk -u https://api.devnet.solana.com task-queue close --task-queue-name wasteland-runners-queue
```

This will refund:
- The 1 SOL deposit
- Any remaining queue funding

## Dependencies

This package uses isolated dependencies to avoid conflicts with the main project:
- `@helium/tuktuk-sdk` - Tuktuk SDK for task queue management
- `@helium/tuktuk-idls` - Tuktuk program IDLs
- `@solana/web3.js` - Solana Web3 library (incompatible with main project's @solana/kit)
- `@coral-xyz/anchor` - Anchor framework

## Notes

- The crank turner runs as a child process and is automatically managed
- Tasks are queued with a 0.001 SOL crank reward
- The test waits up to 60 seconds for each task to be executed
- All resources are cleaned up on exit (including SIGINT/SIGTERM)
- Queue funding is essential for recursive tasks like `create_expedition`