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

/* On a phone the first bad field can be off-screen; move the visitor to it. */
function showRejected(errors) {
  showFieldErrors(errors);
  const first = form.querySelector(".field-error:not(:empty)");
  if (!first) return;
  say("Please check the highlighted fields.");
  form.querySelector(`[name="${first.dataset.for}"]`).focus();
}

function mailtoLink() {
  const link = document.createElement("a");
  link.href = "mailto:zoneson@gmail.com";
  link.textContent = "zoneson@gmail.com";
  return link;
}

function showFallback() {
  say("Sorry, sending failed. Please email me directly at ", mailtoLink(), ".");
}

function showThanks() {
  const thanks = document.createElement("p");
  thanks.id = "form-status";
  thanks.setAttribute("role", "status");
  thanks.textContent = "Thanks — I usually reply within one working day.";
  form.replaceWith(thanks);
}

const ON_STATUS = {
  400: (body) => showRejected(body.errors),
  /* The check may be blocked by a privacy extension, so always offer a way out. */
  403: () => say("Please complete the check and try again, or email me directly at ", mailtoLink(), "."),
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
