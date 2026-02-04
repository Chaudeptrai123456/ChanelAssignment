const stage = document.querySelector(".zoom-stage");
const viewport = document.querySelector(".zoom-viewport");
const image = document.querySelector(".couture-content-tab2-image");
const button = document.querySelector(".button1");
const footer = document.querySelector("footer");
const uiIamges = document.querySelector(".ui-images");
const main = document.querySelector("main");
const maxScale = 2.2;
const maxRotate = -40;

function clamp(v, min = 0, max = 3) {
  return Math.min(Math.max(v, min), max);
}

function handleStageScroll() {
  const rect = viewport.getBoundingClientRect();
  const vh = window.innerHeight;
  if (rect.top >= 0) {
    stage.style.transform = "translate(-50%, -50%) scale(1) rotate(0deg)";
    return;
  }
  if (rect.top >= vh || rect.bottom <= 0) {
    stage.style.transform = "translate(-50%, -50%) scale(1) rotate(0deg)";
    return;
  }

  let progress = (vh - rect.top) / (vh + rect.height);
  progress = clamp(progress);

  const scale = 1 + progress * (maxScale - 1.2);
  const rotate = progress * maxRotate;

  stage.style.transform = `
    translate(-50%, -50%)
    scale(${scale})
    rotate(${rotate}deg)
  `;
}

function handleImageScroll() {
  const rect = image.getBoundingClientRect();
  const footerRect = footer.getBoundingClientRect();
  const footerTrigger = window.innerHeight * 0.85;
  const vh = window.innerHeight * 1.2;
  if ((rect.top < vh && rect.bottom > 0) || footerRect.top >= footerTrigger) {
    let progress = 1 - rect.top / vh;
    progress = clamp(progress);
    const scale = 0.33 + progress * (1 - 0.33);
    image.style.transform = `scale(${scale})`;
    button.classList.add("show");
  }

  if (footerRect.top < footerTrigger || rect.bottom > vh) {
    button.classList.remove("show");
  }
}
function onScroll() {
  handleStageScroll();
  handleImageScroll();
}

window.addEventListener("scroll", () => {
  requestAnimationFrame(onScroll);
});

function goToHome() {
  window.location.href = "index.html";
}
function goToCollection() {
  window.location.href = "couture.html";
}
