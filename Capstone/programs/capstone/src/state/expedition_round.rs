use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
#[repr(C)]
pub struct ExpeditionRound {
    pub expedition_id: u64,                // 8 bytes - links to expedition
    pub round_start_time: i64,             // 8 bytes - unix timestamp
    pub round_end_time: Option<i64>,       // 9 bytes - Option<i64>
    pub winning_guild_id: Option<u64>,     // 9 bytes - Option<u64>
    pub round_number: u8,                  // 1 byte - current round (0-3)
    pub risk_level_chosen: u8,             // 1 byte - 0=low, 1=med, 2=high
    pub outcome: u8,                       // 1 byte - 0=pending, 1=success, 2=failure
    pub bump: u8                           // 1 byte
    // Total: 38 bytes + 8 discriminator = 46 bytes
}