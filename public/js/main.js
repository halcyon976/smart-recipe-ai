// Add the per-session anti-forgery token to every browser form and confirm deletes.
const csrfToken=document.querySelector('meta[name="csrf-token"]')?.content||'';
document.querySelectorAll('form[method="post" i]').forEach(form=>{if(!form.querySelector('input[name="_csrf"]')){const input=document.createElement('input');input.type='hidden';input.name='_csrf';input.value=csrfToken;form.append(input);}});
document.querySelectorAll('form[data-confirm]').forEach(form=>form.addEventListener('submit',event=>{if(!window.confirm(form.dataset.confirm))event.preventDefault();}));

const shareButton=document.querySelector('#share-recipe');if(shareButton)shareButton.addEventListener('click',async()=>{const url=window.location.href,title=shareButton.dataset.title||'Recipe',status=document.querySelector('#share-status');try{if(navigator.share){await navigator.share({title,text:'Try this recipe: '+title,url});status.textContent='';}else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);status.textContent='Recipe link copied!';}else{window.prompt('Copy this recipe link:',url);}}catch(error){if(error.name!=='AbortError'){window.prompt('Copy this recipe link:',url);}}});
