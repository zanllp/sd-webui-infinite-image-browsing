import{ct as M,cu as d,c4 as _,aX as g,bh as h,cv as E,bj as O,cw as p,bf as y,bz as C}from"./index-e9e01f28.js";function I(n){return function(r){return r==null?void 0:r[n]}}var L=1,w=2;function D(n,r,e,t){var i=e.length,A=i,a=!t;if(n==null)return!A;for(n=Object(n);i--;){var f=e[i];if(a&&f[2]?f[1]!==n[f[0]]:!(f[0]in n))return!1}for(;++i<A;){f=e[i];var u=f[0],s=n[u],o=f[1];if(a&&f[2]){if(s===void 0&&!(u in n))return!1}else{var l=new M;if(t)var R=t(s,o,u,n,r,l);if(!(R===void 0?d(o,s,L|w,t,l):R))return!1}}return!0}function P(n){return n===n&&!_(n)}function G(n){for(var r=g(n),e=r.length;e--;){var t=r[e],i=n[t];r[e]=[t,i,P(i)]}return r}function c(n,r){return function(e){return e==null?!1:e[n]===r&&(r!==void 0||n in Object(e))}}function b(n){var r=G(n);return r.length==1&&r[0][2]?c(r[0][0],r[0][1]):function(e){return e===n||D(e,n,r)}}function F(n,r,e){var t=n==null?void 0:h(n,r);return t===void 0?e:t}var S=1,m=2;function v(n,r){return E(n)&&P(r)?c(O(n),r):function(e){var t=F(e,n);return t===void 0&&t===r?p(e,n):d(r,t,S|m)}}function x(n){return function(r){return h(r,n)}}function K(n){return E(n)?I(O(n)):x(n)}function T(n){return typeof n=="function"?n:n==null?y:typeof n=="object"?C(n)?v(n[0],n[1]):b(n):K(n)}export{T as b};
