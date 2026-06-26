const xlsx = require('xlsx');
const path = 'c:/Users/arosh/Downloads/CC_CMA/details/M.Com List.xlsx';
const wb = xlsx.readFile(path, { cellDates: true });
console.log('sheets=', wb.SheetNames);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
console.log('header row:', JSON.stringify(data[0]));
console.log('first 3 rows:', JSON.stringify(data.slice(1, 4)));
