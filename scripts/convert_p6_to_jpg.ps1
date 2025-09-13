$ErrorActionPreference = 'Stop'

# Output directory
$outDir = Join-Path $PSScriptRoot 'out'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

# Source: download current PNG from CDN
$cdnP6 = 'https://cdn.iotvision.top/images/p6.png'
$srcPng = Join-Path $outDir 'p6.src.png'
Write-Host "Downloading p6.png from CDN ..." -ForegroundColor Cyan
Invoke-WebRequest -UseBasicParsing -Uri $cdnP6 -OutFile $srcPng

# Load System.Drawing for image processing
Add-Type -AssemblyName System.Drawing

function Get-JpegEncoder {
  return [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
}

function New-EncoderParams([int]$quality){
  $p = New-Object System.Drawing.Imaging.EncoderParameters 1
  $enc = [System.Drawing.Imaging.Encoder]::Quality
  $val = New-Object System.Drawing.Imaging.EncoderParameter $enc, [long]$quality
  $p.Param[0] = $val
  return $p
}

function ConvertTo-Jpeg1080([string]$src, [string]$dst, [int]$maxWidth = 1080, [int]$quality = 80){
  $img = [System.Drawing.Image]::FromFile($src)
  try {
    $newW = if ($img.Width -le $maxWidth) { [int]$img.Width } else { [int]$maxWidth }
    $newH = [int][Math]::Round($img.Height * ($newW / [double]$img.Width))
    # For JPEG, ensure 24bpp RGB to avoid alpha-channel issues
    $pf = [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
    $bmp = New-Object System.Drawing.Bitmap($newW, $newH, $pf)
    try {
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      try {
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        # Fill white background in case source has transparency
        $g.Clear([System.Drawing.Color]::White)
        $g.DrawImage($img, 0, 0, $newW, $newH)
      } finally { $g.Dispose() }
      # Save as JPEG (use default encoder settings to avoid GDI+ parameter issues)
      $bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    } finally { $bmp.Dispose() }
  } finally { $img.Dispose() }
}

$p6jpg = Join-Path $outDir 'p6.jpg'
Write-Host "Converting to JPEG (1080px, q=80) ..." -ForegroundColor Cyan
ConvertTo-Jpeg1080 -src $srcPng -dst $p6jpg -maxWidth 1080 -quality 80

Write-Host "Done. Outputs:" -ForegroundColor Cyan
Get-Item $p6jpg | Select-Object FullName, Length | Format-List | Out-String | Write-Host

