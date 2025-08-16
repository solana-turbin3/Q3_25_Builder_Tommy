use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
#[repr(C)]
pub struct GlobalGameState {
    pub authority: Pubkey,                 // 32 bytes
    pub next_expedition_id: u64,           // 8 bytes - counter for expedition IDs
    pub next_expedition_time: i64,         // 8 bytes
    pub expedition_interval: i64,          // 8 bytes
    pub base_reward_per_expedition: u64,   // 8 bytes
    pub scrap_mint: Pubkey,                // 32 bytes - SCRAP token mint address
    pub total_rewards_distributed: u64,    // 8 bytes - total rewards distributed across all expeditions
    pub bump: u8                           // 1 byte
    // total: 105 bytes + 8 discriminator = 113 bytes
}