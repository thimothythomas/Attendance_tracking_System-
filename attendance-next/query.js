import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const psScript = `
$conn = New-Object System.Data.OleDb.OleDbConnection('Provider=Microsoft.ACE.OLEDB.12.0;Data Source=C:\\eTimeTrackLite\\eTimeTrackLite1.mdb;');
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
`;

writeFileSync('query.ps1', psScript);
const result = execSync('powershell -ExecutionPolicy Bypass -File query.ps1').toString();
console.log(result);
