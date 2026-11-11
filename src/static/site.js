// Copy buttons on code panels, and a collapsed "On this page" list on small screens.
document.querySelectorAll(".panel .copy").forEach((button) => {
  const code = button.closest(".panel")?.querySelector("pre");
  if (!code || !navigator.clipboard) return button.remove();
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(code.innerText.trimEnd());
    button.textContent = "Copied";
    setTimeout(() => (button.textContent = "Copy"), 1500);
  });
});

const toc = document.querySelector(".toc");
if (toc && window.matchMedia("(max-width: 900px)").matches) toc.open = false;

// Theme toggle: an explicit choice is stored; without one the site follows the
// system, live. The head script sets data-theme before paint, so no flash.
(function () {
  const button = document.querySelector("[data-theme-toggle]");
  if (!button) return;
  const root = document.documentElement;
  const system = window.matchMedia("(prefers-color-scheme: light)");
  const paint = () => {
    const light = root.getAttribute("data-theme") === "light";
    button.textContent = light ? "Dark" : "Light";
    button.setAttribute("aria-label", light ? "Switch to the dark theme" : "Switch to the light theme");
    button.setAttribute("aria-pressed", String(light));
  };
  button.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("ak-theme", next); } catch (e) { /* private mode */ }
    paint();
  });
  system.addEventListener("change", (event) => {
    let stored = null;
    try { stored = localStorage.getItem("ak-theme"); } catch (e) { /* private mode */ }
    if (stored === "light" || stored === "dark") return;
    root.setAttribute("data-theme", event.matches ? "light" : "dark");
    paint();
  });
  paint();
})();
