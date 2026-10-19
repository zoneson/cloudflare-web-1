const form = document.getElementById("contact-form");
const statusBox = document.getElementById("form-status");
const sendButton = form.querySelector('button[type="submit"]');

function say(...parts) {
  statusBox.replaceChildren(...parts);
}

function showFieldErrors(errors = {}) {
  for (const slot of form.querySelectorAll(".field-error")) {
    slot.textContent = errors[slot.dataset.for] ?? "";
  }
  if (errors.form) say(errors.form);
}

function showFallback() {
  const link = document.createElement("a");
  link.href = "mailto:zoneson@gmail.com";
  link.textContent = "zoneson@gmail.com";
  say("Sorry, sending failed. Please email me directly at ", link, ".");
}

function showThanks() {
  const thanks = document.createElement("p");
  thanks.id = "form-status";
  thanks.setAttribute("role", "status");
  thanks.textContent = "Thanks — I usually reply within one working day.";
  form.replaceWith(thanks);
}

const ON_STATUS = {
  400: (body) => showFieldErrors(body.errors),
  403: () => say("Please complete the check and try again."),
};

function collect() {
  const data = Object.fromEntries(new FormData(form));
  data.turnstileToken = data["cf-turnstile-response"] ?? "";
  delete data["cf-turnstile-response"];
  return data;
}

/*
 * Turnstile tokens are single-use and the server may already have spent
 * this one, so every unsuccessful attempt gets a fresh check. The widget
 * script can be blocked by privacy extensions, hence the optional call.
 */
async function submit(event) {
  event.preventDefault();
  if (sendButton.disabled) return;
  sendButton.disabled = true;
  showFieldErrors();
  say();
  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(collect()),
    });
    if (response.ok) return showThanks();
    const body = await response.json().catch(() => ({}));
    (ON_STATUS[response.status] ?? showFallback)(body);
  } catch {
    showFallback();
  }
  window.turnstile?.reset();
  sendButton.disabled = false;
}

form.addEventListener("submit", submit);
