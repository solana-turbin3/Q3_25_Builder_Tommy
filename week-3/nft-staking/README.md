# Solana Template Project - made by tommy

A complete, modern Solana development template with automated setup using Anchor, Codama, Solana Kite, and LiteSVM for streamlined development and testing.

## Features

- **🚀 One-Command Setup**: Fully automated project initialization with `./init.sh`
- **⚓ Anchor Framework**: Latest Anchor setup for Solana program development
- **🔄 Codama Integration**: Automatic TypeScript client generation from IDL
- **🧪 LiteSVM Testing**: Fast, in-process testing without validator overhead
- **⚡ Solana Kite**: Modern, type-safe client library for Solana interactions
- **📦 Smart Dependencies**: Pre-configured compatible versions that work together
- **🏗️ Dynamic Renaming**: Automatically adapts to your project name
- **✅ Verified Build Process**: Handles both Anchor builds and liteSVM testing

## Quick Start

### Prerequisites

- Rust and Cargo
- Node.js (v18+)
- Solana CLI
- Anchor CLI

### Installation

1. Clone this template:
```bash
git clone <template-repo-url> my-project
cd my-project
```

2. Run the initialization script:
```bash
./init.sh
```

That's it! The init script will:
- ✅ Check all prerequisites (Rust, Node.js, Solana CLI, Anchor CLI)
- ✅ Generate a unique program ID and keypair
- ✅ Configure the project with your directory name
- ✅ Update all file names, module names, and program IDs consistently
- ✅ Install all Node.js dependencies
- ✅ Clean and build the Anchor program
- ✅ Generate Codama TypeScript clients
- ✅ Build the program for liteSVM testing
- ✅ Run all tests (including integration tests with liteSVM)

Your project will be fully configured and ready for development with:
- A working "hello world" Anchor program
- Generated TypeScript clients
- Passing liteSVM integration tests
- All files properly renamed to your project

### Development

#### Running Tests
```bash
# Run all tests with LiteSVM (from project root)
cargo test --manifest-path programs/YOUR_PROJECT_NAME/Cargo.toml

# Run specific test
cargo test test_hello_world --manifest-path programs/YOUR_PROJECT_NAME/Cargo.toml
```

#### Building
```bash
# Clean and build the program
anchor clean
anchor build

# Build for liteSVM testing (if needed)
cargo build-sbf --manifest-path programs/YOUR_PROJECT_NAME/Cargo.toml
```

#### Client Generation
```bash
# Generate TypeScript clients with Codama
npm run generate-clients
```

#### Full Rebuild (if needed)
```bash
# If you encounter any issues, re-run the init script
./init.sh
```

### Project Structure (After Initialization)

After running `./init.sh` in a directory named `my-project`, you'll get:

```
my-project/
├── programs/
│   └── my-project/                    # Renamed from template-program
│       ├── src/
│       │   ├── lib.rs                # Main program (with your program ID)
│       │   ├── instructions/         # Instruction handlers
│       │   └── state/                # State structures
│       ├── tests/
│       │   └── test_my_project.rs    # LiteSVM integration tests
│       └── Cargo.toml                # Updated with your project name
├── clients/
│   └── js/
│       └── src/
│           └── generated/            # Auto-generated TypeScript clients
├── scripts/
│   └── generate-clients.ts           # Codama client generation script
├── target/
│   ├── idl/
│   │   └── my_project.json          # Generated IDL (not template_program.json)
│   └── deploy/
│       ├── my_project.so            # Compiled program for liteSVM
│       └── my-project-keypair.json  # Generated program keypair
├── init.sh                          # Initialization script
├── Anchor.toml                      # Updated with your program ID
├── package.json                     # Updated dependencies
└── README.md                        # This file
```

All files are automatically renamed and configured for your specific project!

## Usage

### Creating a New Instruction

1. Add your instruction to `programs/template-program/src/lib.rs`
2. Create account structures in the instruction handler
3. Add tests in `programs/template-program/tests/`
4. Build and test:
   ```bash
   anchor build
   cargo test
   ```

### Using the Generated Client

After running `npm run generate-clients`, you can use the generated client:

```typescript
import { createTemplateProgramClient } from './clients/js/src/generated';

const client = createTemplateProgramClient();
// Use the client...
```

## Configuration

### Anchor.toml
Configure your program ID, cluster settings, and scripts in `Anchor.toml`.

### Dependencies
Update dependencies in:
- `programs/template-program/Cargo.toml` for Rust
- `package.json` for Node.js

## Testing with LiteSVM

LiteSVM provides fast, lightweight testing without the overhead of a full validator. Tests are written in Rust and run with `cargo test`.

Example test:
```rust
#[tokio::test]
async fn test_my_instruction() {
    let mut svm = LiteSVM::new();
    // Setup and test...
}
```

## Deployment

1. Set your program ID in `Anchor.toml`
2. Configure your wallet
3. Deploy:
```bash
anchor deploy
```



