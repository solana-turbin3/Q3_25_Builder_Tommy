# Withdraw CPI Flow: Visual Diagram

## The Complete Withdraw Process

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            WITHDRAW FUNCTION EXECUTION                              │
└─────────────────────────────────────────────────────────────────────────────────────┘

1. SETUP CPI PROGRAM AND ACCOUNTS
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  let cpi_program = self.system_program.to_account_info();                          │
│  let cpi_accounts = Transfer {                                                      │
│      from: self.vault.to_account_info(),    ← VAULT (PDA) sends SOL               │
│      to: self.signer.to_account_info(),     ← SIGNER receives SOL                 │
│  };                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────┘

2. CREATE PDA SIGNING SEEDS (Lines 166-170)
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  let pda_signing_seeds = [                                                         │
│      b"vault",                              ← Seed 1: Static string               │
│      self.signer.key.as_ref(),              ← Seed 2: ✅ User's wallet key         │
│      &[self.vault_state.vault_bump],        ← Seed 3: Bump byte                   │
│  ];                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────┘

3. WRAP SEEDS FOR CPICONTEXT (Line 173)
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  let seeds = [&pda_signing_seeds[..]];      ← Add extra nesting level             │
└─────────────────────────────────────────────────────────────────────────────────────┘

4. CREATE CPI CONTEXT WITH SIGNER PROOF (Line 176)
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, &seeds);    │
└─────────────────────────────────────────────────────────────────────────────────────┘

5. EXECUTE TRANSFER
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  transfer(cpi_ctx, amount)?;                                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Memory Layout: Seeds Structure

```
INDIVIDUAL SEED COMPONENTS:
┌──────────────┬─────────────────────────────┬─────────────────┐
│   b"vault"   │    signer.key.as_ref()      │   &[bump_byte]  │
│   &[u8; 5]   │         &[u8]               │     &[u8]       │
│  (5 bytes)   │       (32 bytes)            │   (1 byte)      │
└──────────────┴─────────────────────────────┴─────────────────┘

ASSEMBLED INTO pda_signing_seeds:
┌─────────────────────────────────────────────────────────────────┐
│                    [&[u8], &[u8], &[u8]]                       │
│                         ↓                                       │
│    Individual seeds that recreate the original PDA derivation  │
└─────────────────────────────────────────────────────────────────┘

WRAPPED FOR CPICONTEXT as seeds:
┌─────────────────────────────────────────────────────────────────┐
│                      [&[&[u8]]]                                 │
│                         ↓                                       │
│    Array of PDA seed sets (we only have one PDA to sign for)   │
└─────────────────────────────────────────────────────────────────┘
```

## The Mathematical Proof

```
PDA DERIVATION FORMULA:
vault_address = hash(["vault", signer_key, bump], program_id)

WHAT WE'RE PROVING:
"I know the seeds that derive this PDA address, therefore I control it"

VERIFICATION PROCESS:
┌─────────────────────────────────────────────────────────────────┐
│ 1. System Program receives our seed set                        │
│ 2. System Program recreates: hash(seeds, program_id)           │
│ 3. Compares result with vault account address                  │
│ 4. If match → "This program controls this PDA" ✅              │
│ 5. If no match → "Invalid signer seeds" ❌                     │
└─────────────────────────────────────────────────────────────────┘
```

## Critical Verification Points

```
✅  SEED CONSISTENCY VERIFIED:

ACCOUNT CONSTRAINT (Line 93):
seeds = [b"vault", signer.key().as_ref()]
                   ^^^^^^^^^^^^^^^^^

IMPLEMENTATION (Line 168):
self.signer.key.as_ref()
^^^^^^^^^^^^^^^^^^^^^

RESULT: Perfect match! ✅ PDA derivation is identical.
```

## Data Flow Visualization

```
USER CALLS withdraw(amount)
         ↓
┌─────────────────────────────────────────────────────────────────┐
│  VAULT PDA NEEDS TO SIGN THE TRANSFER                          │
│  (PDAs can't literally sign, so we provide mathematical proof) │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│  CREATE EXACT SEEDS THAT WERE USED TO DERIVE THE VAULT PDA     │
│  [b"vault", signer_key, bump] → Must match original derivation │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PACKAGE SEEDS FOR CPICONTEXT                                  │
│  CpiContext expects: &[&[&[u8]]] (3 levels of nesting)        │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│  SYSTEM PROGRAM VERIFIES SEEDS DERIVE TO VAULT ADDRESS         │
│  If valid → Transfer authorized ✅                              │
│  If invalid → Transaction fails ❌                             │
└─────────────────────────────────────────────────────────────────┘
```

## Type Transformations

```
STEP 1: Raw Components
b"vault"                          → &[u8; 5]
signer_key.as_ref()              → &[u8]
&[vault_bump]                    → &[u8]

STEP 2: Array Assembly  
[seed1, seed2, seed3]            → [&[u8]; 3]

STEP 3: CpiContext Wrapping
[&pda_signing_seeds[..]]         → [&[&[u8]]; 1]

STEP 4: Reference for CpiContext
&seeds                           → &[&[&[u8]]]