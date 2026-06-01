# Quick save: stage everything, commit, and push to GitHub.
# Usage:  .\save.ps1 "what I changed"
param([string]$m = "update")

git add .
# Only commit if there is something staged.
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "Nothing to commit." -ForegroundColor Yellow
} else {
    git commit -m $m
    git push
    Write-Host "Saved & pushed: $m" -ForegroundColor Green
    Write-Host "Reminder: restart the bot (Ctrl+C in the launch.js window, then 'node launch.js') to apply code changes." -ForegroundColor Cyan
}
