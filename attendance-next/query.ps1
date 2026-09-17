
$conn = New-Object System.Data.OleDb.OleDbConnection('Provider=Microsoft.ACE.OLEDB.12.0;Data Source=C:\eTimeTrackLite\eTimeTrackLite1.mdb;');
$conn.Open();
$cmd = $conn.CreateCommand();
$cmd.CommandText = 'SELECT * FROM Shifts';
$reader = $cmd.ExecuteReader();
while ($reader.Read()) {
  $output = ""
  for ($i=0; $i -lt $reader.FieldCount; $i++) {
    $output += $reader.GetName($i) + ": " + $reader.GetValue($i) + " | "
  }
  Write-Host $output
}
$conn.Close();
