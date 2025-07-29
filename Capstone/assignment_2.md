# Wasteland Runners - Capstone Assignment #2

---

## Part A: User Stories & On-Chain Requirements Document:

---

## Core User Personas 🧑‍🏭

1. **Crypto Gamers**

These are my primary target users who can validate both halves of my value proposition - the gaming mechanics AND the crypto-earning elements. 

They understand cooperative gameplay, appreciate Discord-native experiences, and can evaluate whether my "proof-of-gaming" concept is genuinely engaging. Without crypto-gamers finding the core loop fun and worthwhile, the entire premise fails.

1. **OG Crypto-Miners / Fair Launch Enthusiasts**

These users are critical for validating my key differentiator - the "fair launch, no VCs, no scumbags" positioning. They deeply understand what makes token distribution feel legitimate and can assess whether your earning mechanics create genuine value rather than just another unsustainable token emission. Their endorsement gives credibility to the economic model, and give an aura of “old-school cool” to the project if they get involved and evangelize the project.

1. **Community Moderators**

My core value is "turning natural Discord socializing into cooperative gameplay,” therefore I absolutely need moderators to facilitate the social experience. They will answer questions, maintain community engagement, and keep things fun for people who are not playing, or still learning about the game. Without effective moderation, the Discord-native social features that differentiate Wasteland Runners from web-based games will fail. Indeed, there will be a lot of bot-run features to handle the core gameplay loop, but live moderators will keep the game truly discord-native.

## Function Maps 🗺️

### 1. **Crypto Gamers**

**Core Gaming Functions:**

- **Join scheduled expeditions** (discover when they're happening, sign up/log in)
- **Participate in group voting** (view 3 options, cast votes within time limits)
- **Engage in strategic discussion** (chat with team during 1-minute windows)
- **Receive expedition results** (see outcomes of group decisions, $SCRAP earned)
- **Track progression** (view personal/team earnings, expedition history)

**Discovery & Onboarding:**

- **Learn game mechanics** (understand risk/reward, cooperation benefits)
- **Connect wallet** (link Discord to crypto wallet for $SCRAP distribution)
- **Join game Discord** (get access to expedition channels)

### 2. **OG Crypto-Miners**

**Verification Functions:**

- **Audit tokenomics** (verify fair launch, no pre-mine, transparent distribution)
- **Monitor on-chain activity** (track $SCRAP minting, distribution fairness)
- **Validate earning mechanics** (confirm tokens are actually earned through gameplay)

**Participation Functions:**

- **Play expeditions** (earn $SCRAP through cooperative gameplay)
- **Manage token holdings** (receive, hold, potentially trade $SCRAP)
- **Evangelize project** (share with other fair-launch enthusiasts if satisfied)

### 3. **Community Moderators**

Solana Protocol Architecture Diagram Construction Guide

**Game Management:**

- **Facilitate coordination** (guide new players, explain mechanics)

**Community Functions:**

- **Answer questions** (help users with wallet connections, game rules)
- **Maintain Discord health** (moderate chat, enforce community guidelines)
- **Report issues** (escalate technical problems, suggest improvements)
- **Earn $SCRAP** (also play the game!)

### **Critical Integration Points:** 🛠️

- **Wallet-Discord Connection:** All users need seamless crypto wallet integration
- **Scheduled Expeditions:** Scheduled expeditions must work!
- **Group Formation:** System to match players into expedition teams before an expedition begins
- **On-chain Transactions:** Game starts, voting periods, and automated $SCRAP distribution post-expedition

## Potential On-Chain Requirements 💾

<aside>

1. <<< A user connects their wallet to “log in” to the game. >>>

- Use Matrica to connect a wallet to discord
- Might need a way to create verified players? NFT gating is one option.
- If NFT, then players pay to claim a free soulbound, or regular, NFT?
- Or does just any Matrica verified wallet get to play?
- the user would have to create a game_account, either on connecting, or when “readying up” for a game in the game lobby.
</aside>

<aside>

1. <<< A user finds a scheduled expedition. >>>

- Expeditions are announced via #announcement-bot using discord dynamic time converter for localized time-state
- The bot would need to read the on-chain state to know when an expedition will begin, likely stack —> discord.js, solana kit, deserialization package (borsch or @coral-xyz/anchor), websocket subscriptions
</aside>

<aside>

1. <<< A user joins the lobby of an upcoming expedition. >>>

- The bot would need to open a discord channel based on detecting an appropriate time in advance of a game starting (~10-15 mins before beginning).
- The game state would need to recognize when players are in the lobby, and ready to play. Players click on the discord bot “ready up” button and the bot sends a state change to the program, loading up each player’s pubkey?
</aside>

<aside>

1. <<< A user watches an on-going expedition. >>>

- Any user who does not “ready up” is unable to chat in the discord game channel.
- The bot would grant chat permissions only after successfully updating game state.
- No on-chain instructions required here?
</aside>

<aside>

1. <<< A user starts their expedition with other users. >>>

- The game program runs once the timer is up, likely managed via Tuk Tuk like a cron job?
- The program can only take votes from users who “ready up”d before the game started, so their pubkeys would be logged in the struct I imagine.
</aside>

<aside>

1. <<< A user reads the narrative in-game text that posits a scenario requiring a group vote.>>>

- The discord bot prints the scenario message from its stored off-chain database.
- For the purposes of this POC project, I think it is easier to keep the scenarios disconnected from the on-chain actions, so that the chance to earn $SCRAP is not dependent on the vote directly? However, this would make the game more of a lottery with the disguise of a game on top.
- Otherwise what we should do is create 3 or 4 different game scenarios (with text to match), and each scenario would have 4 or 5 rounds.

At the beginning of a game we would do a random roll to decide which scenario is selected. This would tell the bot which text to deliver to the players.

At each round, a group vote is taken with 3 options. Each option has different percentages to win/lose $SCRAP as a group. There would be a low/medium/high risk option in each round, and some special rounds that do things like “lose all scrap or win 200% more”, or “don’t earn SCRAP this round but earn 500% if you roll x_integer” type effects. 
</aside>

<aside>

1. <<< A user discusses the group vote with their party. >>>

- This user story requires no on-chain action. The users with permission to speak in this game expedition can freely use discord to discuss the optimal voting strategy.
</aside>

<aside>

1. <<< A user votes on an in-game action. >>>

- The bot recognizes the user pressing the vote button for A, B, or C and delivers the on-chain message to update the game state. 
- The bot keeps track of the on-chain state to know when the next round begins.
- The program tracks the result of the current round.
- The program deals with insufficient votes (zero or 1?), and either cancels the game or forfeits the round.
- The program applies a negative modifier on some type to split votes (1 for A, 1 for B, 1 for C)
- In future versions of the game, NFTs could be used to represent game upgrades and give the team better outcomes in certain scenarios (medic gives +odds in team member wounded scenario, scavenger gives +odds in wasteland discovery scenarios)
</aside>

<aside>

1. <<< A user changes their vote. >>>

- The bot sends the update to the game state.
- The bot & program lock voting when there’s 5 seconds left till next round? Or maybe not necessary.
</aside>

<aside>

1. <<< Repeat step 6 through 8, four to five times. >>>

- The game round function has a loop until it reaches its limit of 4 or 5 rounds.
- The game exits the loop and performs its payout function.
- Maybe the program updates a historical state program that shows the results of all the games played so far.
</aside>

<aside>

1. <<< A user receives a small, medium, large or no reward at the end of the game. >>>

- The program divvies up the reward amongst all players.
</aside>

<aside>

1. <<< A user checks their lifetime stats. >>>

- Each user_account PDA could track the numbers of times they won/lost, outcomes achieved (small/medium/large/none), scenarios discovered, and so on.
- the bot would allow users to make a call to the struct to read it, then announce it general-chat discord channel (for bragging rights).
</aside>

---

---

---

## Part B: Process Appendix

---

🅰️

- **Part A: Initial User & Function Mapping**
    
    
    **1) Manual User Brainstorming**
    
    **Manual Task:**
    
    Based on your refined Value Proposition from Assignment 1, brainstorm a broad list of every potential user type who might interact with your project. Think beyond just the primary user. Consider different categories:
    
    - **Direct Users:** Who will use the product day-to-day? (e.g., content creators, voters, investors)
    1. Crypto gamers - people have a cross-over interesting in gaming and crypto.
    2. Old school fair launch miners - people who like earning currency with a level playing field e.g. no pre-allocations, no insiders, no token sales.
    3. Content creators - while unlikely (discord isn’t the prettiest interface), if the earnings were considerable, content creators may engage with the game to shill their fan base.
    4. Low income crypto earners - people who live in countries where USD has a stronger earning power, and even small amounts can go a long way.
    - **Indirect Users/Beneficiaries:** Who benefits from the direct users' actions? (e.g., content consumers, project owners)
    1. Not sure about this category.
    - **Administrators/Moderators:** Who will manage the system? (e.g., you as the developer, community moderators)
    1. Community/hired moderators - being a discord-heavy system, most likely there would need to be moderators to handle the day-to-day functions of the channel and answer questions.
    - **Stakeholders:** Who has a vested interest in the project's success but may not use it directly? (e.g., token holders, partners)
    1. Traders (non-players) - these would be people who trade the token but aren’t necessarily playing the game itself.
    2. Liquidity providers - these would be people who provide liquidity for the token to earn fees on both traders and players who may sell their earnings or buy more tokens.
    
    **2) AI-Assisted User Prioritization**
    
    <aside>
    
    > **AI Response**
    
    Based on your value proposition for Wasteland Runners, here are the **3-4 most critical user types** to focus on for your initial Proof-of-Concept:
    > 
    > 
    > ## 1. **Crypto Gamers** (Essential)
    > 
    > **Rationale:** These are your primary target users who can validate both halves of your value proposition - the gaming mechanics AND the crypto earning elements. They understand cooperative gameplay, appreciate Discord-native experiences, and can evaluate whether your "proof-of-gaming" concept is genuinely engaging. Without crypto gamers finding the core loop fun and worthwhile, the entire premise fails.
    > 
    > ## 2. **Old School Fair Launch Miners** (Essential)
    > 
    > **Rationale:** These users are critical for validating your key differentiator - the "fair launch, no VCs, no scumbags" positioning. They deeply understand what makes token distribution feel legitimate and can assess whether your earning mechanics create genuine value rather than just another unsustainable token emission. Their endorsement gives credibility to the economic model.
    > 
    > ## 3. **Community/Hired Moderators** (Essential)
    > 
    > **Rationale:** Since your core value is "turning natural Discord socializing into cooperative gameplay," you absolutely need moderators to facilitate the social coordination mechanics. They enable the scheduled expeditions, manage group voting, and maintain the community engagement that makes the cooperative elements work. Without effective moderation, the Discord-native social features that differentiate you from web-based games will fail.
    > 
    > ## 4. **Low Income Crypto Earners** (Important but Secondary)
    > 
    > **Rationale:** While not essential for proving core mechanics work, this group validates whether your earning amounts create meaningful value for real users. They can provide feedback on whether the token rewards justify time investment and help you calibrate the economic balance. However, you can initially test with crypto gamers and add this group once basic mechanics are proven.
    > 
    > **Skip for POC:** Content creators (low likelihood), traders, and liquidity providers are all secondary infrastructure that should come after you've proven the core cooperative gaming experience creates genuine value for players.
    > 
    </aside>
    
    Manual Reconciliation:
    
    My Final List -
    
    1. Crypto Gamers
    2. OG Crypto-Miners
    3. Community Moderators
    
    I liked all of the AI’s recommended and suggested core users. I agree that content creators, traders, and LPs are all secondary users that do not need priority focus. I cut down the list to just the top 3 core users and project needs. Appealing to Crypto Gamers and OG Crypto-Miners is the core of this project — if they don’t sign on to the game, there are no tokens being minted, and the project can’t go forward.
    
    Community moderators are an absolute necessity for a discord run project, and from my experience running Bonk Buddy (free mint game project), moderators double as users who love to play and earn some tokens on the side.
    
    **3) Core Function Mapping**
    
    <aside>
    
    **AI Answer**
    
    Based on your prioritized user types, here are the **key functions and interactions** each needs to perform for Wasteland Runners:
    
    ## 1. **Crypto Gamers**
    
    ### Core Gaming Functions:
    
    - **Join scheduled expeditions** (discover when they're happening, sign up)
    - **Participate in group voting** (view 3 options, cast votes within time limits)
    - **Engage in strategic discussion** (chat with team during 1-minute windows)
    - **Receive expedition results** (see outcomes of group decisions, $SCRAP earned)
    - **Track progression** (view personal/team earnings, expedition history)
    
    ### Discovery & Onboarding:
    
    - **Learn game mechanics** (understand risk/reward, cooperation benefits)
    - **Connect wallet** (link Discord to crypto wallet for $SCRAP distribution)
    - **Join game Discord** (get access to expedition channels)
    
    ## 2. **OG Crypto-Miners**
    
    ### Verification Functions:
    
    - **Audit tokenomics** (verify fair launch, no pre-mine, transparent distribution)
    - **Monitor on-chain activity** (track $SCRAP minting, distribution fairness)
    - **Validate earning mechanics** (confirm tokens are actually earned through gameplay)
    
    ### Participation Functions:
    
    - **Play expeditions** (earn $SCRAP through cooperative gameplay)
    - **Manage token holdings** (receive, hold, potentially trade $SCRAP)
    - **Evangelize project** (share with other fair-launch enthusiasts if satisfied)
    
    ## 3. **Community Moderators**
    
    ### Game Management:
    
    - **Initiate expeditions** (trigger scheduled runs via bot commands)
    - **Facilitate coordination** (guide new players, explain mechanics mid-game)
    - **Monitor voting periods** (ensure fair play, handle technical glitches)
    - **Distribute rewards** (oversee $SCRAP allocation post-expedition)
    
    ### Community Functions:
    
    - **Answer questions** (help users with wallet connections, game rules)
    - **Maintain Discord health** (moderate chat, enforce community guidelines)
    - **Report issues** (escalate technical problems, suggest improvements)
    - **Earn moderator rewards** (receive $SCRAP for community management work)
    
    ## **Critical Integration Points:**
    
    - **Wallet-Discord Connection:** All users need seamless crypto wallet integration
    - **Timing Coordination:** Scheduled expeditions must work across time zones
    - **Group Formation:** System to match players into expedition teams
    - **Real-time Communication:** Discord chat must integrate with game mechanics
    - **On-chain Transactions:** Automated $SCRAP distribution post-expedition
    
    This mapping shows you'll need robust Discord bot functionality, wallet integration, and community management tools to serve all three user types effectively.
    
    </aside>
    
    **4) Deriving Core POC Requirements**
    
    Manual Task:
    
    1. Players must know when scheduled expeditions are happening, and be able to sign up or join a lobby.
    2. Receiving rewards for any player is essential once the game is over.
    3. Wallet connectors within discord are essential for seamless gameplay.
    4. Voting on outcomes must be clear and occur on-chain via discord.
    
    **AI Task:** 
    
    <aside>
    
    **AI Response:**
    
    Here's the **revised technical requirements** for your Solana-native POC:
    
    ## **Solana-Native Technical Stack**
    
    ### **1. Core Solana Programs (Smart Contracts)**
    
    - **Anchor framework** for Solana program development
    - **Game State Program** - stores expedition lobbies, player rosters, voting results
    - **Token Program** - $SCRAP token mint and distribution logic
    - **Voting Program** - records expedition decisions with weighted outcomes
    - **Player Registry** - maps Discord IDs to wallet addresses (via Matrica)
    
    ### **2. On-Chain Automation**
    
    - **TUK TUK integration** for scheduled expedition triggers
    - **Cron-based program calls** - automatically start expeditions at set intervals
    - **Automated reward distribution** - TUK TUK calls `distribute_rewards()` when expeditions end
    - **State cleanup jobs** - remove expired lobbies, archive completed games
    
    ### **3. Discord Integration Layer**
    
    - **Matrica for wallet management** - handles `/connect-wallet` and verification
    - **Lightweight Discord bot** - primarily UI/notification layer
    - **Program-derived addresses (PDAs)** for Discord user → Solana account mapping
    - **Real-time state queries** from Discord to on-chain game state
    
    ### **4. Minimal Off-Chain Infrastructure**
    
    - **Simple Discord bot** (discord.js) for:
        - Displaying expedition lobbies from on-chain state
        - Facilitating voting UI (reactions trigger on-chain votes)
        - Showing game results and transaction confirmations
    - **RPC endpoint** (Helius/QuickNode) for program interactions
    - **Optional: Basic caching layer** (Redis) for Discord performance
    
    ## **On-Chain Program Architecture**
    
    ### **Game State Account Structure:**
    
    ```rust
    pub struct Expedition {
        pub id: u64,
        pub scheduled_time: i64,
        pub players: Vec<Pubkey>,        // Player wallet addresses
        pub status: ExpeditionStatus,    // Lobby/Active/Voting/Complete
        pub current_scenario: u8,        // Which decision scenario
        pub votes: HashMap<Pubkey, Vote>, // Player votes
        pub rewards_pool: u64,           // $SCRAP to distribute
    }
    
    ```
    
    ### **Critical Program Instructions:**
    
    ```rust
    // TUK TUK calls this at scheduled times
    create_expedition(scheduled_time: i64)
    
    // Players join via Discord/Matrica
    join_expedition(expedition_id: u64)
    
    // TUK TUK triggers when lobby full
    start_expedition(expedition_id: u64)
    
    // Players vote through Discord bot
    submit_vote(expedition_id: u64, scenario: u8, choice: u8)
    
    // TUK TUK calls after voting window
    process_expedition_result(expedition_id: u64)
    
    // Distribute $SCRAP based on outcomes
    distribute_rewards(expedition_id: u64)
    
    ```
    
    ## **Integration Flow**
    
    ### **1. Expedition Lifecycle:**
    
    ```
    TUK TUK → create_expedition() → Discord notification
    Players → join_expedition() via Matrica wallet
    TUK TUK → start_expedition() when 4-6 players ready
    Discord bot → display scenario options
    Players → submit_vote() through Discord reactions
    TUK TUK → process_expedition_result() after 60 seconds
    TUK TUK → distribute_rewards() based on outcome
    
    ```
    
    ### **2. Discord Bot Responsibilities:**
    
    - **Query on-chain state** to display active expeditions
    - **Format voting interfaces** (embed messages with reaction buttons)
    - **Relay user interactions** to Solana programs via Matrica
    - **Display transaction confirmations** and reward notifications
    
    ## **Key Advantages of This Approach**
    
    ### **Decentralization:**
    
    - **No centralized database** - all game state on Solana
    - **Automated execution** via TUK TUK removes manual intervention
    - **Transparent operations** - all game logic verifiable on-chain
    
    ### **Cost Efficiency:**
    
    - **Solana's low fees** make frequent transactions viable
    - **Batch operations** through program instructions
    - **No server hosting costs** for game logic
    
    ### **Technical Simplicity:**
    
    - **Less infrastructure to manage** - programs + Discord bot
    - **Matrica handles complexity** of wallet connections
    - **TUK TUK handles scheduling** - no cron job management
    
    ## **POC Development Priority**
    
    1. **Deploy basic Anchor programs** (expedition state, voting, rewards)
    2. **Integrate Matrica** for Discord-wallet connections
    3. **Set up TUK TUK jobs** for expedition scheduling
    4. **Build minimal Discord bot** for UI/notifications
    5. **Test full expedition flow** with small group
    6. **Add $SCRAP token integration** and reward distribution
    
    This architecture leverages Solana's strengths while minimizing your infrastructure overhead - perfect for a fair-launch, decentralized gaming project!
    
    </aside>
    

---

🅱️

- **Part B: Adversarial Analysis & Granularity Check**
    
    **1) Critique & Refine User Stories / Requirements:**
    
    <aside>
    
    **AI Response:**
    
    Looking at your user stories against your refined value proposition and Solana-native technical architecture, they're **directionally correct but need more granularity** to map to specific technical components. Here's my analysis:
    
    ## **What's Working Well**
    
    Your stories capture the **core value proposition elements**:
    
    - ✅ Discord-native cooperative gameplay
    - ✅ Fair launch verification for OG miners
    - ✅ Community-driven moderation
    - ✅ Accessible earning mechanics
    
    ## **Missing User Stories & Edge Cases**
    
    ### **Critical Gaps:**
    
    1. **Expedition Discovery:** "Join scheduled expeditions" is too vague
        - How do users know when expeditions are available?
        - What's the UX for browsing active lobbies?
        - How do they get notified of upcoming starts?
    2. **Failed States:** No coverage of common failure scenarios
        - Expedition doesn't fill (< 4 players)
        - Player disconnects mid-game
        - Transaction failures during voting/rewards
        - TUK TUK automation failures
    3. **Spectator Experience:** Missing onboarding flow
        - Users who want to watch before playing
        - Learning the narrative/lore without committing $SCRAP
    4. **Cross-Timezone Coordination:** Mentioned as critical but not detailed
        - How do global players coordinate on timing?
        - What's the UX for scheduling preferences?
    
    ## **Technical Granularity Issues**
    
    Your stories need to map more specifically to the **Solana program instructions**:
    
    ### **Too High-Level:**
    
    ```
    ❌ "Participate in group voting"
    ✅ Should be:
       - View scenario options from Game State Program
       - Submit vote via Discord reaction → Matrica → submit_vote()
       - See real-time vote tally from on-chain state
       - Receive voting period countdown notifications
    
    ```
    
    ### **Missing Program Mappings:**
    
    ```
    ❌ "Track progression"
    ✅ Should specify:
       - Query player_stats PDA for historical earnings
       - Display expedition_history from on-chain logs
       - Show $SCRAP balance from Token Program
       - Calculate success rates from vote outcomes
    
    ```
    
    ## **Required Technical Granularity**
    
    ### **Database Schema Needs:**
    
    Your stories should specify what goes **on-chain vs off-chain**:
    
    ```rust
    // On-Chain (Anchor Programs)
    - Expedition state & voting results
    - Player wallet → Discord ID mapping
    - $SCRAP mint & distribution records
    - Historical game outcomes for stats
    
    // Off-Chain (Discord Bot)
    - Narrative text & scenario descriptions
    - Discord message IDs for UI state
    - Temporary lobby management during formation
    
    ```
    
    ### **API Endpoint Mappings:**
    
    Each user action needs specific technical implementation:
    
    ```
    "Connect wallet" →
      - Discord: /connect-wallet command
      - Matrica: signature verification
      - Program: create_player_registry() instruction
      - Bot: confirmation & role assignment
    
    "Join expedition" →
      - Bot: Query available expeditions from Game State
      - User: React to expedition embed
      - Program: join_expedition(expedition_id, player_pubkey)
      - TUK TUK: start_expedition() when lobby full
    
    ```
    
    ## **Missing Requirements**
    
    ### **1. Narrative System:**
    
    Your value prop emphasizes "emergent community storytelling" but stories don't cover:
    
    - How scenarios are created/curated
    - How outcomes affect future expedition options
    - Lore continuity across multiple games
    
    ### **2. Economic Balancing:**
    
    OG Crypto-Miners need transparency on:
    
    - $SCRAP emission rates per expedition
    - Risk/reward probability matrices
    - Token sink mechanisms (future expansion)
    
    ### **3. Community Management Tools:**
    
    Moderators need specific capabilities:
    
    - Override failed TUK TUK jobs manually
    - Adjust expedition parameters (player count, timing)
    - Ban players from expeditions (not just Discord)
    
    ## **Recommended Next Steps**
    
    1. **Break down each story** into 3-5 sub-tasks mapping to specific program instructions
    2. **Define data schemas** for both on-chain accounts and off-chain Discord state
    3. **Map error handling** for each user flow (transaction failures, timeouts, etc.)
    4. **Specify integration points** between Discord bot, Matrica, TUK TUK, and your programs
    
    Your foundation is solid, but you need this level of technical granularity to actually start building the Anchor programs and Discord bot effectively.
    
    </aside>
    
    **Analyze the feedback - Manual Task**
    
    Overall the AI feedback is a bit too granular so I’m going to pull it back to User Stories and the granular actions that are taken as much as possible before breaking it down into on-chain actions in the **Part C: Granularity and Clarity Refinement.** Some of the parts that the AI mentioned did help me clarify some of the User Stores — namely, the difference between finding and joining a lobby, changing a vote, and the user checking his own stats.
    
    **REFINED USER STORIES - MANUAL**
    
    1. A user connects their wallet to “log in” to the game.
    2. A user finds a scheduled expedition.
    3. A user joins the lobby of an upcoming expedition.
    4. A user watches an on-going expedition.
    5. A user starts their expedition with other users.
    6. A user reads the narrative in-game text that posits a scenario requiring a group vote.
    7. A user discusses the group vote with their party.
    8. A user votes on an in-game action.
    9. A user changes their vote.
    10. Repeat step 6 through 8, four to five times.
    11. A user receives a small, medium, large or no reward at the end of the game.
    12. A user checks their lifetime stats.
    

---

🐱

- **Part C: Granularity & Clarity Refinement**
    
    **1) Final Manual Review & Refinement**
    
    I am happy with the list as defined above, I kept it simple, jargon-free, and focused on the core user patterns after I saw the AI response to my idea.
    

---

🐶

- **Part D: Defining Potential On-Chain Requirements**
    
    **1) Brainstorming On-Chain Requirements for Each User Story**
    

<aside>

1. <<< A user connects their wallet to “log in” to the game. >>>

- Use Matrica to connect a wallet to discord
- Might need a way to create verified players? NFT gating is one option.
- If NFT, then players pay to claim a free soulbound, or regular, NFT?
- Or does just any Matrica verified wallet get to play?
- the user would have to create a game_account, either on connecting, or when “readying up” for a game in the game lobby.
</aside>

<aside>

1. <<< A user finds a scheduled expedition. >>>

- Expeditions are announced via #announcement-bot using discord dynamic time converter for localized time-state
- The bot would need to read the on-chain state to know when an expedition will begin, likely stack —> discord.js, solana kit, deserialization package (borsch or @coral-xyz/anchor), websocket subscriptions
</aside>

<aside>

1. <<< A user joins the lobby of an upcoming expedition. >>>

- The bot would need to open a discord channel based on detecting an appropriate time in advance of a game starting (~10-15 mins before beginning).
- The game state would need to recognize when players are in the lobby, and ready to play. Players click on the discord bot “ready up” button and the bot sends a state change to the program, loading up each player’s pubkey?
</aside>

<aside>

1. <<< A user watches an on-going expedition. >>>

- Any user who does not “ready up” is unable to chat in the discord game channel.
- The bot would grant chat permissions only after successfully updating game state.
- No on-chain instructions required here?
</aside>

<aside>

1. <<< A user starts their expedition with other users. >>>

- The game program runs once the timer is up, likely managed via Tuk Tuk like a cron job?
- The program can only take votes from users who “ready up”d before the game started, so their pubkeys would be logged in the struct I imagine.
</aside>

<aside>

1. <<< A user reads the narrative in-game text that posits a scenario requiring a group vote.>>>

- The discord bot prints the scenario message from its stored off-chain database.
- For the purposes of this POC project, I think it is easier to keep the scenarios disconnected from the on-chain actions, so that the chance to earn $SCRAP is not dependent on the vote directly? However, this would make the game more of a lottery with the disguise of a game on top.
- Otherwise what we should do is create 3 or 4 different game scenarios (with text to match), and each scenario would have 4 or 5 rounds.

At the beginning of a game we would do a random roll to decide which scenario is selected. This would tell the bot which text to deliver to the players.

At each round, a group vote is taken with 3 options. Each option has different percentages to win/lose $SCRAP as a group. There would be a low/medium/high risk option in each round, and some special rounds that do things like “lose all scrap or win 200% more”, or “don’t earn SCRAP this round but earn 500% if you roll x_integer” type effects. 
</aside>

<aside>

1. <<< A user discusses the group vote with their party. >>>

- This user story requires no on-chain action. The users with permission to speak in this game expedition can freely use discord to discuss the optimal voting strategy.
</aside>

<aside>

1. <<< A user votes on an in-game action. >>>

- The bot recognizes the user pressing the vote button for A, B, or C and delivers the on-chain message to update the game state. 
- The bot keeps track of the on-chain state to know when the next round begins.
- The program tracks the result of the current round.
- The program deals with insufficient votes (zero or 1?), and either cancels the game or forfeits the round.
- The program applies a negative modifier on some type to split votes (1 for A, 1 for B, 1 for C)
- In future versions of the game, NFTs could be used to represent game upgrades and give the team better outcomes in certain scenarios (medic gives +odds in team member wounded scenario, scavenger gives +odds in wasteland discovery scenarios)
</aside>

<aside>

1. <<< A user changes their vote. >>>

- The bot sends the update to the game state.
- The bot & program lock voting when there’s 5 seconds left till next round? Or maybe not necessary.
</aside>

<aside>

1. <<< Repeat step 6 through 8, four to five times. >>>

- The game round function has a loop until it reaches its limit of 4 or 5 rounds.
- The game exits the loop and performs its payout function.
- Maybe the program updates a historical state program that shows the results of all the games played so far.
</aside>

<aside>

1. <<< A user receives a small, medium, large or no reward at the end of the game. >>>

- The program divvies up the reward amongst all players.
</aside>

<aside>

1. <<< A user checks their lifetime stats. >>>

- Each user_account PDA could track the numbers of times they won/lost, outcomes achieved (small/medium/large/none), scenarios discovered, and so on.
- the bot would allow users to make a call to the struct to read it, then announce it general-chat discord channel (for bragging rights).
</aside>

---

### Links

My Claude discussion session - https://claude.ai/share/2f40048d-faf8-4dc3-806d-8dc061125784
