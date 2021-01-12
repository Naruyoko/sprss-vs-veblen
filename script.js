var lineBreakRegex=/\r?\n/g;
var itemSeparatorRegex=/[\t ,]/g;
window.onload=function (){
  console.clear();
  dg('input').onkeydown=handlekey;
  dg('input').onfocus=handlekey;
  dg('input').onmousedown=handlekey;
  load();
  convertall();
}
function dg(s){
  return document.getElementById(s);
}
function encodewithbase64asdigit(s,key){
  var base64key="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  var r="";
  var bitsperdigit=Math.ceil(Math.log2(key.length+1));
  var l=s.length;
  var b=0;
  var m=0;
  for (var i=0;i<l;i++){
    var v=key.indexOf(s[i]);
    if (v==-1) continue;
    m<<=bitsperdigit;
    m|=v;
    b+=bitsperdigit;
    while (b>=6){
      r+=base64key[m>>(b-6)];
      m%=1<<(b-6);
      b-=6;
    }
  }
  if (b>0){
    m<<=6-b;
    m|=(1<<(6-b))-1;
    r+=base64key[m];
  }
  return r;
}
function decodewithbase64asdigit(s,key){
  var base64key="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  var r="";
  var bitsperdigit=Math.ceil(Math.log2(key.length+1));
  var l=s.length;
  var b=0;
  var m=0;
  var end=(1<<bitsperdigit)-1;
  for (var i=0;i<l;i++){
    var v=base64key.indexOf(s[i]);
    if (v==-1) continue;
    m<<=6;
    m|=v;
    b+=6;
    while (b>=bitsperdigit){
      var p=m>>(b-bitsperdigit);
      if (p==end) break;
      r+=key[p];
      m%=1<<(b-bitsperdigit);
      b-=bitsperdigit;
    }
  }
  return r;
}
function inAP(s){
  return !(s instanceof Array)&&s instanceof Object;
}
function prefixVeblen(s){
  if (typeof s=="string") s=buildVeblenObject(s);
  if (s===0) return "0";
  if (s instanceof Array&&s.length==1) return prefixVeblen(s[0]);
  if (s instanceof Array) return "+"+prefixVeblen(s.slice(0,Math.ceil(s.length/2)))+prefixVeblen(s.slice(Math.ceil(s.length/2)));
  if (inAP(s)) return "p"+prefixVeblen(s[0])+prefixVeblen(s[1]);
  throw Error("Unexpected type "+s);
}
function infixVeblen(s){
  if (typeof s=="string") s=buildVeblenObject(s);
  if (s===0) return "0";
  if (s instanceof Array) return s.map(infixVeblen).join("+");
  if (inAP(s)) return "("+infixVeblen(s[0])+","+infixVeblen(s[1])+")";
  throw Error("Unexpected type "+s);
}
function equalStandard(x,y){
  if (x===0) return y===0;
  if (x instanceof Array){
    if (!(y instanceof Array)||x.length!=y.length) return false;
    var l=x.length;
    for (var i=0;i<l;i++){
      if (!equalStandard(x[i],y[i])) return false;
    }
    return true;
  }
  if (inAP(x)){
    return inAP(y)&&equalStandard(x[0],y[0])&&equalStandard(x[1],y[1]);
  }
  throw Error("Unexpected type "+x);
}
function lessThanStandard(x,y){
  if (typeof x=="string") x=buildVeblenObject(x);
  if (typeof y=="string") y=buildVeblenObject(y);
  if (x===0) return y!==0;
  if (y===0) return false;
  if (!(x instanceof Object)||!(y instanceof Object)) throw Error("Unexpected type "+[x,y]);
  var xt=x instanceof Array;
  var yt=y instanceof Array;
  if (!xt&&!yt) return equalStandard(x[0],y[0])?lessThanStandard(x[1],y[1]):lessThanStandard(x[0],y[0])?lessThanStandard(x[1],y):lessThanStandard(x,y[1]);
  if (xt&&!yt) return lessThanStandard(x[0],y);
  if (!xt&&yt) return equalStandard(x,y[0])||lessThanStandard(x,y[0]);
  if (xt&&yt){
    var l=Math.min(x.length,y.length);
    for (var i=0;i<l;i++){
      if (!equalStandard(x[i],y[i])) return lessThanStandard(x[i],y[i]);
    }
    return x.length<y.length;
  }
}
function standardizeVeblen(s,stringify){
  if (typeof stringify=="undefined") stringify=typeof s=="string";
  if (typeof s=="string") s=buildVeblenObject(s);
  var r;
  if (s===0) r=s;
  else if (s instanceof Array){
    var a=s.map(e=>standardizeVeblen(e,false));
    var r=[];
    for (var i=0;i<a.length;i++){
      if (a[i] instanceof Array) r=r.concat(a[i]);
      else r.push(a[i]);
    }
    for (var i=r.length;i>=0;i--){
      if (r[i]===0||r[i+1]&&lessThanStandard(r[i],r[i+1])){
        r.splice(i,1);
      }
    }
    if (r.length==1) r=r[0];
  }else if (inAP(s)){
    r={0:standardizeVeblen(s[0],false),1:standardizeVeblen(s[1],false)};
    if (inAP(r[1])&&lessThanStandard(r[0],r[1][0])) r=r[1];
  }
  return stringify?infixVeblen(r):r;
}
function flattenArraysVeblen(s){
  if (s===0) return s;
  if (s instanceof Array){
    var a=s.map(flattenArraysVeblen);
    var r=[];
    for (var i=0;i<a.length;i++){
      if (a[i] instanceof Array) r=r.concat(a[i]);
      else r.push(a[i]);
    }
    return r.length==1?r[0]:r;
  }
  if (inAP(s)) return {0:flattenArraysVeblen(s[0]),1:flattenArraysVeblen(s[1])};
  throw Error("no");
}
function normalizeVeblen(s){
  return s.replace(/\d+/g,n=>+n?+n>1?"(0,0)"+"+(0,0)".repeat(+n-1):"(0,0)":"0");
}
function abbreviateVeblen(s){
  return s.replace(/\(0,0\)(\+\(0,0\))*/g,e=>(e.length+1)/6);
}
function isNat(s){
  if (typeof s=="number") return isFinite(s)&&Number.isInteger(s)&&s>=0;
  if (typeof s=="string") s=buildVeblenObject(s);
  if (s instanceof Array){
    for (var i=0;i<s.length;i++){
      if (!equalStandard(s[i],{0:0,1:0})) return false;
    }
    return true;
  }
  if (inAP(s)) return equalStandard(s,{0:0,1:0});
  throw Error("Unexpected type "+s);
}
//Faster than normal build function
function buildVeblenNat(n){
  if (!isNat(n)) throw Error("Input must be a nonnegative integer.");
  if (n instanceof Object) return cloneVeblenObject(n);
  if (typeof n=="string") n=+n;
  if (n==0){
    return 0;
  }else if (n==1){
    return {0:0,1:0};
  }else{
    var r=[];
    for (var i=0;i<n;i++) r.push({0:0,1:0});
    return r;
  }
  throw Error("Unexpected type "+n);
}
function numerifyNatVeblen(n){
  if (!isNat(n)) throw Error("Input must be a nonnegative integer.");
  if (n===0) return n;
  if (typeof n=="string") n=buildVeblenObject(n);
  if (n instanceof Array) return n.length;
  if (inAP(n)) return 1;
  throw Error("Unexpected type "+n);
}
function cloneVeblenObject(s){
  if (s===0) return s;
  else if (s instanceof Array) return s.map(cloneVeblenObject);
  else if (inAP(s)){
    return {0:cloneVeblenObject(s[0]),1:cloneVeblenObject(s[1])};
  }else throw Error("Unexpected");
}
function buildVeblenObject(s){
  if (typeof s!="string") return cloneVeblenObject(s);
  if (s[0]=="p"||s[0]=="+"){
    var l=s.length;
    var p=0;
    var a=[NaN];
    for (var i=1;i<l;i++){
      if (s[i]=="p"||s[i]=="+") ++p;
      else --p;
      a.push(p);
      if (p<0) break;
    }
    if (i==l) throw Error("Unexpected end of input");
    var r;
    var left=s.slice(1,i+1);
    var right=s.slice(i+1);
    if (left[0]=="0"&&left.length>1||right[0]=="0"&&right.length>1) throw Error("Unexpected 0");
    if (s[0]=="p") r={0:buildVeblenObject(left),1:buildVeblenObject(right)};
    else r=flattenArraysVeblen([buildVeblenObject(left),buildVeblenObject(right)]);
    return r;
  }
  s=normalizeVeblen(s);
  var l=s.length;
  var p=0;
  if (!s||s=="0") return 0;
  var lastsep=-1;
  var plussep=[];
  for (var i=0;i<l;i++){
    if (s[i]=="(") ++p;
    if (s[i]==")") --p;
    if (p==0&&s[i+1]&&s[i+1]!="+") throw Error("Expected a plus sign"+s);
    if (p==0) plussep.push(s.slice(lastsep+1,lastsep=++i));
    if (p<0) throw Error("Unmatched parenthesis");
  }
  if (p>0) throw Error("Unmatched parenthesis");
  if (plussep.length==1){
    for (var i=1;i<l;i++){
      if (s[i]=="(") ++p;
      if (s[i]==")") --p;
      if (p<=0&&s[i]!="+"&&s[i+1]&&s[i+1]!="+") break;
    }
    if (p!=0||s[i+1]!=",") throw Error("Expected a comma "+s);
    return {0:buildVeblenObject(s.slice(1,i+1)),1:buildVeblenObject(s.slice(i+2,-1))};
  }else return plussep.map(buildVeblenObject);
}
function offsetArray(s,o){
  return s.map(e=>e+o);
}
var DIRECTION="V";
function S_to_V(s,stringify){
  if (typeof stringify=="undefined") stringify=true;
  if (typeof s=="string") s=s?s.split(itemSeparatorRegex).map(Number):[];
  var l=s.length;
  for (var i=0;i<l;i++){
    if (!isNat(s[i])) throw Error("Unexpected type "+s[i]);
  }
  var r;
  if (s.length==0){
    r=0;
  }else if (s.length==1){
    r={0:0,1:0};
  }else{
    var zerosplit=[];
    var i=0;
    while (i<l){
      var last=i;
      i=s.indexOf(0,i+1);
      if (i==-1) i=l;
      zerosplit.push(s.slice(last,i));
    }
    if (zerosplit.length==1){
      var phisplit=[];
      var last=1;
      var lastnum=s[1];
      for (var i=2;i<l;i++){
        if (s[i]<=lastnum){
          phisplit.push(s.slice(last,i));
          last=i;
          lastnum=s[i];
        }
      }
      phisplit.push(s.slice(last,l));  
      var r=0;
      var pl=phisplit.length;
      for (var i=0;i<pl;i++){
        var first=phisplit[i][0];
        var sub=buildVeblenNat(first-1);
        var innerseq=offsetArray(phisplit[i],-first);
        var inner=S_to_V(innerseq,false);
        if (i>0&&phisplit[i-1][0]==first){
          if (r[1] instanceof Array) r[1].push(inner);
          else r[1]=[r[1],inner];
        }else if (r===0){
          if (sub!==0){
            if (inner instanceof Array&&equalStandard(inner[0],{0:0,1:0})) inner.unshift();
            else if (inAP(inner)&&equalStandard(inner,{0:0,1:0})) inner=0;
          }
          r={0:sub,1:inner};
        }else{
          r={0:sub,1:[r,inner]};
        }
      }
    }else{
      r=zerosplit.map(e=>S_to_V(e,false));
    }
  }
  r=standardizeVeblen(r);
  return stringify?infixVeblen(r):r;
}
function V_to_S(s,stringify){
  if (typeof stringify=="undefined") stringify=true;
  if (typeof s=="string") s=standardizeVeblen(s,false);
  var r;
  if (s===0){
    r=[];
  }else if (s instanceof Array){
    var a=s.map(e=>V_to_S(e,false));
    var r=[];
    for (var i=0;i<a.length;i++) r=r.concat(a[i]);
  }else if (inAP(s)){
    var sub=s[0];
    if (!isNat(sub)) throw Error("Veblen expression out of range");
    var first=numerifyNatVeblen(sub)+1;
    var innerveblen,outerveblen;
    outerveblen=s[1];
    while (true){
      if (outerveblen===0||inAP(outerveblen)&&lessThanStandard(sub,outerveblen[0])) break;
      if (outerveblen instanceof Array) outerveblen=outerveblen[0];
      else if (inAP(outerveblen)) outerveblen=outerveblen[1];
    }
    innerveblen=s[1];
    if (innerveblen instanceof Array&&equalStandard(innerveblen[0],outerveblen)) innerveblen=innerveblen.slice(1);
    else if (inAP(innerveblen)&&equalStandard(innerveblen,outerveblen)) innerveblen=0;
    if (first>1&&isNat(s[1])){
      if (innerveblen===0) innerveblen={0:0,1:0};
      else if (innerveblen instanceof Array){
        innerveblen=innerveblen.slice(0);
        innerveblen.push({0:0,1:0});
      }else if (inAP(innerveblen)) innerveblen=[innerveblen,{0:0,1:0}];
    }
    var inner=offsetArray(V_to_S(innerveblen,false),first);
    var outer=V_to_S(outerveblen,false).slice(1);
    r=[0];
    r=r.concat(outer);
    r=r.concat(inner);
  }else throw Error("Unexpected type "+s);
  return stringify?r.join(","):r;
}
var input="";
function convertall(recalculate){
  if (!recalculate&&input==dg("input").value) return;
  input=dg("input").value;
  dg("output").value=input.split(lineBreakRegex).map(function(s){try{return DIRECTION=="V"?abbreviateVeblen(S_to_V(s)):V_to_S(s)}catch(e){return e.message+"\n"+e.stack}}).join("\r\n");
}
function toggledirection(){
  if (DIRECTION=="V"){
    DIRECTION="S";
    dg("toggledirectionbutton").value="Veblen->SPrSS";
    document.getElementById("inputlabel").innerHTML="Veblen:";
    document.getElementById("outputlabel").innerHTML="SPrSS:";
  }else{
    DIRECTION="V";
    dg("toggledirectionbutton").value="SPrSS->Veblen";
    document.getElementById("inputlabel").innerHTML="SPrSS:";
    document.getElementById("outputlabel").innerHTML="Veblen:";
  }
  convertall(true);
}
function swap(){
  dg("input").value=dg("output").value;
  toggledirection();
}
window.onpopstate=function (e){
  load();
  convertall(true);
}
function save(clipboard){
  var encodedInput;
  if (DIRECTION=="V"){
    var encodedInput=input.split(lineBreakRegex).join(";")+";"+DIRECTION;
  }else if (DIRECTION=="S"){
    var encodedInput=input.split(lineBreakRegex).map(function(s){try{return encodewithbase64asdigit(prefixVeblen(s),"p+0")}catch(e){return ""}}).join(";")+";"+DIRECTION;
  }
  history.pushState(encodedInput,"","?"+encodedInput);
  if (clipboard){
    var copyarea=dg("copyarea");
    copyarea.value=location.href;
    copyarea.style.display="";
    copyarea.select();
    copyarea.setSelectionRange(0,99999);
    document.execCommand("copy");
    copyarea.style.display="none";
  }
}
function load(){
  var state=location.search.substring(1);
  if (!state) return;
  var input=state.split(";");
  var direction="V";
  if (["V","S"].includes(input[input.length-1])) direction=input.pop();
  if (direction=="V"){
    input=input.join("\r\n");
  }else{
    input=input.map(function(s){try{return abbreviateVeblen(infixVeblen(decodewithbase64asdigit(s,"p+0")))}catch(e){return e+"\n"+e.stack}}).join("\r\n");
  }
  dg("input").value=input;
  if (direction!=DIRECTION) toggledirection();
}
var handlekey=function(e){
  setTimeout(convertall,0);
}
window.onerror=function (e,s,l,c,o){dg("output").value=JSON.stringify(e+"\n"+s+":"+l+":"+c+"\n"+o.stack);}