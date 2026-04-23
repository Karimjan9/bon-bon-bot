$ErrorActionPreference = "Stop"

$mysql = "C:\x_programs\xamp\mysql\bin\mysql.exe"
if (-not (Test-Path $mysql)) {
    $mysql = "C:\xampp\mysql\bin\mysql.exe"
}

if (-not (Test-Path $mysql)) {
    throw "mysql.exe topilmadi. XAMPP MySQL bin papkasini PATH ga qo'shing yoki scriptdagi pathni o'zgartiring."
}

Get-Content -Raw ".\scripts\create_mysql_database.sql" | & $mysql -u root
