' Project Nexus v5 — silent launcher (no console window)
Option Explicit
Dim fso, shell, dir, app, bin
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
app = dir
bin = dir & "\node_modules\electron\dist\electron.exe"
If Not fso.FileExists(bin) Then
  bin = fso.GetParentFolderName(dir) & "\node_modules\electron\dist\electron.exe"
End If
If fso.FileExists(bin) Then
  shell.CurrentDirectory = dir
  shell.Run """" & bin & """ """ & app & """", 0, False
Else
  MsgBox "Electron was not found." & vbCrLf & vbCrLf & _
         "Run run.bat once (or `npm install` inside updated\) and try again.", 48, "Project Nexus v5"
End If
