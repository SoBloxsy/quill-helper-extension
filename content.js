console.log('Helper script running');

(function () {
  "use strict";

  function clearContent(mainElement) {
    
    const styles = document.createElement("style");
    styles.innerText = `
        .floating-container {
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.9);
            padding: 15px;
            border-radius: 5px;
            z-index: 9999;
            cursor: move;
            max-height: 80vh;
            overflow-y: auto;
            max-width: 400px;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
        .questions, .answer {
            color: red;
            background: black;
            margin: 5px 0;
            padding: 10px;
            border-radius: 3px;
        }
        hr {
            border-color: #333;
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
 

    // Create floating container
    const floatingDiv = document.createElement("div");
    floatingDiv.className = "floating-container";
    document.body.appendChild(floatingDiv);

    // Make it draggable
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    floatingDiv.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
      initialX = e.clientX - floatingDiv.offsetLeft;
      initialY = e.clientY - floatingDiv.offsetTop;
      if (e.target === floatingDiv) {
        isDragging = true;
      }
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        floatingDiv.style.left = `${currentX}px`;
        floatingDiv.style.top = `${currentY}px`;
      }
    }

    function dragEnd(e) {
      isDragging = false;
    }

    // Add content to floating div
    questions.forEach((question, index) => {
      const questionDiv = document.createElement("div");
      questionDiv.className = "questions";
      questionDiv.textContent = `Question: ${question.key}`;
      floatingDiv.appendChild(questionDiv);

      const responseDiv = document.createElement("div");
      responseDiv.className = "answer";
      responseDiv.textContent = `Response: ${responses[index]}`;
      // Add click event listener to response div
      responseDiv.addEventListener('click', () => {
        const textArea = document.querySelector('.connect-text-area, .input-field ');
        if (textArea) {
          textArea.innerText = responses[index];
          // Trigger input event to ensure any listeners on the textarea are notified
          textArea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      // Add cursor pointer style to indicate clickable
      responseDiv.style.cursor = 'pointer';
      floatingDiv.appendChild(responseDiv);

      const separator = document.createElement("hr");
      floatingDiv.appendChild(separator);
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
            const validResponse = responseData.find(r => r.optimal === true);
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