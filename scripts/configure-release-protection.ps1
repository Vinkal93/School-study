$ErrorActionPreference = 'Stop'
$taskCredentialLines = "protocol=https`nhost=github.com`n`n" | git -c credential.interactive=false credential fill 2>$null
$taskCredentialFields = @{}
foreach ($taskLine in $taskCredentialLines) {
  $taskPair = $taskLine -split '=', 2
  if ($taskPair.Length -eq 2) { $taskCredentialFields[$taskPair[0]] = $taskPair[1] }
}
if (-not $taskCredentialFields.password) { throw 'Sign in to GitHub with Git Credential Manager first.' }
$taskHeaders = @{ Authorization = ('Bearer ' + $taskCredentialFields.password); Accept = 'application/vnd.github+json'; 'X-GitHub-Api-Version' = '2022-11-28' }
$taskUrl = 'https://api.github.com/repos/Vinkal93/School-study/branches/main/protection'
$taskConfig = @{
  required_status_checks = @{ strict = $true; contexts = @('Release checks', 'Safe release gate', 'Vercel – school-study') }
  enforce_admins = $true
  required_pull_request_reviews = @{ dismiss_stale_reviews = $true; require_code_owner_reviews = $false; required_approving_review_count = 0 }
  restrictions = $null
  required_linear_history = $false
  allow_force_pushes = $false
  allow_deletions = $false
  required_conversation_resolution = $true
} | ConvertTo-Json -Depth 8
$null = Invoke-RestMethod -Method Put -Uri $taskUrl -Headers $taskHeaders -ContentType 'application/json' -Body $taskConfig
$taskApplied = Invoke-RestMethod -Uri $taskUrl -Headers $taskHeaders
@{
  requiredChecks = $taskApplied.required_status_checks.contexts
  upToDateRequired = $taskApplied.required_status_checks.strict
  administratorsProtected = $taskApplied.enforce_admins.enabled
  pullRequestsRequired = ($null -ne $taskApplied.required_pull_request_reviews)
  forcePushAllowed = $taskApplied.allow_force_pushes.enabled
  deletionAllowed = $taskApplied.allow_deletions.enabled
  conversationsMustResolve = $taskApplied.required_conversation_resolution.enabled
} | ConvertTo-Json
