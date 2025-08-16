use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum ExpeditionStatus {
    Pending,
    InProgress,
    Completed,
    Cancelled,
}

#[account]
#[derive(InitSpace)]
#[repr(C)]
pub struct Expedition {
    pub id: u64,                       // 8 bytes - unique expedition id
    pub status: ExpeditionStatus,      // 1 byte - enum for expedition status
    pub scenario_type: u8,             // 1 byte - 1, 2, 3 (build/scavenge/combat)
    pub current_round: u64,            // 8 bytes - current round number (expanded from u8)
    pub total_participants: u64,       // 8 bytes - total number of participants
    pub rounds_completed: u64,         // 8 bytes - number of rounds completed
    pub total_rewards_distributed: u64, // 8 bytes - total SCRAP tokens distributed
    pub rewards_distributed: bool,     // 1 byte - prevents double distribution
    pub bump: u8                       // 1 byte
    // Total: 43 bytes + 8 discriminator = 51 bytes
}