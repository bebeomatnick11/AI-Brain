function plan({route,message,skills=[]}){
  const text=String(message||''); const selected=skills.filter(s=>s.enabled!==false).filter(s=>{
    const hay=[s.name,s.description,...(s.triggers||[])].join(' ').toLowerCase(); return (s.triggers||[]).some(t=>text.toLowerCase().includes(String(t).toLowerCase())) || hay.includes(route.type);
  }).sort((a,b)=>(b.priority||50)-(a.priority||50)).slice(0,3);
  const complex=text.length>500 || /\b(and|then|sau đó|tiếp theo|đồng thời|multiple|nhiều)\b/i.test(text);
  return {type:route.type,complex,steps:complex?['understand','execute','verify']:['answer'],selectedSkills:selected};
}
module.exports={plan};
