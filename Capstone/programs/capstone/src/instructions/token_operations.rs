use anchor_lang::prelude::*;
use anchor_spl::token;

//create ata account for reward pool
#[inline(never)] // im trying out inline(never) here for my helper functions to optimize stack usage cause i thought i had a memory issue, but i think i dont need it?
pub fn create_reward_pool_ata<'info>(
    authority: &AccountInfo<'info>,
    reward_pool: &AccountInfo<'info>,
    reward_pool_ata: &AccountInfo<'info>,
    scrap_mint: &AccountInfo<'info>,
    associated_token_program: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
) -> Result<()> {
    let cpi_accounts = anchor_spl::associated_token::Create {
        payer: authority.clone(),
        associated_token: reward_pool_ata.clone(),
        authority: reward_pool.clone(),
        mint: scrap_mint.clone(),
        system_program: system_program.clone(),
        token_program: token_program.clone(),
    };
    let cpi_ctx = CpiContext::new(associated_token_program.clone(), cpi_accounts);
    anchor_spl::associated_token::create(cpi_ctx)
}

// create the transfer authority to pda func
#[inline(never)]
pub fn transfer_authorities_to_pda<'info>(
    authority: &AccountInfo<'info>,
    reward_pool_key: &Pubkey,
    scrap_mint: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
) -> Result<()> {
    {
        let cpi_accounts = anchor_spl::token::SetAuthority {
            current_authority: authority.clone(),
            account_or_mint: scrap_mint.clone(),
        };
        let cpi_ctx = CpiContext::new(token_program.clone(), cpi_accounts);
        anchor_spl::token::set_authority(
            cpi_ctx,
            token::spl_token::instruction::AuthorityType::MintTokens,
            Some(*reward_pool_key),
        )?;
    }

    // transfer freeze authority to reward pool pda
    {
        let cpi_accounts = anchor_spl::token::SetAuthority {
            current_authority: authority.clone(),
            account_or_mint: scrap_mint.clone(),
        };
        let cpi_ctx = CpiContext::new(token_program.clone(), cpi_accounts);
        anchor_spl::token::set_authority(
            cpi_ctx,
            token::spl_token::instruction::AuthorityType::FreezeAccount,
            Some(*reward_pool_key),
        )
    }
}

// mint whole supply to the ata controlled by reward pool pda
#[inline(never)]
pub fn mint_initial_supply<'info>(
    scrap_mint: &AccountInfo<'info>,
    reward_pool_ata: &AccountInfo<'info>,
    reward_pool: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    signer_seeds: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    let cpi_accounts = anchor_spl::token::MintTo {
        mint: scrap_mint.clone(),
        to: reward_pool_ata.clone(),
        authority: reward_pool.clone(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        token_program.clone(),
        cpi_accounts,
        signer_seeds,
    );
    anchor_spl::token::mint_to(cpi_ctx, amount)
}

// remove mint and freeze auth -- no touchy
#[inline(never)]
pub fn remove_authorities<'info>(
    reward_pool: &AccountInfo<'info>,
    scrap_mint: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    {
        let cpi_accounts = anchor_spl::token::SetAuthority {
            current_authority: reward_pool.clone(),
            account_or_mint: scrap_mint.clone(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            token_program.clone(),
            cpi_accounts,
            signer_seeds,
        );
        anchor_spl::token::set_authority(
            cpi_ctx,
            token::spl_token::instruction::AuthorityType::MintTokens,
            None,
        )?;
    }
    {
        let cpi_accounts = anchor_spl::token::SetAuthority {
            current_authority: reward_pool.clone(),
            account_or_mint: scrap_mint.clone(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            token_program.clone(),
            cpi_accounts,
            signer_seeds,
        );
        anchor_spl::token::set_authority(
            cpi_ctx,
            token::spl_token::instruction::AuthorityType::FreezeAccount,
            None,
        )
    }
}