/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");

/* Track selected products */
let selectedProducts = [];
let allProducts = [];
const STORAGE_KEY_SELECTED = "loreal_selected_products_v1";
const STORAGE_KEY_CONVO = "loreal_conversation_v1";

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards with selection */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <div class="product-actions">
          <button class="add-product-btn" data-id="${product.id}" data-name="${product.name}" data-brand="${product.brand}">
            Add to Routine
          </button>
          <button class="details-btn" data-id="${product.id}" aria-expanded="false">Details</button>
        </div>
        <div class="product-desc" aria-hidden="true">${product.description}</div>
      </div>
    </div>
  `
    )
    .join("");

  /* Attach event listeners to add product buttons */
  document.querySelectorAll(".add-product-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const productId = parseInt(btn.getAttribute("data-id"));
      const productName = btn.getAttribute("data-name");
      const productBrand = btn.getAttribute("data-brand");
      toggleProductSelection(productId, productName, productBrand);
    });
  });

  /* Card click toggles selection */
  document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      // avoid toggling when clicking buttons inside the card
      if (e.target.closest("button")) return;
      const id = parseInt(card.getAttribute("data-id"));
      const prod = allProducts.find((p) => p.id === id);
      if (!prod) return;
      toggleProductSelection(prod.id, prod.name, prod.brand);
    });
  });

  /* Details toggle */
  document.querySelectorAll(".details-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const id = parseInt(btn.getAttribute("data-id"));
      const card = btn.closest(".product-card");
      const desc = card.querySelector(".product-desc");
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", expanded ? "false" : "true");
      desc.setAttribute("aria-hidden", expanded ? "true" : "false");
      desc.style.display = expanded ? "none" : "block";
    });
  });

  /* Reflect selected state visually */
  document.querySelectorAll(".product-card").forEach((card) => {
    const id = parseInt(card.getAttribute("data-id"));
    if (selectedProducts.find((p) => p.id === id)) {
      card.classList.add("selected");
      const btn = card.querySelector(".add-product-btn");
      if (btn) btn.textContent = "Selected";
    }
  });
}

/* Add product to selected products list */
function addProductToSelected(id, name, brand) {
  /* Check if product is already selected */
  if (selectedProducts.find((p) => p.id === id)) {
    return;
  }

  selectedProducts.push({ id, name, brand });
  updateSelectedProductsDisplay();
}

function toggleProductSelection(id, name, brand) {
  const exists = selectedProducts.find((p) => p.id === id);
  if (exists) {
    removeProductFromSelected(id);
  } else {
    selectedProducts.push({ id, name, brand });
    updateSelectedProductsDisplay();
  }
  saveSelectedToStorage();
  // update visual state on the card
  const card = document.querySelector(`.product-card[data-id='${id}']`);
  if (card) {
    if (selectedProducts.find((p) => p.id === id)) {
      card.classList.add("selected");
      const btn = card.querySelector(".add-product-btn");
      if (btn) btn.textContent = "Selected";
    } else {
      card.classList.remove("selected");
      const btn = card.querySelector(".add-product-btn");
      if (btn) btn.textContent = "Add to Routine";
    }
  }
}

/* Remove product from selected list */
function removeProductFromSelected(id) {
  selectedProducts = selectedProducts.filter((p) => p.id !== id);
  updateSelectedProductsDisplay();
  saveSelectedToStorage();
  const card = document.querySelector(`.product-card[data-id='${id}']`);
  if (card) {
    card.classList.remove("selected");
    const btn = card.querySelector(".add-product-btn");
    if (btn) btn.textContent = "Add to Routine";
  }
}

/* Update the display of selected products */
function updateSelectedProductsDisplay() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      '<p style="color: #999; font-size: 14px;">No products selected yet</p>';
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
    <div class="product-tag">
      <span>${product.name} (${product.brand})</span>
      <button class="remove-product-btn" data-id="${product.id}">×</button>
    </div>
  `
    )
    .join("");

  /* Attach event listeners to remove buttons */
  document.querySelectorAll(".remove-product-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const productId = parseInt(btn.getAttribute("data-id"));
      removeProductFromSelected(productId);
    });
  });
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  allProducts = products;
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

// Save / Load selected products to localStorage
function saveSelectedToStorage() {
  try {
    localStorage.setItem(
      STORAGE_KEY_SELECTED,
      JSON.stringify(selectedProducts)
    );
  } catch (e) {
    console.warn("Could not save selected products", e);
  }
}

function loadSelectedFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SELECTED);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      selectedProducts = parsed;
    }
  } catch (e) {
    console.warn("Could not load selected products", e);
    selectedProducts = [];
  }
}

// Conversation persistence
function saveConversationToStorage() {
  try {
    // omit the system message when saving
    const toSave = conversationHistory.filter((m) => m.role !== "system");
    localStorage.setItem(STORAGE_KEY_CONVO, JSON.stringify(toSave));
  } catch (e) {
    console.warn("Could not save conversation", e);
  }
}

function loadConversationFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONVO);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // restore with system message at front
      const system = conversationHistory[0];
      conversationHistory = [system, ...parsed];
      // render chat window
      parsed.forEach((m) => {
        displayMessage(m.content, m.role === "user");
      });
    }
  } catch (e) {
    console.warn("Could not load conversation", e);
  }
}

// Clear selected button creation
function ensureClearButton() {
  const container = document.querySelector(".selected-products");
  if (!container) return;
  if (document.getElementById("clearSelected")) return;
  const btn = document.createElement("button");
  btn.id = "clearSelected";
  btn.className = "generate-btn";
  btn.style.background = "transparent";
  btn.style.color = "#1a1a1a";
  btn.style.border = "1px dashed #d4af37";
  btn.style.marginTop = "10px";
  btn.textContent = "Clear Selected";
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    selectedProducts = [];
    updateSelectedProductsDisplay();
    saveSelectedToStorage();
    // update cards
    document.querySelectorAll(".product-card.selected").forEach((c) => {
      c.classList.remove("selected");
      const b = c.querySelector(".add-product-btn");
      if (b) b.textContent = "Add to Routine";
    });
  });
  container.appendChild(btn);
}

// Turn plain-text URLs into anchors
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function linkify(text) {
  const escaped = escapeHtml(text);
  const urlRegex = /https?:\/\/[^\s)]+/g;
  return escaped.replace(
    urlRegex,
    (url) => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`
  );
}

// override displayMessage to allow links and preserve previous behavior
function displayMessage(text, isUser) {
  const messageDiv = document.createElement("div");
  messageDiv.className = isUser ? "user-message" : "ai-message";
  messageDiv.innerHTML = `<p>${linkify(
    String(text).replace(/\n/g, "<br/>")
  )}</p>`;
  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Initialize: load stored selections and conversation, and create clear button
(async function init() {
  loadSelectedFromStorage();
  updateSelectedProductsDisplay();
  ensureClearButton();
  // preload product list so selected state can be shown when user opens a category
  allProducts = await loadProducts();
})();

/* API Configuration */
const WORKER_URL = "https://white-sound-1605.yledesm1.workers.dev/";
let conversationHistory = [
  {
    role: "system",
    content:
      "You are a L'Oréal AI beauty advisor that helps users build personalized skincare and beauty routines. You have access to the user's selected products and provide tailored recommendations. You refuse unrelated questions and only answer queries about L'Oréal products and beauty routines. You remember details from earlier messages and respond with context awareness. When providing recommendations, include application order and short rationale. If you reference outside facts (availability, studies, or claims), include a concise citation or link when possible. Be helpful, friendly, and professional.",
  },
];

// load persisted conversation (if any)
loadConversationFromStorage();

/* Call OpenAI API via Cloudflare Worker */
async function callOpenAIAPI(messages) {
  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messages,
        max_completion_tokens: 800,
        temperature: 0.5,
        frequency_penalty: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("API Error:", error);
    return "Sorry, I couldn't process that request. Please try again.";
  }
}
// (displayMessage is defined earlier and supports linkification)

/* Generate routine from selected products */
async function generateRoutine() {
  if (selectedProducts.length === 0) {
    displayMessage(
      "Please select at least one product before generating a routine.",
      false
    );
    return;
  }

  const productList = selectedProducts
    .map((p) => {
      const full = allProducts.find((a) => a.id === p.id) || {};
      return `${p.name} by ${p.brand} — ${
        full.description || "(no description available)"
      }`;
    })
    .join("\n\n");

  const prompt = `I have selected these L'Oréal products:\n\n${productList}\n\nPlease create a personalized skincare routine using these products, including morning and evening steps, application order, interactions to avoid, and tips for best results. If some products are redundant or conflict, suggest substitutions or explain why. Include concise citations or links when referencing external facts.`;

  displayMessage(prompt, true);

  const updatedMessages = [
    ...conversationHistory,
    { role: "user", content: prompt },
  ];

  const response = await callOpenAIAPI(updatedMessages);
  displayMessage(response, false);

  /* Update conversation history */
  conversationHistory.push({ role: "user", content: prompt });
  conversationHistory.push({ role: "assistant", content: response });
  saveConversationToStorage();
}

/* Chat form submission handler */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) return;

  /* Display user message */
  displayMessage(message, true);
  userInput.value = "";

  /* Prepare messages for API */
  const updatedMessages = [
    ...conversationHistory,
    { role: "user", content: message },
  ];

  /* Get response from API */
  const response = await callOpenAIAPI(updatedMessages);

  /* Display AI response */
  displayMessage(response, false);

  /* Update conversation history */
  conversationHistory.push({ role: "user", content: message });
  conversationHistory.push({ role: "assistant", content: response });
  saveConversationToStorage();
});

/* Generate routine button event listener */
generateRoutineBtn.addEventListener("click", generateRoutine);
