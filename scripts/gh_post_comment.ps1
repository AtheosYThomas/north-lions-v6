$gh = 'C:\Program Files\GitHub CLI\gh.exe'
if (-not (Test-Path $gh)) { Write-Error "gh executable not found at $gh"; exit 2 }
Set-Location (Split-Path -Path $MyInvocation.MyCommand.Path -Parent)
# Ensure we are in repo root
Set-Location '..\'
& $gh pr comment 18 --body-file pr_comment.md
$url = & $gh pr view 18 --json url -q .url
Write-Output "PR_URL: $url"
