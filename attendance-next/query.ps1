
$conn = New-Object System.Data.OleDb.OleDbConnection('Provider=Microsoft.ACE.OLEDB.12.0;Data Source=C:\eTimeTrackLite\eTimeTrackLite1.mdb;');
$conn.Open();
$cmd = $conn.CreateCommand();
$cmd.CommandText = 'SELECT AttendanceDate, EmployeeId, COUNT(*) as Cnt FROM AttendanceLogs GROUP BY AttendanceDate, EmployeeId HAVING COUNT(*) > 1';
$reader = $cmd.ExecuteReader();
while ($reader.Read()) {
  Write-Host "Duplicate found! Date:" $reader.GetValue(0) "- Employee:" $reader.GetValue(1) "- Count:" $reader.GetValue(2)
}
$conn.Close();
