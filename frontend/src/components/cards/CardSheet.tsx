import { useEffect, useRef, type ReactNode } from 'react';
export function CardSheet({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ const previous=document.activeElement instanceof HTMLElement?document.activeElement:null; const dialog=ref.current; dialog?.showModal(); return ()=>{dialog?.close();previous?.focus();}; },[]);
  return <dialog ref={ref} className="cf-sheet" onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
    <div className="cf-sheet-inner"><header><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Close panel">Close</button></header>{children}</div>
  </dialog>;
}
