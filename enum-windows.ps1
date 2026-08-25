Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;
public class WinEnum {
  public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumProc cb, IntPtr lParam);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int max);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hWnd, StringBuilder sb, int max);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
}
"@

$targetProcess = Get-Process | Where-Object { $_.ProcessName -match "Quantum|Analyzer|量子|检测|健康" } | Select-Object -First 1
$result = @{
  processRunning = $null -ne $targetProcess
  pid = if ($targetProcess) { $targetProcess.Id } else { 0 }
  processName = if ($targetProcess) { $targetProcess.ProcessName } else { "" }
  windows = @()
}

if ($targetProcess) {
  $winList = New-Object System.Collections.ArrayList
  $callback = [WinEnum+EnumProc]{
    param([IntPtr]$hWnd, [IntPtr]$lParam)
    $title = New-Object System.Text.StringBuilder 512
    $class = New-Object System.Text.StringBuilder 256
    [WinEnum]::GetWindowText($hWnd, $title, 512) | Out-Null
    [WinEnum]::GetClassName($hWnd, $class, 256) | Out-Null
    $t = $title.ToString()
    $c = $class.ToString()
    if ($t -ne "") {
      [void]$winList.Add(@{ hwnd = $hWnd.ToInt64(); title = $t; class = $c; visible = [WinEnum]::IsWindowVisible($hWnd) })
    }
    return $true
  }
  [WinEnum]::EnumWindows($callback, [IntPtr]::Zero) | Out-Null
  $result.windows = $winList
}

$result | ConvertTo-Json -Depth 5
