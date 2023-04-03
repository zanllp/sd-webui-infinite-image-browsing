import{d as A,u as ae,k as C,C as ge,a as I,c,b3 as Oe,b4 as De,r as Y,l as Ie,ad as X,P as F,ai as _e,b5 as re,D as he,_ as $,b6 as Z,B as ke,f as $e,i as me,b7 as Te,e as je,b8 as Le,b9 as Ne,ba as We,w as Me,bb as ze,ah as ye,ax as Ae,bc as be,j as Ce,bd as K,q as j,n as O,p as U,aK as Se,aC as M,s as x,v as z,x as ee,aJ as N,be as Ee,A as Pe,o as Be,bf as Ue,au as B,bg as Fe,bh as Re,bi as Ge,bj as Ve,az as te,aX as qe,aU as ce,bk as Ye,bl as Xe,bm as He,bn as Je,bo as Qe,aA as Ze,aB as Ke}from"./index-cba93bef.js";import{b as et,_ as tt,F as nt}from"./index-acdf42c2.js";import{W as at,T as rt,B as ot,I as st}from"./index-633d24a9.js";import{_ as ct}from"./index-9859258f.js";var lt=function(){return{prefixCls:String,checked:{type:Boolean,default:void 0},onChange:{type:Function},onClick:{type:Function},"onUpdate:checked":Function}},it=A({compatConfig:{MODE:3},name:"ACheckableTag",props:lt(),setup:function(e,a){var r=a.slots,t=a.emit,g=ae("tag",e),f=g.prefixCls,v=function(h){var l=e.checked;t("update:checked",!l),t("change",!l),t("click",h)},m=C(function(){var o;return ge(f.value,(o={},I(o,"".concat(f.value,"-checkable"),!0),I(o,"".concat(f.value,"-checkable-checked"),e.checked),o))});return function(){var o;return c("span",{class:m.value,onClick:v},[(o=r.default)===null||o===void 0?void 0:o.call(r)])}}});const ne=it;var ut=new RegExp("^(".concat(Oe.join("|"),")(-inverse)?$")),dt=new RegExp("^(".concat(De.join("|"),")$")),ft=function(){return{prefixCls:String,color:{type:String},closable:{type:Boolean,default:!1},closeIcon:F.any,visible:{type:Boolean,default:void 0},onClose:{type:Function},"onUpdate:visible":Function,icon:F.any}},R=A({compatConfig:{MODE:3},name:"ATag",props:ft(),slots:["closeIcon","icon"],setup:function(e,a){var r=a.slots,t=a.emit,g=a.attrs,f=ae("tag",e),v=f.prefixCls,m=f.direction,o=Y(!0);Ie(function(){e.visible!==void 0&&(o.value=e.visible)});var h=function(k){k.stopPropagation(),t("update:visible",!1),t("close",k),!k.defaultPrevented&&e.visible===void 0&&(o.value=!1)},l=C(function(){var i=e.color;return i?ut.test(i)||dt.test(i):!1}),s=C(function(){var i;return ge(v.value,(i={},I(i,"".concat(v.value,"-").concat(e.color),l.value),I(i,"".concat(v.value,"-has-color"),e.color&&!l.value),I(i,"".concat(v.value,"-hidden"),!o.value),I(i,"".concat(v.value,"-rtl"),m.value==="rtl"),i))});return function(){var i,k,y,w=e.icon,T=w===void 0?(i=r.icon)===null||i===void 0?void 0:i.call(r):w,S=e.color,u=e.closeIcon,d=u===void 0?(k=r.closeIcon)===null||k===void 0?void 0:k.call(r):u,p=e.closable,b=p===void 0?!1:p,D=function(){return b?d?c("span",{class:"".concat(v.value,"-close-icon"),onClick:h},[d]):c(_e,{class:"".concat(v.value,"-close-icon"),onClick:h},null):null},W={backgroundColor:S&&!l.value?S:void 0},G=T||null,V=(y=r.default)===null||y===void 0?void 0:y.call(r),J=G?c(X,null,[G,c("span",null,[V])]):V,Q="onClick"in g,_=c("span",{class:s.value,style:W},[J,D()]);return Q?c(at,null,{default:function(){return[_]}}):_}}});R.CheckableTag=ne;R.install=function(n){return n.component(R.name,R),n.component(ne.name,ne),n};const xe=R;var we=re("normal","exception","active","success"),vt=re("line","circle","dashboard"),pt=re("default","small"),H=function(){return{prefixCls:String,type:F.oneOf(vt),percent:Number,format:{type:Function},status:F.oneOf(we),showInfo:{type:Boolean,default:void 0},strokeWidth:Number,strokeLinecap:String,strokeColor:{type:[String,Object],default:void 0},trailColor:String,width:Number,success:{type:Object,default:function(){return{}}},gapDegree:Number,gapPosition:String,size:F.oneOf(pt),steps:Number,successPercent:Number,title:String}};function E(n){return!n||n<0?0:n>100?100:n}function q(n){var e=n.success,a=n.successPercent,r=a;return e&&"progress"in e&&(he(!1,"Progress","`success.progress` is deprecated. Please use `success.percent` instead."),r=e.progress),e&&"percent"in e&&(r=e.percent),r}var gt=["from","to","direction"],_t=function(){return $($({},H()),{},{prefixCls:String,direction:{type:String}})},ht=function(e){var a=[];return Object.keys(e).forEach(function(r){var t=parseFloat(r.replace(/%/g,""));isNaN(t)||a.push({key:t,value:e[r]})}),a=a.sort(function(r,t){return r.key-t.key}),a.map(function(r){var t=r.key,g=r.value;return"".concat(g," ").concat(t,"%")}).join(", ")},kt=function(e,a){var r=e.from,t=r===void 0?Z.blue:r,g=e.to,f=g===void 0?Z.blue:g,v=e.direction,m=v===void 0?a==="rtl"?"to left":"to right":v,o=ke(e,gt);if(Object.keys(o).length!==0){var h=ht(o);return{backgroundImage:"linear-gradient(".concat(m,", ").concat(h,")")}}return{backgroundImage:"linear-gradient(".concat(m,", ").concat(t,", ").concat(f,")")}};const mt=A({compatConfig:{MODE:3},name:"Line",props:_t(),setup:function(e,a){var r=a.slots,t=C(function(){var o=e.strokeColor,h=e.direction;return o&&typeof o!="string"?kt(o,h):{background:o}}),g=C(function(){return e.trailColor?{backgroundColor:e.trailColor}:void 0}),f=C(function(){var o=e.percent,h=e.strokeWidth,l=e.strokeLinecap,s=e.size;return $({width:"".concat(E(o),"%"),height:"".concat(h||(s==="small"?6:8),"px"),borderRadius:l==="square"?0:""},t.value)}),v=C(function(){return q(e)}),m=C(function(){var o=e.strokeWidth,h=e.size,l=e.strokeLinecap,s=e.success;return{width:"".concat(E(v.value),"%"),height:"".concat(o||(h==="small"?6:8),"px"),borderRadius:l==="square"?0:"",backgroundColor:s==null?void 0:s.strokeColor}});return function(){var o;return c(X,null,[c("div",{class:"".concat(e.prefixCls,"-outer")},[c("div",{class:"".concat(e.prefixCls,"-inner"),style:g.value},[c("div",{class:"".concat(e.prefixCls,"-bg"),style:f.value},null),v.value!==void 0?c("div",{class:"".concat(e.prefixCls,"-success-bg"),style:m.value},null):null])]),(o=r.default)===null||o===void 0?void 0:o.call(r)])}}});var yt={percent:0,prefixCls:"vc-progress",strokeColor:"#2db7f5",strokeLinecap:"round",strokeWidth:1,trailColor:"#D9D9D9",trailWidth:1},bt=function(e){var a=Y(null);return $e(function(){var r=Date.now(),t=!1;e.value.forEach(function(g){var f=(g==null?void 0:g.$el)||g;if(f){t=!0;var v=f.style;v.transitionDuration=".3s, .3s, .3s, .06s",a.value&&r-a.value<100&&(v.transitionDuration="0s, 0s")}}),t&&(a.value=Date.now())}),e},Ct={gapDegree:Number,gapPosition:{type:String},percent:{type:[Array,Number]},prefixCls:String,strokeColor:{type:[Object,String,Array]},strokeLinecap:{type:String},strokeWidth:Number,trailColor:String,trailWidth:Number,transition:String},St=["prefixCls","strokeWidth","trailWidth","gapDegree","gapPosition","trailColor","strokeLinecap","strokeColor"],le=0;function ie(n){return+n.replace("%","")}function ue(n){return Array.isArray(n)?n:[n]}function de(n,e,a,r){var t=arguments.length>4&&arguments[4]!==void 0?arguments[4]:0,g=arguments.length>5?arguments[5]:void 0,f=50-r/2,v=0,m=-f,o=0,h=-2*f;switch(g){case"left":v=-f,m=0,o=2*f,h=0;break;case"right":v=f,m=0,o=-2*f,h=0;break;case"bottom":m=f,h=2*f;break}var l="M 50,50 m ".concat(v,",").concat(m,`
   a `).concat(f,",").concat(f," 0 1 1 ").concat(o,",").concat(-h,`
   a `).concat(f,",").concat(f," 0 1 1 ").concat(-o,",").concat(h),s=Math.PI*2*f,i={stroke:a,strokeDasharray:"".concat(e/100*(s-t),"px ").concat(s,"px"),strokeDashoffset:"-".concat(t/2+n/100*(s-t),"px"),transition:"stroke-dashoffset .3s ease 0s, stroke-dasharray .3s ease 0s, stroke .3s, stroke-width .06s ease .3s, opacity .3s ease 0s"};return{pathString:l,pathStyle:i}}const Pt=A({compatConfig:{MODE:3},name:"VCCircle",props:me(Ct,yt),setup:function(e){le+=1;var a=Y(le),r=C(function(){return ue(e.percent)}),t=C(function(){return ue(e.strokeColor)}),g=Te(),f=je(g,2),v=f[0],m=f[1];bt(m);var o=function(){var l=e.prefixCls,s=e.strokeWidth,i=e.strokeLinecap,k=e.gapDegree,y=e.gapPosition,w=0;return r.value.map(function(T,S){var u=t.value[S]||t.value[t.value.length-1],d=Object.prototype.toString.call(u)==="[object Object]"?"url(#".concat(l,"-gradient-").concat(a.value,")"):"",p=de(w,T,u,s,k,y),b=p.pathString,D=p.pathStyle;w+=T;var W={key:S,d:b,stroke:d,"stroke-linecap":i,"stroke-width":s,opacity:T===0?0:1,"fill-opacity":"0",class:"".concat(l,"-circle-path"),style:D};return c("path",$({ref:v(S)},W),null)})};return function(){var h=e.prefixCls,l=e.strokeWidth,s=e.trailWidth,i=e.gapDegree,k=e.gapPosition,y=e.trailColor,w=e.strokeLinecap;e.strokeColor;var T=ke(e,St),S=de(0,100,y,l,i,k),u=S.pathString,d=S.pathStyle;delete T.percent;var p=t.value.find(function(D){return Object.prototype.toString.call(D)==="[object Object]"}),b={d:u,stroke:y,"stroke-linecap":w,"stroke-width":s||l,"fill-opacity":"0",class:"".concat(h,"-circle-trail"),style:d};return c("svg",$({class:"".concat(h,"-circle"),viewBox:"0 0 100 100"},T),[p&&c("defs",null,[c("linearGradient",{id:"".concat(h,"-gradient-").concat(a.value),x1:"100%",y1:"0%",x2:"0%",y2:"0%"},[Object.keys(p).sort(function(D,W){return ie(D)-ie(W)}).map(function(D,W){return c("stop",{key:W,offset:D,"stop-color":p[D]},null)})])]),c("path",b,null),o().reverse()])}}});function xt(n){var e=n.percent,a=n.success,r=n.successPercent,t=E(q({success:a,successPercent:r}));return[t,E(E(e)-t)]}function wt(n){var e=n.success,a=e===void 0?{}:e,r=n.strokeColor,t=a.strokeColor;return[t||Z.green,r||null]}const Ot=A({compatConfig:{MODE:3},name:"Circle",inheritAttrs:!1,props:H(),setup:function(e,a){var r=a.slots,t=C(function(){if(e.gapDegree||e.gapDegree===0)return e.gapDegree;if(e.type==="dashboard")return 75}),g=C(function(){var s=e.width||120;return{width:typeof s=="number"?"".concat(s,"px"):s,height:typeof s=="number"?"".concat(s,"px"):s,fontSize:"".concat(s*.15+6,"px")}}),f=C(function(){return e.strokeWidth||6}),v=C(function(){return e.gapPosition||e.type==="dashboard"&&"bottom"||"top"}),m=C(function(){return xt(e)}),o=C(function(){return Object.prototype.toString.call(e.strokeColor)==="[object Object]"}),h=C(function(){return wt({success:e.success,strokeColor:e.strokeColor})}),l=C(function(){var s;return s={},I(s,"".concat(e.prefixCls,"-inner"),!0),I(s,"".concat(e.prefixCls,"-circle-gradient"),o.value),s});return function(){var s;return c("div",{class:l.value,style:g.value},[c(Pt,{percent:m.value,strokeWidth:f.value,trailWidth:f.value,strokeColor:h.value,strokeLinecap:e.strokeLinecap,trailColor:e.trailColor,prefixCls:e.prefixCls,gapDegree:t.value,gapPosition:v.value},null),(s=r.default)===null||s===void 0?void 0:s.call(r)])}}});var Dt=function(){return $($({},H()),{},{steps:Number,size:{type:String},strokeColor:String,trailColor:String})};const It=A({compatConfig:{MODE:3},name:"Steps",props:Dt(),setup:function(e,a){var r=a.slots,t=C(function(){return Math.round(e.steps*((e.percent||0)/100))}),g=C(function(){return e.size==="small"?2:14}),f=C(function(){for(var v=e.steps,m=e.strokeWidth,o=m===void 0?8:m,h=e.strokeColor,l=e.trailColor,s=e.prefixCls,i=[],k=0;k<v;k+=1){var y,w=(y={},I(y,"".concat(s,"-steps-item"),!0),I(y,"".concat(s,"-steps-item-active"),k<=t.value-1),y);i.push(c("div",{key:k,class:w,style:{backgroundColor:k<=t.value-1?h:l,width:"".concat(g.value,"px"),height:"".concat(o,"px")}},null))}return i});return function(){var v;return c("div",{class:"".concat(e.prefixCls,"-steps-outer")},[f.value,(v=r.default)===null||v===void 0?void 0:v.call(r)])}}}),$t=A({compatConfig:{MODE:3},name:"AProgress",props:me(H(),{type:"line",percent:0,showInfo:!0,trailColor:null,size:"default",strokeLinecap:"round"}),slots:["format"],setup:function(e,a){var r=a.slots,t=ae("progress",e),g=t.prefixCls,f=t.direction;he(e.successPercent==null,"Progress","`successPercent` is deprecated. Please use `success.percent` instead.");var v=C(function(){var l,s=e.type,i=e.showInfo,k=e.size,y=g.value;return l={},I(l,y,!0),I(l,"".concat(y,"-").concat(s==="dashboard"&&"circle"||s),!0),I(l,"".concat(y,"-show-info"),i),I(l,"".concat(y,"-").concat(k),k),I(l,"".concat(y,"-rtl"),f.value==="rtl"),l}),m=C(function(){var l=e.percent,s=l===void 0?0:l,i=q(e);return parseInt(i!==void 0?i.toString():s.toString(),10)}),o=C(function(){var l=e.status;return we.indexOf(l)<0&&m.value>=100?"success":l||"normal"}),h=function(){var s=e.showInfo,i=e.format,k=e.type,y=e.percent,w=e.title,T=q(e);if(!s)return null;var S,u=i||(r==null?void 0:r.format)||function(p){return"".concat(p,"%")},d=k==="line";return i||r!=null&&r.format||o.value!=="exception"&&o.value!=="success"?S=u(E(y),E(T)):o.value==="exception"?S=d?c(Le,null,null):c(_e,null,null):o.value==="success"&&(S=d?c(Ne,null,null):c(We,null,null)),c("span",{class:"".concat(g.value,"-text"),title:w===void 0&&typeof S=="string"?S:void 0},[S])};return function(){var l=e.type,s=e.steps,i=e.strokeColor,k=e.title,y=h(),w;l==="line"?w=s?c(It,$($({},e),{},{strokeColor:typeof i=="string"?i:void 0,prefixCls:g.value,steps:s}),{default:function(){return[y]}}):c(mt,$($({},e),{},{prefixCls:g.value}),{default:function(){return[y]}}):(l==="circle"||l==="dashboard")&&(w=c(Ot,$($({},e),{},{prefixCls:g.value}),{default:function(){return[y]}}));var T=$($({},v.value),{},I({},"".concat(g.value,"-status-").concat(o.value),!0));return c("div",{class:T,title:k},[w])}}}),Tt=Me($t);function jt(n,e){return n&&n.length?ze(n,et(e)):[]}var Lt={icon:{tag:"svg",attrs:{viewBox:"64 64 896 896",focusable:"false"},children:[{tag:"path",attrs:{d:"M696 480H328c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h368c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8z"}},{tag:"path",attrs:{d:"M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"}}]},name:"minus-circle",theme:"outlined"};const Nt=Lt;function fe(n){for(var e=1;e<arguments.length;e++){var a=arguments[e]!=null?Object(arguments[e]):{},r=Object.keys(a);typeof Object.getOwnPropertySymbols=="function"&&(r=r.concat(Object.getOwnPropertySymbols(a).filter(function(t){return Object.getOwnPropertyDescriptor(a,t).enumerable}))),r.forEach(function(t){Wt(n,t,a[t])})}return n}function Wt(n,e,a){return e in n?Object.defineProperty(n,e,{value:a,enumerable:!0,configurable:!0,writable:!0}):n[e]=a,n}var oe=function(e,a){var r=fe({},e,a.attrs);return c(ye,fe({},r,{icon:Nt}),null)};oe.displayName="MinusCircleOutlined";oe.inheritAttrs=!1;const Mt=oe;var zt={icon:{tag:"svg",attrs:{viewBox:"64 64 896 896",focusable:"false"},children:[{tag:"path",attrs:{d:"M168 504.2c1-43.7 10-86.1 26.9-126 17.3-41 42.1-77.7 73.7-109.4S337 212.3 378 195c42.4-17.9 87.4-27 133.9-27s91.5 9.1 133.8 27A341.5 341.5 0 01755 268.8c9.9 9.9 19.2 20.4 27.8 31.4l-60.2 47a8 8 0 003 14.1l175.7 43c5 1.2 9.9-2.6 9.9-7.7l.8-180.9c0-6.7-7.7-10.5-12.9-6.3l-56.4 44.1C765.8 155.1 646.2 92 511.8 92 282.7 92 96.3 275.6 92 503.8a8 8 0 008 8.2h60c4.4 0 7.9-3.5 8-7.8zm756 7.8h-60c-4.4 0-7.9 3.5-8 7.8-1 43.7-10 86.1-26.9 126-17.3 41-42.1 77.8-73.7 109.4A342.45 342.45 0 01512.1 856a342.24 342.24 0 01-243.2-100.8c-9.9-9.9-19.2-20.4-27.8-31.4l60.2-47a8 8 0 00-3-14.1l-175.7-43c-5-1.2-9.9 2.6-9.9 7.7l-.7 181c0 6.7 7.7 10.5 12.9 6.3l56.4-44.1C258.2 868.9 377.8 932 512.2 932c229.2 0 415.5-183.7 419.8-411.8a8 8 0 00-8-8.2z"}}]},name:"sync",theme:"outlined"};const At=zt;function ve(n){for(var e=1;e<arguments.length;e++){var a=arguments[e]!=null?Object(arguments[e]):{},r=Object.keys(a);typeof Object.getOwnPropertySymbols=="function"&&(r=r.concat(Object.getOwnPropertySymbols(a).filter(function(t){return Object.getOwnPropertyDescriptor(a,t).enumerable}))),r.forEach(function(t){Et(n,t,a[t])})}return n}function Et(n,e,a){return e in n?Object.defineProperty(n,e,{value:a,enumerable:!0,configurable:!0,writable:!0}):n[e]=a,n}var se=function(e,a){var r=ve({},e,a.attrs);return c(ye,ve({},r,{icon:At}),null)};se.displayName="SyncOutlined";se.inheritAttrs=!1;const Bt=se;const Ut={key:0,class:"auto-completed-dirs"},Ft=A({__name:"localPathShortcut",props:{task:null,idx:null},emits:["update:task"],setup(n,{emit:e}){const a=n,r=Ae({get:()=>a.task,set:o=>e("update:task",o)}),t=be(),g=Ce(),{showDirAutoCompletedIdx:f}=K(t),v=o=>{if(r.value.type==="download"){r.value.recv_dir=o;return}r.value.send_dirs.push(o)},m=["#f5222d","#1890ff","#ff3125","#d46b08","#007bff","#52c41a","#13c2c2","#fa541c","#eb2f96","#2f54eb"];return(o,h)=>{const l=xe,s=Ee;return j(f)===n.idx&&j(g).autoCompletedDirList.length?(O(),U("div",Ut,[(O(!0),U(X,null,Se(j(g).autoCompletedDirList,(i,k)=>(O(),M(s,{key:i.dir,title:i.dir+"  点击添加"},{default:x(()=>[c(l,{visible:!j(r).send_dirs.includes(i.dir),color:m[k%m.length],onClick:y=>v(i.dir)},{default:x(()=>[z(ee(i.zh),1)]),_:2},1032,["visible","color","onClick"])]),_:2},1032,["title"]))),128))])):N("",!0)}}});const pe=Pe(Ft,[["__scopeId","data-v-a4800223"]]),Rt=n=>(Ze("data-v-0d6f8c56"),n=n(),Ke(),n),Gt={class:"top-bar"},Vt=Rt(()=>te("div",{class:"flex-placeholder"},null,-1)),qt={key:3},Yt={class:"action-bar"},Xt=A({__name:"taskRecord",setup(n){const e=Ye(!0),a=be(),r=Ce(),{tasks:t}=K(a),{showDirAutoCompletedIdx:g}=K(a),f=new Map,v=Y(10);Be(async()=>{const u=await Ue();t.value=jt([...u.tasks,...t.value].map(e),p=>p.id).sort((p,b)=>Date.parse(b.start_time)-Date.parse(p.start_time)).slice(0,100);let d=t.value.filter(p=>p.running);d.filter(p=>!u.tasks.find(b=>b.id===p.id)).forEach(p=>{p.running=!1}),d=t.value.filter(p=>p.running),d.length&&d.forEach(p=>{l(p.id).completedTask.then(()=>B.success(`${p.type==="download"?"下载":"上传"}完成`))}),t.value.length||o()}),r.useEventListen("createNewTask",async u=>{t.value.unshift(e({...m(),...u})),await h(0),B.success("创建完成，在任务列表查看进度")});const m=()=>e({type:"upload",send_dirs:[],recv_dir:"",id:"",running:!1,start_time:"",n_failed_files:0,n_files:0,n_success_files:0,canceled:!1}),o=()=>{t.value.unshift(m())},h=async u=>{const d=t.value[u];if(d.send_dirs=d.send_dirs.map(b=>b.trim()).filter(b=>b),d.recv_dir=d.recv_dir.trim(),!(d.type==="upload"?d.recv_dir.startsWith("/"):d.send_dirs.every(b=>b.startsWith("/"))))return B.error("百度云的位置必须以 “/” 开头");d.running=!0,d.n_files=100;const p=await Fe(d);d.id=p.id,l(p.id).completedTask.then(()=>B.success("上传完成"))},l=u=>{a.taskLogMap.set(u,[]);const d=rt.run({action:()=>Re(u),pollInterval:a.pollInterval*1e3,validator(p){a.taskLogMap.get(u).push(...p.tasks);const b=t.value.findIndex(D=>D.id===u);return t.value[b]=e(p.task_summary),!p.task_summary.running}});return f.set(u,d),a.queue.pushAction(()=>d.completedTask),d},s=u=>parseInt(((u.n_failed_files+u.n_success_files)/u.n_files*100).toString()),i=u=>!!u.id&&!u.running&&!u.canceled,k=u=>u.running||i(u),y=u=>{const d=t.value[u];t.value.unshift({...m(),...Xe(d,"send_dirs","type","recv_dir")}),B.success("复制完成，已添加到最前端")},w=u=>{a.currLogDetailId=t.value[u].id,a.splitView.open=!0},T=async u=>{var b;const d=t.value[u],{last_tick:p}=await He(d.id);a.taskLogMap.get(d.id).push(...p.tasks),t.value[u]=e(p.task_summary),(b=f.get(d.id))==null||b.clearTask()},S=async u=>{const d=t.value[u];t.value.splice(u,1),d.id&&Je(d.id),B.success("删除完成")};return(u,d)=>{const p=Qe,b=ot,D=xe,W=tt,G=ct,V=st,J=nt,Q=Tt;return O(),U("div",{class:"wrapper",onClick:d[1]||(d[1]=_=>g.value=-1)},[c(p,{style:{display:"none"}}),c(b,{onClick:o,block:"",style:{"border-radius":"8px"}},{icon:x(()=>[c(j(Ge))]),default:x(()=>[z(" 添加一个任务 ")]),_:1}),(O(!0),U(X,null,Se(j(t).slice(0,v.value),(_,L)=>(O(),U("div",{key:j(Ve)(_),class:"task-form"},[te("div",Gt,[i(_)?(O(),M(D,{key:0,color:"success"},{default:x(()=>[z("已完成")]),_:1})):N("",!0),_.running?(O(),M(D,{key:1,color:"processing"},{icon:x(()=>[c(j(Bt),{spin:!0})]),default:x(()=>[z(ee(_.type==="download"?"下载":"上传")+"中 ",1)]),_:2},1024)):N("",!0),_.canceled?(O(),M(D,{key:2,color:"default"},{icon:x(()=>[c(j(Mt))]),default:x(()=>[z(" 已取消 ")]),_:1})):N("",!0),Vt,_.start_time?(O(),U("div",qt," 开始时间： "+ee(_.start_time),1)):N("",!0)]),c(J,{layout:"vertical","label-align":"left"},{default:x(()=>[c(W,{label:"任务类型"},{default:x(()=>[c(j(qe),{value:_.type,"onUpdate:value":P=>_.type=P,disabled:k(_),options:["upload","download"],conv:{value:P=>P,text:P=>P==="upload"?"上传":"下载"}},null,8,["value","onUpdate:value","disabled","conv"])]),_:2},1024),c(W,{label:`发送的文件夹 (${_.type==="upload"?"本地":"百度云"})`,onClick:ce(P=>_.type==="upload"&&(g.value=L),["stop"])},{default:x(()=>[c(G,{"auto-size":"",disabled:k(_),value:_.send_dirs.join(),"onUpdate:value":P=>_.send_dirs=P.split(","),"allow-clear":"",placeholder:"发送文件的文件夹,多个文件夹使用逗号或者换行分隔。支持使用占位符例如stable-diffusion-webui最常用表示日期的<#%Y-%m-%d#>"},null,8,["disabled","value","onUpdate:value"]),_.type==="upload"?(O(),M(pe,{key:0,task:_,"onUpdate:task":P=>j(t)[L]=P,idx:L},null,8,["task","onUpdate:task","idx"])):N("",!0)]),_:2},1032,["label","onClick"]),c(W,{label:`接收的文件夹 (${_.type!=="upload"?"本地":"百度云"})`},{default:x(()=>[c(V,{value:_.recv_dir,"onUpdate:value":P=>_.recv_dir=P,disabled:k(_),"allow-clear":"",onClick:ce(P=>_.type==="download"&&(g.value=L),["stop"]),placeholder:"用于接收的文件夹，支持使用占位符例如stable-diffusion-webui最常用表示日期的<#%Y-%m-%d#>"},null,8,["value","onUpdate:value","disabled","onClick"]),_.type==="download"?(O(),M(pe,{key:0,task:_,"onUpdate:task":P=>j(t)[L]=P,idx:L},null,8,["task","onUpdate:task","idx"])):N("",!0)]),_:2},1032,["label"])]),_:2},1024),te("div",Yt,[j(a).taskLogMap.get(_.id)?(O(),M(b,{key:0,onClick:P=>w(L)},{default:x(()=>[z("查看详细日志")]),_:2},1032,["onClick"])):N("",!0),c(b,{onClick:P=>y(L)},{default:x(()=>[z("复制该任务")]),_:2},1032,["onClick"]),_.running?(O(),M(b,{key:1,onClick:P=>T(L),danger:""},{default:x(()=>[z("取消任务")]),_:2},1032,["onClick"])):N("",!0),c(b,{onClick:P=>S(L),disabled:_.running,danger:""},{default:x(()=>[z("移除")]),_:2},1032,["onClick","disabled"]),i(_)?N("",!0):(O(),M(b,{key:2,type:"primary",loading:_.running,disabled:_.running,onClick:P=>h(L)},{default:x(()=>[z("开始")]),_:2},1032,["loading","disabled","onClick"]))]),_.running?(O(),M(Q,{key:0,"stroke-color":{from:"#108ee9",to:"#87d068"},percent:s(_),status:"active"},null,8,["percent"])):N("",!0)]))),128)),v.value<j(t).length?(O(),M(b,{key:0,onClick:d[0]||(d[0]=_=>v.value+=5),block:"",style:{"border-radius":"8px"}},{default:x(()=>[z(" 继续加载 ")]),_:1})):N("",!0)])}}});const Kt=Pe(Xt,[["__scopeId","data-v-0d6f8c56"]]);export{Kt as default};