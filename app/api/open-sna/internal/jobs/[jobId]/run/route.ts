import { handleOpenSnaInternal } from '@/lib/open-sna-http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
// Cloud Run's service timeout owns the 900-second execution window. This route
// refuses execution on the web adapter; keep its serverless metadata bounded.
export const maxDuration=300;
export async function POST(request:Request,context:{params:Promise<{jobId:string}>}){return handleOpenSnaInternal(request,(await context.params).jobId,'run');}
