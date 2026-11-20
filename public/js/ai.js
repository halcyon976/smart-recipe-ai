// Send AI requests to the private server routes and safely display their replies.
const csrfHeader = document.querySelector('meta[name="csrf-token"]')?.content || '';

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    throw new Error('The server returned an unexpected response. Please wait a moment and try again.');
  }
}

const generator = document.querySelector('#generate');
if (generator) {
  generator.addEventListener('click', async () => {
    const input = document.querySelector('#ingredients');
    const output = document.querySelector('#recipe-result');
    if (!input.value.trim()) {
      input.focus();
      return;
    }

    generator.disabled = true;
    generator.textContent = 'Thinking…';
    output.textContent = '';

    try {
      const response = await fetch('/api/ai/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfHeader },
        body: JSON.stringify({ ingredients: input.value })
      });
      const recipe = await readJsonResponse(response);
      if (!response.ok) throw new Error(recipe.error || 'Recipe generation is unavailable right now.');
      if (recipe.error) {
        output.textContent = recipe.error;
        return;
      }

      showRecipe(recipe, output);
    } catch (error) {
      output.textContent = error.message;
    } finally {
      generator.disabled = false;
      generator.textContent = '✨ Make me a recipe';
    }
  });
}

function showRecipe(recipe, output) {
  const title = document.createElement('h2');
  title.className = 'h4';
  title.textContent = recipe.title;
  output.append(title);

  const explanation = document.createElement('p');
  explanation.textContent = recipe.explanation || '';
  output.append(explanation);

  if (Array.isArray(recipe.unused_ingredients) && recipe.unused_ingredients.length) {
    const unusedHeading = document.createElement('h3');
    unusedHeading.className = 'h6';
    unusedHeading.textContent = 'Left out this time';
    output.append(unusedHeading);

    const unusedList = document.createElement('ul');
    recipe.unused_ingredients.forEach(item => {
      const row = document.createElement('li');
      row.textContent = item;
      unusedList.append(row);
    });
    output.append(unusedList);
  }

  const ingredientsHeading = document.createElement('h3');
  ingredientsHeading.className = 'h6';
  ingredientsHeading.textContent = `Ingredients · ${recipe.cooking_time} minutes`;
  output.append(ingredientsHeading);

  const ingredientsList = document.createElement('ul');
  (recipe.ingredients || []).forEach(item => {
    const row = document.createElement('li');
    row.textContent = item;
    ingredientsList.append(row);
  });
  output.append(ingredientsList);

  const stepsList = document.createElement('ol');
  (recipe.steps || []).forEach(step => {
    const row = document.createElement('li');
    row.textContent = step;
    stepsList.append(row);
  });
  output.append(stepsList);

  const saveButton = document.createElement('button');
  saveButton.className = 'btn btn-outline-primary mt-2';
  saveButton.textContent = 'Save to My recipes';
  saveButton.addEventListener('click', () => saveRecipe(recipe));
  output.append(saveButton);
}

function saveRecipe(recipe) {
  const form = document.createElement('form');
  form.method = 'post';
  form.action = '/ai/save-recipe';
  const fields = {
    _csrf: csrfHeader,
    title: recipe.title,
    cooking_time: recipe.cooking_time,
    difficulty: 'Easy',
    cuisine: 'AI generated',
    ingredients: recipe.ingredients.join('\n'),
    steps: recipe.steps.join('\n'),
    tags: 'AI generated'
  };

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.append(input);
  });
  document.body.append(form);
  form.submit();
}

const chatForm = document.querySelector('#chat-form');
if (chatForm) {
  chatForm.addEventListener('submit', async event => {
    event.preventDefault();
    const input = document.querySelector('#chat-message');
    const log = document.querySelector('#chat-log');
    const button = chatForm.querySelector('button');
    const message = input.value.trim();
    if (!message) return;

    addBubble(log, message, 'user');
    input.value = '';
    button.disabled = true;
    button.textContent = 'Thinking…';
    const reply = addBubble(log, 'Cooking up an answer…', 'assistant');
    reply.classList.add('thinking');

    try {
      const response = await fetch('/api/ai/cooking-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfHeader },
        body: JSON.stringify({ message })
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'The assistant could not reply. Please try again.');
      reply.textContent = data.answer;
    } catch (error) {
      reply.textContent = error.message;
    } finally {
      reply.classList.remove('thinking');
      button.disabled = false;
      button.textContent = 'Send';
    }
  });
}

function addBubble(log, text, role) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  log.append(bubble);
  log.scrollTop = log.scrollHeight;
  return bubble;
}
