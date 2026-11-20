// Security helpers for browser forms, API requests, and request throttling.
const crypto=require('crypto');
const {rateLimit}=require('express-rate-limit');

exports.addCsrfToken=(req,res,next)=>{
  if(!req.session.csrfToken)req.session.csrfToken=crypto.randomBytes(32).toString('hex');
  res.locals.csrfToken=req.session.csrfToken;
  next();
};

exports.csrfProtection=(req,res,next)=>{
  const submitted=Buffer.from(req.body?._csrf||req.get('x-csrf-token')||'');
  const expected=Buffer.from(req.session?.csrfToken||'');
  const matches=submitted.length===expected.length&&expected.length>0&&crypto.timingSafeEqual(submitted,expected);
  if(matches)return next();
  return res.status(403).render('errors/error',{title:'Please refresh the page',message:'This form expired or could not be verified. Go back, refresh, and try again.'});
};

exports.loginLimiter=rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:true,legacyHeaders:false,message:'Too many login attempts. Wait 15 minutes and try again.'});
exports.signupLimiter=rateLimit({windowMs:60*60*1000,limit:10,standardHeaders:true,legacyHeaders:false,message:'Too many signup attempts. Try again later.'});
exports.passwordResetLimiter=rateLimit({windowMs:60*60*1000,limit:5,standardHeaders:true,legacyHeaders:false,message:'Too many reset requests. Try again later.'});
exports.aiLimiter=rateLimit({windowMs:60*60*1000,limit:30,standardHeaders:true,legacyHeaders:false,message:'You have reached the hourly AI limit. Try again later.'});
exports.uploadLimiter=rateLimit({windowMs:60*60*1000,limit:20,standardHeaders:true,legacyHeaders:false,message:'You have reached the hourly photo upload limit. Try again later.'});
exports.validateRecipe=(req,res,next)=>{
  const title=String(req.body.title||'').trim();const ingredients=String(req.body.ingredients||'').trim();const steps=String(req.body.steps||'').trim();const cookingTime=Number(req.body.cooking_time);const difficulty=String(req.body.difficulty||'Easy');const cuisine=String(req.body.cuisine||'Other').trim();
  if(!title||title.length>180||!ingredients||ingredients.length>8000||!steps||steps.length>12000||!Number.isInteger(cookingTime)||cookingTime<1||cookingTime>1440||!['Easy','Medium','Hard'].includes(difficulty)||!cuisine||cuisine.length>80)return res.status(400).render('errors/error',{title:'Check the recipe details',message:'Add a title, ingredients, and steps; use a cooking time from 1 to 1440 minutes, and keep each field within its limit.'});
  const ingredientLines=ingredients.split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean);
  if(!looksLikeText(title,1,1,3)||ingredientLines.length<2||!looksLikeText(ingredients,3,2,8)||!looksLikeText(steps,6,4,18))return res.status(400).render('errors/error',{title:'Please add a real recipe',message:'Use a readable recipe title, at least two ingredient entries, and clear cooking instructions. Repeated or random text cannot be shared.'});
  req.body={...req.body,title,ingredients,steps,cooking_time:cookingTime,difficulty,cuisine,tags:String(req.body.tags||'').split(',').map(tag=>tag.trim().slice(0,30)).filter(Boolean).slice(0,12)};next();
};
function looksLikeText(value,minWords,minUnique,minLetters){const words=(String(value).toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]);const letters=(String(value).match(/\p{L}/gu)||[]);if(words.length<minWords||new Set(words).size<minUnique||letters.length<minLetters||/(.)\1{4,}/iu.test(value))return false;const latin=String(value).match(/[a-z]/gi)||[];if(latin.length>=8){const vowels=String(value).match(/[aeiou]/gi)||[];if(vowels.length/latin.length<.18)return false;}return true;}
