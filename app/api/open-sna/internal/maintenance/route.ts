import { handleOpenSnaMaintenance } from '@/lib/open-sna-http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=180;
export async function POST(request:Request){return handleOpenSnaMaintenance(request);}
