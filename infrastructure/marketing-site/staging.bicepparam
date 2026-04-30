using './main.bicep'

// Staging environment — tracks the 'develop' branch → staging.tcpc.dk
//
// Secure params (backendPriceApiUrl, repositoryToken) are NOT stored here.
// Pass them at deploy time:
//   --parameters backendPriceApiUrl=$PRICE_API_URL repositoryToken=$GITHUB_PAT

param name = 'swa-tcpc-marketing-staging'
param branch = 'develop'
// customDomain = 'staging.tcpc.dk'   ← add back after CNAME is created in DNS
param onboardingUrl = 'https://staging.tcpc.dk/signup'
param signupDisabled = 'false'
param backendPriceApiUrl = readEnvironmentVariable('BACKEND_PRICE_API_BASE_URL')
param tags = {
  project: 'tcpc'
  component: 'marketing-site'
  environment: 'staging'
  managedBy: 'bicep'
}
