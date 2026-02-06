$ErrorActionPreference = "Stop"

$Image = "alphaclaw:local"
$Container = "alphaclaw"
$Port = if ($env:ALPHACLAW_GATEWAY_PORT) { $env:ALPHACLAW_GATEWAY_PORT } else { "8888" }
$DataDir = if ($env:ALPHACLAW_CONFIG_DIR) { $env:ALPHACLAW_CONFIG_DIR } else { "$HOME/.alphaclaw" }

# Create data directory if it doesn't exist
if (!(Test-Path $DataDir)) {
    New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
}

# Build image if it doesn't exist
docker image inspect $Image 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Building $Image..."
    docker build -t $Image .
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

# Stop and remove existing container if running
docker container inspect $Container 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Stopping existing $Container container..."
    docker rm -f $Container | Out-Null
}

# Load .env file if present
$EnvArgs = @()
if (Test-Path .env) {
    $EnvArgs += "--env-file", ".env"
}

Write-Host "Starting AlphaClaw on port $Port..."
Write-Host "Config directory: $DataDir"

docker run -d `
    --name $Container `
    -p "${Port}:${Port}" `
    -v "${DataDir}:/home/node/.alphaclaw" `
    @EnvArgs `
    --restart unless-stopped `
    $Image `
    node dist/index.js gateway --bind lan --port $Port

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start container."
    exit 1
}

Write-Host ""
Write-Host "AlphaClaw is running."
Write-Host "  Web UI: http://localhost:$Port"
Write-Host "  Logs:   docker logs -f $Container"
Write-Host "  Stop:   docker stop $Container"
