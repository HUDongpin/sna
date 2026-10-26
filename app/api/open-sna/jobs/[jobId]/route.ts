import { handleOpenSnaJob } from '@/lib/open-sna-http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=180;
type Context={params:Promise<{jobId:string}>};
export async function GET(request:Request,context:Context){return handleOpenSnaJob(request,(await context.params).jobId,'status');}
export async function DELETE(request:Request,context:Context){return handleOpenSnaJob(request,(await context.params).jobId,'cancel');}
