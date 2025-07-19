# 🏗️ NFT Staking Program - ELI5 Architectural Diagram

## 🅿️ **Think of it as a Magical Parking Garage for NFTs**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    🏢 THE MAGIC PARKING GARAGE                      │
│                        (Your Solana Program)                        │
└─────────────────────────────────────────────────────────────────────┘

🎯 **WHAT HAPPENS:**
People park their valuable NFTs (like rare digital trading cards) 
and earn reward points the longer they keep them parked!

═══════════════════════════════════════════════════════════════════════

## 📋 **THE GARAGE RULES BOARD** (StakeConfig)
```
┌─────────────────────────────────────────┐
│          🪧 GARAGE RULES                │
│                                         │
│  💰 Points per parked NFT: 5/day        │
│  🚗 Max NFTs you can park: 10           │
│  ⏰ Must stay parked for: 7 days        │
│  🎁 Reward token: MAGIC_COINS           │
│                                         │
│  📍 Address: Always at "config" corner  │
└─────────────────────────────────────────┘
```
**Real Code:** `StakeConfig` struct with global settings

═══════════════════════════════════════════════════════════════════════

## 👤 **YOUR CUSTOMER LOYALTY CARD** (UserAccount)
```
┌─────────────────────────────────────────┐
│       🏷️ ALICE'S LOYALTY CARD           │
│                                         │
│  ⭐ Total Points Earned: 150            │
│  🚗 Currently Parked NFTs: 3            │
│                                         │
│  📍 Address: "user_alice" spot          │
└─────────────────────────────────────────┘
```
**Real Code:** `UserAccount` - tracks your overall progress

═══════════════════════════════════════════════════════════════════════

## 🅿️ **INDIVIDUAL PARKING SPOTS** (StakeAccount)
```
Spot A: ["stake_coolNFT123_alice"]     Spot B: ["stake_rareCard456_alice"]
┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│    🚗 PARKED: CoolNFT#123       │    │    🏎️ PARKED: RareCard#456     │
│    👤 Owner: Alice              │    │    👤 Owner: Alice              │
│    📅 Parked Since: Jan 1       │    │    📅 Parked Since: Jan 5       │
│    ⏱️ Duration: 10 days         │    │    ⏱️ Duration: 6 days          │
└─────────────────────────────────┘    └─────────────────────────────────┘
```
**Real Code:** Each `StakeAccount` tracks one NFT's parking session

═══════════════════════════════════════════════════════════════════════

## 🔄 **THE MAGICAL PROCESS FLOW**

### 1️⃣ **GARAGE SETUP** (initialize_config.rs)
```
🏗️ Admin builds the garage:
   ┌─── Sets up the rules board (StakeConfig)
   ├─── Creates reward token mint (MAGIC_COINS)
   └─── Uses magic seeds: ["config"] & ["rewards", config]
```

### 2️⃣ **CUSTOMER ARRIVES** (Future: stake instruction)
```
👤 Alice drives up with NFT:
   ┌─── Checks garage rules ✅
   ├─── Creates loyalty card if first time (UserAccount)
   ├─── Finds empty parking spot (StakeAccount)
   ├─── Parks NFT in spot 🅿️
   └─── Starts earning points! ⭐
```

### 3️⃣ **DAILY MAGIC** (Future: claim rewards)
```
🕰️ Every day:
   ┌─── Garage calculates: days_parked × points_per_stake
   ├─── Updates loyalty card points
   └─── Customer can withdraw MAGIC_COINS 🪙
```

### 4️⃣ **CUSTOMER LEAVES** (Future: unstake instruction)
```
🚗 Alice retrieves her NFT:
   ┌─── Must wait minimum time (freeze_period) ⏳
   ├─── Gets final points calculation
   ├─── NFT returned to wallet 
   └─── Parking spot becomes empty 🅿️
```

═══════════════════════════════════════════════════════════════════════

## 🗺️ **ADDRESS MAP** (How to find everything)

```
🏢 The Garage Program: nft_staking_program_id

📍 **Predictable Addresses** (PDAs - Program Derived Addresses):
├─ 🪧 Rules Board:     ["config"] 
├─ 🪙 Reward Mint:     ["rewards", config_address]
├─ 👤 Alice's Card:    ["user", alice_wallet]
├─ 🅿️ Parking Spot A:  ["stake", nft_mint_A, alice_wallet]
└─ 🅿️ Parking Spot B:  ["stake", nft_mint_B, alice_wallet]
```

**Why predictable?** So you can always find your stuff without keeping track of addresses!

═══════════════════════════════════════════════════════════════════════

## 🔍 **KEY RELATIONSHIPS**

1. **One Garage** → Many Customer Cards → Many Parking Spots
2. **StakeConfig** (rules) → **UserAccount** (your totals) → **StakeAccount** (individual NFTs)
3. **Anchor Magic**: Automatically calculates addresses and manages PDA bumps
4. **Security**: Only you can park/unpark your NFTs, only admin can change rules

═══════════════════════════════════════════════════════════════════════

## 💡 **WHY THIS ARCHITECTURE ROCKS**

✅ **Scalable**: Each NFT gets its own parking spot (no conflicts)
✅ **Efficient**: Customer cards aggregate data (no scanning all spots)
✅ **Secure**: Predictable but protected addresses
✅ **Flexible**: Easy to add new features (VIP spots, different point rates)

**The genius:** Separate global rules, user totals, and individual stakes!