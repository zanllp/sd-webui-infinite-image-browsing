import{r as c,bp as S,b3 as y}from"./index-2ccb5782.js";import{u as q,b as P,f as z,c as D,d as E,e as G,h as Q}from"./hook-dadee24a.js";const A=()=>{const e=c(),l=S(),o=c(),t={tabIdx:-1,target:"local",paneIdx:-1,walkMode:!1},{stackViewEl:r,multiSelectedIdxs:u,stack:m}=q({images:e}).toRefs(),{itemSize:f,gridItems:p}=P(t),{showMenuIdx:v}=z(),{onFileDragStart:I}=D(),{showGenInfo:d,imageGenInfo:w,q:g,onContextMenuClick:i,onFileItemClick:x}=E(t,{openNext:y}),{previewIdx:k,previewing:h,onPreviewVisibleChange:M,previewImgMove:b,canPreview:C}=G(t,{scroller:o,files:e}),F=async(a,s,n)=>{m.value=[{curr:"",files:e.value}],await i(a,s,n)};return Q("removeFiles",async({paths:a})=>{var s;e.value=(s=e.value)==null?void 0:s.filter(n=>!a.includes(n.fullpath))}),{scroller:o,queue:l,images:e,onContextMenuClickU:F,stackViewEl:r,previewIdx:k,previewing:h,onPreviewVisibleChange:M,previewImgMove:b,canPreview:C,itemSize:f,gridItems:p,showGenInfo:d,imageGenInfo:w,q:g,onContextMenuClick:i,onFileItemClick:x,showMenuIdx:v,multiSelectedIdxs:u,onFileDragStart:I}};export{A as u};
