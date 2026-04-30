@description('Name of the Static Web App resource.')
param name string

@description('Azure region. West Europe gives lowest latency to Denmark.')
param location string = 'westeurope'

@description('GitHub repository URL.')
param repositoryUrl string = 'https://github.com/ThomasHoest/TheCheapPowerCompany'

@description('Branch this environment tracks (main = production, develop = staging).')
param branch string

@description('Custom domain to bind (e.g. tcpc.dk or staging.tcpc.dk). Leave empty to skip.')
param customDomain string = ''

@description('Public URL of the onboarding flow.')
param onboardingUrl string

@description('Internal backend price API base URL. Marked secure — never stored in param files.')
@secure()
param backendPriceApiUrl string

@description('Set to "true" to show the signup-disabled state on all CTAs.')
param signupDisabled string = 'false'

@description('GitHub fine-grained PAT with repo read access, used by Azure to pull source. Pass at deploy time — never commit.')
@secure()
param repositoryToken string = ''

@description('Resource tags applied to all resources.')
param tags object = {
  project: 'tcpc'
  component: 'marketing-site'
  managedBy: 'bicep'
}

// ---------------------------------------------------------------------------
// Static Web App
// ---------------------------------------------------------------------------

resource swa 'Microsoft.Web/staticSites@2023-01-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    repositoryUrl: repositoryUrl
    branch: branch
    repositoryToken: repositoryToken
    buildProperties: {
      appLocation: 'apps/marketing-site'
      outputLocation: '.next'
      apiLocation: ''
      skipGithubActionWorkflowGeneration: true  // Workflow is already committed to the repo
    }
  }
}

// ---------------------------------------------------------------------------
// Application settings (environment variables)
// These are injected by the SWA runtime — not stored in the Next.js build.
// ---------------------------------------------------------------------------

resource appSettings 'Microsoft.Web/staticSites/config@2023-01-01' = {
  parent: swa
  name: 'appsettings'
  properties: {
    NEXT_PUBLIC_ONBOARDING_URL: onboardingUrl
    NEXT_PUBLIC_BACKEND_PRICE_API_BASE_URL: backendPriceApiUrl
    NEXT_PUBLIC_SIGNUP_DISABLED: signupDisabled
  }
}

// ---------------------------------------------------------------------------
// Custom domain
// Skipped when customDomain param is empty.
//
// After deploying, Azure will show you a validation token or CNAME target.
// Add the DNS record at your registrar, then Azure will issue a managed cert.
// Allow up to 10 minutes for cert provisioning.
// ---------------------------------------------------------------------------

resource domain 'Microsoft.Web/staticSites/customDomains@2023-01-01' = if (!empty(customDomain)) {
  parent: swa
  name: customDomain
  properties: {}
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

@description('The default Azure-assigned hostname (e.g. polite-bay-xxx.azurestaticapps.net).')
output defaultHostname string = swa.properties.defaultHostname

@description('Deployment API token — add this as AZURE_STATIC_WEB_APPS_API_TOKEN in GitHub secrets.')
#disable-next-line outputs-should-not-contain-secrets
output deploymentToken string = swa.listSecrets().properties.apiKey

@description('Resource name for reference in CI scripts.')
output staticWebAppName string = swa.name
