#!/bin/bash

# Solana Template Initialization Script
# This script sets up a new Solana project from this template

set -e

echo "🚀 Initializing Solana Template Project..."

# Check if required tools are installed
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    fi
}

echo "🔍 Checking prerequisites..."
check_command "rustc"
check_command "cargo"
check_command "node"
check_command "npm"
check_command "solana"
check_command "anchor"

# Update program ID in Anchor.toml
echo "📝 Configuring project..."
PROGRAM_NAME=$(basename "$(pwd)")

# Create target/deploy directory if it doesn't exist
mkdir -p target/deploy

# Generate program keypair and extract the program ID more reliably
solana-keygen new --force --no-passphrase --silent --outfile target/deploy/${PROGRAM_NAME}-keypair.json
PROGRAM_ID=$(solana-keygen pubkey target/deploy/${PROGRAM_NAME}-keypair.json)

echo "🔑 Generated program ID: $PROGRAM_ID"

# Update Anchor.toml with new program ID
sed -i.bak "s/template_program/${PROGRAM_NAME}/g" Anchor.toml
sed -i.bak "s/TemplateProgram/${PROGRAM_NAME}/g" Anchor.toml
sed -i.bak "s/template-program/${PROGRAM_NAME}/g" Anchor.toml
sed -i.bak "s/solana-template/${PROGRAM_NAME}/g" Anchor.toml

# Update Cargo.toml and test file, then rename program directory if it exists
if [ -d "programs/template-program" ]; then
    # Update package name and lib name in Cargo.toml
    RUST_PROGRAM_NAME=$(echo "${PROGRAM_NAME}" | tr '-' '_')
    sed -i.bak "s/template-program/${PROGRAM_NAME}/g" programs/template-program/Cargo.toml
    sed -i.bak "s/template_program/${RUST_PROGRAM_NAME}/g" programs/template-program/Cargo.toml
    sed -i.bak "s/solana_template/${RUST_PROGRAM_NAME}/g" programs/template-program/Cargo.toml
    
    # Update test file to use the new program name (before renaming directory)
    sed -i.bak "s/template_program/${RUST_PROGRAM_NAME}/g" programs/template-program/tests/test_template.rs
    
    # Update the program ID in lib.rs and test file to use the generated program ID
    sed -i.bak "s/Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS/${PROGRAM_ID}/g" programs/template-program/src/lib.rs
    sed -i.bak "s/Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS/${PROGRAM_ID}/g" programs/template-program/tests/test_template.rs
    
    # Update the module name in lib.rs to match the new program name
    sed -i.bak "s/pub mod template_program/pub mod ${RUST_PROGRAM_NAME}/g" programs/template-program/src/lib.rs
    
    # Now rename the directory
    mv programs/template-program "programs/${PROGRAM_NAME}"
fi

# Update package.json
sed -i.bak "s/template-program/${PROGRAM_NAME}/g" package.json

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Clean and build the program
echo "🧹 Cleaning previous build..."
anchor clean
echo "🔨 Building program..."
anchor build

# Generate clients
echo "🎯 Generating Codama clients..."
npm run generate-clients

# Check if .so file was created
RUST_PROGRAM_NAME=$(echo "${PROGRAM_NAME}" | tr '-' '_')
SO_FILE="target/deploy/${RUST_PROGRAM_NAME}.so"
if [ ! -f "$SO_FILE" ]; then
    echo "❌ Program .so file not found at $SO_FILE"
    echo "🔧 Trying alternative build approach..."
    cargo build-sbf --manifest-path programs/${PROGRAM_NAME}/Cargo.toml
fi

# Run tests
echo "🧪 Running tests..."
cargo test --manifest-path programs/${PROGRAM_NAME}/Cargo.toml

echo "✅ Project initialized successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update your program name in programs/${PROGRAM_NAME}/src/lib.rs"
echo "2. Add your instructions in programs/${PROGRAM_NAME}/src/instructions/"
echo "3. Add your state structures in programs/${PROGRAM_NAME}/src/state/"
echo "4. Write tests in programs/${PROGRAM_NAME}/tests/"
echo "5. Start developing! 🎉"