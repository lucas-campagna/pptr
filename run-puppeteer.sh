#!/bin/bash
# run-puppeteer.sh - Run Puppeteer YAML scripts in Docker
# Usage: ./run-puppeteer.sh <script.yaml> [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_usage() {
  echo "Usage: $0 <script.yaml> [options]"
  echo ""
  echo "Options:"
  echo "  --headless              Run in headless mode (default)"
  echo "  --no-headless           Run in visible browser"
  echo "  --log <path>            Write logs to file inside output dir"
  echo "  --output <dir>          Output directory (default: ./output)"
  echo "  --var <VAR=VALUE>       Override variable (can use multiple times)"
  echo "  -v <VAR=VALUE>          Override variable (shorthand)"
  echo ""
  echo "Examples:"
  echo "  $0 scripts/example.yaml"
  echo "  $0 scripts/example.yaml --no-headless"
  echo "  $0 scripts/example.yaml --var BASE_URL=https://other-site.com"
  echo "  $0 scripts/example.yaml -v BASE_URL=https://other-site.com -v SEARCH_TERM=test"
  exit 1
}

# Check for script argument
if [ -z "$1" ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  print_usage
fi

SCRIPT_PATH="$1"
shift

# Validate script file exists
if [ ! -f "$SCRIPT_PATH" ]; then
  echo -e "${RED}Error: Script file not found: $SCRIPT_PATH${NC}"
  exit 1
fi

# Resolve absolute paths
SCRIPT_PATH=$(realpath "$SCRIPT_PATH")
SCRIPT_DIR=$(dirname "$SCRIPT_PATH")
SCRIPT_NAME=$(basename "$SCRIPT_PATH")

# Default options
HEADLESS="true"
OUTPUT_DIR="./"
LOG_ARG=""
VAR_ARGS=()

# Parse options
while [ $# -gt 0 ]; do
  case "$1" in
    --headless)
      HEADLESS="true"
      shift
      ;;
    --no-headless)
      HEADLESS="false"
      shift
      ;;
    --log)
      if [ -z "$2" ]; then
        echo -e "${RED}Error: --log requires a file path${NC}"
        exit 1
      fi
      LOG_ARG="$2"
      shift 2
      ;;
    --output)
      if [ -z "$2" ]; then
        echo -e "${RED}Error: --output requires a directory path${NC}"
        exit 1
      fi
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --var)
      if [ -z "$2" ]; then
        echo -e "${RED}Error: --var requires VAR=VALUE format${NC}"
        exit 1
      fi
      VAR_ARGS+=("--var" "$2")
      shift 2
      ;;
    -v)
      if [ -z "$2" ]; then
        echo -e "${RED}Error: -v requires VAR=VALUE format${NC}"
        exit 1
      fi
      VAR_ARGS+=("--var" "$2")
      shift 2
      ;;
    *=*)
      # VAR=VALUE format
      VAR_ARGS+=("--var" "$1")
      shift
      ;;
    *)
      echo -e "${RED}Error: Unknown option: $1${NC}"
      print_usage
      ;;
  esac
done

# Create output directory
mkdir -p "$OUTPUT_DIR"
OUTPUT_DIR=$(realpath "$OUTPUT_DIR")

# Build docker args
DOCKER_ARGS="--rm --cap-add=SYS_ADMIN"
DOCKER_ARGS="$DOCKER_ARGS -v \"$SCRIPT_DIR:/app/scripts:ro\""
DOCKER_ARGS="$DOCKER_ARGS -v \"$OUTPUT_DIR:/app/output\""

# Set headless environment variable
if [ "$HEADLESS" = "false" ]; then
  DOCKER_ARGS="$DOCKER_ARGS -e HEADLESS=false"
fi

# Build command arguments
CMD_ARGS="scripts/$SCRIPT_NAME"
if [ "$HEADLESS" = "false" ]; then
  CMD_ARGS="$CMD_ARGS --no-headless"
fi
if [ -n "$LOG_ARG" ]; then
  CMD_ARGS="$CMD_ARGS --log $LOG_ARG"
fi
# Add variable override arguments
for var_arg in "${VAR_ARGS[@]}"; do
  CMD_ARGS="$CMD_ARGS $var_arg"
done

# Print run info
echo -e "${GREEN}Running Puppeteer script:${NC} $SCRIPT_NAME"
echo -e "${GREEN}Script directory:${NC} $SCRIPT_DIR"
echo -e "${GREEN}Output directory:${NC} $OUTPUT_DIR"
echo -e "${GREEN}Headless mode:${NC} $HEADLESS"
if [ -n "$LOG_ARG" ]; then
  echo -e "${GREEN}Log file:${NC} $OUTPUT_DIR/$LOG_ARG"
fi
if [ ${#VAR_ARGS[@]} -gt 0 ]; then
  echo -e "${GREEN}Variables:${NC} ${VAR_ARGS[*]}"
fi
echo ""

# Run container
eval docker run $DOCKER_ARGS puppeteer-runner $CMD_ARGS

# Check exit code
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo -e "${GREEN}Script completed successfully${NC}"
else
  echo ""
  echo -e "${RED}Script failed with exit code: $EXIT_CODE${NC}"
fi

exit $EXIT_CODE
