const menuItems = document.querySelectorAll(".main-menu li");
const megaMenus = document.querySelectorAll(".mega-menu");
const overlay = document.getElementById("mega-overlay");
const closeBtns = document.querySelectorAll(".mega-close-btn");
function closeAllMenus() {
  megaMenus.forEach((menu) => menu.classList.remove("active"));
  overlay.classList.remove("active");
}
menuItems.forEach((item) => {
  item.addEventListener("click", () => {
    const menuId = item.getAttribute("data-menu");
    const targetMenu = document.getElementById(`menu-${menuId}`);

    closeAllMenus();

    if (targetMenu) {
      targetMenu.classList.add("active");
      overlay.classList.add("active");
    }
  });
});

overlay.addEventListener("click", closeAllMenus);

closeBtns.forEach((btn) => {
  btn.addEventListener("click", closeAllMenus);
});
function goToCollection(){
  window.location.href="collection.html";
}
function goToItem() {
  window.location.href="item.html"
}
function goToHome() {
  window.location.href="index.html"
}
function goToMakeOrder() {
  window.location.href="order.html"
}
function goToPaying() {
  window.location.href="paying.html"
}
/*

        <div class="container-content">
          <div class="container-content-item">
            <div class="product-media">
              <img src="./images/image80.avif"  class="product-media-image"/>
            </div>
            <div class="container-content-item-content">
              <p>
                <strong>NHẪN COCO CRUSH</strong><br />
                Mô típ chần quả trám, phiển bản mini, VÀNG BEIGE 18K <br />
                <strong>53 230 000 VND*</strong>
              </p>
              <div onclick="goToMakeOrder()" class="container-content-item-link">Xem Chi Tiết</div>
          </div>
        </div>
*/