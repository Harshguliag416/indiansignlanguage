param(
    [Parameter(Mandatory = $true)]
    [int]$TrainingPid,

    [Parameter(Mandatory = $true)]
    [string]$LogPath,

    [int]$IntervalMinutes = 60,

    [string]$StatusLogPath = "",

    [string]$ProgressJsonPath = "",

    [string]$ProgressHtmlPath = ""
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $LogPath)) {
    throw "Training log not found: $LogPath"
}

if (-not $StatusLogPath) {
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($LogPath)
    $StatusLogPath = Join-Path ([System.IO.Path]::GetDirectoryName($LogPath)) ($baseName + ".monitor.log")
}

if (-not $ProgressJsonPath) {
    $ProgressJsonPath = [System.IO.Path]::ChangeExtension($LogPath, ".progress.json")
}

if (-not $ProgressHtmlPath) {
    $ProgressHtmlPath = [System.IO.Path]::ChangeExtension($LogPath, ".progress.html")
}

function Remove-Ansi {
    param([string]$Text)
    if ($null -eq $Text) {
        return ""
    }

    return [regex]::Replace($Text, "\x1b\[[0-9;]*[A-Za-z]", "")
}

function Get-LatestTrainingSnapshot {
    param([string]$Path)

    $lines = Get-Content $Path -Tail 2000 -ErrorAction SilentlyContinue
    $epoch = $null
    $epochs = $null
    $step = $null
    $steps = $null
    $accuracy = $null
    $top3 = $null
    $loss = $null
    $remaining = $null

    foreach ($rawLine in $lines) {
        $line = Remove-Ansi $rawLine

        if ($line -match 'Epoch\s+(\d+)\/(\d+)') {
            $epoch = [int]$matches[1]
            $epochs = [int]$matches[2]
            continue
        }

        if ($line -match '\s*(\d+)\/(\d+)\s+.*?(\d+:\d{2})(?::\d{2})?\s+(\d+)s\/step\s+- accuracy:\s+([0-9.]+)\s+- loss:\s+([0-9.]+)\s+- top3_accuracy:\s+([0-9.]+)') {
            $step = [int]$matches[1]
            $steps = [int]$matches[2]
            $remaining = $matches[3]
            $accuracy = [double]$matches[5]
            $loss = [double]$matches[6]
            $top3 = [double]$matches[7]
            continue
        }

        if ($line -match '^\s*(\d+)\/(\d+)\s+.*? - accuracy:\s+([0-9.]+)\s+- loss:\s+([0-9.]+)\s+- top3_accuracy:\s+([0-9.]+)') {
            $step = [int]$matches[1]
            $steps = [int]$matches[2]
            $accuracy = [double]$matches[3]
            $loss = [double]$matches[4]
            $top3 = [double]$matches[5]
            continue
        }
    }

    [pscustomobject]@{
        Epoch = $epoch
        Epochs = $epochs
        Step = $step
        Steps = $steps
        Accuracy = $accuracy
        Top3Accuracy = $top3
        Loss = $loss
        EpochRemaining = $remaining
    }
}

function Merge-SnapshotWithProgressCache {
    param($Snapshot)

    if (-not (Test-Path $ProgressJsonPath)) {
        return $Snapshot
    }

    try {
        $existing = Get-Content $ProgressJsonPath -Raw | ConvertFrom-Json
    } catch {
        return $Snapshot
    }

    if (-not $Snapshot.Epochs -and $existing.epochs) {
        $Snapshot.Epochs = [int]$existing.epochs
    }

    if (-not $Snapshot.Steps -and $existing.steps_per_epoch) {
        $Snapshot.Steps = [int]$existing.steps_per_epoch
    }

    if (-not $Snapshot.Epoch) {
        if ($Snapshot.Step -and $existing.step -and $existing.epoch -and $existing.epochs) {
            if ([int]$Snapshot.Step -lt [int]$existing.step -and [int]$existing.epoch -lt [int]$existing.epochs) {
                $Snapshot.Epoch = [int]$existing.epoch + 1
            } else {
                $Snapshot.Epoch = [int]$existing.epoch
            }
        } elseif ($existing.epoch) {
            $Snapshot.Epoch = [int]$existing.epoch
        }
    }

    return $Snapshot
}

function Show-Toast {
    param(
        [string]$Title,
        [string]$Message
    )

    try {
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
        [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

        $xml = @"
<toast>
  <visual>
    <binding template="ToastGeneric">
      <text>$([System.Security.SecurityElement]::Escape($Title))</text>
      <text>$([System.Security.SecurityElement]::Escape($Message))</text>
    </binding>
  </visual>
</toast>
"@

        $doc = New-Object Windows.Data.Xml.Dom.XmlDocument
        $doc.LoadXml($xml)
        $toast = [Windows.UI.Notifications.ToastNotification]::new($doc)
        $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("ISL Bridge")
        $notifier.Show($toast)
    } catch {
        Add-Content -Path $StatusLogPath -Value ("[{0}] Toast failed: {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $_.Exception.Message)
    }
}

function Write-StatusLine {
    param([string]$Text)

    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Text
    Add-Content -Path $StatusLogPath -Value $line
}

function Get-ProgressPayload {
    param(
        $Snapshot,
        [datetime]$StartedAt,
        [string]$Status
    )

    $percent = 0.0
    $etaText = "calculating"
    if ($Snapshot.Epoch -and $Snapshot.Epochs -and $Snapshot.Step -and $Snapshot.Steps) {
        $completedSteps = (($Snapshot.Epoch - 1) * $Snapshot.Steps) + $Snapshot.Step
        $totalSteps = $Snapshot.Epochs * $Snapshot.Steps
        $percent = [math]::Round(($completedSteps / $totalSteps) * 100, 2)
        $elapsed = (Get-Date) - $StartedAt
        if ($completedSteps -gt 0 -and $elapsed.TotalSeconds -gt 0) {
            $secondsPerStep = $elapsed.TotalSeconds / $completedSteps
            $remainingSteps = $totalSteps - $completedSteps
            $etaText = (Get-Date).AddSeconds($secondsPerStep * $remainingSteps).ToString("dd MMM HH:mm")
        }
    }

    [pscustomobject]@{
        status = $Status
        updated_at = (Get-Date).ToUniversalTime().ToString("o")
        epoch = $Snapshot.Epoch
        epochs = $Snapshot.Epochs
        step = $Snapshot.Step
        steps_per_epoch = $Snapshot.Steps
        percent = $percent
        accuracy = $Snapshot.Accuracy
        top3_accuracy = $Snapshot.Top3Accuracy
        loss = $Snapshot.Loss
        epoch_remaining = $Snapshot.EpochRemaining
        eta = $etaText
        log_path = $LogPath
    }
}

function Write-ProgressArtifacts {
    param($Payload)

    $Payload | ConvertTo-Json -Depth 4 | Set-Content -Path $ProgressJsonPath -Encoding utf8

    $accuracy = if ($null -eq $Payload.accuracy) { "--" } else { "{0:N2}%" -f ($Payload.accuracy * 100) }
    $top3 = if ($null -eq $Payload.top3_accuracy) { "--" } else { "{0:N2}%" -f ($Payload.top3_accuracy * 100) }
    $loss = if ($null -eq $Payload.loss) { "--" } else { "{0:N4}" -f $Payload.loss }
    $epoch = if ($null -eq $Payload.epoch) { "--" } else { $Payload.epoch }
    $epochs = if ($null -eq $Payload.epochs) { "--" } else { $Payload.epochs }
    $step = if ($null -eq $Payload.step) { "--" } else { $Payload.step }
    $steps = if ($null -eq $Payload.steps_per_epoch) { "--" } else { $Payload.steps_per_epoch }

    $html = @"
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="15" />
  <title>ISL Bridge Training Progress</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; background: #0f172a; color: #e2e8f0; }
    .wrap { max-width: 720px; margin: 40px auto; padding: 24px; }
    .card { background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 24px; box-shadow: 0 20px 45px rgba(0,0,0,0.2); }
    .bar { height: 24px; border-radius: 999px; background: #1f2937; overflow: hidden; margin: 16px 0 20px; }
    .fill { height: 100%; width: $($Payload.percent)%; background: linear-gradient(90deg, #22d3ee, #10b981); }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .metric { background: #0b1220; border-radius: 12px; padding: 12px 14px; }
    .label { color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
    .value { font-size: 22px; font-weight: 700; margin-top: 4px; }
    .meta { color: #94a3b8; font-size: 14px; margin-top: 14px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="label">Training Status</div>
      <div class="value">$($Payload.status.ToUpper()) - $($Payload.percent)%</div>
      <div class="bar"><div class="fill"></div></div>
      <div class="grid">
        <div class="metric"><div class="label">Epoch</div><div class="value">$epoch / $epochs</div></div>
        <div class="metric"><div class="label">Step</div><div class="value">$step / $steps</div></div>
        <div class="metric"><div class="label">Accuracy</div><div class="value">$accuracy</div></div>
        <div class="metric"><div class="label">Top 3</div><div class="value">$top3</div></div>
        <div class="metric"><div class="label">Loss</div><div class="value">$loss</div></div>
        <div class="metric"><div class="label">ETA</div><div class="value">$($Payload.eta)</div></div>
      </div>
      <div class="meta">Auto-refreshes every 15 seconds. Last update: $($Payload.updated_at)</div>
    </div>
  </div>
</body>
</html>
"@

    Set-Content -Path $ProgressHtmlPath -Value $html -Encoding utf8
}

function Get-StatusMessage {
    param(
        $Snapshot,
        [datetime]$StartedAt
    )

    if (-not $Snapshot.Epoch -or -not $Snapshot.Epochs -or -not $Snapshot.Step -or -not $Snapshot.Steps) {
        return "Training is running, but detailed progress has not appeared in the log yet."
    }

    $completedSteps = (($Snapshot.Epoch - 1) * $Snapshot.Steps) + $Snapshot.Step
    $totalSteps = $Snapshot.Epochs * $Snapshot.Steps
    $overallPercent = [math]::Round(($completedSteps / $totalSteps) * 100, 1)
    $elapsed = (Get-Date) - $StartedAt

    $etaText = "calculating"
    if ($completedSteps -gt 0 -and $elapsed.TotalSeconds -gt 0) {
        $secondsPerStep = $elapsed.TotalSeconds / $completedSteps
        $remainingSteps = $totalSteps - $completedSteps
        $eta = (Get-Date).AddSeconds($secondsPerStep * $remainingSteps)
        $etaText = $eta.ToString("dd MMM HH:mm")
    }

    return "Epoch $($Snapshot.Epoch)/$($Snapshot.Epochs), step $($Snapshot.Step)/$($Snapshot.Steps), overall $overallPercent%, acc $([math]::Round($Snapshot.Accuracy * 100, 1))%, top3 $([math]::Round($Snapshot.Top3Accuracy * 100, 1))%, loss $([math]::Round($Snapshot.Loss, 4)), epoch left $($Snapshot.EpochRemaining), ETA $etaText."
}

$process = Get-Process -Id $TrainingPid -ErrorAction Stop
$startedAt = $process.StartTime

Write-StatusLine "Monitoring started for PID $TrainingPid and log $LogPath"
Show-Toast -Title "ISL Bridge Training Monitor" -Message "Hourly training notifications are active for PID $TrainingPid."
Write-ProgressArtifacts -Payload (Get-ProgressPayload -Snapshot (Merge-SnapshotWithProgressCache -Snapshot (Get-LatestTrainingSnapshot -Path $LogPath)) -StartedAt $startedAt -Status "running")

while ($true) {
    try {
        $currentProcess = Get-Process -Id $TrainingPid -ErrorAction Stop
        $snapshot = Merge-SnapshotWithProgressCache -Snapshot (Get-LatestTrainingSnapshot -Path $LogPath)
        $status = Get-StatusMessage -Snapshot $snapshot -StartedAt $startedAt
        Write-StatusLine $status
        Write-ProgressArtifacts -Payload (Get-ProgressPayload -Snapshot $snapshot -StartedAt $startedAt -Status "running")
        Show-Toast -Title "ISL Bridge Training Update" -Message $status
        Start-Sleep -Seconds ($IntervalMinutes * 60)
    } catch [Microsoft.PowerShell.Commands.ProcessCommandException] {
        $snapshot = Merge-SnapshotWithProgressCache -Snapshot (Get-LatestTrainingSnapshot -Path $LogPath)
        if ($snapshot.Epoch -and $snapshot.Epochs) {
            $final = "Training process exited after epoch $($snapshot.Epoch)/$($snapshot.Epochs). Check logs for final metrics."
        } else {
            $final = "Training process exited. Check the log for final status."
        }
        Write-StatusLine $final
        Write-ProgressArtifacts -Payload (Get-ProgressPayload -Snapshot $snapshot -StartedAt $startedAt -Status "stopped")
        Show-Toast -Title "ISL Bridge Training Finished" -Message $final
        break
    } catch {
        $message = "Monitor error: $($_.Exception.Message)"
        Write-StatusLine $message
        Write-ProgressArtifacts -Payload (Get-ProgressPayload -Snapshot (Merge-SnapshotWithProgressCache -Snapshot (Get-LatestTrainingSnapshot -Path $LogPath)) -StartedAt $startedAt -Status "error")
        Show-Toast -Title "ISL Bridge Monitor Error" -Message $message
        Start-Sleep -Seconds 300
    }
}


