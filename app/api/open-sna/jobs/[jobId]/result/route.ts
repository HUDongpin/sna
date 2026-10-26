import { handleOpenSnaJob } from '@/lib/open-sna-http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=180;
export async function GET(request:Request,context:{params:Promise<{jobId:string}>}){return handleOpenSnaJob(request,(await context.params).jobId,'result');}
