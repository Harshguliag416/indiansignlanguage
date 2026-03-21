param(
    [string]$DatasetDir = "training_data\\alnum_full",
    [int]$ImageSize = 96,
    [int]$BatchSize = 128,
    [int]$Epochs = 6,
    [double]$ValidationSplit = 0.10,
    [double]$LearningRate = 0.0015,
    [int]$IntraOpThreads = 8,
    [int]$InterOpThreads = 2,
    [string]$OutputDir = "",
    [int]$MonitorIntervalMinutes = 1,
    [switch]$Launch
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$datasetPath = Join-Path $repoRoot $DatasetDir
if (-not (Test-Path $datasetPath)) {
    throw "Dataset directory not found: $datasetPath"
}

$sampleCount = (Get-ChildItem $datasetPath -Recurse -File | Measure-Object).Count
$trainCount = [int][Math]::Floor($sampleCount * (1.0 - $ValidationSplit))
$valCount = $sampleCount - $trainCount
$stepsPerEpoch = [int][Math]::Ceiling($trainCount / [double]$BatchSize)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
if ($OutputDir) {
    if ([System.IO.Path]::IsPathRooted($OutputDir)) {
        $outputDir = $OutputDir
    } else {
        $outputDir = Join-Path $repoRoot $OutputDir
    }
} else {
    $outputDir = Join-Path $repoRoot ("model_outputs\\alnum_deadline_10h_" + $timestamp)
}

$runName = Split-Path $outputDir -Leaf
$stdoutLog = Join-Path $repoRoot ("training_logs\\" + $runName + ".out.log")
$stderrLog = Join-Path $repoRoot ("training_logs\\" + $runName + ".err.log")
$monitorLog = Join-Path $repoRoot ("training_logs\\" + $runName + ".monitor.log")
$progressJson = Join-Path $outputDir "progress.json"
$progressHtml = Join-Path $outputDir "progress.html"

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $stdoutLog) | Out-Null
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$env:OMP_NUM_THREADS = [string]$IntraOpThreads
$env:TF_NUM_INTRAOP_THREADS = [string]$IntraOpThreads
$env:TF_NUM_INTEROP_THREADS = [string]$InterOpThreads
$env:TF_ENABLE_ONEDNN_OPTS = "1"
$env:PYTHONUTF8 = "1"

$args = @(
    "training\\train_alnum_model.py",
    "--dataset-dir", $DatasetDir,
    "--output-dir", $outputDir,
    "--image-size", [string]$ImageSize,
    "--batch-size", [string]$BatchSize,
    "--epochs", [string]$Epochs,
    "--validation-split", [string]$ValidationSplit,
    "--learning-rate", [string]$LearningRate,
    "--progress-json", $progressJson,
    "--progress-html", $progressHtml
)

Write-Host ""
Write-Host "ISL Bridge deadline profile"
Write-Host "Dataset          : $DatasetDir"
Write-Host "Samples          : $sampleCount"
Write-Host "Train / Val      : $trainCount / $valCount"
Write-Host "Image size       : $ImageSize"
Write-Host "Batch size       : $BatchSize"
Write-Host "Epochs           : $Epochs"
Write-Host "Steps / epoch    : $stepsPerEpoch"
Write-Host "Learning rate    : $LearningRate"
Write-Host "Threads          : intra=$IntraOpThreads inter=$InterOpThreads"
Write-Host "Output dir       : $outputDir"
Write-Host "Stdout log       : $stdoutLog"
Write-Host "Stderr log       : $stderrLog"
Write-Host "Monitor log      : $monitorLog"
Write-Host "Progress JSON    : $progressJson"
Write-Host "Progress HTML    : $progressHtml"
Write-Host ""
Write-Host "Command:"
Write-Host ("python " + ($args -join " "))
Write-Host ""

if (-not $Launch) {
    Write-Host "Dry run only. Re-run with -Launch to start this profile."
    Write-Host "To resume an interrupted run, re-run with the same -OutputDir value."
    exit 0
}

$process = Start-Process `
    -FilePath "python" `
    -ArgumentList $args `
    -WorkingDirectory $repoRoot `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru

$monitorArgs = @(
    "-ExecutionPolicy", "Bypass",
    "-File", (Join-Path $repoRoot "tools\\monitor_training_progress.ps1"),
    "-TrainingPid", [string]$process.Id,
    "-LogPath", $stdoutLog,
    "-IntervalMinutes", [string]$MonitorIntervalMinutes,
    "-StatusLogPath", $monitorLog,
    "-ProgressJsonPath", $progressJson,
    "-ProgressHtmlPath", $progressHtml
)

$monitor = Start-Process `
    -FilePath "powershell" `
    -ArgumentList $monitorArgs `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden `
    -PassThru

Write-Host "Started training PID: $($process.Id)"
Write-Host "Started monitor PID : $($monitor.Id)"
Write-Host "Monitor stdout with:"
Write-Host "Get-Content $stdoutLog -Tail 80"
Write-Host "Open progress page:"
Write-Host $progressHtml
