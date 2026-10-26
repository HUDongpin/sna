import { readFileSync,writeFileSync } from 'node:fs';
const input=readFileSync(process.argv[process.argv.indexOf('--input')+1],'utf8');
if(input==='timeout')setInterval(()=>{},1000);
else if(input==='stderr'){process.stderr.write('PRIVATE '.repeat(20000));setInterval(()=>{},1000);}
else if(input==='legacy-success'){const result=JSON.parse(readFileSync('public/open-sna/programming-resilience-demo.json','utf8'));writeFileSync(process.argv[process.argv.indexOf('--output')+1],JSON.stringify(result));}
else {process.stderr.write('PRIVATE raw workbook data\nOPEN_SNA_ERROR_CODE=WORKBOOK_INVALID\n');process.exitCode=1;}
