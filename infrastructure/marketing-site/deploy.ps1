# Deploy the marketing site Static Web App to Azure.
# Run once per environment; subsequent deploys happen automatically via GitHub Actions.
#
# Prerequisites:
#   Install Azure CLI: https://aka.ms/installazurecliwindows
#   az login
#   az account set --subscription <YOUR_SUBSCRIPTION_ID>
#
# Usage:
#   .\deploy.ps1 production
#   .\deploy.ps1 staging

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet('production', 'staging')]
    [string]$Environment
)

$ErrorActionPreference = 'Stop'

$ResourceGroup = "rg-tcpc-marketing-$Environment"
$Location      = 'westeurope'
$ParamFile     = "$Environment.bicepparam"

# ---------------------------------------------------------------------------
# Secrets — read from environment variables, never hard-coded.
# Set these in your shell before running:
#   $env:BACKEND_PRICE_API_BASE_URL = 'https://api.tcpc.dk/v1'
#   $env:GITHUB_PAT = 'github_pat_...'
# ---------------------------------------------------------------------------

$PriceApiUrl = $env:BACKEND_PRICE_API_BASE_URL
$GithubPat   = $env:GITHUB_PAT

if (-not $PriceApiUrl) {
    Write-Error 'Set $env:BACKEND_PRICE_API_BASE_URL before running.'
}
if (-not $GithubPat) {
    Write-Error 'Set $env:GITHUB_PAT (fine-grained PAT with repo read access) before running.'
}

# ---------------------------------------------------------------------------
# 1. Create resource group (idempotent)
# ---------------------------------------------------------------------------

Write-Host "`n-> Ensuring resource group '$ResourceGroup' in $Location..."
az group create `
    --name $ResourceGroup `
    --location $Location `
    --tags project=tcpc component=marketing-site environment=$Environment managedBy=bicep `
    --output none

# ---------------------------------------------------------------------------
# 2. Deploy Bicep template
# ---------------------------------------------------------------------------

Write-Host "-> Deploying $ParamFile to $ResourceGroup..."
$OutputsJson = az deployment group create `
    --resource-group $ResourceGroup `
    --template-file main.bicep `
    --parameters $ParamFile `
    --parameters backendPriceApiUrl=$PriceApiUrl repositoryToken=$GithubPat `
    --output json

$Outputs         = $OutputsJson | ConvertFrom-Json
$DefaultHostname = $Outputs.properties.outputs.defaultHostname.value
$SwaName         = $Outputs.properties.outputs.staticWebAppName.value
$DeployToken     = $Outputs.properties.outputs.deploymentToken.value

# ---------------------------------------------------------------------------
# 3. Print next steps
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "Deployment complete."
Write-Host ""
Write-Host "  Default URL   : https://$DefaultHostname"
Write-Host "  SWA resource  : $SwaName (resource group: $ResourceGroup)"
Write-Host ""
Write-Host "Next steps:"
Write-Host ""
Write-Host "  1. Add the deployment token as a GitHub secret:"
Write-Host "       Secret name  : AZURE_STATIC_WEB_APPS_API_TOKEN"
Write-Host "       Secret value : $DeployToken"
Write-Host "     -> github.com/ThomasHoest/TheCheapPowerCompany/settings/secrets/actions"
Write-Host ""
Write-Host "  2. Configure DNS for your custom domain:"
if ($Environment -eq 'production') {
    Write-Host "       tcpc.dk         ALIAS / CNAME -> $DefaultHostname"
    Write-Host "       www.tcpc.dk     CNAME         -> $DefaultHostname"
} else {
    Write-Host "       staging.tcpc.dk CNAME -> $DefaultHostname"
}
Write-Host ""
Write-Host "  3. After DNS propagates, Azure will provision a managed TLS cert (~10 min)."
Write-Host ""
Write-Host "  4. Push to the tracked branch to trigger the first real deployment:"
if ($Environment -eq 'production') {
    Write-Host "       git push origin main"
} else {
    Write-Host "       git push origin develop"
}
