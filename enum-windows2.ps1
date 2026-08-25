Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class WinEnum2 {
  public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumProc cb, IntPtr lParam);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int max);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hWnd, StringBuilder sb, int max);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
}
"@

$target = Get-Process | Where-Object { $_.ProcessName -match "Quantum" } | Select-Object -First 1
if (-not $target) { Write-Output '{"processRunning":false}'; exit }

$pid = $target.Id
$wins = New-Object System.Collections.ArrayList

# 枚举所有顶层窗口（含隐藏），找属于该 PID 的
$topCb = [WinEnum2+EnumProc]{
  param([IntPtr]$hWnd, [IntPtr]$lParam)
  $outPid = [uint32]0
  [WinEnum2]::GetWindowThreadProcessId($hWnd, [ref]$outPid) | Out-Null
  if ($outPid -eq $pid) {
    $title = New-Object System.Text.StringBuilder 512
    $class = New-Object System.Text.StringBuilder 256
    [WinEnum2]::GetWindowText($hWnd, $title, 512) | Out-Null
    [WinEnum2]::GetClassName($hWnd, $class, 256) | Out-Null
    $children = New-Object System.Collections.ArrayList
    # 枚举子控件
    $childCb = [WinEnum2+EnumProc]{
      param([IntPtr]$cHwnd, [IntPtr]$cLParam)
      $cTitle = New-Object System.Text.StringBuilder 256
      $cClass = New-Object System.Text.StringBuilder 128
      [WinEnum2]::GetWindowText($cHwnd, $cTitle, 256) | Out-Null
      [WinEnum2]::GetClassName($cHwnd, $cClass, 128) | Out-Null
      [void]$children.Add(@{ hwnd = $cHwnd.ToInt64(); class = $cClass.ToString(); text = $cTitle.ToString() })
      return $true
    }
    [WinEnum2]::EnumChildWindows($hWnd, $childCb, [IntPtr]::Zero) | Out-Null
    [void]$wins.Add(@{
      hwnd = $hWnd.ToInt64()
      title = $title.ToString()
      class = $class.ToString()
      visible = [WinEnum2]::IsWindowVisible($hWnd)
      children = $children
    })
  }
  return $true
}
[WinEnum2]::EnumWindows($topCb, [IntPtr]::Zero) | Out-Null

@{ processRunning = $true; pid = $pid; processName = $target.ProcessName; windows = $wins } | ConvertTo-Json -Depth 6
