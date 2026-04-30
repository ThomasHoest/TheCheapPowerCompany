using './main.bicep'

// Staging environment — tracks the 'develop' branch → staging.tcpc.dk
//
// Secure params (backendPriceApiUrl, repositoryToken) are NOT stored here.
// Pass them at deploy time:
//   --parameters backendPriceApiUrl=$PRICE_API_URL repositoryToken=$GITHUB_PAT

param name = 'swa-tcpc-marketing-staging'
param branch = 'develop'
param customDomain = 'staging.tcpc.dk'
param onboardingUrl = 'https://staging.tcpc.dk/signup'
param signupDisabled = 'false'
param tags = {
  project: 'tcpc'
  component: 'marketing-site'
  environment: 'staging'
  managedBy: 'bicep'
}
