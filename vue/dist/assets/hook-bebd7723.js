import{ai as F,r as g,k as R,j as b,J as A,C as q,bz as z,bK as G,bL as L}from"./index-ac57907e.js";import{u as j,a as O,b as Q,e as H}from"./FileItem-e3b6a812.js";import{a as K,b as T,c as U,d as W}from"./MultiSelectKeep-5d38d223.js";let B=0;const V=()=>++B,X=(n,i,{dataUpdateStrategy:l="replace"}={})=>{const a=F([""]),c=g(!1),t=g(),o=g(!1);let f=g(-1);const v=new Set,w=e=>{var s;l==="replace"?t.value=e:l==="merge"&&(A((Array.isArray(t.value)||typeof t.value>"u")&&Array.isArray(e),"数据更新策略为合并时仅可用于值为数组的情况"),t.value=[...(s=t==null?void 0:t.value)!==null&&s!==void 0?s:[],...e])},d=e=>b(void 0,void 0,void 0,function*(){if(o.value||c.value&&typeof e>"u")return!1;o.value=!0;const s=V();f.value=s;try{let r;if(typeof e=="number"){if(r=a[e],typeof r!="string")return!1}else r=a[a.length-1];const h=yield n(r);if(v.has(s))return v.delete(s),!1;w(i(h));const u=h.cursor;if((e===a.length-1||typeof e!="number")&&(c.value=!u.has_next,u.has_next)){const y=u.next_cursor||u.next;A(typeof y=="string"),a.push(y)}}finally{f.value===s&&(o.value=!1)}return!0}),m=()=>{v.add(f.value),o.value=!1},x=(e=!1)=>b(void 0,void 0,void 0,function*(){const{refetch:s,force:r}=typeof e=="object"?e:{refetch:e};r&&m(),A(!o.value),a.splice(0,a.length,""),o.value=!1,t.value=void 0,c.value=!1,s&&(yield d())}),I=()=>({next:()=>b(void 0,void 0,void 0,function*(){if(o.value)throw new Error("不允许同时迭代");return{done:!(yield d()),value:t.value}})});return R({abort:m,load:c,next:d,res:t,loading:o,cursorStack:a,reset:x,[Symbol.asyncIterator]:I,iter:{[Symbol.asyncIterator]:I}})},te=n=>F(X(n,i=>i.files,{dataUpdateStrategy:"merge"})),se=n=>{const i=F(new Set),l=q(()=>(n.res??[]).filter(p=>!i.has(p.fullpath))),a=z(),{stackViewEl:c,multiSelectedIdxs:t,stack:o,scroller:f,props:v}=j({images:l}).toRefs(),{itemSize:w,gridItems:d,cellWidth:m,onScroll:x}=O({fetchNext:()=>n.next()}),{showMenuIdx:I}=Q(),{onFileDragStart:e,onFileDragEnd:s}=K(),{showGenInfo:r,imageGenInfo:h,q:u,onContextMenuClick:y,onFileItemClick:C}=T({openNext:G}),{previewIdx:_,previewing:E,onPreviewVisibleChange:J,previewImgMove:M,canPreview:D}=U({loadNext:()=>n.next()}),N=async(p,S,P)=>{o.value=[{curr:"",files:l.value}],await y(p,S,P)};H("removeFiles",async({paths:p})=>{p.forEach(S=>i.add(S))});const k=()=>{L(l.value)};return{images:l,scroller:f,queue:a,iter:n,onContextMenuClickU:N,stackViewEl:c,previewIdx:_,previewing:E,onPreviewVisibleChange:J,previewImgMove:M,canPreview:D,itemSize:w,gridItems:d,showGenInfo:r,imageGenInfo:h,q:u,onContextMenuClick:y,onFileItemClick:C,showMenuIdx:I,multiSelectedIdxs:t,onFileDragStart:e,onFileDragEnd:s,cellWidth:m,onScroll:x,saveLoadedFileAsJson:k,saveAllFileAsJson:async()=>{for(;!n.load;)await n.next();k()},props:v,...W()}};export{te as c,se as u};
