import{u as w,a as y,F as k,d as x}from"./FileItem-55f284ee.js";import{d as b,$ as F,cd as h,r as D,ba as I,be as C,S as z,T as E,c,a1 as S,a2 as e,ad as V,bZ as B,cz as R,Z as T}from"./index-a33b95f7.js";import"./functionalCallableComp-9da3b0bc.js";/* empty css              */import"./index-b94508ba.js";const $=b({__name:"gridView",props:{tabIdx:{},paneIdx:{},id:{},removable:{type:Boolean},allowDragAndDrop:{type:Boolean},files:{},paneKey:{}},setup(p){const o=p,d=F(),{stackViewEl:m}=w().toRefs(),{itemSize:i,gridItems:u,cellWidth:f}=y(),g=h(),a=D(o.files??[]),_=async s=>{const l=B(s);o.allowDragAndDrop&&l&&(a.value=R([...a.value,...l.nodes]))},v=s=>{a.value.splice(s,1)};return I(()=>{d.pageFuncExportMap.set(o.paneKey,{getFiles:()=>C(a.value),setFiles:s=>a.value=s})}),(s,l)=>(z(),E("div",{class:"container",ref_key:"stackViewEl",ref:m,onDrop:_},[c(e(x),{ref:"scroller",class:"file-list",items:a.value.slice(),"item-size":e(i).first,"key-field":"fullpath","item-secondary-size":e(i).second,gridItems:e(u)},{default:S(({item:t,index:r})=>{var n;return[c(k,{idx:r,file:t,"cell-width":e(f),"enable-close-icon":o.removable,onCloseIconClick:A=>v(r),"full-screen-preview-image-url":e(V)(t),"extra-tags":(n=t==null?void 0:t.tags)==null?void 0:n.map(e(g).tagConvert),"enable-right-click-menu":!1},null,8,["idx","file","cell-width","enable-close-icon","onCloseIconClick","full-screen-preview-image-url","extra-tags"])]}),_:1},8,["items","item-size","item-secondary-size","gridItems"])],544))}});const M=T($,[["__scopeId","data-v-f35f4802"]]);export{M as default};