$baseDir = "c:\Users\91858\Downloads\SME_Platform_12_Separate_Modules\platform"

$filesToCheck = @(
    "Module_11_Common\pwa\src\App.jsx",
    "Module_11_Common\pwa\src\components\LiteDashboard.jsx",
    "Module_11_Common\pwa\src\components\VoiceButton.jsx",
    "Module_09_Marketing_Customer_Success\code\services\guest-portal.service.ts",
    "Module_09_Marketing_Customer_Success\code\services\viral-loop.service.ts",
    "Module_09_Marketing_Customer_Success\code\services\community-credit-score.service.ts",
    "Module_03_Payment_Integration\code\services\virtual-account.service.ts",
    "Module_03_Payment_Integration\code\services\reconciliation-engine.service.ts",
    "Module_07_Financing_Factoring\code\entities\discount-offer.entity.ts",
    "Module_07_Financing_Factoring\code\services\discount.service.ts",
    "Module_06_Credit_Scoring\code\entities\insurance-policy.entity.ts",
    "Module_06_Credit_Scoring\code\services\insurance.service.ts",
    "Module_09_Marketing_Customer_Success\code\entities\referral-reward.entity.ts",
    "Module_09_Marketing_Customer_Success\code\services\referral.service.ts"
)

$errors = @()

foreach ($file in $filesToCheck) {
    $fullPath = Join-Path $baseDir $file
    if (-not (Test-Path $fullPath)) {
        $errors += "MISSING FILE: $file"
        Write-Host "❌ MISSING: $file" -ForegroundColor Red
    }
    else {
        Write-Host "✅ FOUND: $file" -ForegroundColor Green
        
        # Basic Import Check
        $content = Get-Content $fullPath
        $imports = $content | Select-String "import .* from ['`"](.+)['`"]"
        
        foreach ($import in $imports) {
            $importPath = $import.Matches.Groups[1].Value
            if ($importPath.StartsWith(".")) {
                # Resolve relative path
                $currentDir = Split-Path $fullPath
                $resolvedPath = $importPath -replace "/", "\"
                $targetPath = Join-Path $currentDir $resolvedPath
                
                # Try extensions .ts, .js, .tsx, .jsx
                $found = $false
                foreach ($ext in @("", ".ts", ".js", ".tsx", ".jsx")) {
                    if (Test-Path "$targetPath$ext") {
                        $found = $true
                        break
                    }
                }
                
                if (-not $found) {
                    $errors += "BROKEN IMPORT in $($file): $($importPath)"
                    Write-Host "  ⚠️ BROKEN IMPORT: $($importPath)" -ForegroundColor Yellow
                }
            }
        }
    }
}

if ($errors.Count -eq 0) {
    Write-Host "`n🎉 ALL CHECKS PASSED: Files exist and relative imports resolve." -ForegroundColor Green
}
else {
    Write-Host "`n❌ VERIFICATION FAILED with $($errors.Count) errors." -ForegroundColor Red
    $errors | ForEach-Object { Write-Host $_ }
}
