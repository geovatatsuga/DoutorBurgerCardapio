const qs = (selector) => document.querySelector(selector);

qs("#loginBtn")?.addEventListener("click", () => {
  window.location.href = "index.html?page=login";
});
