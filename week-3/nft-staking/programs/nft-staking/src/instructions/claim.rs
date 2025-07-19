use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{mint_to, Mint, MintTo, Token, TokenAccount}};

use crate::state::{StakeConfig, UserAccount};

// CLAIM INSTRUCTION: Convert accumulated points into reward tokens
// This is the final step in the staking lifecycle: stake → earn → claim
#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    // USER ACCOUNT: Contains the points earned from staking (will be modified to reset points)
    // Seeds pattern: ["user", user_wallet_address] - unique per user
    #[account(
        mut,
        seeds = [b"user".as_ref(), user.key().as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,
    
    // REWARDS MINT: The "token factory" that creates reward tokens
    // Seeds pattern: ["rewards", config_address] - controlled by the config account
    // This account will be modified to increase total supply when minting
    #[account(
        mut,
        seeds = [b"rewards".as_ref(), config.key().as_ref()],
        bump = config.rewards_bump
    )]
    pub rewards_mint: Account<'info, Mint>,
    
    // CONFIG: Global settings - serves as the mint authority for rewards
    // Seeds pattern: ["config"] - single global configuration
    #[account(
        seeds = [b"config".as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, StakeConfig>,
    
    // REWARDS ATA: User's personal "reward token wallet"
    // Associated Token Account - automatically derived address for user + mint combo
    // init_if_needed: creates the account if it doesn't exist yet
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = rewards_mint,
        associated_token::authority = user,
    )]
    pub rewards_ata: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> Claim<'info> {
    pub fn claim(&mut self) -> Result<()> {
        // STEP 1: SET UP CPI TO TOKEN PROGRAM
        // CPI = Cross-Program Invocation (calling another program's function)
        // We're going to call the Token Program's "mint_to" function
        let cpi_program = self.token_program.to_account_info();

        // STEP 2: CREATE SIGNER SEEDS FOR CONFIG AUTHORITY
        // The config account is the mint authority, but it's a PDA (Program Derived Address)
        // PDAs can't sign directly - we need to use seeds to "sign" on behalf of the PDA
        // this is the SAME pattern we used in stake.rs for freeze/thaw operations...
        let seeds = &[
            b"config".as_ref(),      
            &[self.config.bump]      
        ];
        let signer_seeds = &[&seeds[..]];

        // STEP 3: DEFINE THE MINT OPERATION
        // This tells the Token Program: "mint new tokens"
        let cpi_accounts = MintTo {
            mint: self.rewards_mint.to_account_info(),     // WHAT: Which token type to mint
            to: self.rewards_ata.to_account_info(),        // WHERE: User's token account (destination)
            authority: self.config.to_account_info(),      // WHO: Config has permission to mint (authority)
        };

        // STEP 4: BUNDLE EVERYTHING FOR THE CPI CALL

        // new_with_signer = we're using PDA signing (not user signing like in stake.rs)
        let cpi_context = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        // STEP 5: EXECUTE THE MINT WITH DECIMAL CONVERSION
        // Key insight: self.user_account.points = human-readable number (e.g., 5 points)
        // But tokens need "atomic units" based on decimals (e.g., 5,000,000 for 6 decimals)
        //
        // Formula: points × 10^decimals = atomic_units
        // Example: 5 points × 10^6 = 5,000,000 atomic units = 5.000000 tokens
        //
        // Why? Same as money: $1.50 = 150 cents (multiply by 10^2 for 2 decimal places)
        mint_to(
            cpi_context,
            self.user_account.points as u64 * 10_u64.pow(self.rewards_mint.decimals as u32)
        )?;

        // STEP 6: RESET USER POINTS TO ZERO
        // Points have been "cashed in" for tokens, so clear the balance
        // This prevents double-claiming the same points
        self.user_account.points = 0;
        

        Ok(())
    }
}