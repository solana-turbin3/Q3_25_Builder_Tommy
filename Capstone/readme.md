# Accomplishments

1. full end to end functionality on devnet
2. each round processes user votes with pseudo-random results
3. GuildPerformance struct records each round for stats that are processed at the end of the game for reward distribution
4. RewardPool holds all the supply of SCRAP, and lets users claim their rewards

# What I had to get rid of and what would be implemented in Production

1. MagicBlock VRF. After debugging Tuktuk for quite a while, I tried to do a simple implementation of Magicblock VRF but got confused by the Magicblock devnet versus Solana devnet and I could not figure out the intricacies in time after some initial discord searches and looking through the `/magicblock-engine-examples`. I was afraid I would break my Tuktuk implementation if I went any further, so I opted for simple randomness with low entropy for this capstone. In prod, we would obviously get MagicBlock VRF working for true ungameable randomness.

2. Discord bot. This was intended to be the "operating system" for the game and handle the flow of user interactions. In prod, this is necessary and the core feature of the game. 

3. Auto-dispersal of rewards. I changed distribute rewards to a claim rewards because Tuktuk was having some issues with my implementation that I did not have time to debug. For the capstone, the user claims the rewards after the calculations are processed.

# Things made using AI or AI-assistance and research

Both tests were developed using AI. I ran out of time to dive into learning Typescript very well, so I used AI to help me with the tests for `e2e-test.ts` and `wasteland-runners.ts`. `e2e-test.ts` is the primary test that I used to make sure the program worked end-to-end in realtime as though a game was being played. I spent the most time on this test (~2 days) to troubleshoot and debug the entire program. Once the whole program passed in real-time, I created `wasteland-runners.ts` to do a more simple solana kit test to make sure all our program instructions are set up correctly.

# Setting up the tests

### wasteland-runners.ts
This is in `tests/wasteland-runners.ts` and it's basically just checking that all our program instructions are set up correctly. It doesn't actually send any transactions or anythingjust validates that the data structures are right. It should work out of the box once you install the main repo.

```bash
npx tsx --test tests/wasteland-runners.ts
```
<img width="912" height="562" alt="image" src="https://github.com/user-attachments/assets/8f758744-9252-4e06-92d4-160c4ead9951" />
<img width="1238" height="1298" alt="image" src="https://github.com/user-attachments/assets/d761920d-3d07-46d3-b3b5-47f67b011296" />



### e2e-test.ts
This is in `scripts/tuktuk-integration/src/e2e-test.ts` and it actually runs a complete game from start to finish on devnet. You have to adjust a few things to get it to work yourself. 

The e2e test uses the `@helium/tuktuk-sdk` package, which is the client-side package, and it directly conflicts with `@helium/tuktuk-program`, which is the onchain program. This is why it is in its own subfolder and you need to install the packages seperately.


## Setup Instructions

### Step 1: Main Project Setup


First, build and deploy the main Anchor program from the root directory:

```bash
# Build the program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Run the quick validation test
npx tsx --test tests/wasteland-runners.ts

# Change any leftover program_ids if there are any
# change all instances of 81zfvbGkhnSgAg24xtC7f24N3TKfanNs7426RkzBUmsx to your new program id so the tests work properly
```


### Step 2: e2e Test Setup

The E2E test has its own dependencies in the `scripts/tuktuk-integration` folder:

```bash
# Go to the E2E test directory
cd scripts/tuktuk-integration

# Install E2E test dependencies
npm install

# Make sure your wallet has some SOL cause it will need it to both deploy the program to devnet, and fund the Tuktuk crank turner that we have to set up (there is no Devnet crank turner run by Helium)
solana airdrop 5 --url devnet

```

### Step 3: configure for Your Program

using your own deployed program, update the program ID in both files -- if you haven't already done the global replace from line 53 of this document:

**In `scripts/tuktuk-integration/src/initialize-game.ts` (line 19):**
```typescript
const PROGRAM_ID = new PublicKey("YOUR_PROGRAM_ID_HERE");
```

**In `scripts/tuktuk-integration/src/e2e-test.ts` (line 38):**
```typescript
const PROGRAM_ID = new PublicKey("YOUR_PROGRAM_ID_HERE");
```

### Step 4: Run the E2E Test

```bash
# Initialize game state (required before E2E test). this will initialize all the necessary accounts for the game to run in the full e2e test
npx ts-node src/initialize-game.ts

# Run the full E2E test
npx ts-node src/e2e-test.ts
```

### What You'll See

the E2E test is pretty verbose. it will show you a progress screen that updates as it goes through all the steps:

- Creates an expedition
- Creates a user account
- Joins the expedition
- Starts it
- Runs 3 rounds of voting and processing
- Completes the expedition
- Distributes rewards
- Claims tokens
<img width="2226" height="1628" alt="image" src="https://github.com/user-attachments/assets/d45eb0aa-4698-44eb-b87a-8ec8b11ad200" />



The whole thing takes a few minutes and you'll see a bunch of transaction links you can check on Solscan to double-check it's going through. Sometimes it will hang on a step for quite a while because devnet is slow and i think Tuktuk needs a better mainnet RPC to be performant.

