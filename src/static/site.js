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
