$env:PATH = [System.Environment]::GetEnvironmentVariable('PATH','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('PATH','User')
Set-Location 'C:\Users\atheo\north-lions-v6'
gh pr create --base main --head chore/fix-registrations-tests --title 'fix(functions): resolve cancelRegistration TypeError' --body-file pr_body.txt --label chore
if ($LASTEXITCODE -eq 0) { gh pr view --json url -q .url }
