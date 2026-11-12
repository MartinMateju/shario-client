[CmdletBinding(SupportsShouldProcess = $true)]
param()

Set-StrictMode -Version 3.0
$ErrorActionPreference = "Stop"

$frontendRoot = Split-Path -Parent $PSScriptRoot
$tenantRoot = Join-Path $frontendRoot "src/app/[locale]/tenants/[tenantSlug]"

# Refuse to clean an older tree until the replacement route groups are present.
# This keeps the overlay operation fail-safe if the ZIP was extracted in the
# wrong directory or only partially copied.
$requiredCanonicalFiles = @(
    "(public-foundation)/page.js",
    "(tenant-auth)/login/page.js",
    "(customer-transactions)/layout.js"
)

$missingCanonicalFiles = @(
    foreach ($relativePath in $requiredCanonicalFiles) {
        $candidate = Join-Path $tenantRoot $relativePath
        if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            $candidate
        }
    }
)

if ($missingCanonicalFiles.Count -gt 0) {
    $formattedMissing = $missingCanonicalFiles -join [Environment]::NewLine
    throw "The shared customer-shell ZIP is not fully extracted. Missing canonical files:$([Environment]::NewLine)$formattedMissing"
}

# Earlier frontend ZIPs placed these public and auth route owners directly below
# [tenantSlug]. Their replacements now live in explicit route groups.
$obsoletePaths = @(
    "page.js",
    "book",
    "courses",
    "help",
    "memberships",
    "login",
    "password",
    "register",

    # Payment-result pages moved into (customer-transactions), where they remain
    # available even if a studio's public site is unpublished.
    "(public-foundation)/memberships/checkout/cancel/page.js",
    "(public-foundation)/memberships/checkout/success/page.js",
    "(studio-grohovka-public)/checkout/cancel/page.js",
    "(studio-grohovka-public)/checkout/success/page.js",
    "(studio-grohovka-public)/kurzy-keramiky-brno/cancel/page.js",
    "(studio-grohovka-public)/kurzy-keramiky-brno/success/page.js"
)

foreach ($relativePath in $obsoletePaths) {
    $target = Join-Path $tenantRoot $relativePath
    if (Test-Path -LiteralPath $target) {
        if ($PSCmdlet.ShouldProcess($target, "Remove obsolete route owner")) {
            Remove-Item -LiteralPath $target -Recurse -Force
        }
    }
}

$nextCache = Join-Path $frontendRoot ".next"
if (Test-Path -LiteralPath $nextCache) {
    if ($PSCmdlet.ShouldProcess($nextCache, "Clear the Next.js build cache")) {
        Remove-Item -LiteralPath $nextCache -Recurse -Force
    }
}

Write-Host "Shared customer-shell overlay cleanup completed."
