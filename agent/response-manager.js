function clean(response){let text=String(response||'').trim(); text=text.replace(/^```(?:text|markdown)?\s*([\s\S]*?)```$/i,'$1').trim(); return text;}
function conversationalFallback(message){return `Mình hiểu ý bạn: ${String(message||'').trim()}`;}
module.exports={clean,conversationalFallback};
