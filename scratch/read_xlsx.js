const fs = require('fs');
const XLSX = require('xlsx');

const filePath = 'c:\\Users\\AROSHA\\Downloads\\CCU_CMA\\details\\C file -  register 19.03.2024..xlsx';
if (!fs.existsSync(filePath)) {
  console.error('File does not exist at:', filePath);
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);
console.log('Sheet Names:', workbook.SheetNames);

const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

console.log('Total Rows:', data.length);
console.log('Header Row (Row 0):', data[0]);
console.log('Row 1:', data[1]);
console.log('Row 2:', data[2]);
console.log('Row 3:', data[3]);
console.log('Row 4:', data[4]);
console.log('Row 5:', data[5]);
