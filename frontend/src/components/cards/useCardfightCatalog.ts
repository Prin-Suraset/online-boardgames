import { useEffect, useState } from 'react';
import { parseCatalog, type AreaCatalog } from '../../lib/areaDecks';
let pending: Promise<AreaCatalog> | null = null;
export function useCardfightCatalog() {
  const [catalog,setCatalog]=useState<AreaCatalog|null>(null), [error,setError]=useState<string|null>(null);
  useEffect(()=>{
    let cancelled=false;
    pending ??= fetch('/area-games/cardfight/catalog.json').then(async response=>{if(!response.ok)throw new Error('Card catalog unavailable. Reload to retry.');return parseCatalog(await response.json() as unknown);}).catch((error:unknown)=>{pending=null;throw error;});
    void pending.then(value=>{if(!cancelled)setCatalog(value);}).catch((reason:unknown)=>{if(!cancelled)setError(reason instanceof Error?reason.message:'Could not load cards.');});
    return ()=>{cancelled=true;};
  },[]);
  return {catalog,error};
}
