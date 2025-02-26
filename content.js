console.log('Helper script running');

(function () {
  "use strict";

  function clearContent(mainElement) {
    const styles = document.createElement("style");
    styles.innerText = `
        .sidebar-container {
            position: fixed;
            top: 0;
            right: 0;
            height: 100vh;
            width: 300px;
            background: rgb(237 237 237);
            padding: 15px;
            z-index: 9999;
            overflow-y: auto;
            box-shadow: -2px 0 10px rgba(0,0,0,0.5);
            transition: transform 0.3s ease;
        }
        .sidebar-toggle {
            position: fixed;
    top: 20px;
    right: 300px;
    background: rgb(241 241 241);
    color: #06806b;
    padding: 8px;
    cursor: pointer;
    border-radius: 5px 0 0 5px;
    z-index: 9999;
    border-style: none;
        }
        .sidebar-container.collapsed {
            transform: translateX(300px);
        }
        .sidebar-toggle.collapsed {
            right: 0;
        }
        .questions, .answer {
            color: #3f3f3f;
    background: #e5e5e5;
    margin: 5px 0;
    padding: 10px;
    border-radius: 3px;
        }
    .answer {
    background: #ffffff;
    }
        hr {
            border-color: #333;
                background-color: #06806b;
        }
    `;
    document.head.appendChild(styles);
  }

  function getUrlParams(url) {
    // Extract lesson ID from hash part of URL
    const lessonMatch = url.match(/lesson\/([^?&]+)/);
    // Extract student ID from query parameters
    const studentMatch = url.match(/[?&]student=([^&]+)/);

    return {
      id: lessonMatch ? lessonMatch[1] : null,
      studentId: studentMatch ? studentMatch[1] : null
    };
  }

  function displayQuestionsAndAnswers(mainElement, questions, responses) {
    // Create sidebar container
    const sidebarDiv = document.createElement("div");
    sidebarDiv.className = "sidebar-container";

    // Create toggle button
    const toggleButton = document.createElement("button");
    toggleButton.className = "sidebar-toggle";
    toggleButton.innerHTML = "◀";
    toggleButton.addEventListener('click', () => {
      sidebarDiv.classList.toggle('collapsed');
      toggleButton.classList.toggle('collapsed');
      toggleButton.innerHTML = sidebarDiv.classList.contains('collapsed') ? '▶' : '◀';
    });

    // Start it hidden
    sidebarDiv.classList.toggle('collapsed');
    toggleButton.classList.toggle('collapsed');

    document.body.appendChild(sidebarDiv);
    document.body.appendChild(toggleButton);

    //Add title to sidebar
    const titleh2 = document.createElement("h2");
    titleh2.className = "helpertitle";
    titleh2.textContent = `Quill Helper by Iren`;
    titleh2.style.fontSize = '28px';
    sidebarDiv.appendChild(titleh2);

    // Add Description to sidebar
    const description = document.createElement("p");
    description.className = "helperdescription";
    description.textContent = `Click the response to input it into the text area.`;
    description.style.fontSize = '22px';
    sidebarDiv.appendChild(description);

    // Add content to sidebar
    questions.forEach((question, index) => {

      const questionDiv = document.createElement("div");
      questionDiv.className = "questions";
      questionDiv.textContent = `Question: ${index + 1} (${question.key}) `;
      sidebarDiv.appendChild(questionDiv);

      const responseDiv = document.createElement("div");
      responseDiv.className = "answer";
      responseDiv.textContent = `Answer: ${responses[index]}`;
      responseDiv.style.cursor = 'pointer';
      responseDiv.addEventListener('click', () => {
        const textArea = document.querySelector('.connect-text-area, .input-field');
        if (textArea) {
          textArea.innerText = responses[index];
          textArea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      sidebarDiv.appendChild(responseDiv);

      const separator = document.createElement("hr");
      sidebarDiv.appendChild(separator);


    });
  }

  async function fetchResponses(questions) {
    const responses = [];
    for (const question of questions) {
      try {
        const responseUrl = `https://cms.quill.org/questions/${question.key}/responses`;
        const response = await fetch(responseUrl);
        const responseData = await response.json();

        if (Array.isArray(responseData) && responseData.length > 0) {
          // Find the first response with spelling_error: false
          const validResponse = responseData.find(r => r.optimal === true && r.spelling_error === false);
          // If found, use it; otherwise use the first response
          responses.push(validResponse ? validResponse.text : responseData[0].text);
        }
      } catch (error) {
        console.error(`Error fetching response:`, error);
        responses.push("Error fetching response");
      }
    }
    return responses;
  }

  async function processQuestions(mainElement) {

    const currentUrl = window.location.href;
    const { id, studentId } = getUrlParams(currentUrl);

    let lessonId = id;
    if (!lessonId) {
      const hashPart = currentUrl.split('#')[1] || '';

      const urlParams = new URLSearchParams(hashPart.split('?')[1] || '');
      lessonId = urlParams.get('uid');

    }

    try {
      // Using the correct endpoint format for the lesson
      const jsonUrl = `https://www.quill.org/api/v1/lessons/${lessonId}.json`;
      const response = await fetch(jsonUrl);
      const jsonData = await response.json();
      const questions = jsonData.questions || [];

      const responses = await fetchResponses(questions);
      displayQuestionsAndAnswers(mainElement, questions, responses);
    } catch (error) {
      console.error("Error processing questions:", error);
    }
  }

  function waitForMain(callback) {

    const observer = new MutationObserver((mutations) => {
      const mainElement = document.querySelector("main, .main, #main, [role='main']");
      if (mainElement) {

        observer.disconnect();
        callback(mainElement);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true
    });
  }

  async function start() {

    const mainElement = document.querySelector("main, .main, #main, [role='main']");
    if (mainElement) {
      clearContent(mainElement);
      await processQuestions(mainElement);
    } else {
      waitForMain(async (element) => {
        clearContent(element);
        await processQuestions(element);
      });
    }
  }

  // Initialize when document is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();