# Vault System Architecture - Discovery Diagram

## The Two-Account Pattern

```
USER: Alice (Public Key: ABC123...)
│
│ (wants to create a vault)
│
▼

┌─────────────────────────────────────────────────────────────┐
│                     VAULT SYSTEM                           │
│                                                             │
│  Account #1: "VAULT Account"                               │
│  ┌─────────────────────────────────────┐                   │
│  │ Type: PDA (SystemAccount)            │                   │
│  │ Owner: Program                       │                   │
│  │ Seeds: [b"vault", alice_pubkey]      │                   │
│  │ Contains: SOL Balance                │                   │
│  │ Purpose: Holds the actual SOL        │                   │
│  └─────────────────────────────────────┘                   │
│               │                                             │
│               │ (connected by shared user)                  │
│               │                                             │
│  Account #2: "STATE Account"                               │
│  ┌─────────────────────────────────────┐                   │
│  │ Type: PDA (Custom Account)           │                   │
│  │ Owner: Program                       │                   │
│  │ Seeds: [b"state", alice_pubkey]      │                   │
│  │ Contains: vault_bump, state_bump     │                   │
│  │ Purpose: Stores metadata/info        │                   │
│  └─────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘

## Operations:

DEPOSIT: User sends SOL → ??????? → ???????

WITHDRAW: ??????? → User receives SOL (but only if ???????)

```

## Discovery Questions:

1. What should Account #1 be responsible for?
2. What should Account #2 be responsible for?
3. Who should "own" each account?
4. How do the accounts work together?