import{ca as z,av as K,d as j,ar as U,dz as $,w,r as b,C as S,l as A,u as D,o as E,aw as H,h as o,c as s,a as C,at as L,cY as W,g as _,ck as G,P as c,di as x}from"./index-ac57907e.js";var R=K("small","default"),Y=function(){return{id:String,prefixCls:String,size:c.oneOf(R),disabled:{type:Boolean,default:void 0},checkedChildren:c.any,unCheckedChildren:c.any,tabindex:c.oneOfType([c.string,c.number]),autofocus:{type:Boolean,default:void 0},loading:{type:Boolean,default:void 0},checked:c.oneOfType([c.string,c.number,c.looseBool]),checkedValue:c.oneOfType([c.string,c.number,c.looseBool]).def(!0),unCheckedValue:c.oneOfType([c.string,c.number,c.looseBool]).def(!1),onChange:{type:Function},onClick:{type:Function},onKeydown:{type:Function},onMouseup:{type:Function},"onUpdate:checked":{type:Function},onBlur:Function,onFocus:Function}},q=j({compatConfig:{MODE:3},name:"ASwitch",__ANT_SWITCH:!0,inheritAttrs:!1,props:Y(),slots:["checkedChildren","unCheckedChildren"],setup:function(n,r){var d=r.attrs,y=r.slots,B=r.expose,l=r.emit,m=U();$(function(){w(!("defaultChecked"in d),"Switch","'defaultChecked' is deprecated, please use 'v-model:checked'"),w(!("value"in d),"Switch","`value` is not validate prop, do you mean `checked`?")});var h=b(n.checked!==void 0?n.checked:d.defaultChecked),f=S(function(){return h.value===n.checkedValue});A(function(){return n.checked},function(){h.value=n.checked});var v=D("switch",n),u=v.prefixCls,F=v.direction,T=v.size,i=b(),g=function(){var e;(e=i.value)===null||e===void 0||e.focus()},V=function(){var e;(e=i.value)===null||e===void 0||e.blur()};B({focus:g,blur:V}),E(function(){H(function(){n.autofocus&&!n.disabled&&i.value.focus()})});var k=function(e,t){n.disabled||(l("update:checked",e),l("change",e,t),m.onFieldChange())},I=function(e){l("blur",e)},N=function(e){g();var t=f.value?n.unCheckedValue:n.checkedValue;k(t,e),l("click",t,e)},M=function(e){e.keyCode===x.LEFT?k(n.unCheckedValue,e):e.keyCode===x.RIGHT&&k(n.checkedValue,e),l("keydown",e)},O=function(e){var t;(t=i.value)===null||t===void 0||t.blur(),l("mouseup",e)},P=S(function(){var a;return a={},o(a,"".concat(u.value,"-small"),T.value==="small"),o(a,"".concat(u.value,"-loading"),n.loading),o(a,"".concat(u.value,"-checked"),f.value),o(a,"".concat(u.value,"-disabled"),n.disabled),o(a,u.value,!0),o(a,"".concat(u.value,"-rtl"),F.value==="rtl"),a});return function(){var a;return s(G,{insertExtraNode:!0},{default:function(){return[s("button",C(C(C({},L(n,["prefixCls","checkedChildren","unCheckedChildren","checked","autofocus","checkedValue","unCheckedValue","id","onChange","onUpdate:checked"])),d),{},{id:(a=n.id)!==null&&a!==void 0?a:m.id.value,onKeydown:M,onClick:N,onBlur:I,onMouseup:O,type:"button",role:"switch","aria-checked":h.value,disabled:n.disabled||n.loading,class:[d.class,P.value],ref:i}),[s("div",{class:"".concat(u.value,"-handle")},[n.loading?s(W,{class:"".concat(u.value,"-loading-icon")},null):null]),s("span",{class:"".concat(u.value,"-inner")},[f.value?_(y,n,"checkedChildren"):_(y,n,"unCheckedChildren")])])]}})}}});const Q=z(q);export{Q as _};