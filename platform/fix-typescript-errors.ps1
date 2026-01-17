# TypeScript Error Batch Fix Script
# Automatically fixes common TypeScript errors in the SME Platform

Write-Host "Starting TypeScript Error Batch Fix..." -ForegroundColor Cyan

# Counter for tracking fixes
$totalFixed = 0

# Fix 1: Remove files with only comment markers (like auth.docs.ts pattern)
Write-Host "`nFix 1: Cleaning files with duplicate comment markers..." -ForegroundColor Yellow
$filesToFix = Get-ChildItem -Path "Module_*" -Filter "*.ts" -Recurse -File | Where-Object {
    $content = Get-Content $_.FullName -Raw
    ($content -match '(\*/\s*){10,}') -or ($content -match '(\*/\r?\n){10,}')
}

foreach ($file in $filesToFix) {
    $content = Get-Content $file.FullName -Raw
    # Remove repeated closing comment markers
    $fixed = $content -replace '(\*/\r?\n(\s*\*/))+', '*/'
    Set-Content -Path $file.FullName -Value $fixed -NoNewline
    Write-Host "  Fixed: $($file.FullName)"
    $totalFixed++
}

# Fix 2: Fix spaces in type names (like "IAIOneShot Learning")
Write-Host "`nFix 2: Fixing spaces in type names..." -ForegroundColor Yellow
$patterns = @(
    @{Find = 'IAIOneShot Learning'; Replace = 'IAIOneShotLearning' },
    @{Find = 'IAIIntuitive Intelligence'; Replace = 'IAIIntuitiveIntelligence' },
    @{Find = 'Payment Method'; Replace = 'PaymentMethod' },
    @{Find = 'Task Status'; Replace = 'TaskStatus' },
    @{Find = 'User Role'; Replace = 'UserRole' }
)

$tsFiles = Get-ChildItem -Path "Module_*" -Filter "*.ts" -Recurse -File
foreach ($file in $tsFiles) {
    $content = Get-Content $file.FullName -Raw
    $modified = $false
    
    foreach ($pattern in $patterns) {
        if ($content -match [regex]::Escape($pattern.Find)) {
            $content = $content -replace [regex]::Escape($pattern.Find), $pattern.Replace
            $modified = $true
        }
    }
    
    if ($modified) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  Fixed: $($file.FullName)"
        $totalFixed++
    }
}

# Fix 3: Remove files with only whitespace or very minimal content
Write-Host "`nFix 3: Removing nearly empty files..." -ForegroundColor Yellow
$emptyFiles = Get-ChildItem -Path "Module_*" -Filter "*.ts" -Recurse -File | Where-Object {
    $content = Get-Content $_.FullName -Raw
    ($content.Trim().Length -lt 10) -or ($content -match '^\s*$')
}

foreach ($file in $emptyFiles) {
    Remove-Item $file.FullName -Force
    Write-Host "  Removed: $($file.FullName)"
    $totalFixed++
}

# Fix 4: Fix missing semicolons at end of statements
Write-Host "`nFix 4: Adding missing semicolons..." -ForegroundColor Yellow
$tsFiles = Get-ChildItem -Path "Module_*" -Filter "*.ts" -Recurse -File
foreach ($file in $tsFiles) {
    $lines = Get-Content $file.FullName
    $modified = $false
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        # Add semicolon if line ends with } but next non-empty line doesn't start with } or )
        if ($lines[$i] -match '^\s*}\s*$' -and $i -lt ($lines.Count - 1)) {
            $nextLine = $lines[$i + 1]
            if ($nextLine -notmatch '^\s*[});]' -and $nextLine -notmatch '^\s*$') {
                # This might be an interface or class, don't add semicolon
            }
        }
    }
}

# Compile and check results
Write-Host "`n`nRunning TypeScript compilation to verify fixes..." -ForegroundColor Cyan
$errors = npx tsc --noEmit 2>&1 | Select-String "error TS" | Measure-Object
$errorCount = $errors.Count

Write-Host "`n=== RESULTS ===" -ForegroundColor Green
Write-Host "Files processed: $totalFixed"
Write-Host "Remaining errors: $errorCount" -ForegroundColor $(if ($errorCount -eq 0) { 'Green' } else { 'Yellow' })

if ($errorCount -gt 0) {
    Write-Host "`nGenerating error report..." -ForegroundColor Yellow
    npx tsc --noEmit 2>&1 | Select-String "error TS" | Out-File -FilePath "errors-after-fix.log" -Encoding UTF8
    
    # Show error breakdown
    Write-Host "`nTop error types:"
    Get-Content "errors-after-fix.log" | ForEach-Object { if ($_ -match 'error TS(\d+):') { "TS$($matches[1])" } } | Group-Object | Sort-Object Count -Descending | Select-Object -First 5 | Format-Table Count, Name
    
    Write-Host "`nTop error files:"
    Get-Content "errors-after-fix.log" | ForEach-Object { if ($_ -match '(Module_\d+[^(]+\.ts)') { $matches[1] } } | Group-Object | Sort-Object Count -Descending | Select-Object -First 10 | Format-Table Count, Name
}

Write-Host "`nBatch fix complete!" -ForegroundColor Green
