document.addEventListener('DOMContentLoaded', function() {
  const taskInput = document.getElementById('taskInput');
  const addTaskButton = document.getElementById('addTask');
  const taskList = document.getElementById('taskList');

  // Load tasks from storage
  chrome.storage.sync.get(['tasks'], function(result) {
    const tasks = result.tasks || [];
    tasks.forEach(task => addTaskToList(task));
  });

  addTaskButton.addEventListener('click', function() {
    const taskText = taskInput.value.trim();
    if (taskText) {
      addTask(taskText);
      taskInput.value = '';
    }
  });

  function addTask(taskText) {
    chrome.storage.sync.get(['tasks'], function(result) {
      const tasks = result.tasks || [];
      tasks.push(taskText);
      chrome.storage.sync.set({tasks: tasks}, function() {
        addTaskToList(taskText);
      });
    });
  }

  function addTaskToList(taskText) {
    const li = document.createElement('li');
    li.textContent = taskText;
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.classList.add('delete');
    deleteButton.addEventListener('click', function() {
      li.remove();
      removeTask(taskText);
    });

    li.appendChild(deleteButton);
    taskList.appendChild(li);
  }

  function removeTask(taskText) {
    chrome.storage.sync.get(['tasks'], function(result) {
      const tasks = result.tasks || [];
      const updatedTasks = tasks.filter(task => task !== taskText);
      chrome.storage.sync.set({tasks: updatedTasks});
    });
  }

  const chatInput = document.getElementById('chatInput');
  const sendMessageButton = document.getElementById('sendMessage');
  const chatHistory = document.getElementById('chatHistory');

  const OPENAI_API_KEY = '//OpenAPIKey';

  let conversationHistory = [
    {"role": "system", "content": "You are an AI assistant for a space-themed to-do list Chrome extension. Provide helpful, concise responses about task management and space-related topics. Keep responses under 50 words."}
  ];

  sendMessageButton.addEventListener('click', async function() {
    const message = chatInput.value.trim();
    if (message) {
      addMessageToChat('user', message);
      chatInput.value = '';
      chatInput.disabled = true;
      sendMessageButton.disabled = true;

      try {
        const response = await getAIResponse(message);
        addMessageToChat('ai', response);
      } catch (error) {
        console.error('Error:', error);
        addMessageToChat('ai', "I'm sorry, I encountered an error. Please try again later.");
      }

      chatInput.disabled = false;
      sendMessageButton.disabled = false;
      chatInput.focus();
    }
  });

  function addMessageToChat(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    messageElement.textContent = `${sender === 'user' ? 'You' : 'AI'}: ${message}`;
    chatHistory.appendChild(messageElement);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  async function getAIResponse(message) {
    conversationHistory.push({"role": "user", "content": message});

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        console.log('Sending request to OpenAI API...');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: conversationHistory,
            max_tokens: 150,
            n: 1,
            temperature: 0.7,
          })
        });

        console.log('Response status:', response.status);
        
        if (response.status === 429) {
          console.log(`Rate limited. Retrying in ${(retries + 1) * 2} seconds...`);
          await delay((retries + 1) * 2000);
          retries++;
          continue;
        }

        if (!response.ok) {
          const errorBody = await response.text();
          console.error('Error response body:', errorBody);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API response:', data);

        const aiMessage = data.choices[0].message.content.trim();
        conversationHistory.push({"role": "assistant", "content": aiMessage});

        if (conversationHistory.length > 10) {
          conversationHistory = conversationHistory.slice(conversationHistory.length - 10);
        }

        return aiMessage;
      } catch (error) {
        console.error('Detailed error:', error);
        if (retries === maxRetries - 1) {
          return `I'm sorry, I encountered an error: ${error.message}`;
        }
      }
    }
  }

  // ... rest of existing task-related code ...
});
