$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$jarPath = Join-Path $projectRoot 'target\iipm-payroll-system-0.0.1-SNAPSHOT.jar'
$port = 3330

if (-not (Test-Path $jarPath)) {
    throw "Backend JAR not found: $jarPath"
}

$javaCommand = Get-Command java -ErrorAction SilentlyContinue
if ($javaCommand) {
    $javaPath = $javaCommand.Source
} elseif ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
    $javaPath = Join-Path $env:JAVA_HOME 'bin\java.exe'
} else {
    $javaPath = (Get-ChildItem 'C:\Program Files\Microsoft\jdk-*\bin\java.exe' -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending |
        Select-Object -First 1 -ExpandProperty FullName)
}

if (-not $javaPath) {
    throw 'Java 17 or newer was not found. Install Microsoft OpenJDK 17 and restart PowerShell.'
}

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$versionOutput = (& $javaPath -version 2>&1 | Out-String)
$ErrorActionPreference = $previousErrorActionPreference
$versionMatch = [regex]::Match($versionOutput, 'version "(?<major>\d+)')
if (-not $versionMatch.Success -or [int]$versionMatch.Groups['major'].Value -lt 17) {
    throw "Java 17 or newer is required. Detected: $versionOutput"
}

$existingConnection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($existingConnection) {
    $existingProcess = Get-Process -Id $existingConnection[0].OwningProcess -ErrorAction SilentlyContinue
    throw "Port $port is already in use by PID $($existingConnection[0].OwningProcess) ($($existingProcess.ProcessName)). Stop it before starting the backend."
}

$stdoutLog = Join-Path $projectRoot 'backend.log'
$stderrLog = Join-Path $projectRoot 'backend-error.log'
$configPath = Join-Path $projectRoot 'src\main\resources\application.yml'
$arguments = @('-jar', $jarPath, '--server.port=3330', "--spring.config.additional-location=file:$configPath")
$backendProcess = Start-Process -FilePath $javaPath -ArgumentList $arguments -WorkingDirectory $projectRoot -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru

for ($attempt = 0; $attempt -lt 60; $attempt++) {
    $backendProcess.Refresh()
    if ($backendProcess.HasExited) {
        throw "Backend exited with code $($backendProcess.ExitCode). Check backend.log and backend-error.log."
    }
    $listening = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($listening) {
        Write-Output "Backend started successfully. PID=$($backendProcess.Id) URL=http://localhost:$port"
        exit 0
    }
    Start-Sleep -Seconds 1
}

throw "Backend process $($backendProcess.Id) is still starting after 60 seconds, but port $port is not listening. Check backend.log and backend-error.log."