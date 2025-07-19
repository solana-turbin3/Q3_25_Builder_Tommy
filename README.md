# Q3_25_Builder_Tommy
## tommy

hello i am tommy

i'm a beginner solana developer, graduate of the Encode bootcamp and hopefully soon to be Turbin3 graduate and more. my interests lie in **retro gaming** like Fallout 2 and Planescape: Torment, and **on-chain arbitrage**.

feel free to reach out if you want to connect!
- GitHub: [@7ommyzero](https://github.com/7ommyzero)  
- Twitter: [@t0mmyzero](https://twitter.com/t0mmyzero)
- Discord: t0.mmy

## TURBIN3 PROJECTS

<details>
<summary><strong>Week 0 - Prerequisites</strong></summary>

**Overview**: Finished the pre-reqs to qualify for turbin3 cohort q3. Used TS and Rust.

Some things I learned:
 - You are allowed to modify an IDL at the source!
 - I used a method to force the IDL instead -- there are multiple ways to solve a problem.
 - Airdropping
 - Minting NFTs
 - How to use authorities
 - I didn't know nothing about TS before this, besides passively reading IDLs for other projects.

 </details>
<details>
<summary><strong>Week 1 - SPL Token, Gill, NFTs</strong></summary>

**Overview**: Day 1 - SPL tokens

Some things I learned:
 - How to go through the whole process to initialize a mint address then use it for creating metadata, minting the token and then tranferring it to another address.
 - I figured out a function to take in the decimal amount and make the token amounts more human-readable when modifing the values eg... toTokenAmount(50) / number_tokens(500) to correspond to the actual number of tokens you are sending.

**Overview**: Day 2 - Gill
- Learned about Gill and how to use it as a simplifier for web3js and solana/kit. 

**Overview**: Day 3 - SPL tokens
- Learned how to upload my own image to Pinata and then use the scripts to create a flow
- nft_metadata handles off-chain json storage on Irys or arweave
- nft_mint pushes metadata that we defined on-chain and creates the nft, has a reference to the off-chain metadata uri.
- some marketplaces will take the on-chain metadata, some will take the off-chain metadata.
</details>

<details>
<summary><strong>Week 2 - Vaults, Escrows, and AMMs</strong></summary>

**Overview**: Day 1 - Advanced Vault concepts and Program Derived Addresses
 
Some things I learned:
 - the building block of all solana programs -- vaults.
 - to deposit funds and withdraw
 - how to close a vault and return the rent fee to owner.

**Overview**: Day 2 - Complete Escrow Implementation

Some things I learned:
 - the building structure of all solana programs -- escrows!
 - probably one of the hardest things i've learned.
 - learned about how Anchor bundles account structs, serializes them, and uses handlers to send them to the Solana runtime.
 - learned about all sorts of Anchor account wrappers and their purposes eg. Program<T>, Account<T>, Interface<T>, InterfaceAccount<T>, AccountInfo<T>, and so on.
 - did a deep dive into all the Anchor account contraints and what they do.
 - connected the idea of implement methods as instruction handlers who are doing the "job" to send bytes (which everything has to be converted to) to the Solana runtime
 - figured out how has_one and init_if_needed do important validation / read tasks when they are checking on data we "wrote" with an initializer like `make_offer.rs`.
 - Built a full three-instruction escrow: `make_offer`, `take_offer`, and `refund_offer`

<br>
**Overview**: Day 3 - AMM Development (Ongoing)

**Overview**: Day 3 - AMM (Ongoing)

Still working on the AMM video! Fell behind on this one.
</details>

<details>
<summary><strong>Week 3 - NFT Staking Program and Marketplace</strong></summary>

Some things I learned:

- How NFTs are staked and frozen in the user's wallet
- How NFTs can accrue points and be claimed
- Dived a bit deeper into methods like .to_account_info(), .key(), as_ref(), the context functions and how the runtime expects information to be delivered.
- learned about the metadata program structs 
- explored two different types of ways to implement ways to track points accrual on NFTs on an individual basis if we didn't want to aggregate it under user_account. it led to some interesting alternatives for design decisions -- i.e. adding mint.key to user_account versus creating an enhanced StakeAccount struct with accumulated rewards tracking.

</details>
