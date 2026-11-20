// Gemini calls stay on the server; without a key, useful mock responses are returned.
async function askGemini(prompt) {
  // Real Gemini API call belongs here. Keep GEMINI_API_KEY on the server only.
  let response;
  for(let attempt=0;attempt<3;attempt++){
    try {
      response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent', { method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY}, body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:1200}}), signal:AbortSignal.timeout(25000) });
    } catch(error) {
      if(error.name==='TimeoutError'||error.name==='AbortError') {
        const timeoutError=new Error('Gemini request timed out.');
        timeoutError.code='GEMINI_TIMEOUT';
        throw timeoutError;
      }
      throw error;
    }
    if(response.ok)break;
    if(![429,500,503].includes(response.status)||attempt===2){let detail='';try{const payload=await response.json();detail=payload.error?.message||'';}catch{}const error=new Error(`Gemini request failed (${response.status})${detail?`: ${detail}`:''}`);error.status=response.status;throw error;}
    const retryAfter=Number(response.headers.get('retry-after'));
    const waitMs=Number.isFinite(retryAfter)&&retryAfter>0?Math.min(retryAfter*1000,5000):(1000*(2**attempt)+Math.floor(Math.random()*300));
    await new Promise(resolve=>setTimeout(resolve,waitMs));
  }
  const data = await response.json(); return data.candidates?.[0]?.content?.parts?.map(p=>p.text).join('\n') || '';
}
exports.generateRecipe = async (ingredients) => {
  if (!process.env.GEMINI_API_KEY) return { title:'Sunny Pantry Skillet', ingredients:ingredients.split(',').map(x=>x.trim()).filter(Boolean).concat(['olive oil','salt and pepper']), steps:['Warm a little oil in a pan.','Add your ingredients in order of cooking time and season to taste.','Cook until tender and serve warm.'], cooking_time:25, explanation:'A flexible mock recipe built from your ingredients. Add a Gemini key for generated recipes.' };
  const text = await askGemini(`Act as a careful home-cooking recipe writer. The user has these ingredients: ${ingredients}. First decide whether they form a plausible edible dish. Treat each item as a separate ingredient, and do not force every item into one dish. If the combination is unsafe, nonsensical, or missing a usable main ingredient, return JSON with {"error":"..."} explaining what to clarify or remove. Otherwise create one coherent recipe using the most compatible ingredients, state any unused ingredients, and only add common pantry staples. Include realistic quantities, clear steps, safe cooking guidance for meat/eggs, and honest minutes. Return only valid JSON, no markdown: {"title":"string","ingredients":["string"],"steps":["string"],"cooking_time":25,"explanation":"string"}.`);
  try { const parsed=JSON.parse(text.replace(/^```json\s*|```$/g,'')); if(parsed.error)return {error:String(parsed.error)}; if(!parsed.title||!Array.isArray(parsed.ingredients)||!parsed.ingredients.length||!Array.isArray(parsed.steps)||!parsed.steps.length)throw Error('Invalid recipe response'); return parsed; } catch { throw new Error('The AI returned an incomplete recipe. Please try again with fewer, clearer ingredients.'); }
};
exports.cookingAdvice = async (question) => {
  if (!process.env.GEMINI_API_KEY) return `Here is a practical starting point: ${question.toLowerCase().includes('salty') ? 'stir in a little unsalted liquid or add more vegetables, then taste again.' : question.toLowerCase().includes('thicken') ? 'simmer uncovered, or whisk in a small cornstarch slurry a little at a time.' : question.toLowerCase().includes('butter') ? 'you can usually replace butter with about three quarters as much oil in sautéing and many bakes.' : 'make a small adjustment, taste, and add more gradually. Keep heat and food safety in mind.'} This is a sample answer; add a Gemini key for personalized AI advice.`;
  return askGemini(`You are a knowledgeable, friendly cooking assistant. The user may ask follow-up questions. Use the conversation so far to resolve references. Answer the actual question with practical detail; if it is unrelated to cooking, say you specialize in cooking and offer a relevant alternative. For safety-critical food questions, be cautious and give concrete safe handling advice. Conversation: ${question}`);
};
exports.chatWithHistory = async (messages) => askGemini(`You are a knowledgeable, friendly cooking assistant. Answer the latest user message using the previous conversation for context. Give useful, practical detail; if unrelated to cooking, politely redirect. Be cautious with food safety.\n\nConversation:\n${messages.map(m=>`${m.role==='user'?'User':'Assistant'}: ${m.message}`).join('\n')}`);
