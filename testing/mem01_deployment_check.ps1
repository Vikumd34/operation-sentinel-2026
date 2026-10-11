$ErrorActionPreference = "Stop"

try {
    $container = docker inspect operation-sentinel-2026 | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw "Container not found" }

    $health = Invoke-RestMethod "http://127.0.0.1:8081/api/health"

    if (-not $health.ok -or $health.stages -ne 6 -or -not $health.flagsLoaded) {
        throw "Health check failed"
    }

    if ($container.Config.User -ne "node") {
        throw "Container is not running as node user"
    }

    if ($container.HostConfig.Privileged) {
        throw "Privileged mode is enabled"
    }

    $flagsMount = $container.Mounts |
        Where-Object { $_.Destination -eq "/app/organiser_only" }

    if (-not $flagsMount -or $flagsMount.RW) {
        throw "Flags mount is missing or writable"
    }

    Write-Host "PASS: Docker health, 6 stages, non-root user, security and flags mount" -ForegroundColor Green
}
catch {
    Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}