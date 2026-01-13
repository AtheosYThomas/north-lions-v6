$outpath = 'C:\Users\atheo\north-lions-v6\e2e_full_connectivity_output.txt'
Start-Transcript -Path $outpath -Force

Write-Output "🚀 Starting End-to-End Connectivity Test..."
Write-Output "1) Logging in to Auth Emulator..."
try {
  $ProjectId = $env:TEST_PROJECT_ID
  if (-not $ProjectId) { $ProjectId='north-lions-v6-a7757' }
  $AuthHost = $env:TEST_AUTH_HOST
  if (-not $AuthHost) { $AuthHost='http://127.0.0.1:9099' }
  $FuncHost = $env:TEST_FUNC_HOST
  if (-not $FuncHost) { $FuncHost='http://127.0.0.1:5002' }
  $UserEmail = $env:TEST_USER_EMAIL
  if (-not $UserEmail) { $UserEmail='admin@example.com' }
  $UserPass = $env:TEST_USER_PASS
  if (-not $UserPass) { $UserPass='password123' }
  $ApiKey = $env:TEST_API_KEY
  if (-not $ApiKey) { $ApiKey='fake-api-key' }
  # Ensure the test user exists: try signUp (ignore if already exists)
  try {
    $SignUpUrl = "$AuthHost/identitytoolkit.googleapis.com/v1/accounts:signUp?key=$ApiKey"
    $SignUpBody = @{ email=$UserEmail; password=$UserPass; returnSecureToken=$true } | ConvertTo-Json
    Invoke-RestMethod -Uri $SignUpUrl -Method Post -Body $SignUpBody -ContentType 'application/json' -ErrorAction Stop | Out-Null
    Write-Output "User created (signUp OK)"
  } catch {
    if ($_.Exception.Response) {
      $resp = $_.Exception.Response
      try { $reader = New-Object System.IO.StreamReader($resp.GetResponseStream()); $body = $reader.ReadToEnd() } catch { $body = '' }
      if ($body -match 'EMAIL_EXISTS') { Write-Output 'User already exists (signUp skipped)' } else { Write-Output "signUp warning: $body" }
    } else { Write-Output "signUp error: $($_.Exception.Message)" }
  }
  $LoginUrl = "$AuthHost/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$ApiKey"
  Write-Output "POST -> $LoginUrl"
  $LoginBody = @{ email=$UserEmail; password=$UserPass; returnSecureToken=$true } | ConvertTo-Json
  $AuthResp = Invoke-RestMethod -Uri $LoginUrl -Method Post -Body $LoginBody -ContentType 'application/json'
  $IdToken = $AuthResp.idToken
  Write-Output "LOGIN OK"
  if ($IdToken -and $IdToken.Length -gt 40) { $trim = $IdToken.Substring(0,40) + '...' } else { $trim = $IdToken }
  Write-Output "IdToken (trimmed): $trim"
} catch {
  Write-Output "LOGIN FAILED: $($_.Exception.Message)"
  Stop-Transcript
  exit 1
}

Write-Output "2) Calling Functions Endpoint (getEventRegistrations)..."
try {
  $FuncUrl = "$FuncHost/$ProjectId/us-central1/getEventRegistrations"
  $FuncBody = @{ data = @{ eventId = 'event1' } } | ConvertTo-Json
  Write-Output "POST -> $FuncUrl"
  Write-Output "Request body: $FuncBody"
  $Headers = @{ Authorization = "Bearer $IdToken"; Accept = 'application/json' }
  $FuncResp = Invoke-RestMethod -Uri $FuncUrl -Method Post -Body $FuncBody -Headers $Headers -ContentType 'application/json'
  Write-Output "FUNCTION CALL OK"
  Write-Output '--- Response ---'
  Write-Output ($FuncResp | ConvertTo-Json -Depth 10)
} catch {
  Write-Output '❌ REQUEST FAILED'
  if ($_.Exception.Response) {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Output "   Status: $code"
    $Stream = $_.Exception.Response.GetResponseStream()
    $Reader = New-Object System.IO.StreamReader($Stream)
    $content = $Reader.ReadToEnd()
    Write-Output '   Body:'
    Write-Output $content
  } else {
    Write-Output "   Error: $($_.Exception.Message)"
  }
}

Stop-Transcript
