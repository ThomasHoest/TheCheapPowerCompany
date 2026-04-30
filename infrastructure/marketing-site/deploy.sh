#!/usr/bin/env bash
# Deploy the marketing site Static Web App to Azure.
# Run once per environment; subsequent deploys happen automatically via GitHub Actions.
#
# Prerequisites:
#   az login
#   az account set --subscription <YOUR_SUBSCRIPTION_ID>
#
# Usage:
#   ./deploy.sh production
#   ./deploy.sh staging

set -euo pipefail

ENV="${1:-}"
if [[ "$ENV" != "production" && "$ENV" != "staging" ]]; then
  echo "Usage: $0 <production|staging>"
  exit 1
fi

RESOURCE_GROUP="rg-tcpc-marketing-${ENV}"
LOCATION="westeurope"
PARAM_FILE="${ENV}.bicepparam"

# ---------------------------------------------------------------------------
# Secrets — source from env vars or a secrets manager, never hard-code.
# ---------------------------------------------------------------------------

PRICE_API_URL="${BACKEND_PRICE_API_BASE_URL:?Set BACKEND_PRICE_API_BASE_URL}"
GITHUB_PAT="${GITHUB_PAT:?Set GITHUB_PAT (fine-grained PAT with repo read access)}"

# ---------------------------------------------------------------------------
# 1. Create resource group (idempotent)
# ---------------------------------------------------------------------------

echo "→ Ensuring resource group '$RESOURCE_GROUP' in $LOCATION..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --tags project=tcpc component=marketing-site environment="$ENV" managedBy=bicep \
  --output none

# ---------------------------------------------------------------------------
# 2. Deploy Bicep template
# ---------------------------------------------------------------------------

echo "→ Deploying $PARAM_FILE to $RESOURCE_GROUP..."
OUTPUTS=$(az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file main.bicep \
  --parameters "$PARAM_FILE" \
  --parameters \
    backendPriceApiUrl="$PRICE_API_URL" \
    repositoryToken="$GITHUB_PAT" \
  --output json)

DEFAULT_HOSTNAME=$(echo "$OUTPUTS" | jq -r '.properties.outputs.defaultHostname.value')
SWA_NAME=$(echo "$OUTPUTS"        | jq -r '.properties.outputs.staticWebAppName.value')
DEPLOY_TOKEN=$(echo "$OUTPUTS"    | jq -r '.properties.outputs.deploymentToken.value')

# ---------------------------------------------------------------------------
# 3. Print next steps
# ---------------------------------------------------------------------------

echo ""
echo "Deployment complete."
echo ""
echo "  Default URL   : https://$DEFAULT_HOSTNAME"
echo "  SWA resource  : $SWA_NAME (resource group: $RESOURCE_GROUP)"
echo ""
echo "Next steps:"
echo ""
echo "  1. Add the deployment token as a GitHub secret:"
echo "       Secret name  : AZURE_STATIC_WEB_APPS_API_TOKEN"
echo "       Secret value : $DEPLOY_TOKEN"
echo "     → github.com/ThomasHoest/TheCheapPowerCompany/settings/secrets/actions"
echo ""
echo "  2. Configure DNS for your custom domain:"
if [[ "$ENV" == "production" ]]; then
  echo "       tcpc.dk         ALIAS / CNAME → $DEFAULT_HOSTNAME"
  echo "       www.tcpc.dk     CNAME          → $DEFAULT_HOSTNAME"
else
  echo "       staging.tcpc.dk CNAME → $DEFAULT_HOSTNAME"
fi
echo ""
echo "  3. After DNS propagates, Azure will provision a managed TLS cert (~10 min)."
echo ""
echo "  4. Push to the tracked branch to trigger the first real deployment:"
if [[ "$ENV" == "production" ]]; then
  echo "       git push origin main"
else
  echo "       git push origin develop"
fi
