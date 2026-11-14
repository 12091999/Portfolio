(function () {
  // Footer year
  document.getElementById("year").textContent = new Date().getFullYear();

  // Mobile menu
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.getElementById("menu");
  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  menu.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  // Scroll reveal
  const items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("visible"); io.unobserve(en.target); }
      }),
      { threshold: 0.15 }
    );
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add("visible"));
  }

  // Contact form
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  const button = form.querySelector("button[type=submit]");
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function showErrors(errors) {
    form.querySelectorAll(".error").forEach((el) => (el.textContent = ""));
    form.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
    Object.entries(errors).forEach(([field, msg]) => {
      const slot = form.querySelector(`.error[data-for="${field}"]`);
      const input = form.elements[field];
      if (slot) slot.textContent = msg;
      if (input) input.classList.add("invalid");
    });
  }

  function validate(data) {
    const errors = {};
    if (data.name.length < 2) errors.name = "Please enter your name.";
    if (!EMAIL_RE.test(data.email)) errors.email = "Please enter a valid email address.";
    if (data.message.length < 10) errors.message = "Message must be at least 10 characters.";
    return errors;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";
    status.className = "";

    const data = Object.fromEntries(new FormData(form).entries());
    Object.keys(data).forEach((k) => (data[k] = String(data[k]).trim()));

    const errors = validate(data);
    showErrors(errors);
    if (Object.keys(errors).length) return;

    button.disabled = true;
    button.textContent = "Sending...";

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));

      if (res.ok && body.ok) {
        form.reset();
        status.textContent = "Thanks! Your message was sent. I'll get back to you soon.";
        status.className = "ok";
      } else if (body.errors) {
        showErrors(body.errors);
      } else {
        status.textContent = body.error || "Something went wrong. Please try again.";
        status.className = "fail";
      }
    } catch (_err) {
      status.textContent = "Network error. Please check your connection and try again.";
      status.className = "fail";
    } finally {
      button.disabled = false;
      button.textContent = "Send message";
    }
  });
})();
