use anchor_lang::{prelude::*, system_program::{Transfer, transfer}};

declare_id!("BS7k9JPu7a9ZQaUAAikE4ZnuBri11V9DyQTdNuxUVyUq");




#[program]
pub mod day1_vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.initialize(&ctx.bumps)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        ctx.accounts.deposit(amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        ctx.accounts.withdraw(amount)
    }

    pub fn close(ctx: Context<Close>) -> Result<()> {
        ctx.accounts.close()
        // TODO: Implement close functionality
        // Should withdraw all remaining SOL and close account
    }
}

// =============================================================================
// ACCOUNT STRUCTS - Define what accounts each function needs
// =============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)] 
    pub signer: Signer<'info>,

    // this is the vault state account that stores our custom data struct
    #[account(
        init,
        payer = signer,
        seeds = [b"state", signer.key().as_ref()],
        bump,
        space = VaultState::INIT_SPACE,
    )]
    pub vault_state: Account<'info, VaultState>,

    //this is the system account that will holds SOL and is initialized by receiving SOL
    #[account(
        mut,
        seeds = [b"vault", vault_state.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    // this is the system program that will handle transactions
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        seeds = [b"state", signer.key().as_ref()],
        bump = vault_state.state_bump,
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        mut,
        seeds = [b"vault", vault_state.key().as_ref()],
        bump = vault_state.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        seeds = [b"state", signer.key().as_ref()],
        bump = vault_state.state_bump,
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        mut,
        seeds = [b"vault", vault_state.key().as_ref()],
        bump = vault_state.vault_bump,
    )]
    pub vault: SystemAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Close<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"state", signer.key().as_ref()],
        bump = vault_state.state_bump,
        close = signer,
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        mut,
        seeds = [b"vault", vault_state.key().as_ref()],
        bump = vault_state.vault_bump,
    )]
    pub vault: SystemAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

// =============================================================================
// IMPLEMENTATION LOGIC - The actual business logic for each function
// =============================================================================

impl<'info> Initialize<'info> {
    pub fn initialize(&mut self, bumps: &InitializeBumps) -> Result<()> {
        // initialize rent exemption to transfer enough lamports
        let rent_exempt = Rent::get()?.minimum_balance(self.vault.to_account_info().data_len());

        let cpi_program = self.system_program.to_account_info();

        let cpi_accounts = Transfer {
            from: self.signer.to_account_info(),
            to: self.vault.to_account_info(),

        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        transfer(cpi_ctx, rent_exempt)?;

        // TODO: Store bump values in vault_state
        self.vault_state.vault_bump = bumps.vault;
        self.vault_state.state_bump = bumps.vault_state;

        Ok(())
    }
}

impl<'info> Deposit<'info> {
    pub fn deposit(&mut self, amount: u64) -> Result<()> {

        let cpi_program = self.system_program.to_account_info(); // this is the cpi program (system_program) that will handle the transfer, also to_account_info() converts the system_program into an AccountInfo

        let cpi_accounts = Transfer { // this is the "envelope" that has the transfer details as a struct
            from: self.signer.to_account_info(),
            to: self.vault.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts); // this is the "shipping label" that contains all the necessary details for the transfer eg. the SystemProgram + accounts

        transfer(cpi_ctx, amount)?; // this is the literal Anchor SDK's CPI (Custom Program Interface) for transferring SOL

        Ok(())
    }
}

impl<'info> Withdraw<'info> {
    pub fn withdraw(&mut self, amount: u64) -> Result<()> {
        let vault_balance = self.vault.lamports();
        
        // Calculate minimum rent-exempt balance needed
        let rent_exempt = Rent::get()?.minimum_balance(0); // 0 because SystemAccount has no data
        
        // Calculate maximum withdrawable amount
        let max_withdrawable = vault_balance.saturating_sub(rent_exempt);
        
        // Check if requested amount is safe to withdraw
        require!(amount <= max_withdrawable, ErrorCode::WouldGoRentExempt); // <---- anchor doesnt have an error code for this(?), so define it ourselves

        let cpi_program = self.system_program.to_account_info(); // this is the cpi program (system_program) that will handle the transfer

        let cpi_accounts = Transfer { // this is the "envelope" that has the transfer details as a struct, this time the vault is the sender, and the signer is the recipient
            from: self.vault.to_account_info(),
            to: self.signer.to_account_info(),
        };

        // PDA MATHEMATICAL PROOF - These are the "authorization credentials" that prove our program owns the vault PDA

        let pda_signing_seeds = [
            b"vault",                                // Step 1: The PDA prefix (like a "document type")
            self.vault_state.to_account_info().key.as_ref(),               // Step 2: The vault_state key (must match original derivation!)
            &[self.vault_state.vault_bump],         // Step 3: The bump seed (ensures canonical address)
        ];

        // PACKAGING FOR SHIPMENT - CpiContext expects &[&[&[u8]]] format (array of PDA seed sets)
        let seeds = [&pda_signing_seeds[..]];       // Wrap our single PDA's seeds into the required format

        // ENHANCED SHIPPING LABEL - Now with "proof of authorization" attached!
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, &seeds); // Unlike deposit's new(), new_with_signer() includes mathematical proof that we control the sending PDA

        transfer(cpi_ctx, amount)?; // this is the literal Anchor SDK's CPI (Custom Program Interface) for transferring SOL from PDA


        Ok(())
    }
}

impl<'info> Close<'info> {
    pub fn close(&mut self) -> Result<()> {
        // VAULT CLOSURE OPERATION - This is the "business liquidation" process
        // Unlike withdraw (user-specified amount), close empties the entire vault before closing accounts
        
        let cpi_program = self.system_program.to_account_info(); // Same shipping service as withdraw and deposit

        let cpi_accounts = Transfer { // The "final liquidation envelope" - vault pays out everything to owner
            from: self.vault.to_account_info(),        // Source: The vault being emptied
            to: self.signer.to_account_info(),         // Destination: Original vault owner
        };

        // PDA MATHEMATICAL PROOF - Same authorization credentials pattern as withdraw
        // let vault_state_key = self.vault_state.key(); --- don't need this part anymore
        let pda_signing_seeds = [
            b"vault",                                // Step 1: The PDA prefix (like a "document type")
            self.vault_state.to_account_info().key.as_ref(),               // Step 2: The vault_state key (must match original derivation!)
            &[self.vault_state.vault_bump],         // Step 3: The bump seed (ensures canonical address)
        ];

        // PACKAGING FOR FINAL SHIPMENT - Same three-level nesting as withdraw
        let seeds = [&pda_signing_seeds[..]];       // Wrap our single PDA's seeds into the required format

        // FINAL SHIPPING LABEL - With mathematical proof of PDA ownership
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, &seeds);

        // COMPLETE LIQUIDATION - Key difference: self.vault.lamports() gets ALL remaining SOL
        transfer(cpi_ctx, self.vault.lamports())?; // Unlike withdraw's user-provided amount, this empties the vault completely
        
        // IMPORTANT: The vault_state account is automatically closed due to the `close = signer` constraint
        // This returns rent lamports to the signer and marks the account for deletion
        
        Ok(()) // Return success after complete vault closure
    }
}

// =============================================================================
// DATA STRUCTURES - Define what data your program stores
// =============================================================================

#[account]

pub struct VaultState {
    pub vault_bump: u8,
    pub state_bump: u8,
}

impl Space for VaultState {
    const INIT_SPACE: usize = 8 + 1 + 1; // anchor discriminator + vault_bump + state_bump
}

// =============================================================================
// ERROR CODES - defining custom error
// =============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds in vault")]
    InsufficientFunds,
    #[msg("Withdrawal would make account rent-exempt")]
    WouldGoRentExempt,
    #[msg("Insufficient withdrawable funds (after rent-exempt reserve)")]
    InsufficientWithdrawableFunds,
}
