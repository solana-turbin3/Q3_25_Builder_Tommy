# Signer Seeds Structure Diagram

## Multiple Levels of Nesting

### Level 1: Individual Seeds (What goes inside a PDA derivation)
```
Individual seed components:
┌─────────────┐  ┌──────────────────────┐  ┌──────────────┐
│  b"vault"   │  │ signer.key().as_ref()│  │ &vault_bump  │
│   &[u8]     │  │       &[u8]          │  │    &[u8]     │
└─────────────┘  └──────────────────────┘  └──────────────┘
```

### Level 2: Seed Set (One PDA's complete seed collection)
```
One PDA's seeds (what you have now):
┌─────────────────────────────────────────────────────────────────┐
│  &[b"vault", signer.key.as_ref(), &vault_bump]                 │
│                    &[&[u8]]                                     │
│  "Array of references to byte slices"                          │
└─────────────────────────────────────────────────────────────────┘
```

### Level 3: Multiple PDAs (What CpiContext expects)
```
Array of PDA seed sets (what CpiContext wants):
┌─────────────────────────────────────────────────────────────────┐
│  &[                                                             │
│    &[b"vault", signer.key.as_ref(), &vault_bump],             │
│    // Could have more PDA seed sets here if needed              │
│  ]                                                              │
│                    &[&[&[u8]]]                                  │
│  "Array of arrays of references to byte slices"                │
└─────────────────────────────────────────────────────────────────┘
```

## Your Current Code vs What CpiContext Needs

### What You Have:
```rust
let signer_seeds: &[&[u8]] = &[
    b"vault",
    signer_key.as_ref(),
    &vault_bump,
];
```

### What CpiContext::new_with_signer Expects:
```rust
let signer_seeds: &[&[&[u8]]] = &[
    &[b"vault", signer_key.as_ref(), &vault_bump],
];
```

## Visual Comparison

### Your Structure:
```
&[item1, item2, item3]
 ↓
&[&[u8]]  ← Single array of byte slice references
```

### CpiContext Expected Structure:
```
&[&[item1, item2, item3]]
 ↓    ↓
 │    └── &[&[u8]]  ← One PDA's seed set
 └── &[&[&[u8]]]    ← Array of PDA seed sets
```

## The Solution Pattern

### Current (Doesn't work with CpiContext):
```rust
let signer_seeds = &[b"vault", signer_key.as_ref(), &vault_bump];
//                   ^─── This is &[&[u8]]
```

### Fixed (Works with CpiContext):
```rust
let signer_seeds = &[&[b"vault", signer.key.as_ref(), &vault_bump]];
//                   ↑ ↑
//                   │ └── This is &[&[u8]] (one PDA's seeds)
//                   └── This is &[&[&[u8]]] (array of PDA seed sets)
```

## Why The Extra Nesting?

**Conceptual Reason:**
- CpiContext can handle transactions where multiple PDAs need to sign
- Each PDA has its own set of seeds
- So CpiContext expects: "Array of [PDA1_seeds, PDA2_seeds, ...]"
- Even if you only have one PDA, you still need the outer array

**Real-world Example:**
```rust
// If you had 2 PDAs signing:
let signer_seeds = &[
    &[b"vault", signer.key.as_ref(), &vault_bump],      // PDA 1
    &[b"escrow", signer.key.as_ref(), &escrow_bump],    // PDA 2
];
```

## Memory Layout Visualization

```
What CpiContext sees:
┌─────────────────────────────────────┐
│ Pointer to Array of PDA Seed Sets   │
│ ┌─────────────────────────────────┐ │
│ │ PDA 1 Seed Set                  │ │
│ │ ┌──────┬──────────┬───────────┐ │ │
│ │ │b"va" │signer_key│vault_bump │ │ │
│ │ │ult"  │          │           │ │ │
│ │ └──────┴──────────┴───────────┘ │ │
│ └─────────────────────────────────┘ │
│ (Could have more PDA seed sets)     │
└─────────────────────────────────────┘
```

## Quick Fix Reference

**Change this:**
```rust
let signer_seeds: &[&[u8]] = &[/*...*/];
```

**To this:**
```rust
let signer_seeds: &[&[&[u8]]] = &[&[/*...*/]];
```

The key insight: Add one more `&[...]` wrapper around your existing seed array!