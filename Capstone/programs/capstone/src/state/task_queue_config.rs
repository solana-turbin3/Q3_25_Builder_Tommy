use anchor_lang::prelude::*;

/// Configuration for the Tuktuk task queue
/// This manages the automated crank operations for expeditions
#[account]
#[derive(Debug)]
pub struct TaskQueueConfig {
    /// Authority that manages the task queue
    pub authority: Pubkey,
    
    /// Name of the task queue (expedition_queue)
    pub queue_name: String,
    
    /// Current expedition being processed
    pub current_expedition_id: u64,
    
    /// Last execution timestamp
    pub last_execution: i64,
    
    /// Whether the queue is active
    pub is_active: bool,
    
    /// Number of failed attempts
    pub retry_count: u8,
    
    /// Maximum retries for VRF failures
    pub max_retries: u8,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl TaskQueueConfig {
    pub const SPACE: usize = 8 + // discriminator
        32 + // authority
        32 + // queue_name (max string length)
        8 + // current_expedition_id
        8 + // last_execution
        1 + // is_active
        1 + // retry_count
        1 + // max_retries
        1; // bump
        
    pub const DEFAULT_MAX_RETRIES: u8 = 3;
    pub const QUEUE_NAME: &'static str = "expedition_queue";
}