import{ax as N,aw as V,cc as D,b$ as E,d as U,V as q,aW as G,a$ as L,r as B,A as I,aa as M,p as P,K as c,L as p,$ as y,x as b,T as v,c as j,O as m,a2 as z,W as x,N as A,Y as k,U as w,Z as C,a4 as W,cg as K,a8 as Q}from"./index-43060d2f.js";/* empty css              */import{a as $,u as Y}from"./db-c23bc74f.js";import{b as Z}from"./_baseIteratee-e73bfe8e.js";import{B as H}from"./button-bd7116ce.js";function J(s,n,a,r){for(var e=-1,t=s==null?0:s.length;++e<t;){var i=s[e];n(r,i,a(i),s)}return r}function R(s){return function(n,a,r){for(var e=-1,t=Object(n),i=r(n),f=i.length;f--;){var g=i[s?f:++e];if(a(t[g],g,t)===!1)break}return n}}var X=R();const ee=X;function ae(s,n){return s&&ee(s,n,N)}function te(s,n){return function(a,r){if(a==null)return a;if(!V(a))return s(a,r);for(var e=a.length,t=n?e:-1,i=Object(a);(n?t--:++t<e)&&r(i[t],t,i)!==!1;);return a}}var se=te(ae);const ne=se;function re(s,n,a,r){return ne(s,function(e,t,i){n(r,e,a(e),i)}),r}function oe(s,n){return function(a,r){var e=D(a)?J:re,t=n?n():{};return e(a,s,Z(r),t)}}var ie=Object.prototype,le=ie.hasOwnProperty,ce=oe(function(s,n,a){le.call(s,a)?s[a].push(n):E(s,a,[n])});const ue=ce,de={class:"container"},pe={class:"search-bar"},fe={class:"list-container"},ge={class:"cat-name"},he=["onClick"],ve=U({__name:"TagSearch",props:{tabIdx:null,paneIdx:null},setup(s){const n=s,a=q(),r=G(new L(-1,0,-1,"throw")),e=B(),t=B(new Set),i=I(()=>e.value?e.value.tags.slice().sort((o,l)=>l.count-o.count):[]),f=["Model","Sampler","lora","pos","size"].reduce((o,l,h)=>(o[l]=h,o),{}),g=I(()=>Object.entries(ue(i.value,o=>o.type)).sort((o,l)=>f[o[0]]-f[l[0]])),O=M();P(async()=>{e.value=await $(),e.value.img_count&&e.value.expired&&S()});const S=async()=>{r.pushAction(async()=>{await Y(),e.value=await $()})},T=()=>{a.openTagSearchMatchedImageGridInRight(n.tabIdx,O,Array.from(t.value))},_=(o,l=!1)=>(l?`[${o.type}] `:"")+(o.display_name?`${o.display_name} : ${o.name}`:o.name);return(o,l)=>{const h=H;return c(),p("div",de,[y("",!0),e.value?(c(),p(b,{key:1},[v("div",null,[v("div",pe,[j(m(z),{conv:{value:u=>u.id,text:_,optionText:u=>_(u,!0)},mode:"multiple",style:{width:"100%"},options:m(i),value:Array.from(t.value),placeholder:"Select tags to match images","onUpdate:value":l[0]||(l[0]=u=>t.value=new Set(u))},null,8,["conv","options","value"]),e.value.expired||!e.value.img_count?(c(),x(h,{key:0,onClick:S,loading:!r.isIdle,type:"primary"},{default:A(()=>[k(w(e.value.img_count===0?"Generate index for search image":"Update index"),1)]),_:1},8,["loading"])):(c(),x(h,{key:1,type:"primary",onClick:T,loading:!r.isIdle,disabled:!t.value.size},{default:A(()=>[k("Search ")]),_:1},8,["loading","disabled"]))])]),v("div",fe,[(c(!0),p(b,null,C(m(g),([u,F])=>(c(),p("ul",{class:"tag-list",key:u},[v("h3",ge,w(u),1),(c(!0),p(b,null,C(F,d=>(c(),p("li",{key:d.id,class:W(["tag",{selected:t.value.has(d.id)}]),onClick:me=>t.value.has(d.id)?t.value.delete(d.id):t.value.add(d.id)},[t.value.has(d.id)?(c(),x(m(K),{key:0})):y("",!0),k(" "+w(_(d)),1)],10,he))),128))]))),128))])],64)):y("",!0)])}}});const we=Q(ve,[["__scopeId","data-v-7bf44f69"]]);export{we as default};