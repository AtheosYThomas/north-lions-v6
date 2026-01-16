$gh = 'C:\Program Files\GitHub CLI\gh.exe'
if (-not (Test-Path $gh)) { Write-Error "gh executable not found at $gh"; exit 2 }
# Ensure label exists
& $gh label view chore 1>$null 2>$null
if ($LASTEXITCODE -ne 0) {
  & $gh label create chore --color C0C0C0 --description 'chore'
  Write-Output 'Label created'
} else {
  Write-Output 'Label exists'
}
# Get current user
$user = & $gh api user --jq .login
Write-Output "User: $user"
# Add label and reviewer to PR #18
& $gh pr edit 18 --add-label chore
& $gh pr edit 18 --add-reviewer $user
# Show PR URL
$url = & $gh pr view 18 --json url -q .url
Write-Output "PR_URL: $url"
