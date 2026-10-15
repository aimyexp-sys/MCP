#!/bin/bash

# Trap Ctrl+C (SIGINT) and exit signals to cleanly kill all background processes
trap 'echo -e "\n🛑 Stopping all servers..."; kill $(jobs -p) 2>/dev/null; exit' SIGINT SIGTERM EXIT

echo "=================================================="
echo "🚀 Starting All 5 Servers..."
echo "  1. Student API Server   -> http://localhost:3000"
echo "  2. Student Portal Web   -> http://localhost:5173"
echo "  3. Job Portal Server    -> http://localhost:4000"
echo "  4. Job Portal Web       -> http://localhost:5174"
echo "  5. exp_portal-mcp-server-> MCP (stdio)"
echo "=================================================="

npm start --prefix students-server &
npm run dev --prefix students-portal &
npm start --prefix job-portal-server &
npm run dev --prefix job-portal-web &
npm start --prefix mcp-server &

# Wait for all background jobs
wait
