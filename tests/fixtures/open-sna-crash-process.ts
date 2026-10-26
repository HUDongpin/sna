import path from 'node:path';
import { runOpenSnaR } from '../../lib/open-sna-runner';
runOpenSnaR({mode:'validate',bytes:Buffer.from('timeout'),temporaryRoot:process.argv[2],rscript:process.execPath,scriptPath:path.join(process.cwd(),'tests/fixtures/fake-open-sna-job-r.mjs')}).catch(()=>{process.exitCode=1;});
