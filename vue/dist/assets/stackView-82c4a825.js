import{d as pe,u as je,g as ue,_ as it,c as i,a as Le,P as Ce,D as Ne,f as ut,w as Ft,b as Lt,e as Nt,h as Ze,M as Be,i as Bt,A as ct,j as Me,k as Et,r as ie,l as Ee,m as et,o as Tt,s as De,n as z,p as tt,q as zt,t as Vt,v as jt,x as re,y as N,z as Ut,B as Wt,C as ye,E as at,F as Ht,G as qt,H as Te,I as Gt,J as Kt,K as Oe,L as Fe,N as Qt,O as dt,Q as M,R as T,S as h,T as Z,U as w,V as ze,W as Q,X as pt,Y as Jt,Z as G,$ as g,a0 as e,a1 as b,a2 as K,a3 as Xt,a4 as nt,a5 as Yt,a6 as Zt,a7 as ea,a8 as ta,a9 as aa,aa as na,ab as sa,ac as st,ad as la,ae as oa,af as ra,ag as ia,ah as ua}from"./index-ac57907e.js";import{S as ce,s as ca}from"./index-ffe7b967.js";import{_ as ft}from"./numInput-b3f80782.js";/* empty css              */import{_ as da}from"./index-9d56980e.js";/* empty css              */import{D as vt}from"./index-e1e78154.js";/* empty css              *//* empty css              */import{u as mt,N as pa,g as P,s as ht,a as fa,b as va,c as ma,d as ha,F as ga}from"./FileItem-e3b6a812.js";import{u as ka,a as ba,b as ya,c as Ca,d as wa,M as _a,L as Sa,R as Pa,f as Ia}from"./MultiSelectKeep-5d38d223.js";import{g as be,o as xa,_ as Aa,F as $a}from"./functionalCallableComp-bacd8211.js";import"./_isIterateeCall-a8bdd540.js";import"./shortcut-5c99090c.js";import"./Checkbox-a696edf2.js";import"./isArrayLikeObject-96b1e103.js";var Ra=["class","style"],Ma=function(){return{prefixCls:String,href:String,separator:Ce.any,overlay:Ce.any,onClick:Function}};const de=pe({compatConfig:{MODE:3},name:"ABreadcrumbItem",inheritAttrs:!1,__ANT_BREADCRUMB_ITEM:!0,props:Ma(),slots:["separator","overlay"],setup:function(t,l){var s=l.slots,p=l.attrs,c=je("breadcrumb",t),y=c.prefixCls,A=function(f,C){var v=ue(s,t,"overlay");return v?i(vt,{overlay:v,placement:"bottom"},{default:function(){return[i("span",{class:"".concat(C,"-overlay-link")},[f,i(Ne,null,null)])]}}):f};return function(){var D,f=(D=ue(s,t,"separator"))!==null&&D!==void 0?D:"/",C=ue(s,t),v=p.class,$=p.style,I=it(p,Ra),_;return t.href!==void 0?_=i("a",Le({class:"".concat(y.value,"-link"),onClick:t.onClick},I),[C]):_=i("span",Le({class:"".concat(y.value,"-link"),onClick:t.onClick},I),[C]),_=A(_,y.value),C?i("span",{class:v,style:$},[_,f&&i("span",{class:"".concat(y.value,"-separator")},[f])]):null}}});var Da=function(){return{prefixCls:String,routes:{type:Array},params:Ce.any,separator:Ce.any,itemRender:{type:Function}}};function Oa(r,t){if(!r.breadcrumbName)return null;var l=Object.keys(t).join("|"),s=r.breadcrumbName.replace(new RegExp(":(".concat(l,")"),"g"),function(p,c){return t[c]||p});return s}function lt(r){var t=r.route,l=r.params,s=r.routes,p=r.paths,c=s.indexOf(t)===s.length-1,y=Oa(t,l);return c?i("span",null,[y]):i("a",{href:"#/".concat(p.join("/"))},[y])}const ne=pe({compatConfig:{MODE:3},name:"ABreadcrumb",props:Da(),slots:["separator","itemRender"],setup:function(t,l){var s=l.slots,p=je("breadcrumb",t),c=p.prefixCls,y=p.direction,A=function(v,$){return v=(v||"").replace(/^\//,""),Object.keys($).forEach(function(I){v=v.replace(":".concat(I),$[I])}),v},D=function(v,$,I){var _=Bt(v),L=A($||"",I);return L&&_.push(L),_},f=function(v){var $=v.routes,I=$===void 0?[]:$,_=v.params,L=_===void 0?{}:_,V=v.separator,B=v.itemRender,F=B===void 0?lt:B,j=[];return I.map(function(x){var E=A(x.path,L);E&&j.push(E);var J=[].concat(j),X=null;return x.children&&x.children.length&&(X=i(Be,null,{default:function(){return[x.children.map(function(W){return i(Be.Item,{key:W.path||W.breadcrumbName},{default:function(){return[F({route:W,params:L,routes:I,paths:D(J,W.path,L)})]}})})]}})),i(de,{overlay:X,separator:V,key:E||x.breadcrumbName},{default:function(){return[F({route:x,params:L,routes:I,paths:J})]}})})};return function(){var C,v,$,I=t.routes,_=t.params,L=_===void 0?{}:_,V=ut(ue(s,t)),B=(C=ue(s,t,"separator"))!==null&&C!==void 0?C:"/",F=t.itemRender||s.itemRender||lt;I&&I.length>0?$=f({routes:I,params:L,separator:B,itemRender:F}):V.length&&($=V.map(function(x,E){return Ft(Lt(x.type)==="object"&&(x.type.__ANT_BREADCRUMB_ITEM||x.type.__ANT_BREADCRUMB_SEPARATOR),"Breadcrumb","Only accepts Breadcrumb.Item and Breadcrumb.Separator as it's children"),Nt(x,{separator:B,key:E})}));var j=(v={},Ze(v,c.value,!0),Ze(v,"".concat(c.value,"-rtl"),y.value==="rtl"),v);return i("div",{class:j},[$])}}});var Fa=["separator","class"],La=function(){return{prefixCls:String}};const Ve=pe({compatConfig:{MODE:3},name:"ABreadcrumbSeparator",__ANT_BREADCRUMB_SEPARATOR:!0,inheritAttrs:!1,props:La(),setup:function(t,l){var s=l.slots,p=l.attrs,c=je("breadcrumb",t),y=c.prefixCls;return function(){var A;p.separator;var D=p.class,f=it(p,Fa),C=ut((A=s.default)===null||A===void 0?void 0:A.call(s));return i("span",Le({class:["".concat(y.value,"-separator"),D]},f),[C.length>0?C:"/"])}}});ne.Item=de;ne.Separator=Ve;ne.install=function(r){return r.component(ne.name,ne),r.component(de.name,de),r.component(Ve.name,Ve),r};ce.setDefaultIndicator=ca;ce.install=function(r){return r.component(ce.name,ce),r};var Na={icon:{tag:"svg",attrs:{viewBox:"64 64 896 896",focusable:"false"},children:[{tag:"path",attrs:{d:"M872 474H286.9l350.2-304c5.6-4.9 2.2-14-5.2-14h-88.5c-3.9 0-7.6 1.4-10.5 3.9L155 487.8a31.96 31.96 0 000 48.3L535.1 866c1.5 1.3 3.3 2 5.2 2h91.5c7.4 0 10.8-9.2 5.2-14L286.9 550H872c4.4 0 8-3.6 8-8v-60c0-4.4-3.6-8-8-8z"}}]},name:"arrow-left",theme:"outlined"};const Ba=Na;function ot(r){for(var t=1;t<arguments.length;t++){var l=arguments[t]!=null?Object(arguments[t]):{},s=Object.keys(l);typeof Object.getOwnPropertySymbols=="function"&&(s=s.concat(Object.getOwnPropertySymbols(l).filter(function(p){return Object.getOwnPropertyDescriptor(l,p).enumerable}))),s.forEach(function(p){Ea(r,p,l[p])})}return r}function Ea(r,t,l){return t in r?Object.defineProperty(r,t,{value:l,enumerable:!0,configurable:!0,writable:!0}):r[t]=l,r}var Ue=function(t,l){var s=ot({},t,l.attrs);return i(ct,ot({},s,{icon:Ba}),null)};Ue.displayName="ArrowLeftOutlined";Ue.inheritAttrs=!1;const Ta=Ue;class we{static run(t){const l=Object.assign({immediately:!0,id:-1,isFinished:!1,errorHandleMethod:"ignore"},t);let s,p;const c=new Promise((f,C)=>{p=f,s=C}),y=()=>{l.isFinished=!0,clearTimeout(l.id)},A=()=>Me(this,void 0,void 0,function*(){try{l.res=yield l.action(),l.validator&&l.validator(l.res)&&(p(l.res),y())}catch(f){we.silent||console.error(f),l.errorHandleMethod==="stop"&&(y(),s(f))}}),D=()=>{l.isFinished||(l.id=setTimeout(()=>Me(this,void 0,void 0,function*(){yield A(),D()}),l.pollInterval))};return setTimeout(()=>Me(this,void 0,void 0,function*(){l.immediately&&(yield A()),D()}),0),Et({task:l,clearTask:y,completedTask:c})}}we.silent=!1;var za={icon:{tag:"svg",attrs:{viewBox:"64 64 896 896",focusable:"false"},children:[{tag:"path",attrs:{d:"M832 64H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V96c0-17.7-14.3-32-32-32zm-600 72h560v208H232V136zm560 480H232V408h560v208zm0 272H232V680h560v208zM304 240a40 40 0 1080 0 40 40 0 10-80 0zm0 272a40 40 0 1080 0 40 40 0 10-80 0zm0 272a40 40 0 1080 0 40 40 0 10-80 0z"}}]},name:"database",theme:"outlined"};const Va=za;function rt(r){for(var t=1;t<arguments.length;t++){var l=arguments[t]!=null?Object(arguments[t]):{},s=Object.keys(l);typeof Object.getOwnPropertySymbols=="function"&&(s=s.concat(Object.getOwnPropertySymbols(l).filter(function(p){return Object.getOwnPropertyDescriptor(l,p).enumerable}))),s.forEach(function(p){ja(r,p,l[p])})}return r}function ja(r,t,l){return t in r?Object.defineProperty(r,t,{value:l,enumerable:!0,configurable:!0,writable:!0}):r[t]=l,r}var We=function(t,l){var s=rt({},t,l.attrs);return i(ct,rt({},s,{icon:Va}),null)};We.displayName="DatabaseOutlined";We.inheritAttrs=!1;const Ua=We;function Wa(){const r=ie(),{scroller:t,stackViewEl:l,stack:s,currPage:p,currLocation:c,useEventListen:y,eventEmitter:A,getPane:D,props:f,deletedFiles:C,walker:v,sortedFiles:$}=mt().toRefs();Ee(()=>s.value.length,et((n,u)=>{var d;n!==u&&((d=t.value)==null||d.scrollToItem(0))},300)),Tt(async()=>{var n;if(!s.value.length)if(f.value.mode==="scanned-fixed"||f.value.mode==="walk")s.value=[{files:[],curr:f.value.path??""}];else{const u=await be("/");s.value.push({files:u.files,curr:"/"})}r.value=new pa,r.value.configure({parent:l.value}),f.value.path&&f.value.path!=="/"?await F(f.value.path):(n=P.conf)!=null&&n.home&&F(P.conf.home)}),Ee(c,et(n=>{const u=D.value();if(!u)return;u.path=n;const d=De(n).pop()??"",k=(()=>{const R={walk:"Walk","scanned-fixed":"Fixed",scanned:null}[f.value.mode??"scanned"],O=q=>R?`${R}: ${q}`:q,U=P.getShortPath(n);return O(U.length>24&&d?d:U)})();u.name=z("div",{style:"display:flex;align-items:center"},[z(Ua),z("span",{class:"line-clamp-1",style:"max-width: 256px"},k)]),u.nameFallbackStr=k,P.recent=P.recent.filter(R=>R.key!==u.key),P.recent.unshift({path:n,key:u.key,mode:f.value.mode}),P.recent.length>20&&(P.recent=P.recent.slice(0,20))},300));const I=()=>Te(c.value),_=async n=>{var u,d;if(n.type==="dir")try{(u=r.value)==null||u.start();const{files:S}=await be(n.fullpath);f.value.mode=="scanned-fixed"?s.value=[{files:S,curr:n.fullpath}]:s.value.push({files:S,curr:n.name})}finally{(d=r.value)==null||d.done()}},L=n=>{if(f.value.mode!="walk")for(;n<s.value.length-1;)s.value.pop()},V=()=>{F(Gt(c.value))},B=(n,u)=>(Kt(P.conf,"global.conf load failed"),P.conf.is_win?n.toLowerCase()==u.toLowerCase():n==u),F=async n=>{f.value.mode==="walk"?D.value().path=n:f.value.mode==="scanned-fixed"?await _({fullpath:n,name:n,type:"dir"}):await j(n),tt(500).then(()=>A.value.emit("viewableAreaFilesChange"))},j=async n=>{var d,S;const u=s.value.slice();try{zt(n)||(n=Vt(((d=P.conf)==null?void 0:d.sd_cwd)??"/",n));const k=De(n),R=s.value.map(O=>O.curr);for(R.shift();R[0]&&k[0]&&B(R[0],k[0]);)R.shift(),k.shift();for(let O=0;O<R.length;O++)s.value.pop();if(!k.length)return x();for(const O of k){const U=(S=p.value)==null?void 0:S.files.find(q=>B(q.name,O));if(!U)throw console.error({frags:k,frag:O,stack:jt(s.value)}),new Error(`${O} not found`);await _(U)}}catch(k){throw re.error(N("moveFailedCheckPath")+(k instanceof Error?k.message:"")),console.error(n,De(n),p.value),s.value=u,k}},x=Ut(async()=>{var n,u,d;try{if((n=r.value)==null||n.start(),v.value)await v.value.reset(),A.value.emit("loadNextDir");else{const{files:S}=await be(c.value);Oe(s.value).files=S}C.value.clear(),(u=t.value)==null||u.scrollToItem(0),re.success(N("refreshCompleted"))}finally{(d=r.value)==null||d.done()}}),E=async()=>{var n,u,d;if(f.value.mode==="walk"&&v.value){const S=((n=t.value)==null?void 0:n.$_endIndex)??64;if(P.autoRefreshWalkMode&&S<P.autoRefreshWalkModePosLimit&&await v.value.isExpired()){const k=ie(!1),R=()=>{k.value=!0,P.autoRefreshWalkMode=!1,O(),re.success(N("walkModeAutoRefreshDisabled"))},O=re.loading(z("span",{},[N("autoUpdate"),z("span",{onClick:R,style:{paddingLeft:"16px",cursor:"pointer",color:"var(--primary-color)"}},N("disable"))]),0);try{const U=new Promise(q=>{v.value.seamlessRefresh(S,k).then(Ie=>{k.value||(v.value=Ie,A.value.emit("loadNextDir"),q())})});await Promise.all([U,tt(1500)])}finally{O()}}return}try{if(!P.autoRefreshNormalFixedMode)return;(u=r.value)==null||u.start();const{files:S}=await be(c.value);Oe(s.value).files.map(R=>R.date).join()!==S.map(R=>R.date).join()&&(Oe(s.value).files=S,re.success(N("autoUpdate")))}finally{(d=r.value)==null||d.done()}};Wt("returnToIIB",E),y.value("refresh",x);const J=n=>{F(n)},X=ye(()=>P.quickMovePaths.map(n=>({...n,path:at(n.dir)}))),ee=ye(()=>{const n=at(c.value);return X.value.find(d=>d.path===n)}),W=async()=>{const n=P.tabList[f.value.tabIdx],u={type:"empty",name:N("emptyStartPage"),key:Date.now()+Fe(),popAddPathModal:{path:c.value,type:"scanned"}};n.panes.push(u),n.key=u.key},H=ie(!1),te=ie(c.value),_e=()=>{H.value=!0,te.value=c.value},fe=async()=>{await F(te.value),H.value=!1};ka("click",n=>{var u,d,S;(S=(d=(u=n.target)==null?void 0:u.className)==null?void 0:d.includes)!=null&&S.call(d,"ant-input")||(H.value=!1)});const Se=()=>{const n=parent.location,u=n.href.substring(0,n.href.length-n.search.length),d=new URLSearchParams(n.search);d.set("action","open"),d.set("path",c.value),d.set("mode",f.value.mode??"scanned");const S=`${u}?${d.toString()}`;Te(S,N("copyLocationUrlSuccessMsg"))},Pe=(n="tag-search")=>{const u=P.tabList[f.value.tabIdx],d={type:n,key:Fe(),searchScope:c.value,name:N(n==="tag-search"?"imgSearch":"fuzzy-search")};u.panes.push(d),u.key=d.key},se=()=>A.value.emit("selectAll"),Y=async()=>{await xa(c.value),await x()},le=()=>{const n=c.value;ht.set(n,s.value);const u=P.tabList[f.value.tabIdx],d={type:"local",key:Fe(),path:n,name:N("local"),stackKey:n,mode:"walk"};u.panes.push(d),u.key=d.key},ve=ye(()=>!v.value&&$.value.some(n=>n.type==="dir"));return{locInputValue:te,isLocationEditing:H,onLocEditEnter:fe,onEditBtnClick:_e,addToSearchScanPathAndQuickMove:W,searchPathInfo:ee,refresh:x,copyLocation:I,back:L,openNext:_,currPage:p,currLocation:c,stack:s,scroller:t,share:Se,selectAll:se,quickMoveTo:J,onCreateFloderBtnClick:Y,onWalkBtnClick:le,showWalkButton:ve,searchInCurrentDir:Pe,backToLastUseTo:V,...Ha(E)}}const Ha=r=>{const t=ie([]),l=ye(()=>t.value.length>0);Ht(()=>{t.value.forEach(c=>c())});const s=qt(Qt+"poll-interval",3);return{onPollRefreshClick:()=>{if(t.value.length){t.value.forEach(c=>c()),t.value=[];return}dt.confirm({title:N("pollRefresh"),width:640,content:()=>z("div",{},[z("p",{class:"uni-desc primary-bg"},N("pollRefreshTip")),z("div",{style:{display:"flex",alignItems:"center",gap:"4px"}},[z("span",{},N("pollInterval")+"(s): "),z(ft,{min:1,max:60*10,modelValue:s.value,"onUpdate:modelValue":c=>{s.value=c}})])]),onOk:()=>{const{clearTask:c}=we.run({pollInterval:s.value*1e3,action:r});t.value.push(c)}})},polling:l}};const qa={class:"base-info"},Ga=pe({__name:"BaseFileListInfo",props:{fileNum:{},selectedFileNum:{}},setup(r){return(t,l)=>(M(),T("div",qa,[h("span",null,[Z(w(t.$t("items",[t.fileNum]))+" ",1),t.selectedFileNum?(M(),T(ze,{key:0},[Z(", "+w(t.$t("selectedItems",[t.selectedFileNum])),1)],64)):Q("",!0)])]))}});const Ka=pt(Ga,[["__scopeId","data-v-7f9c0b15"]]),Qa={class:"hint"},Ja={class:"location-bar"},Xa=["onClick"],Ya={key:3,class:"location-act"},Za={class:"actions"},en=["onClick"],tn={style:{width:"512px",background:"var(--zp-primary-background)",padding:"16px","border-radius":"4px","box-shadow":"0 0 4px var(--zp-secondary-background)",border:"1px solid var(--zp-secondary-background)"}},an={style:{padding:"4px"}},nn={style:{padding:"4px"}},sn={style:{padding:"4px"}},ln={key:0,class:"view"},on={style:{padding:"16px 0 512px"}},rn={key:0,class:"preview-switch"},un=pe({__name:"stackView",props:{tabIdx:{},paneIdx:{},path:{},mode:{},stackKey:{}},setup(r){const t=r,l=Jt(),{scroller:s,stackViewEl:p,props:c,multiSelectedIdxs:y,spinning:A}=mt().toRefs(),{currLocation:D,currPage:f,refresh:C,copyLocation:v,back:$,openNext:I,stack:_,quickMoveTo:L,addToSearchScanPathAndQuickMove:V,locInputValue:B,isLocationEditing:F,onLocEditEnter:j,onEditBtnClick:x,share:E,selectAll:J,onCreateFloderBtnClick:X,onWalkBtnClick:ee,showWalkButton:W,searchInCurrentDir:H,backToLastUseTo:te,polling:_e,onPollRefreshClick:fe}=Wa(),{gridItems:Se,sortMethodConv:Pe,moreActionsDropdownShow:se,sortedFiles:Y,sortMethod:le,itemSize:ve,loadNextDir:n,loadNextDirLoading:u,canLoadNext:d,onScroll:S,cellWidth:k,dirCoverCache:R}=fa(),{onDrop:O,onFileDragStart:U,onFileDragEnd:q}=ba(),{onFileItemClick:Ie,onContextMenuClick:He,showGenInfo:me,imageGenInfo:qe,q:gt}=ya({openNext:I}),{previewIdx:he,onPreviewVisibleChange:kt,previewing:xe,previewImgMove:Ge,canPreview:Ke}=Ca(),{showMenuIdx:Ae}=va(),{onClearAllSelected:bt,onReverseSelect:yt,onSelectAll:Ct}=ma(),{getGenDiff:wt,changeIndchecked:oe,seedChangeChecked:ge,getRawGenParams:_t,getGenDiffWatchDep:St}=wa();return Ee(()=>t,()=>{c.value=t;const m=ht.get(t.stackKey??"");m&&(_.value=m.slice())},{immediate:!0}),(m,a)=>{const Pt=la,It=oa,xt=dt,At=ra,$t=de,Rt=ne,Qe=ia,$e=ua,Je=Be,Re=vt,Mt=ft,ke=Aa,Xe=da,Dt=$a,Ot=ce;return M(),G(Ot,{spinning:e(A),size:"large"},{default:g(()=>[i(_a,{show:e(l).keepMultiSelect||!!e(y).length,onClearAllSelected:e(bt),onSelectAll:e(Ct),onReverseSelect:e(yt)},null,8,["show","onClearAllSelected","onSelectAll","onReverseSelect"]),i(Pt,{style:{display:"none"}}),h("div",{ref_key:"stackViewEl",ref:p,onDragover:a[31]||(a[31]=b(()=>{},["prevent"])),onDrop:a[32]||(a[32]=b(o=>e(O)(o),["prevent"])),class:"container"},[i(xt,{visible:e(me),"onUpdate:visible":a[1]||(a[1]=o=>K(me)?me.value=o:null),width:"70vw","mask-closable":"",onOk:a[2]||(a[2]=o=>me.value=!1)},{cancelText:g(()=>[]),default:g(()=>[i(It,{active:"",loading:!e(gt).isIdle},{default:g(()=>[h("div",{style:{width:"100%","word-break":"break-all","white-space":"pre-line","max-height":"70vh",overflow:"auto","z-index":"9999"},onDblclick:a[0]||(a[0]=o=>e(Te)(e(qe)))},[h("div",Qa,w(m.$t("doubleClickToCopy")),1),Z(" "+w(e(qe)),1)],32)]),_:1},8,["loading"])]),_:1},8,["visible"]),h("div",Ja,[h("div",{class:"breadcrumb",style:Xt({flex:e(F)?1:""})},[e(F)?(M(),G(At,{key:0,style:{flex:"1"},value:e(B),"onUpdate:value":a[3]||(a[3]=o=>K(B)?B.value=o:null),onClick:a[4]||(a[4]=b(()=>{},["stop"])),onKeydown:a[5]||(a[5]=b(()=>{},["stop"])),onPressEnter:e(j),"allow-clear":""},null,8,["value","onPressEnter"])):(M(),G(Rt,{key:1,style:{flex:"1"}},{default:g(()=>[(M(!0),T(ze,null,nt(e(_),(o,ae)=>(M(),G($t,{key:ae},{default:g(()=>[h("a",{onClick:b(Ye=>e($)(ae),["prevent"])},w(o.curr==="/"?m.$t("root"):o.curr.replace(/:\/$/,m.$t("drive"))),9,Xa)]),_:2},1024))),128))]),_:1})),e(F)?(M(),G(Qe,{key:2,size:"small",onClick:e(j),type:"primary"},{default:g(()=>[Z(w(m.$t("go")),1)]),_:1},8,["onClick"])):(M(),T("div",Ya,[m.mode==="scanned-fixed"?(M(),T("a",{key:0,onClick:a[6]||(a[6]=b((...o)=>e(te)&&e(te)(...o),["prevent"])),style:{margin:"0 8px 16px 0"}},[i(e(Ta))])):Q("",!0),h("a",{onClick:a[7]||(a[7]=b((...o)=>e(v)&&e(v)(...o),["prevent"])),class:"copy"},w(m.$t("copy")),1),h("a",{onClick:a[8]||(a[8]=b((...o)=>e(x)&&e(x)(...o),["prevent","stop"]))},w(m.$t("edit")),1)]))],4),h("div",Za,[h("a",{class:"opt",onClick:a[9]||(a[9]=b((...o)=>e(C)&&e(C)(...o),["prevent"]))},w(m.$t("refresh")),1),h("a",{class:"opt",onClick:a[10]||(a[10]=b((...o)=>e(fe)&&e(fe)(...o),["prevent"]))},w(e(_e)?m.$t("stopPollRefresh"):m.$t("pollRefresh")),1),i(Re,null,{overlay:g(()=>[i(Je,null,{default:g(()=>[i($e,{key:"tag-search"},{default:g(()=>[h("a",{onClick:a[12]||(a[12]=b(o=>e(H)("tag-search"),["prevent"]))},w(m.$t("imgSearch")),1)]),_:1}),i($e,{key:"tag-search"},{default:g(()=>[h("a",{onClick:a[13]||(a[13]=b(o=>e(H)("fuzzy-search"),["prevent"]))},w(m.$t("fuzzy-search")),1)]),_:1})]),_:1})]),default:g(()=>[h("a",{class:"opt",onClick:a[11]||(a[11]=b(()=>{},["prevent"]))},[Z(w(m.$t("search"))+" ",1),i(e(Ne))])]),_:1}),e(W)?(M(),T("a",{key:0,class:"opt",onClick:a[14]||(a[14]=b((...o)=>e(ee)&&e(ee)(...o),["prevent"]))}," Walk ")):Q("",!0),h("a",{class:"opt",onClick:a[15]||(a[15]=b((...o)=>e(J)&&e(J)(...o),["prevent","stop"]))},w(m.$t("selectAll")),1),e(Yt)?Q("",!0):(M(),T("a",{key:1,class:"opt",onClick:a[16]||(a[16]=b((...o)=>e(E)&&e(E)(...o),["prevent"]))},w(m.$t("share")),1)),i(Re,null,{overlay:g(()=>[i(Je,null,{default:g(()=>[(M(!0),T(ze,null,nt(e(l).quickMovePaths,o=>(M(),G($e,{key:o.dir},{default:g(()=>[h("a",{onClick:b(ae=>e(L)(o.dir),["prevent"])},w(o.zh),9,en)]),_:2},1024))),128))]),_:1})]),default:g(()=>[h("a",{class:"opt",onClick:a[17]||(a[17]=b(()=>{},["prevent"]))},[Z(w(m.$t("quickMove"))+" ",1),i(e(Ne))])]),_:1}),i(Re,{trigger:["click"],visible:e(se),"onUpdate:visible":a[27]||(a[27]=o=>K(se)?se.value=o:null),placement:"bottomLeft",getPopupContainer:o=>o.parentNode},{overlay:g(()=>[h("div",tn,[i(Dt,Zt(ea({labelCol:{span:10},wrapperCol:{span:14}})),{default:g(()=>[i(ke,{label:m.$t("gridCellWidth")},{default:g(()=>[i(Mt,{modelValue:e(k),"onUpdate:modelValue":a[19]||(a[19]=o=>K(k)?k.value=o:null),max:1024,min:64,step:16},null,8,["modelValue"])]),_:1},8,["label"]),i(ke,{label:m.$t("sortingMethod")},{default:g(()=>[i(e(ta),{value:e(le),"onUpdate:value":a[20]||(a[20]=o=>K(le)?le.value=o:null),onClick:a[21]||(a[21]=b(()=>{},["stop"])),conv:e(Pe),options:e(aa)},null,8,["value","conv","options"])]),_:1},8,["label"]),i(ke,{label:m.$t("showChangeIndicators")},{default:g(()=>[i(Xe,{checked:e(oe),"onUpdate:checked":a[22]||(a[22]=o=>K(oe)?oe.value=o:null),onClick:e(_t)},null,8,["checked","onClick"])]),_:1},8,["label"]),i(ke,{label:m.$t("seedAsChange")},{default:g(()=>[i(Xe,{checked:e(ge),"onUpdate:checked":a[23]||(a[23]=o=>K(ge)?ge.value=o:null),disabled:!e(oe)},null,8,["checked","disabled"])]),_:1},8,["label"]),h("div",an,[h("a",{onClick:a[24]||(a[24]=b((...o)=>e(V)&&e(V)(...o),["prevent"]))},w(m.$t("addToSearchScanPathAndQuickMove")),1)]),h("div",nn,[h("a",{onClick:a[25]||(a[25]=b(o=>e(na)(e(D)+"/"),["prevent"]))},w(m.$t("openWithLocalFileBrowser")),1)]),h("div",sn,[h("a",{onClick:a[26]||(a[26]=b((...o)=>e(X)&&e(X)(...o),["prevent"]))},w(m.$t("createFolder")),1)])]),_:1},16)])]),default:g(()=>[h("a",{class:"opt",onClick:a[18]||(a[18]=b(()=>{},["prevent"]))},w(m.$t("more")),1)]),_:1},8,["visible","getPopupContainer"])])]),e(f)?(M(),T("div",ln,[i(e(ha),{class:"file-list",items:e(Y),ref_key:"scroller",ref:s,onScroll:e(S),"item-size":e(ve).first,"key-field":"fullpath","item-secondary-size":e(ve).second,gridItems:e(Se)},{default:g(({item:o,index:ae})=>[i(ga,{idx:parseInt(ae),file:o,"full-screen-preview-image-url":e(Y)[e(he)]?e(sa)(e(Y)[e(he)]):"","show-menu-idx":e(Ae),"onUpdate:showMenuIdx":a[28]||(a[28]=Ye=>K(Ae)?Ae.value=Ye:null),selected:e(y).includes(ae),"cell-width":e(k),onFileItemClick:e(Ie),onDragstart:e(U),onDragend:e(q),onPreviewVisibleChange:e(kt),onContextMenuClick:e(He),"is-selected-mutil-files":e(y).length>1,"enable-change-indicator":e(oe),"seed-change-checked":e(ge),"get-gen-diff":e(wt),"get-gen-diff-watch-dep":e(St),previewing:e(xe),"cover-files":e(R).get(o.fullpath)},null,8,["idx","file","full-screen-preview-image-url","show-menu-idx","selected","cell-width","onFileItemClick","onDragstart","onDragend","onPreviewVisibleChange","onContextMenuClick","is-selected-mutil-files","enable-change-indicator","seed-change-checked","get-gen-diff","get-gen-diff-watch-dep","previewing","cover-files"])]),after:g(()=>[h("div",on,[t.mode==="walk"?(M(),G(Qe,{key:0,onClick:e(n),loading:e(u),block:"",type:"primary",disabled:!e(d),ghost:""},{default:g(()=>[Z(w(m.$t("loadNextPage")),1)]),_:1},8,["onClick","loading","disabled"])):Q("",!0)])]),_:1},8,["items","onScroll","item-size","item-secondary-size","gridItems"]),e(xe)?(M(),T("div",rn,[i(e(Sa),{onClick:a[29]||(a[29]=o=>e(Ge)("prev")),class:st({disable:!e(Ke)("prev")})},null,8,["class"]),i(e(Pa),{onClick:a[30]||(a[30]=o=>e(Ge)("next")),class:st({disable:!e(Ke)("next")})},null,8,["class"])])):Q("",!0)])):Q("",!0)],544),e(xe)?(M(),G(Ia,{key:0,file:e(Y)[e(he)],idx:e(he),onContextMenuClick:e(He)},null,8,["file","idx","onContextMenuClick"])):Q("",!0),i(Ka,{"file-num":e(Y).length,"selected-file-num":e(y).length},null,8,["file-num","selected-file-num"])]),_:1},8,["spinning"])}}});const In=pt(un,[["__scopeId","data-v-d5abb7ba"]]);export{In as default};
