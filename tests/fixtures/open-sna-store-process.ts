import { FileJobObjectStore } from '../../lib/open-sna-job-store';
const store=new FileJobObjectStore(process.argv[2]);
store.write('race.json',Buffer.from(process.argv[3]),null).then(winner=>console.log(winner?'winner':'lost'));
