// Static consistency only. This is NOT an Oracle parser, compiler or DB test.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../sql');
const files=fs.readdirSync(root).filter(p=>/^0\d_.*\.sql$/.test(p));
function tokenize(source){
  const out=[];let i=0;
  while(i<source.length){
    if(/\s/.test(source[i])){i++;continue;}
    if(source.slice(i,i+2)==='--'){const n=source.indexOf('\n',i);i=n<0?source.length:n+1;continue;}
    if(source.slice(i,i+2)==='/*'){const n=source.indexOf('*/',i+2);assert(n>=0,'unclosed SQL comment');i=n+2;continue;}
    if(source[i]==="'") {let closed=false;i++;while(i<source.length){if(source[i]==="'"){if(source[i+1]==="'"){i+=2;continue;}i++;closed=true;break;}i++;}assert(closed,'unclosed SQL literal');out.push('<literal>');continue;}
    const word=source.slice(i).match(/^[A-Za-z_][A-Za-z_0-9$#]*/);if(word){out.push(word[0].toUpperCase());i+=word[0].length;}else out.push(source[i++]);
  }return out;
}
const tokens=Object.fromEntries(files.map(f=>[f,tokenize(fs.readFileSync(path.join(root,f),'utf8'))]));
function group(t,start){assert.equal(t[start],'(');let depth=1,j=start+1;for(;j<t.length&&depth;j++){if(t[j]==='(')depth++;if(t[j]===')')depth--;}assert.equal(depth,0,'unclosed parentheses');return {body:t.slice(start+1,j-1),end:j};}
function split(t){const parts=[[]];let depth=0;for(const x of t){if(x==='(')depth++;if(x===')')depth--;if(x===','&&!depth)parts.push([]);else parts.at(-1).push(x);}return parts;}
const schema=new Map();
for(const name of ['00_original_schema.sql','02_proposed_migration.sql']){
  const t=tokens[name];for(let i=0;i<t.length;i++){
    if(t[i]==='CREATE'&&t[i+1]==='TABLE'&&t[i+3]==='('){const cols=new Set();for(const p of split(group(t,i+3).body))if(!['CONSTRAINT','CHECK','PRIMARY','UNIQUE','FOREIGN'].includes(p[0]))cols.add(p[0]);schema.set(t[i+2],cols);}
    if(t[i]==='ALTER'&&t[i+1]==='TABLE'&&t[i+3]==='ADD'&&t[i+4]==='('){for(const p of split(group(t,i+4).body))if(!['CONSTRAINT','CHECK','PRIMARY','UNIQUE','FOREIGN'].includes(p[0]))schema.get(t[i+2]).add(p[0]);}
  }
}
test('SQL static: parentheses balance across installation and transaction scripts',()=>{
  for(const [name,t] of Object.entries(tokens)){let depth=0;for(const x of t){if(x==='(')depth++;if(x===')')depth--;assert(depth>=0,name+' has extra closing parenthesis');}assert.equal(depth,0,name);}
});
test('SQL static: scalar SELECT INTO list counts agree (record SELECT * excluded)',()=>{
  for(const [name,t] of Object.entries(tokens))for(let i=0;i<t.length;i++)if(t[i]==='SELECT'){
    let depth=0,into=-1,end=-1;for(let j=i+1;j<t.length;j++){const x=t[j];if(!depth&&['FROM',';'].includes(x)){end=j;break;}if(!depth&&x==='INTO')into=j;if(x==='(')depth++;if(x===')'){if(!depth)break;depth--;}}
    if(into>0&&end>into&&!t.slice(i+1,into).includes('*'))assert.equal(split(t.slice(i+1,into)).length,split(t.slice(into+1,end)).length,name+': '+t.slice(i,end).join(' '));
  }
});
test('SQL static: INSERT and FOREIGN KEY columns exist in original schema plus migration',()=>{
  let count=0;
  for(const [name,t] of Object.entries(tokens))for(let i=0;i<t.length;i++){
    let table,pos;if(t[i]==='INSERT'&&t[i+1]==='INTO'){table=t[i+2];pos=i+3;}else if(t[i]==='REFERENCES'){table=t[i+1];pos=i+2;}else continue;
    if(t[pos]!=='(')continue;assert(schema.has(table),name+': unknown table '+table);
    for(const col of split(group(t,pos).body)){assert(schema.get(table).has(col[0]),name+': unknown column '+table+'.'+col[0]);count++;}
  }assert(count>150);
});
test('SQL static: UPDATE assignments target defined columns',()=>{
  for(const [name,t] of Object.entries(tokens))for(let i=0;i<t.length;i++)if(t[i]==='UPDATE'&&schema.has(t[i+1])&&t[i+2]==='SET'){
    let depth=0,end=i+3;for(;end<t.length;end++){if(!depth&&['WHERE',';'].includes(t[end]))break;if(t[end]==='(')depth++;if(t[end]===')')depth--;}
    for(const expr of split(t.slice(i+3,end)))assert(schema.get(t[i+1]).has(expr[0]),name+': unknown UPDATE column '+t[i+1]+'.'+expr[0]);
  }
});
