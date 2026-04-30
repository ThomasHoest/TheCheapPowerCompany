using './main.bicep'

// Production environment — tracks the 'main' branch → tcpc.dk
//
// Secure params (backendPriceApiUrl, repositoryToken) are NOT stored here.
// Pass them at deploy time:
//   --parameters backendPriceApiUrl=$PRICE_API_URL repositoryToken=$GITHUB_PAT

param name = 'swa-tcpc-marketing-prod'
param branch = 'main'
// customDomain = 'tcpc.dk'   ← add back once tcpc.dk is acquired and CNAME created
param onboardingUrl = 'https://tcpc.dk/signup'
param signupDisabled = 'false'
param backendPriceApiUrl = readEnvironmentVariable('BACKEND_PRICE_API_BASE_URL')
param tags = {
  project: 'tcpc'
  component: 'marketing-site'
  environment: 'production'
  managedBy: 'bicep'
}
