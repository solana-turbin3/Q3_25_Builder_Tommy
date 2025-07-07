# Rust/Anchor Code Structure Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                         lib.rs FILE                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │               1. IMPORTS & SETUP                        │    │
│  │   use anchor_lang::{prelude::*, system_program::...};   │    │
│  │   declare_id!("BS7k...");                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           2. PROGRAM MODULE (Entry Points)              │    │
│  │   #[program]                                            │    │
│  │   pub mod day1_vault {                                  │    │
│  │       pub fn initialize(ctx: Context<Initialize>) {...} │    │
│  │       pub fn deposit(ctx: Context<Deposit>, amt) {...}  │    │
│  │       pub fn withdraw(ctx: Context<Withdraw>, amt) {...}│    │
│  │       pub fn close(ctx: Context<Close>) {...}           │    │
│  │   }                                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │         3. ACCOUNT STRUCTS (What accounts needed)       │    │
│  │                                                         │    │
│  │   Initialize<'info> ──┐                                │    │
│  │   Deposit<'info> ─────┼── These define what accounts   │    │
│  │   Withdraw<'info> ────┼── each function needs to work  │    │
│  │   Close<'info> ───────┘                                │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │       4. IMPLEMENTATION BLOCKS (Business Logic)        │    │
│  │                                                         │    │
│  │   impl Initialize { initialize() {...} }               │    │
│  │   impl Deposit { deposit() {...} }                     │    │
│  │   impl Withdraw { withdraw() {...} }                   │    │
│  │   impl Close { close() {...} }                         │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │         5. DATA STRUCTURES (What data to store)        │    │
│  │                                                         │    │
│  │   #[account]                                            │    │
│  │   pub struct VaultState {                               │    │
│  │       vault_bump: u8,                                   │    │
│  │       state_bump: u8,                                   │    │
│  │   }                                                     │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

## Flow: Client Calls Function → Account Struct → Implementation Logic
                               ↓
                        Uses Data Structures
```

## Code Relationship Flow:
1. **Client calls** `initialize()` 
2. **Anchor loads** accounts defined in `Initialize<'info>`
3. **Program executes** logic in `impl Initialize { initialize() }`
4. **Logic manipulates** data in `VaultState` struct