#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$Dir = (Join-Path ([Environment]::GetFolderPath('UserProfile')) '.agents/skills/ai-yangmao-public'),
    [string]$BaseUrl = 'https://ai-yangmao.com/ai-yangmao-public'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$packageFiles = @('SKILL.md', 'LICENSE', 'agents/openai.yaml')

function Test-SkillIdentity([string]$Path) {
    $frontmatter = [regex]::Match([IO.File]::ReadAllText($Path), '\A---\r?\n(.*?)\r?\n---(?:\r?\n|\z)', [Text.RegularExpressions.RegexOptions]::Singleline)
    if (-not $frontmatter.Success) { return $false }
    $names = [regex]::Matches($frontmatter.Groups[1].Value, '(?m)^name:[^\r\n]*')
    return $names.Count -eq 1 -and $names[0].Value -cmatch '^name:[ \t]*(ai-yangmao-public|"ai-yangmao-public"|''ai-yangmao-public'')[ \t]*$'
}

$base = [Uri]$BaseUrl
if (-not $base.IsAbsoluteUri -or $base.UserInfo -or $base.Query -or $base.Fragment -or
    ($base.Scheme -ne 'https' -and -not ($base.Scheme -eq 'http' -and $base.Host -in @('localhost', '127.0.0.1', '[::1]')))) {
    throw 'Use an HTTPS package URL, or localhost for testing.'
}
$downloadBase = $base.AbsoluteUri.TrimEnd('/')
$target = [IO.Path]::GetFullPath($Dir).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
if (-not $target -or $target -eq [IO.Path]::GetPathRoot($target).TrimEnd('\', '/')) {
    throw 'Choose a skill directory, not the filesystem root.'
}
$parent = [IO.Path]::GetDirectoryName($target)
$null = [IO.Directory]::CreateDirectory($parent)
$lock = "$target.install-lock"
try {
    $null = New-Item -ItemType Directory -Path $lock -ErrorAction Stop
} catch {
    [Console]::Error.WriteLine("Installation lock exists or cannot be created: $lock. Check its pid before removing a stale lock.")
    exit 75
}

$stage = $null
$backup = $null
$installed = $false
try {
    [IO.File]::WriteAllText((Join-Path $lock 'pid'), [string]$PID)
    if (Test-Path -LiteralPath $target) {
        $item = Get-Item -LiteralPath $target -Force
        if (-not $item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            throw 'Refusing to replace a file, symlink or junction; choose the actual skill directory with -Dir.'
        }
        $existingSkill = Join-Path $target 'SKILL.md'
        if (-not (Test-Path -LiteralPath $existingSkill -PathType Leaf) -or -not (Test-SkillIdentity $existingSkill)) {
            throw 'The target belongs to another skill; choose another -Dir.'
        }
    }
    $stage = Join-Path $parent ('.ai-yangmao-public.' + [Guid]::NewGuid().ToString('N'))
    $package = Join-Path $stage 'pkg'
    $null = [IO.Directory]::CreateDirectory((Join-Path $package 'agents'))
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
    foreach ($file in @($packageFiles) + @('manifest.sha256')) {
        $destination = Join-Path $package $file
        for ($attempt = 0; $attempt -lt 3; $attempt++) {
            try {
                $response = Invoke-WebRequest -UseBasicParsing -Uri "$downloadBase/$file" -TimeoutSec 30 -MaximumRedirection 0
                $output = [IO.File]::Create($destination)
                try {
                    if ($response.RawContentStream.CanSeek) { $response.RawContentStream.Position = 0 }
                    $response.RawContentStream.CopyTo($output)
                } finally {
                    $output.Dispose()
                }
                break
            } catch {
                if ($attempt -eq 2) { throw }
                Start-Sleep -Seconds 1
            }
        }
    }
    $seen = @()
    foreach ($line in [IO.File]::ReadAllLines((Join-Path $package 'manifest.sha256'))) {
        if ($line -notmatch '^([0-9a-fA-F]{64})[ \t]+\*?(\S+)$') { throw 'Invalid package checksum.' }
        $expectedHash = $Matches[1]
        $file = $Matches[2]
        if ($packageFiles -cnotcontains $file) { throw 'Unexpected package file.' }
        if ($seen -ccontains $file) { throw 'Duplicate package file.' }
        $seen += $file
        $sha256 = [Security.Cryptography.SHA256]::Create()
        $inputFile = [IO.File]::OpenRead((Join-Path $package $file))
        try {
            $actualHash = [BitConverter]::ToString($sha256.ComputeHash($inputFile)).Replace('-', '')
        } finally {
            $inputFile.Dispose()
            $sha256.Dispose()
        }
        if ($actualHash -ne $expectedHash) { throw "Package checksum mismatch: $file" }
    }
    if ($seen.Count -ne $packageFiles.Count) { throw 'Incomplete package manifest.' }
    if (-not (Test-SkillIdentity (Join-Path $package 'SKILL.md'))) {
        throw 'Unexpected skill identity.'
    }
    if (Test-Path -LiteralPath $target) {
        $backup = "$target.backup.$(Get-Date -Format 'yyyyMMddHHmmssfff').$PID"
        [IO.Directory]::Move($target, $backup)
    }
    [IO.Directory]::Move($package, $target)
    $installed = $true
    Write-Output "Installed: $target"
    if ($backup) { Write-Output "Previous version: $backup" }
    Write-Output 'Open a new agent session to load the skill.'
    Write-Output 'MCP (optional): https://ai-yangmao.com/api/mcp'
} finally {
    if (-not $installed -and $backup -and -not (Test-Path -LiteralPath $target)) {
        [IO.Directory]::Move($backup, $target)
    }
    if ($stage -and (Test-Path -LiteralPath $stage)) {
        $stagePath = [IO.Path]::GetFullPath($stage)
        if ([IO.Path]::GetDirectoryName($stagePath) -ne $parent -or
            -not [IO.Path]::GetFileName($stagePath).StartsWith('.ai-yangmao-public.') -or
            ((Get-Item -LiteralPath $stagePath -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            throw 'Unexpected staging path; refusing recursive cleanup.'
        }
        Remove-Item -LiteralPath $stagePath -Recurse -Force
    }
    Remove-Item -LiteralPath (Join-Path $lock 'pid') -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $lock -Force
}
