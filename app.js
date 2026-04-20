const initialCards = [
  {
    front: "Croissant",
    back: "A buttery, flaky, crescent-shaped pastry of Austrian origin, popularised in France.",
  },
  {
    front: "Éclair",
    back: "A long pastry filled with cream and topped with chocolate icing.",
  },
  {
    front: "Mille-feuille",
    back: "Layers of puff pastry alternating with pastry cream. Also called a Napoleon.",
  },
];

const STORAGE_KEY = "flashcards-state-v1";

let current = 0;

const flashcard = document.getElementById("flashcard");
const btnFlip = document.getElementById("btn-flip");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnShuffle = document.getElementById("btn-shuffle");
const btnNewCard = document.getElementById("btn-new-card");
const searchInput = document.querySelector(".search-input");
const counter = document.querySelector(".card-counter");
const frontFace = document.querySelector(".card-front span");
const backFace = document.querySelector(".card-back span");
const deckTitle = document.querySelector(".deck-title");
const deckList = document.getElementById("deck-list");

const btnNewDeck = document.getElementById("btn-new-deck");
const newDeckModal = document.getElementById("new-deck-modal");
const newDeckForm = document.getElementById("new-deck-form");
const deckNameInput = document.getElementById("deck-name");
const deckNameError = document.getElementById("deck-name-error");
const btnCancelNewDeck = document.getElementById("btn-cancel-new-deck");
const btnEditDeck = document.getElementById("btn-edit-deck");
const btnDeleteDeck = document.getElementById("btn-delete-deck");
const newCardModal = document.getElementById("new-card-modal");
const newCardForm = document.getElementById("new-card-form");
const cardFrontInput = document.getElementById("card-front-input");
const cardBackInput = document.getElementById("card-back-input");
const newCardError = document.getElementById("new-card-error");
const btnCancelNewCard = document.getElementById("btn-cancel-new-card");
const btnEditCard = document.getElementById("btn-edit-card");
const btnDeleteCard = document.getElementById("btn-delete-card");
const editCardModal = document.getElementById("edit-card-modal");
const editCardForm = document.getElementById("edit-card-form");
const editCardFrontInput = document.getElementById("edit-card-front-input");
const editCardBackInput = document.getElementById("edit-card-back-input");
const editCardError = document.getElementById("edit-card-error");
const btnCancelEditCard = document.getElementById("btn-cancel-edit-card");

flashcard.setAttribute("tabindex", "0");

function createDefaultDecksFromSidebar() {
  let nextId = 1;
  const defaultDecks = Array.from(
    deckList.querySelectorAll(".deck-item"),
    (item, index) => {
      const deck = {
        id: `deck-${nextId}`,
        name: item.textContent.trim(),
        cards: index === 0 ? [...initialCards] : [],
      };
      nextId += 1;
      return deck;
    },
  );

  return { decks: defaultDecks, nextDeckId: nextId };
}

function sanitizeDecks(rawDecks) {
  if (!Array.isArray(rawDecks)) {
    return [];
  }

  return rawDecks
    .filter(
      (deck) =>
        deck &&
        typeof deck.id === "string" &&
        typeof deck.name === "string" &&
        Array.isArray(deck.cards),
    )
    .map((deck) => ({
      id: deck.id,
      name: deck.name.trim() || "Untitled deck",
      cards: deck.cards
        .filter(
          (card) =>
            card &&
            typeof card.front === "string" &&
            typeof card.back === "string",
        )
        .map((card) => ({
          front: card.front,
          back: card.back,
        })),
    }));
}

function getNextDeckIdCounter(deckCollection) {
  const maxDeckId = deckCollection.reduce((maxId, deck) => {
    const match = /^deck-(\d+)$/.exec(deck.id);
    if (!match) {
      return maxId;
    }
    return Math.max(maxId, Number(match[1]));
  }, 0);

  return maxDeckId + 1;
}

function loadStateFromStorage() {
  try {
    const rawState = localStorage.getItem(STORAGE_KEY);
    if (!rawState) {
      return null;
    }

    const parsedState = JSON.parse(rawState);
    const storedDecks = sanitizeDecks(parsedState.decks);

    if (storedDecks.length === 0) {
      return null;
    }

    let storedActiveDeckId =
      typeof parsedState.activeDeckId === "string"
        ? parsedState.activeDeckId
        : null;

    if (!storedDecks.some((deck) => deck.id === storedActiveDeckId)) {
      storedActiveDeckId = storedDecks[0].id;
    }

    return {
      decks: storedDecks,
      activeDeckId: storedActiveDeckId,
      nextDeckId: getNextDeckIdCounter(storedDecks),
    };
  } catch {
    return null;
  }
}

let { decks, nextDeckId } = createDefaultDecksFromSidebar();
let activeDeckId = decks.length > 0 ? decks[0].id : null;
let deckIdCounter = nextDeckId;

const storedState = loadStateFromStorage();
if (storedState) {
  decks = storedState.decks;
  activeDeckId = storedState.activeDeckId;
  deckIdCounter = storedState.nextDeckId;
}

function saveStateToStorage() {
  const state = {
    decks,
    activeDeckId,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getVisibleCardIndexes(deck) {
  if (!deck) {
    return [];
  }

  const keyword = searchInput.value.trim().toLowerCase();
  if (!keyword) {
    return deck.cards.map((_, index) => index);
  }

  return deck.cards.reduce((matches, card, index) => {
    const haystack = `${card.front} ${card.back}`.toLowerCase();
    if (haystack.includes(keyword)) {
      matches.push(index);
    }
    return matches;
  }, []);
}

function getCurrentActualCardIndex(deck) {
  const visibleIndexes = getVisibleCardIndexes(deck);
  if (visibleIndexes.length === 0) {
    return null;
  }

  if (current >= visibleIndexes.length) {
    current = visibleIndexes.length - 1;
  }

  return visibleIndexes[current];
}

function loadCard(index) {
  const activeDeck = decks.find((deck) => deck.id === activeDeckId);
  const activeCards = activeDeck ? activeDeck.cards : [];
  const visibleIndexes = getVisibleCardIndexes(activeDeck);

  if (!activeDeck) {
    counter.textContent = "Card 0 of 0";
    frontFace.textContent = "No deck selected";
    backFace.textContent = "Choose a deck to start reviewing cards.";
    flashcard.classList.remove("flipped");
    return;
  }

  if (activeCards.length === 0) {
    counter.textContent = "Card 0 of 0";
    frontFace.textContent = "No cards in this deck";
    backFace.textContent = "Click + New Card to add the first card.";
    flashcard.classList.remove("flipped");
    return;
  }

  if (visibleIndexes.length === 0) {
    counter.textContent = "Card 0 of 0";
    frontFace.textContent = "No Card found";
    backFace.textContent = "Try another keyword or clear search.";
    flashcard.classList.remove("flipped");
    return;
  }

  if (index >= visibleIndexes.length) {
    current = visibleIndexes.length - 1;
  }

  const actualIndex = visibleIndexes[current];

  flashcard.classList.remove("flipped");
  frontFace.textContent = activeCards[actualIndex].front;
  backFace.textContent = activeCards[actualIndex].back;
  counter.textContent = `Card ${current + 1} of ${visibleIndexes.length}`;
}

function updateDeckActionsState() {
  const hasActiveDeck = Boolean(activeDeckId);
  btnEditDeck.disabled = !hasActiveDeck;
  btnDeleteDeck.disabled = !hasActiveDeck;
  btnNewCard.disabled = !hasActiveDeck;
  btnShuffle.disabled = !hasActiveDeck;

  const activeDeck = decks.find((deck) => deck.id === activeDeckId);
  const hasCards = activeDeck && activeDeck.cards.length > 0;
  const hasVisibleCards =
    activeDeck && getVisibleCardIndexes(activeDeck).length > 0;
  btnEditCard.disabled = !hasVisibleCards;
  btnDeleteCard.disabled = !hasVisibleCards;
  btnShuffle.disabled = !hasCards;
}

function shuffleCards(cards) {
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[randomIndex]] = [cards[randomIndex], cards[i]];
  }
}

function renderDeckList() {
  deckList.innerHTML = "";

  if (decks.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "deck-item empty-state";
    emptyItem.textContent = "No Decks yet";
    deckList.appendChild(emptyItem);
    return;
  }

  decks.forEach((deck) => {
    const li = document.createElement("li");
    li.className = "deck-item";
    if (deck.id === activeDeckId) {
      li.classList.add("active");
    }
    li.dataset.deckId = deck.id;
    li.textContent = deck.name;
    deckList.appendChild(li);
  });
}

function setActiveDeckById(deckId) {
  const selectedDeck = decks.find((deck) => deck.id === deckId);
  if (!selectedDeck) {
    return;
  }

  activeDeckId = selectedDeck.id;
  current = 0;
  deckTitle.textContent = selectedDeck.name;
  renderDeckList();
  updateDeckActionsState();
  loadCard(current);
  saveStateToStorage();
}

function isDeckNameTaken(deckName, excludedDeckId = null) {
  const normalizedName = deckName.toLowerCase();
  return decks.some(
    (deck) =>
      deck.id !== excludedDeckId && deck.name.toLowerCase() === normalizedName,
  );
}

function validateDeckName(deckName, excludedDeckId = null) {
  if (!deckName) {
    return "Deck name cannot be empty. Please enter a name.";
  }

  if (isDeckNameTaken(deckName, excludedDeckId)) {
    return "Deck name must be unique.";
  }

  return "";
}

function openNewDeckModal() {
  deckNameError.textContent = "";
  newDeckForm.reset();
  newDeckModal.classList.remove("hidden");
  newDeckModal.setAttribute("aria-hidden", "false");
  deckNameInput.focus();
}

function closeNewDeckModal() {
  newDeckModal.classList.add("hidden");
  newDeckModal.setAttribute("aria-hidden", "true");
}

function openNewCardModal() {
  newCardError.textContent = "";
  newCardForm.reset();
  newCardModal.classList.remove("hidden");
  newCardModal.setAttribute("aria-hidden", "false");
  cardFrontInput.focus();
}

function closeNewCardModal() {
  newCardModal.classList.add("hidden");
  newCardModal.setAttribute("aria-hidden", "true");
}

function openEditCardModal() {
  const activeDeck = decks.find((deck) => deck.id === activeDeckId);
  if (!activeDeck || activeDeck.cards.length === 0) {
    return;
  }

  const actualIndex = getCurrentActualCardIndex(activeDeck);
  if (actualIndex === null) {
    return;
  }

  const card = activeDeck.cards[actualIndex];
  editCardError.textContent = "";
  editCardFrontInput.value = card.front;
  editCardBackInput.value = card.back;
  editCardModal.classList.remove("hidden");
  editCardModal.setAttribute("aria-hidden", "false");
  editCardFrontInput.focus();
}

function closeEditCardModal() {
  editCardModal.classList.add("hidden");
  editCardModal.setAttribute("aria-hidden", "true");
}

function isAnyModalOpen() {
  return (
    !newDeckModal.classList.contains("hidden") ||
    !newCardModal.classList.contains("hidden") ||
    !editCardModal.classList.contains("hidden")
  );
}

function keepFocusOnCard() {
  if (isAnyModalOpen()) {
    return;
  }
  flashcard.focus({ preventScroll: true });
}

function getActiveDeck() {
  return decks.find((deck) => deck.id === activeDeckId);
}

function flipCurrentCard() {
  const activeDeck = getActiveDeck();
  if (!activeDeck || getVisibleCardIndexes(activeDeck).length === 0) {
    return;
  }
  flashcard.classList.toggle("flipped");
}

function goToPreviousCard() {
  const activeDeck = getActiveDeck();
  const visibleIndexes = getVisibleCardIndexes(activeDeck);
  if (!activeDeck || visibleIndexes.length === 0) {
    return;
  }
  current = (current - 1 + visibleIndexes.length) % visibleIndexes.length;
  loadCard(current);
}

function goToNextCard() {
  const activeDeck = getActiveDeck();
  const visibleIndexes = getVisibleCardIndexes(activeDeck);
  if (!activeDeck || visibleIndexes.length === 0) {
    return;
  }
  current = (current + 1) % visibleIndexes.length;
  loadCard(current);
}

flashcard.addEventListener("click", () => {
  flipCurrentCard();
  keepFocusOnCard();
});
btnFlip.addEventListener("click", () => {
  flipCurrentCard();
  keepFocusOnCard();
});

btnPrev.addEventListener("click", () => {
  goToPreviousCard();
  keepFocusOnCard();
});

btnNext.addEventListener("click", () => {
  goToNextCard();
  keepFocusOnCard();
});

btnShuffle.addEventListener("click", () => {
  const activeDeck = decks.find((deck) => deck.id === activeDeckId);
  if (!activeDeck || activeDeck.cards.length <= 1) {
    return;
  }

  shuffleCards(activeDeck.cards);
  current = 0;
  loadCard(current);
  updateDeckActionsState();
  saveStateToStorage();
});

btnNewDeck.addEventListener("click", openNewDeckModal);
btnCancelNewDeck.addEventListener("click", closeNewDeckModal);
btnNewCard.addEventListener("click", openNewCardModal);
btnCancelNewCard.addEventListener("click", closeNewCardModal);
btnEditCard.addEventListener("click", openEditCardModal);
btnCancelEditCard.addEventListener("click", closeEditCardModal);
btnDeleteCard.addEventListener("click", () => {
  const activeDeck = decks.find((deck) => deck.id === activeDeckId);
  if (!activeDeck || activeDeck.cards.length === 0) {
    return;
  }

  const actualIndex = getCurrentActualCardIndex(activeDeck);
  if (actualIndex === null) {
    return;
  }

  const card = activeDeck.cards[actualIndex];
  const shouldDelete = window.confirm(
    `Delete card "${card.front}"? This action cannot be undone.`,
  );

  if (!shouldDelete) {
    return;
  }

  activeDeck.cards.splice(actualIndex, 1);
  saveStateToStorage();

  const visibleIndexes = getVisibleCardIndexes(activeDeck);
  if (visibleIndexes.length > 0 && current >= visibleIndexes.length) {
    current = visibleIndexes.length - 1;
  }

  if (activeDeck.cards.length === 0) {
    current = 0;
    loadCard(current);
    updateDeckActionsState();
    return;
  }

  loadCard(current);
  updateDeckActionsState();
});

newDeckModal.addEventListener("click", (event) => {
  if (event.target === newDeckModal) {
    closeNewDeckModal();
  }
});

newCardModal.addEventListener("click", (event) => {
  if (event.target === newCardModal) {
    closeNewCardModal();
  }
});

editCardModal.addEventListener("click", (event) => {
  if (event.target === editCardModal) {
    closeEditCardModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (!editCardModal.classList.contains("hidden")) {
    closeEditCardModal();
    return;
  }

  if (!newCardModal.classList.contains("hidden")) {
    closeNewCardModal();
    return;
  }

  if (!newDeckModal.classList.contains("hidden")) {
    closeNewDeckModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (isAnyModalOpen()) {
    return;
  }

  if (
    event.target instanceof HTMLElement &&
    event.target.closest("input, textarea, select, [contenteditable='true']")
  ) {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    flipCurrentCard();
    keepFocusOnCard();
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    goToPreviousCard();
    keepFocusOnCard();
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    goToNextCard();
    keepFocusOnCard();
  }
});

deckList.addEventListener("click", (event) => {
  const clickedDeck = event.target.closest(".deck-item");
  if (!clickedDeck) {
    return;
  }
  setActiveDeckById(clickedDeck.dataset.deckId);
});

newDeckForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const typedName = deckNameInput.value.trim();

  const validationMessage = validateDeckName(typedName);
  if (validationMessage) {
    deckNameError.textContent = validationMessage;
    return;
  }

  deckNameError.textContent = "";

  const newDeck = {
    id: `deck-${deckIdCounter}`,
    name: typedName,
    cards: [],
  };
  deckIdCounter += 1;
  decks.push(newDeck);
  setActiveDeckById(newDeck.id);
  closeNewDeckModal();
});

newCardForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const front = cardFrontInput.value.trim();
  const back = cardBackInput.value.trim();

  if (!front || !back) {
    newCardError.textContent = "Both front and back are required.";
    return;
  }

  const newCard = { front, back };
  const activeDeck = decks.find((deck) => deck.id === activeDeckId);

  if (!activeDeck) {
    newCardError.textContent = "Please select a deck first.";
    return;
  }

  activeDeck.cards.push(newCard);
  saveStateToStorage();

  const visibleIndexes = getVisibleCardIndexes(activeDeck);
  current = visibleIndexes.length > 0 ? visibleIndexes.length - 1 : 0;
  loadCard(current);
  updateDeckActionsState();
  closeNewCardModal();
});

editCardForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const front = editCardFrontInput.value.trim();
  const back = editCardBackInput.value.trim();

  if (!front || !back) {
    editCardError.textContent = "Both front and back are required.";
    return;
  }

  const activeDeck = decks.find((deck) => deck.id === activeDeckId);
  if (!activeDeck) {
    editCardError.textContent = "Could not update card.";
    return;
  }

  const actualIndex = getCurrentActualCardIndex(activeDeck);
  if (actualIndex === null) {
    editCardError.textContent = "Could not update card.";
    return;
  }

  activeDeck.cards[actualIndex].front = front;
  activeDeck.cards[actualIndex].back = back;
  saveStateToStorage();

  loadCard(current);
  updateDeckActionsState();
  closeEditCardModal();
});

searchInput.addEventListener("input", () => {
  current = 0;
  loadCard(current);
  updateDeckActionsState();
});

btnEditDeck.addEventListener("click", () => {
  if (!activeDeckId) {
    return;
  }

  const activeDeck = decks.find((deck) => deck.id === activeDeckId);
  if (!activeDeck) {
    return;
  }

  const promptedName = window.prompt("Enter new deck name:", activeDeck.name);
  if (promptedName === null) {
    return;
  }

  const updatedName = promptedName.trim();
  const validationMessage = validateDeckName(updatedName, activeDeck.id);
  if (validationMessage) {
    window.alert(validationMessage);
    return;
  }

  activeDeck.name = updatedName;
  saveStateToStorage();
  setActiveDeckById(activeDeck.id);
});

btnDeleteDeck.addEventListener("click", () => {
  if (!activeDeckId) {
    return;
  }

  const activeIndex = decks.findIndex((deck) => deck.id === activeDeckId);
  if (activeIndex === -1) {
    return;
  }

  const activeDeck = decks[activeIndex];
  const shouldDelete = window.confirm(
    `Delete deck "${activeDeck.name}"? This action cannot be undone.`,
  );

  if (!shouldDelete) {
    return;
  }

  decks.splice(activeIndex, 1);

  if (decks.length === 0) {
    activeDeckId = null;
    current = 0;
    deckTitle.textContent = "No Decks yet";
    renderDeckList();
    updateDeckActionsState();
    loadCard(current);
    saveStateToStorage();
    return;
  }

  const nextDeckIndex = Math.min(activeIndex, decks.length - 1);
  setActiveDeckById(decks[nextDeckIndex].id);
});

renderDeckList();
updateDeckActionsState();
if (activeDeckId) {
  setActiveDeckById(activeDeckId);
} else {
  loadCard(current);
}
