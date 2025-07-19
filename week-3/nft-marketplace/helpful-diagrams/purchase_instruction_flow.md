# Visual Flow of the `Purchase` Instruction

This document provides a high-level, text-based diagram illustrating the relationships between the key accounts in the `Purchase` instruction and the flow of assets during an NFT purchase transaction.

---

### **Diagram Key:**
-   `[ ACCOUNT ]` -> A primary account involved in the flow.
-   `-->` -> Shows a relationship or data flow.
-   `(PDA)` -> Indicates the account is a Program Derived Address.
-   `{ Action }` -> Denotes a critical operation or transfer.
-   `💰` -> SOL/Lamport transfers
-   `🖼️` -> NFT transfers

---

### **High-Level Purchase Flow**

```
                                        +-----------------------------+
                                        |      🛒 Taker (Buyer)       |
                                        |        (Signer)            |
                                        +-----------------------------+
                                                   |
                                                   | Pays SOL & Receives NFT
                                                   V
+--------------------------------------------------------------------------+
|                                                                          |
|                       PURCHASE INSTRUCTION EXECUTION                     |
|                                                                          |
|  { 1. send_sol() }    { 2. send_nft() }    { 3. close_mint_vault() }     |
|                                                                          |
+--------------------------------------------------------------------------+
                                                   |
                    +------------------------------+------------------------------+
                    |                                                             |
                    V                                                             V
        +-----------------------------+                            +-----------------------------+
        |  💰 SOL Distribution        |                            |  🖼️ NFT Transfer            |
        +-----------------------------+                            +-----------------------------+
                    |                                                             |
        +-----------+------------+                                    +-----------+------------+
        |                        |                                    |                        |
        V                        V                                    V                        V
+----------------+    +------------------+                +------------------+    +------------------+
|  👤 Maker      |    |  🏛️ Treasury     |                |  🔐 Vault (PDA)  |    |  🛒 Taker ATA    |
|  (Gets Price   |    |  (Gets Fees)     |                |  (Holds NFT)     |    |  (Receives NFT)  |
|   - Fees)      |    |                  |                |                  |    |                  |
+----------------+    +------------------+                +------------------+    +------------------+

```

### **Detailed Transaction Flow**

```
+-----------------------------+
|      🛒 Taker (Buyer)       |
|        (Signer)            |
+-----------------------------+
           |
           | { Initiates Purchase }
           V
+-----------------------------+     +--------------------------------+
|  📄 Listing Account (PDA)   | --> |  🔐 Vault Account (PDA)        |
|  (Contains: price, maker,   |     |  (Escrows the NFT)             |
|   mint, bump)              |     |  Authority: Listing            |
+-----------------------------+     +--------------------------------+
           |                                     |
           | { Controls & Authorizes }           | { Holds NFT }
           |                                     |
           V                                     V
+--------------------------------------------------------------------------+
|                         EXECUTION SEQUENCE                               |
|                                                                          |
|  1️⃣ send_sol():                                                          |
|     💰 Taker --> Maker (listing.price - marketplace_fee)                |
|     💰 Taker --> Treasury (marketplace_fee)                             |
|                                                                          |
|  2️⃣ send_nft():                                                          |
|     🖼️ Vault --> Taker_ATA (1 NFT)                                       |
|     Authority: Listing (with PDA seeds)                                 |
|                                                                          |
|  3️⃣ close_mint_vault():                                                  |
|     🔐 Vault Account --> Closed                                          |
|     💰 Remaining rent --> Maker                                         |
|     📄 Listing Account --> Closed (rent to Maker)                       |
+--------------------------------------------------------------------------+

```

### **Authority & Ownership Flow**

```
+-----------------------------+
|  🔐 Vault Account (PDA)      |
|  Authority: Listing         |
+-----------------------------+
           |
           | { Signing Authority via PDA Seeds }
           V
+-----------------------------+
|  📄 Listing Account (PDA)   |
|  Seeds: [marketplace_key,   |
|          maker_mint_key]    |
|  Bump: listing.bump         |
+-----------------------------+
           |
           | { Signs on behalf of Vault }
           V
+-----------------------------+
|  🖼️ NFT Transfer            |
|  From: Vault               |
|  To: Taker_ATA             |
|  Amount: 1 NFT             |
+-----------------------------+

```

---

### **Detailed Breakdown of Relationships**

1.  **Initiation:**
    *   The **`Taker`** (a `Signer`) initiates the purchase transaction.
    *   They must have enough SOL to cover the listing price.
    *   The system creates or verifies their **`Taker ATA`** for receiving the NFT.

2.  **SOL Distribution (`send_sol()`):**
    *   Calculates marketplace fee: `listing.price * marketplace.fee / 10000`
    *   **First Transfer:** `listing.price - fee` goes from `Taker` to `Maker`
    *   **Second Transfer:** `fee` goes from `Taker` to `Treasury`
    *   Both transfers use the System Program

3.  **NFT Transfer (`send_nft()`):**
    *   Uses **`Listing`** as the signing authority (PDA with seeds)
    *   Creates signer seeds: `[marketplace_key, maker_mint_key, listing.bump]`
    *   Transfers exactly 1 NFT from **`Vault`** to **`Taker ATA`**
    *   Uses `transfer_checked` for secure token transfer with decimal validation

4.  **Cleanup (`close_mint_vault()`):**
    *   Uses same PDA signing authority as NFT transfer
    *   Closes the **`Vault Account`** and sends remaining rent to **`Maker`**
    *   The **`Listing Account`** is also closed (specified in constraints) with rent going to **`Maker`**

5.  **Key Constraints & Security:**
    *   **`Vault`** authority is controlled by **`Listing`** PDA
    *   **`Listing`** can only be found with correct seeds (marketplace + maker_mint)
    *   **`Taker ATA`** is created if needed, ensuring proper token account setup
    *   **`Treasury`** receives marketplace fees automatically
    *   **`Rewards`** mint is included for potential future reward distribution

6.  **Required Programs:**
    *   **System Program:** For SOL transfers and account creation
    *   **Token Program:** For NFT transfers and vault closure
    *   **Associated Token Program:** For ATA creation and management

---

### **Account States: Before → After**

| Account | Before Purchase | After Purchase |
|---------|----------------|----------------|
| **Taker** | Has SOL | SOL - listing.price |
| **Maker** | Waiting for sale | Receives SOL (price - fees) + rent refunds |
| **Treasury** | Accumulating fees | Receives marketplace fees |
| **Taker ATA** | Empty or non-existent | Contains 1 NFT |
| **Vault** | Contains 1 NFT | **CLOSED** |
| **Listing** | Active listing data | **CLOSED** |
| **Marketplace** | Facilitating trade | Collects fees via treasury |