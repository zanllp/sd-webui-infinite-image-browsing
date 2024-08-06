import{d as ce,m as F,ax as re,$ as pe,S as p,T as I,c as s,a2 as e,a1 as n,a4 as R,U as d,J as ue,W as o,V as m,a0 as V,ad as me,Y as k,ae as B,ag as ge,R as fe,ai as G,aL as ve,aM as he,bB as Ie,Z as ke}from"./index-a33b95f7.js";import{S as _e}from"./index-7dc0c278.js";import{L as Ce,R as we,f as Se,M as be}from"./MultiSelectKeep-340db507.js";import{c as xe,d as Me,F as ye}from"./FileItem-55f284ee.js";import{c as Ae,u as Te}from"./hook-5b04ba68.js";import{a as $e}from"./functionalCallableComp-9da3b0bc.js";import"./shortcut-d49aad65.js";import"./Checkbox-f891fdcd.js";/* empty css              */import"./index-b94508ba.js";const De=c=>(ve("data-v-caebce58"),c=c(),he(),c),Fe={class:"hint"},Re={class:"action-bar"},Ve=De(()=>d("div",{style:{padding:"16px 0 512px"}},null,-1)),Be={key:1},Ge={class:"no-res-hint"},ze={class:"hint"},Ue={key:2,class:"preview-switch"},Je=ce({__name:"MatchedImageGrid",props:{tabIdx:{},paneIdx:{},selectedTagIds:{},id:{}},setup(c){const g=c,f=Ae(t=>Ie(g.selectedTagIds,t)),{queue:z,images:i,onContextMenuClickU:_,stackViewEl:U,previewIdx:r,previewing:C,onPreviewVisibleChange:J,previewImgMove:w,canPreview:S,itemSize:b,gridItems:L,showGenInfo:u,imageGenInfo:x,q:N,multiSelectedIdxs:v,onFileItemClick:E,scroller:M,showMenuIdx:h,onFileDragStart:P,onFileDragEnd:K,cellWidth:O,onScroll:y,saveAllFileAsJson:W,props:q,saveLoadedFileAsJson:Q,changeIndchecked:Y,seedChangeChecked:Z,getGenDiff:j,getGenDiffWatchDep:H}=Te(f);F(()=>g.selectedTagIds,async()=>{var t;await f.reset(),await re(),(t=M.value)==null||t.scrollToItem(0),y()},{immediate:!0}),F(()=>g,async t=>{q.value=t},{deep:!0,immediate:!0});const X=pe(),{onClearAllSelected:ee,onSelectAll:te,onReverseSelect:le}=xe();return(t,l)=>{const se=be,ne=ge,ae=fe,A=G,ie=G,oe=_e;return p(),I("div",{class:"container",ref_key:"stackViewEl",ref:U},[s(se,{show:!!e(v).length||e(X).keepMultiSelect,onClearAllSelected:e(ee),onSelectAll:e(te),onReverseSelect:e(le)},null,8,["show","onClearAllSelected","onSelectAll","onReverseSelect"]),s(oe,{size:"large",spinning:!e(z).isIdle},{default:n(()=>{var T,$;return[s(ae,{visible:e(u),"onUpdate:visible":l[1]||(l[1]=a=>R(u)?u.value=a:null),width:"70vw","mask-closable":"",onOk:l[2]||(l[2]=a=>u.value=!1)},{cancelText:n(()=>[]),default:n(()=>[s(ne,{active:"",loading:!e(N).isIdle},{default:n(()=>[d("div",{style:{width:"100%","word-break":"break-all","white-space":"pre-line","max-height":"70vh",overflow:"auto"},onDblclick:l[0]||(l[0]=a=>e(ue)(e(x)))},[d("div",Fe,o(t.$t("doubleClickToCopy")),1),m(" "+o(e(x)),1)],32)]),_:1},8,["loading"])]),_:1},8,["visible"]),d("div",Re,[s(A,{onClick:e(Q)},{default:n(()=>[m(o(t.$t("saveLoadedImageAsJson")),1)]),_:1},8,["onClick"]),s(A,{onClick:e(W)},{default:n(()=>[m(o(t.$t("saveAllAsJson")),1)]),_:1},8,["onClick"])]),(T=e(i))!=null&&T.length?(p(),V(e(Me),{key:0,ref_key:"scroller",ref:M,class:"file-list",items:e(i),"item-size":e(b).first,"key-field":"fullpath","item-secondary-size":e(b).second,gridItems:e(L),onScroll:e(y)},{after:n(()=>[Ve]),default:n(({item:a,index:D})=>[s(ye,{idx:D,file:a,"cell-width":e(O),"show-menu-idx":e(h),"onUpdate:showMenuIdx":l[3]||(l[3]=de=>R(h)?h.value=de:null),onDragstart:e(P),onDragend:e(K),onFileItemClick:e(E),"full-screen-preview-image-url":e(i)[e(r)]?e(me)(e(i)[e(r)]):"",selected:e(v).includes(D),onContextMenuClick:e(_),onPreviewVisibleChange:e(J),"is-selected-mutil-files":e(v).length>1,"enable-change-indicator":e(Y),"seed-change-checked":e(Z),"get-gen-diff":e(j),"get-gen-diff-watch-dep":e(H)},null,8,["idx","file","cell-width","show-menu-idx","onDragstart","onDragend","onFileItemClick","full-screen-preview-image-url","selected","onContextMenuClick","onPreviewVisibleChange","is-selected-mutil-files","enable-change-indicator","seed-change-checked","get-gen-diff","get-gen-diff-watch-dep"])]),_:1},8,["items","item-size","item-secondary-size","gridItems","onScroll"])):e(f).load&&t.selectedTagIds.and_tags.length===1&&!(($=t.selectedTagIds.folder_paths_str)!=null&&$.trim())?(p(),I("div",Be,[d("div",Ge,[d("p",ze,o(t.$t("tagSearchNoResultsMessage")),1),s(ie,{onClick:l[4]||(l[4]=a=>e($e)()),type:"primary"},{default:n(()=>[m(o(t.$t("rebuildImageIndex")),1)]),_:1})])])):k("",!0),e(C)?(p(),I("div",Ue,[s(e(Ce),{onClick:l[5]||(l[5]=a=>e(w)("prev")),class:B({disable:!e(S)("prev")})},null,8,["class"]),s(e(we),{onClick:l[6]||(l[6]=a=>e(w)("next")),class:B({disable:!e(S)("next")})},null,8,["class"])])):k("",!0)]}),_:1},8,["spinning"]),e(C)&&e(i)&&e(i)[e(r)]?(p(),V(Se,{key:0,file:e(i)[e(r)],idx:e(r),onContextMenuClick:e(_)},null,8,["file","idx","onContextMenuClick"])):k("",!0)],512)}}});const Ze=ke(Je,[["__scopeId","data-v-caebce58"]]);export{Ze as default};