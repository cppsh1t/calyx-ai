#!/usr/bin/env bash
# calyx-cli local installation script
# For quick local testing of packaged calyx-cli

set -e  # Exit immediately on error

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get absolute path of script directory
if [ -n "${BASH_SOURCE[0]}" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
    SCRIPT_DIR="$(pwd)"
fi

# Validate directory path
SCRIPT_DIR="$(cd "$SCRIPT_DIR" && pwd)"

# If script is in apps/calyx-cli directory
if echo "$SCRIPT_DIR" | grep -q "/apps/calyx-cli$"; then
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
    CLI_DIR="$SCRIPT_DIR"
else
    # If executed from other location, use current directory
    CLI_DIR="$(pwd)"
    PROJECT_ROOT="$(cd "$CLI_DIR/../.." && pwd)"
fi

echo -e "${GREEN}=== calyx-cli Local Installation Script ===${NC}"
echo ""

# Step 1: Remove existing .tgz packages
echo -e "${YELLOW}[1/5] Checking and removing existing .tgz packages...${NC}"
if ls "$CLI_DIR"/calyx-cli-*.tgz 2>/dev/null; then
    rm -f "$CLI_DIR"/calyx-cli-*.tgz
    echo -e "${GREEN}[OK] Removed old .tgz packages${NC}"
else
    echo -e "${GREEN}[OK] No existing .tgz packages found${NC}"
fi

# Step 2: Uninstall global package
echo ""
echo -e "${YELLOW}[2/5] Uninstalling global calyx-cli...${NC}"
if bun pm ls -g | grep -q "calyx-cli"; then
    bun rm -g calyx-cli
    echo -e "${GREEN}[OK] Uninstalled global calyx-cli${NC}"
else
    echo -e "${GREEN}[OK] Global calyx-cli not installed${NC}"
fi

# Step 3: Build calyx-cli
echo ""
echo -e "${YELLOW}[3/5] Building calyx-cli...${NC}"
cd "$PROJECT_ROOT"
bun run build --filter=calyx-cli
echo -e "${GREEN}[OK] Build completed${NC}"

# Step 4: Pack
echo ""
echo -e "${YELLOW}[4/5] Packing calyx-cli...${NC}"
cd "$CLI_DIR"
npm pack
echo -e "${GREEN}[OK] Pack completed${NC}"

# Step 5: Global install
echo ""
echo -e "${YELLOW}[5/5] Installing calyx-cli globally...${NC}"
TGZ_FILE=$(ls "$CLI_DIR"/calyx-cli-*.tgz 2>/dev/null | head -n 1)
if [ -z "$TGZ_FILE" ]; then
    echo -e "${RED}[ERROR] .tgz package not found${NC}"
    exit 1
fi
bun add -g "$TGZ_FILE"
echo -e "${GREEN}[OK] Installation completed${NC}"

# Verify installation
echo ""
echo -e "${YELLOW}Verifying installation...${NC}"
if command -v calyx &> /dev/null; then
    echo -e "${GREEN}[OK] calyx command is available${NC}"
    CALYX_PATH=$(command -v calyx)
    echo "Location: $CALYX_PATH"
    VERSION=$(calyx --version 2>/dev/null) && echo "Version: $VERSION" || echo -e "${YELLOW}[NOTE] Could not get version info${NC}"
else
    echo -e "${RED}[WARN] calyx command not found in PATH${NC}"
    echo "You may need to restart your terminal or add bun global bin to PATH"
fi

echo ""
echo -e "${GREEN}=== Installation Complete! ===${NC}"
