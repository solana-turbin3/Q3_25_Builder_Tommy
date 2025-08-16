use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
#[repr(C)]
pub struct GuildPerformance {
    pub expedition_id: u64,               // 8 bytes - links to expedition
    pub guild_id: u64,                    // 8 bytes - discord server id
    pub total_risk_points: u32,           // 4 bytes - accumulated risk taken
    pub current_round_vote_tally: [u8; 3], // 3 bytes - [high, med, low] vote counts
    pub successful_rounds: u8,            // 1 byte - rounds won (0-4)
    pub total_rounds_participated: u8,    // 1 byte - rounds played (0-4)
    pub player_count: u8,                 // 1 byte - number of players in guild
    pub bump: u8                          // 1 byte
    // Total: 27 bytes + 8 discriminator = 35 bytes
}